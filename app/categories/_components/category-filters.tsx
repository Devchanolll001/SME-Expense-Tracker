import Link from "next/link";
import { CATEGORY_FILTERS, type CategoryFilter } from "@/lib/categories/constants";
import type { CategoryFilters } from "@/lib/categories/data";

type CategoryFiltersProps = {
  filters: CategoryFilters;
};

function buildCategoryHref(type: CategoryFilter, search: string) {
  const params = new URLSearchParams();

  if (search) {
    params.set("q", search);
  }

  if (type !== "all") {
    params.set("type", type);
  }

  const query = params.toString();

  return query ? `/categories?${query}` : "/categories";
}

export function CategoryFilters({ filters }: CategoryFiltersProps) {
  const hasActiveFilters = Boolean(filters.search) || filters.type !== "all";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <form action="/categories" method="get" className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
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
            placeholder="Search categories..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        {filters.type !== "all" && (
          <input type="hidden" name="type" value={filters.type} />
        )}
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Search
          </button>
          {hasActiveFilters && (
            <Link
              href="/categories"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Category type filter">
        {CATEGORY_FILTERS.map((filter) => {
          const isActive = filter.value === filters.type;

          return (
            <Link
              key={filter.value}
              href={buildCategoryHref(filter.value, filters.search)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
