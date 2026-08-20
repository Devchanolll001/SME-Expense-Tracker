import {
  isCategoryType,
  type CategoryType,
} from "@/lib/categories/constants";

export type CategoryFieldName = "name" | "type" | "description";

export type CategoryFields = Record<CategoryFieldName, string>;

export type CategoryFieldErrors = Partial<
  Record<CategoryFieldName, string[]>
>;

export type ValidCategoryInput = {
  description: string | null;
  name: string;
  type: CategoryType;
};

export type CategoryValidationResult =
  | {
      data: ValidCategoryInput;
      fields: CategoryFields;
      ok: true;
    }
  | {
      errors: CategoryFieldErrors;
      fields: CategoryFields;
      ok: false;
    };

const MAX_CATEGORY_NAME_LENGTH = 80;
const MAX_CATEGORY_DESCRIPTION_LENGTH = 240;

function addFieldError(
  errors: CategoryFieldErrors,
  field: CategoryFieldName,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function getFormString(formData: FormData, name: CategoryFieldName) {
  return String(formData.get(name) ?? "").trim();
}

export function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateCategoryForm(
  formData: FormData,
): CategoryValidationResult {
  const fields: CategoryFields = {
    description: getFormString(formData, "description"),
    name: normalizeCategoryName(getFormString(formData, "name")),
    type: getFormString(formData, "type") || "expense",
  };
  const errors: CategoryFieldErrors = {};
  const type = isCategoryType(fields.type) ? fields.type : null;

  if (!fields.name) {
    addFieldError(errors, "name", "Category name is required.");
  } else if (fields.name.length > MAX_CATEGORY_NAME_LENGTH) {
    addFieldError(
      errors,
      "name",
      `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`,
    );
  }

  if (!type) {
    addFieldError(errors, "type", "Choose income, expense, or both.");
  }

  if (fields.description.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    addFieldError(
      errors,
      "description",
      `Description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or fewer.`,
    );
  }

  if (Object.keys(errors).length > 0 || !type) {
    return {
      errors,
      fields,
      ok: false,
    };
  }

  return {
    data: {
      description: fields.description || null,
      name: fields.name,
      type,
    },
    fields,
    ok: true,
  };
}
