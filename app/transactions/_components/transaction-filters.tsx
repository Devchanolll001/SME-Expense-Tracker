import Link from "next/link";
import { getCategoriesForTransactionType } from "@/lib/categories/constants";
import { DATE_FILTERS } from "@/lib/date-ranges";
import {
  PAYMENT_METHODS,
  TRANSACTION_SORT_OPTIONS,
  TRANSACTION_TYPES,
} from "@/lib/transactions/constants";
import type {
  TransactionCategory,
  TransactionFilters,
} from "@/lib/transactions/data";

type TransactionFiltersProps = {
  categories: TransactionCategory[];
  filters: TransactionFilters;
};

export function TransactionFilters({
  categories,
  filters,
}: TransactionFiltersProps) {
  const categoryOptions =
    filters.type === "all"
      ? categories
      : getCategoriesForTransactionType(categories, filters.type);

  return (
    <form
      action="/transactions"
      method="get"
      className="rounded-2xl border border-[#e7ded2] bg-white p-5 shadow-[0_8px_24px_rgba(89,55,30,0.05)]"
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(5,1fr)_auto]">
        <div>
          <label
            htmlFor="q"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.search}
            placeholder="Search transactions..."
            className="w-full rounded-lg border border-slate-200 bg-[#fffdfa] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label
            htmlFor="type"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={filters.type}
            className="w-full rounded-lg border border-slate-200 bg-[#fffdfa] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="category"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={filters.categoryId}
            className="w-full rounded-lg border border-slate-200 bg-[#fffdfa] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="paymentMethod"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Payment
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={filters.paymentMethod}
            className="w-full rounded-lg border border-slate-200 bg-[#fffdfa] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Date
          </label>
          <select
            id="date"
            name="date"
            defaultValue={filters.date}
            className="w-full rounded-lg border border-slate-200 bg-[#fffdfa] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            {DATE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="sort"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={filters.sort}
            className="w-full rounded-lg border border-slate-200 bg-[#fffdfa] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            {TRANSACTION_SORT_OPTIONS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-[#895129] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f3f20]"
          >
            Apply
          </button>
          <Link
            href="/transactions"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}
