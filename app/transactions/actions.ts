"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AUTHENTICATED_HOME, ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getOwnedBusinessesForUser } from "@/lib/business/access";
import { categorySupportsTransactionType } from "@/lib/categories/constants";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/transactions/constants";
import {
  isValidUuid,
  validateTransactionForm,
  type TransactionFieldErrors,
  type TransactionFields,
  type ValidTransactionInput,
} from "@/lib/transactions/validation";

export type TransactionFormState = {
  errors?: TransactionFieldErrors;
  fields: TransactionFields;
  message?: string;
  status: "idle" | "error";
};

export type DeleteTransactionState = {
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
      user: {
        id: string;
      };
    }
  | {
      message: string;
      status: "error";
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

type CategoryRow = {
  id: string;
  type: string;
};

function getErrorState(
  fields: TransactionFields,
  message: string,
  errors?: TransactionFieldErrors,
): TransactionFormState {
  return {
    errors,
    fields,
    message,
    status: "error",
  };
}

function redirectToLogin(): never {
  redirect(
    `/login?next=${encodeURIComponent(
      "/transactions",
    )}&error=Please%20sign%20in%20to%20manage%20transactions.`,
  );
}

function redirectWithSuccess(message: string): never {
  revalidatePath(AUTHENTICATED_HOME);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/transactions");
  redirect(`/transactions?success=${encodeURIComponent(message)}`);
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
        "More than one business is connected to this account. Resolve duplicate business records before managing transactions.",
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
    user: {
      id: user.id,
    },
  };
}

async function validateCategoryForBusiness(
  context: Extract<ActionContext, { status: "ok" }>,
  input: ValidTransactionInput,
) {
  const { data, error } = await context.supabase
    .from("categories")
    .select("id, type")
    .eq("business_id", context.business.id)
    .eq("id", input.categoryId)
    .maybeSingle();

  if (error) {
    return {
      errors: undefined,
      message: "We couldn't validate the selected category. Please try again.",
      ok: false,
    };
  }

  const category = data as CategoryRow | null;

  if (!category) {
    return {
      errors: {
        categoryId: ["Choose a category for your business."],
      },
      message: "Please fix the highlighted fields.",
      ok: false,
    };
  }

  if (!categorySupportsTransactionType(category.type, input.type)) {
    return {
      errors: {
        categoryId: [
          `Choose a category that supports ${input.type} transactions.`,
        ],
      },
      message: "Please fix the highlighted fields.",
      ok: false,
    };
  }

  return {
    errors: undefined,
    message: "",
    ok: true,
  };
}

function getTransactionPayload(
  input: ValidTransactionInput,
  businessId: string,
  userId: string,
) {
  return {
    amount: input.amount,
    business_id: businessId,
    category_id: input.categoryId,
    description: input.description,
    notes: input.notes,
    payment_method: input.paymentMethod as PaymentMethod,
    reference: input.reference,
    transaction_date: input.transactionDate,
    type: input.type,
    user_id: userId,
  };
}

export async function createTransaction(
  previousState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  void previousState;

  const context = await getActionContext();
  const validation = validateTransactionForm(formData);

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

  const categoryValidation = await validateCategoryForBusiness(
    context,
    validation.data,
  );

  if (!categoryValidation.ok) {
    return getErrorState(
      validation.fields,
      categoryValidation.message,
      categoryValidation.errors,
    );
  }

  const { error } = await context.supabase.from("transactions").insert(
    getTransactionPayload(
      validation.data,
      context.business.id,
      context.user.id,
    ),
  );

  if (error) {
    return getErrorState(
      validation.fields,
      "We couldn't save this transaction. Please try again.",
    );
  }

  redirectWithSuccess("Transaction added.");
}

export async function updateTransaction(
  transactionId: string,
  previousState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  void previousState;

  const context = await getActionContext();
  const validation = validateTransactionForm(formData);

  if (!validation.ok) {
    return getErrorState(
      validation.fields,
      "Please fix the highlighted fields.",
      validation.errors,
    );
  }

  if (!isValidUuid(transactionId)) {
    return getErrorState(validation.fields, "Transaction not found.");
  }

  if (context.status !== "ok") {
    return getErrorState(validation.fields, context.message);
  }

  const categoryValidation = await validateCategoryForBusiness(
    context,
    validation.data,
  );

  if (!categoryValidation.ok) {
    return getErrorState(
      validation.fields,
      categoryValidation.message,
      categoryValidation.errors,
    );
  }

  const { data: existingTransaction, error: existingTransactionError } =
    await context.supabase
      .from("transactions")
      .select("id")
      .eq("business_id", context.business.id)
      .eq("id", transactionId)
      .maybeSingle();

  if (existingTransactionError) {
    return getErrorState(
      validation.fields,
      "We couldn't load this transaction. Please try again.",
    );
  }

  if (!existingTransaction) {
    return getErrorState(validation.fields, "Transaction not found.");
  }

  const { error } = await context.supabase
    .from("transactions")
    .update({
      amount: validation.data.amount,
      category_id: validation.data.categoryId,
      description: validation.data.description,
      notes: validation.data.notes,
      payment_method: validation.data.paymentMethod,
      reference: validation.data.reference,
      transaction_date: validation.data.transactionDate,
      type: validation.data.type,
    })
    .eq("business_id", context.business.id)
    .eq("id", transactionId);

  if (error) {
    return getErrorState(
      validation.fields,
      "We couldn't update this transaction. Please try again.",
    );
  }

  redirectWithSuccess("Transaction updated.");
}

export async function deleteTransaction(
  transactionId: string,
  previousState: DeleteTransactionState,
  formData: FormData,
): Promise<DeleteTransactionState> {
  void previousState;
  void formData;

  const context = await getActionContext();

  if (!isValidUuid(transactionId)) {
    return {
      message: "Transaction not found.",
      status: "error",
    };
  }

  if (context.status !== "ok") {
    return {
      message: context.message,
      status: "error",
    };
  }

  const { data: existingTransaction, error: existingTransactionError } =
    await context.supabase
      .from("transactions")
      .select("id")
      .eq("business_id", context.business.id)
      .eq("id", transactionId)
      .maybeSingle();

  if (existingTransactionError) {
    return {
      message: "We couldn't load this transaction. Please try again.",
      status: "error",
    };
  }

  if (!existingTransaction) {
    return {
      message: "Transaction not found.",
      status: "error",
    };
  }

  const { error } = await context.supabase
    .from("transactions")
    .delete()
    .eq("business_id", context.business.id)
    .eq("id", transactionId);

  if (error) {
    return {
      message: "We couldn't delete this transaction. Please try again.",
      status: "error",
    };
  }

  redirectWithSuccess("Transaction deleted.");
}
