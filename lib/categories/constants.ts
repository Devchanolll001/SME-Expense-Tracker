import type { TransactionType } from "@/lib/transactions/constants";

export const CATEGORY_TYPES = [
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Both", value: "both" },
] as const;

export const CATEGORY_FILTERS = [
  { label: "All", value: "all" },
  ...CATEGORY_TYPES,
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number]["value"];
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number]["value"];

export function isCategoryType(value: string): value is CategoryType {
  return CATEGORY_TYPES.some((type) => type.value === value);
}

export function isCategoryFilter(value: string): value is CategoryFilter {
  return CATEGORY_FILTERS.some((filter) => filter.value === value);
}

export function getCategoryTypeLabel(value: string) {
  return CATEGORY_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function categorySupportsTransactionType(
  categoryType: string,
  transactionType: string,
) {
  return categoryType === "both" || categoryType === transactionType;
}

export function getCategoriesForTransactionType<
  TCategory extends { type: string },
>(categories: TCategory[], transactionType: TransactionType) {
  return categories.filter((category) =>
    categorySupportsTransactionType(category.type, transactionType),
  );
}
