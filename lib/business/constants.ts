export const DEFAULT_BUSINESS_CURRENCY = "NGN";

export const SUPPORTED_BUSINESS_CURRENCIES = [
  DEFAULT_BUSINESS_CURRENCY,
] as const;

export type SupportedBusinessCurrency =
  (typeof SUPPORTED_BUSINESS_CURRENCIES)[number];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Transport",
  "Salaries",
  "Marketing",
  "Supplies",
  "Equipment",
  "Internet",
  "Maintenance",
  "Other",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Sales",
  "Services",
  "Consulting",
  "Investment",
  "Other",
] as const;
