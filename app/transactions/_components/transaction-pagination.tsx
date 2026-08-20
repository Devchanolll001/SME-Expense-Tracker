import Link from "next/link";
import type { TransactionFilters } from "@/lib/transactions/data";

type TransactionPaginationProps = {
  filters: TransactionFilters;
  pagination: {
    currentPage: number;
    endItem: number;
    startItem: number;
    totalItems: number;
    totalPages: number;
  };
};

function getPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from(
    { length: end - adjustedStart + 1 },
    (_, index) => adjustedStart + index,
  );
}

function getTransactionsHref(filters: TransactionFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("q", filters.search);
  }

  if (filters.type !== "all") {
    params.set("type", filters.type);
  }

  if (filters.categoryId !== "all") {
    params.set("category", filters.categoryId);
  }

  if (filters.paymentMethod !== "all") {
    params.set("paymentMethod", filters.paymentMethod);
  }

  if (filters.date !== "all") {
    params.set("date", filters.date);
  }

  if (filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

function PageLink({
  children,
  disabled,
  href,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

export function TransactionPagination({
  filters,
  pagination,
}: TransactionPaginationProps) {
  if (pagination.totalItems === 0) {
    return null;
  }

  const pages = getPageNumbers(
    pagination.currentPage,
    pagination.totalPages,
  );

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing {pagination.startItem}-{pagination.endItem} of{" "}
        {pagination.totalItems}
      </p>

      <nav aria-label="Transaction pages" className="flex flex-wrap gap-2">
        <PageLink
          href={getTransactionsHref(filters, pagination.currentPage - 1)}
          disabled={pagination.currentPage <= 1}
        >
          Previous
        </PageLink>

        {pages.map((page) =>
          page === pagination.currentPage ? (
            <span
              key={page}
              aria-current="page"
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            >
              {page}
            </span>
          ) : (
            <PageLink key={page} href={getTransactionsHref(filters, page)}>
              {page}
            </PageLink>
          ),
        )}

        <PageLink
          href={getTransactionsHref(filters, pagination.currentPage + 1)}
          disabled={pagination.currentPage >= pagination.totalPages}
        >
          Next
        </PageLink>
      </nav>
    </div>
  );
}
