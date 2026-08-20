"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AUTHENTICATED_HOME, ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getOwnedBusinessesForUser } from "@/lib/business/access";
import {
  categorySupportsTransactionType,
  getCategoryTypeLabel,
  type CategoryType,
} from "@/lib/categories/constants";
import {
  normalizeCategoryName,
  validateCategoryForm,
  type CategoryFieldErrors,
  type CategoryFields,
  type ValidCategoryInput,
} from "@/lib/categories/validation";
import { createClient } from "@/lib/supabase/server";

export type CategoryFormState = {
  errors?: CategoryFieldErrors;
  fields: CategoryFields;
  message?: string;
  status: "idle" | "error";
};

export type DeleteCategoryState = {
  message?: string;
  status: "idle" | "error";
};

type ActionContext =
  | {
      business: {
        id: string;
      };
      status: "ok";
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | {
      message: string;
      status: "error";
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

type CategoryIdentityRow = {
  id: string;
  name: string;
  type: string;
};

type DuplicateCategoryRow = {
  id: string;
  name: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function getErrorState(
  fields: CategoryFields,
  message: string,
  errors?: CategoryFieldErrors,
): CategoryFormState {
  return {
    errors,
    fields,
    message,
    status: "error",
  };
}

function getDuplicateCategoryMessage(input: ValidCategoryInput) {
  return `A ${getCategoryTypeLabel(input.type).toLowerCase()} category named "${input.name}" already exists.`;
}

function redirectToLogin(): never {
  redirect(
    `/login?next=${encodeURIComponent(
      "/categories",
    )}&error=Please%20sign%20in%20to%20manage%20categories.`,
  );
}

function redirectWithSuccess(message: string): never {
  revalidatePath(AUTHENTICATED_HOME);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/transactions");
  revalidatePath("/categories");
  redirect(`/categories?success=${encodeURIComponent(message)}`);
}

async function getActionContext(): Promise<ActionContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectToLogin();
  }

  const { businesses, error } = await getOwnedBusinessesForUser(
    supabase,
    user.id,
  );

  if (error) {
    return {
      message: "We couldn't check your business setup. Please try again.",
      status: "error",
      supabase,
    };
  }

  if (businesses.length === 0) {
    redirect(ONBOARDING_ROUTE);
  }

  if (businesses.length > 1) {
    return {
      message:
        "More than one business is connected to this account. Resolve duplicate business records before managing categories.",
      status: "error",
      supabase,
    };
  }

  return {
    business: {
      id: businesses[0].id,
    },
    status: "ok",
    supabase,
  };
}

async function findDuplicateCategory(
  context: Extract<ActionContext, { status: "ok" }>,
  input: ValidCategoryInput,
  excludeCategoryId?: string,
) {
  const { data, error } = await context.supabase
    .from("categories")
    .select("id, name")
    .eq("business_id", context.business.id)
    .eq("type", input.type);

  if (error) {
    return {
      found: false,
      message: "We couldn't check existing categories. Please try again.",
      ok: false,
    };
  }

  const normalizedName = normalizeCategoryName(input.name).toLocaleLowerCase();
  const duplicate = ((data ?? []) as DuplicateCategoryRow[]).find(
    (category) =>
      category.id !== excludeCategoryId &&
      normalizeCategoryName(category.name).toLocaleLowerCase() ===
        normalizedName,
  );

  return {
    found: Boolean(duplicate),
    message: duplicate
      ? `A ${getCategoryTypeLabel(input.type).toLowerCase()} category named "${input.name}" already exists.`
      : "",
    ok: true,
  };
}

async function getOwnedCategory(
  context: Extract<ActionContext, { status: "ok" }>,
  categoryId: string,
) {
  const { data, error } = await context.supabase
    .from("categories")
    .select("id, name, type")
    .eq("business_id", context.business.id)
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    return {
      category: null,
      message: "We couldn't load this category. Please try again.",
      ok: false,
    };
  }

  return {
    category: data as CategoryIdentityRow | null,
    message: data ? "" : "Category not found.",
    ok: true,
  };
}

async function getIncompatibleTransactionCount(
  context: Extract<ActionContext, { status: "ok" }>,
  categoryId: string,
  type: CategoryType,
) {
  if (type === "both") {
    return {
      count: 0,
      message: "",
      ok: true,
      transactionType: null,
    };
  }

  const incompatibleType = type === "income" ? "expense" : "income";
  const { count, error } = await context.supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("business_id", context.business.id)
    .eq("category_id", categoryId)
    .eq("type", incompatibleType);

  if (error) {
    return {
      count: 0,
      message:
        "We couldn't check transactions that use this category. Please try again.",
      ok: false,
      transactionType: incompatibleType,
    };
  }

  return {
    count: count ?? 0,
    message: "",
    ok: true,
    transactionType: incompatibleType,
  };
}

export async function createCategory(
  previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  void previousState;

  const context = await getActionContext();
  const validation = validateCategoryForm(formData);

  if (!validation.ok) {
    return getErrorState(
      validation.fields,
      "Please fix the highlighted fields.",
      validation.errors,
    );
  }

  if (context.status !== "ok") {
    return getErrorState(validation.fields, context.message);
  }

  const duplicate = await findDuplicateCategory(context, validation.data);

  if (!duplicate.ok) {
    return getErrorState(validation.fields, duplicate.message);
  }

  if (duplicate.found) {
    return getErrorState(validation.fields, duplicate.message, {
      name: [duplicate.message],
    });
  }

  const { error } = await context.supabase.from("categories").insert({
    business_id: context.business.id,
    description: validation.data.description,
    name: validation.data.name,
    type: validation.data.type,
  });

  if (error) {
    if (error.code === "23505") {
      const message = getDuplicateCategoryMessage(validation.data);

      return getErrorState(validation.fields, message, {
        name: [message],
      });
    }

    return getErrorState(
      validation.fields,
      "We couldn't create this category. Please try again.",
    );
  }

  redirectWithSuccess("Category created.");
}

export async function updateCategory(
  categoryId: string,
  previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  void previousState;

  const context = await getActionContext();
  const validation = validateCategoryForm(formData);

  if (!validation.ok) {
    return getErrorState(
      validation.fields,
      "Please fix the highlighted fields.",
      validation.errors,
    );
  }

  if (!isValidUuid(categoryId)) {
    return getErrorState(validation.fields, "Category not found.");
  }

  if (context.status !== "ok") {
    return getErrorState(validation.fields, context.message);
  }

  const existingCategory = await getOwnedCategory(context, categoryId);

  if (!existingCategory.ok) {
    return getErrorState(validation.fields, existingCategory.message);
  }

  if (!existingCategory.category) {
    return getErrorState(validation.fields, "Category not found.");
  }

  const duplicate = await findDuplicateCategory(
    context,
    validation.data,
    existingCategory.category.id,
  );

  if (!duplicate.ok) {
    return getErrorState(validation.fields, duplicate.message);
  }

  if (duplicate.found) {
    return getErrorState(validation.fields, duplicate.message, {
      name: [duplicate.message],
    });
  }

  if (validation.data.type !== existingCategory.category.type) {
    const transactionCheck = await getIncompatibleTransactionCount(
      context,
      existingCategory.category.id,
      validation.data.type,
    );

    if (!transactionCheck.ok) {
      return getErrorState(validation.fields, transactionCheck.message);
    }

    if (
      transactionCheck.count > 0 &&
      transactionCheck.transactionType &&
      !categorySupportsTransactionType(
        validation.data.type,
        transactionCheck.transactionType,
      )
    ) {
      const countLabel =
        transactionCheck.count === 1
          ? "1 transaction"
          : `${transactionCheck.count} transactions`;
      const targetType = getCategoryTypeLabel(validation.data.type);

      return getErrorState(
        validation.fields,
        `Cannot change this category to ${targetType}. It is currently used by ${countLabel} for ${transactionCheck.transactionType} records. Create a new ${validation.data.type} category instead.`,
        {
          type: [
            `This category has ${countLabel} that would no longer match the selected type.`,
          ],
        },
      );
    }
  }

  const { error } = await context.supabase
    .from("categories")
    .update({
      description: validation.data.description,
      name: validation.data.name,
      type: validation.data.type,
    })
    .eq("business_id", context.business.id)
    .eq("id", existingCategory.category.id);

  if (error) {
    if (error.code === "23505") {
      const message = getDuplicateCategoryMessage(validation.data);

      return getErrorState(validation.fields, message, {
        name: [message],
      });
    }

    return getErrorState(
      validation.fields,
      "We couldn't update this category. Please try again.",
    );
  }

  redirectWithSuccess("Category updated.");
}

export async function deleteCategory(
  categoryId: string,
  previousState: DeleteCategoryState,
  formData: FormData,
): Promise<DeleteCategoryState> {
  void previousState;
  void formData;

  const context = await getActionContext();

  if (!isValidUuid(categoryId)) {
    return {
      message: "Category not found.",
      status: "error",
    };
  }

  if (context.status !== "ok") {
    return {
      message: context.message,
      status: "error",
    };
  }

  const existingCategory = await getOwnedCategory(context, categoryId);

  if (!existingCategory.ok) {
    return {
      message: existingCategory.message,
      status: "error",
    };
  }

  if (!existingCategory.category) {
    return {
      message: "Category not found.",
      status: "error",
    };
  }

  const { error } = await context.supabase
    .from("categories")
    .delete()
    .eq("business_id", context.business.id)
    .eq("id", existingCategory.category.id);

  if (error) {
    return {
      message: "We couldn't delete this category. Please try again.",
      status: "error",
    };
  }

  redirectWithSuccess("Category deleted.");
}
