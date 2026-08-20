import { isValidDateOnly } from "@/lib/date-ranges";
import {
  isPaymentMethod,
  isTransactionType,
  type PaymentMethod,
  type TransactionType,
} from "@/lib/transactions/constants";

export type TransactionFieldName =
  | "type"
  | "amount"
  | "description"
  | "categoryId"
  | "transactionDate"
  | "paymentMethod"
  | "reference"
  | "notes";

export type TransactionFields = Record<TransactionFieldName, string>;

export type TransactionFieldErrors = Partial<
  Record<TransactionFieldName, string[]>
>;

export type ValidTransactionInput = {
  amount: string;
  categoryId: string;
  description: string;
  notes: string | null;
  paymentMethod: PaymentMethod;
  reference: string | null;
  transactionDate: string;
  type: TransactionType;
};

export type TransactionValidationResult =
  | {
      data: ValidTransactionInput;
      fields: TransactionFields;
      ok: true;
    }
  | {
      errors: TransactionFieldErrors;
      fields: TransactionFields;
      ok: false;
    };

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT_WHOLE_DIGITS = 12;
const MAX_DESCRIPTION_LENGTH = 160;
const MAX_REFERENCE_LENGTH = 80;
const MAX_NOTES_LENGTH = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function addFieldError(
  errors: TransactionFieldErrors,
  field: TransactionFieldName,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function getFormString(formData: FormData, name: TransactionFieldName) {
  return String(formData.get(name) ?? "").trim();
}

export function isValidUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeAmount(value: string) {
  const cleanedValue = value.replace(/[\p{Sc},\s]/gu, "");

  if (
    !cleanedValue ||
    cleanedValue.toLowerCase() === "nan" ||
    cleanedValue.toLowerCase() === "infinity" ||
    cleanedValue.startsWith("-") ||
    cleanedValue.startsWith("+") ||
    !AMOUNT_PATTERN.test(cleanedValue)
  ) {
    return {
      amount: "",
      error: "Enter a valid amount greater than zero.",
    };
  }

  const [wholePart, fractionPart = ""] = cleanedValue.split(".");
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fractionPart.padEnd(2, "0");

  if (normalizedWhole.length > MAX_AMOUNT_WHOLE_DIGITS) {
    return {
      amount: "",
      error: "Amount must be less than 1,000,000,000,000.00.",
    };
  }

  if (normalizedWhole === "0" && normalizedFraction === "00") {
    return {
      amount: "",
      error: "Amount must be greater than zero.",
    };
  }

  return {
    amount: `${normalizedWhole}.${normalizedFraction}`,
    error: null,
  };
}

export function validateTransactionForm(
  formData: FormData,
): TransactionValidationResult {
  const fields: TransactionFields = {
    amount: getFormString(formData, "amount"),
    categoryId: getFormString(formData, "categoryId"),
    description: getFormString(formData, "description"),
    notes: getFormString(formData, "notes"),
    paymentMethod: getFormString(formData, "paymentMethod") || "cash",
    reference: getFormString(formData, "reference"),
    transactionDate: getFormString(formData, "transactionDate"),
    type: getFormString(formData, "type") || "expense",
  };
  const errors: TransactionFieldErrors = {};

  if (!isTransactionType(fields.type)) {
    addFieldError(errors, "type", "Choose income or expense.");
  }

  const normalizedAmount = normalizeAmount(fields.amount);
  if (normalizedAmount.error) {
    addFieldError(errors, "amount", normalizedAmount.error);
  }

  if (!fields.description) {
    addFieldError(errors, "description", "Description is required.");
  } else if (fields.description.length > MAX_DESCRIPTION_LENGTH) {
    addFieldError(
      errors,
      "description",
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    );
  }

  if (!fields.categoryId) {
    addFieldError(errors, "categoryId", "Choose a category.");
  } else if (!isValidUuid(fields.categoryId)) {
    addFieldError(errors, "categoryId", "Choose a valid category.");
  }

  if (!fields.transactionDate) {
    addFieldError(errors, "transactionDate", "Transaction date is required.");
  } else if (!isValidDateOnly(fields.transactionDate)) {
    addFieldError(errors, "transactionDate", "Enter a valid date.");
  }

  if (!isPaymentMethod(fields.paymentMethod)) {
    addFieldError(errors, "paymentMethod", "Choose a valid payment method.");
  }

  if (fields.reference.length > MAX_REFERENCE_LENGTH) {
    addFieldError(
      errors,
      "reference",
      `Reference must be ${MAX_REFERENCE_LENGTH} characters or fewer.`,
    );
  }

  if (fields.notes.length > MAX_NOTES_LENGTH) {
    addFieldError(
      errors,
      "notes",
      `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
    );
  }

  const type = isTransactionType(fields.type) ? fields.type : null;
  const paymentMethod = isPaymentMethod(fields.paymentMethod)
    ? fields.paymentMethod
    : null;

  if (
    Object.keys(errors).length > 0 ||
    !type ||
    !paymentMethod ||
    !normalizedAmount.amount
  ) {
    return {
      errors,
      fields,
      ok: false,
    };
  }

  return {
    data: {
      amount: normalizedAmount.amount,
      categoryId: fields.categoryId,
      description: fields.description,
      notes: fields.notes || null,
      paymentMethod,
      reference: fields.reference || null,
      transactionDate: fields.transactionDate,
      type,
    },
    fields,
    ok: true,
  };
}
