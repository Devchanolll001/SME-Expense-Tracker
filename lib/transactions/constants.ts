export const TRANSACTION_TYPES = [
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number]["value"];

export const PAYMENT_METHODS = [
  { label: "Cash", value: "cash" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Card", value: "card" },
  { label: "POS", value: "pos" },
  { label: "Mobile Money", value: "mobile_money" },
  { label: "Other", value: "other" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const TRANSACTION_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest amount", value: "highest_amount" },
  { label: "Lowest amount", value: "lowest_amount" },
] as const;

export type TransactionSort =
  (typeof TRANSACTION_SORT_OPTIONS)[number]["value"];

export const TRANSACTIONS_PAGE_SIZE = 20;

export function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.some((type) => type.value === value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method.value === value);
}

export function isTransactionSort(value: string): value is TransactionSort {
  return TRANSACTION_SORT_OPTIONS.some((sort) => sort.value === value);
}

export function getPaymentMethodLabel(value: string) {
  return (
    PAYMENT_METHODS.find((method) => method.value === value)?.label ?? "Other"
  );
}

export function getTransactionTypeLabel(value: string) {
  return TRANSACTION_TYPES.find((type) => type.value === value)?.label ?? value;
}
