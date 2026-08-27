import Link from "next/link";
import {
  getCategoryTypeLabel,
  type CategoryType,
} from "@/lib/categories/constants";
import type {
  CategoryFilters,
  CategoryListItem,
} from "@/lib/categories/data";

type CategoryListProps = {
  categories: CategoryListItem[];
  filters: CategoryFilters;
};

function hasActiveFilters(filters: CategoryFilters) {
  return Boolean(filters.search) || filters.type !== "all";
}

function transactionCountLabel(count: number) {
  return count === 1 ? "1 transaction" : `${count} transactions`;
}

function formatCreatedAt(value: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function TypeBadge({ type }: { type: CategoryType }) {
  const classes = {
    both: "border-sky-200 bg-sky-50 text-sky-700",
    expense: "border-[#e2bdb4] bg-[#f8e9e5] text-[#660f09]",
    income: "border-[#b8d8c0] bg-[#e5f2e8] text-[#2f7d4a]",
  }[type];

  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${classes}`}
    >
      {getCategoryTypeLabel(type)}
    </span>
  );
}

function EmptyCategories({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-5 py-12 text-center">
      <h2 className="text-lg font-bold text-slate-950">
        {filtered ? "No categories match your search" : "No categories yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {filtered
          ? "Try a different search term or clear the filters."
          : "Create your first category to organize your business transactions."}
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {filtered ? (
          <Link
            href="/categories"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear Search
          </Link>
        ) : (
          <Link
            href="/categories/new"
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add Category
          </Link>
        )}
      </div>
    </div>
  );
}

export function CategoryList({ categories, filters }: CategoryListProps) {
  const filtered = hasActiveFilters(filters);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Category List</h2>
          <p className="mt-1 text-sm text-slate-500">
            Names and usage counts for your business categories.
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyCategories filtered={filtered} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Category Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Transactions
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Created
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="max-w-sm px-5 py-4 text-sm">
                      <p className="font-semibold text-slate-900">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {category.description}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <TypeBadge type={category.type} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {transactionCountLabel(category.transactionCount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatCreatedAt(category.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/categories/${category.id}/edit`}
                          className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/categories/${category.id}/delete`}
                          className="rounded-lg border border-rose-200 px-3 py-2 font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {categories.map((category) => (
              <article key={category.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-950">
                      {category.name}
                    </h3>
                    <p className="mt-2">
                      <TypeBadge type={category.type} />
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {transactionCountLabel(category.transactionCount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Created {formatCreatedAt(category.createdAt)}
                    </p>
                  </div>
                </div>

                {category.description && (
                  <p className="mt-3 text-sm text-slate-500">
                    {category.description}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/categories/${category.id}/edit`}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/categories/${category.id}/delete`}
                    className="flex-1 rounded-lg border border-rose-200 px-3 py-2 text-center text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
