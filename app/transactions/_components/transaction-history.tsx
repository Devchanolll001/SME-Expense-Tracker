import Link from "next/link";
import { formatDisplayDate } from "@/lib/date-ranges";
import { formatCurrency } from "@/lib/finance/currency";
import {
  getPaymentMethodLabel,
  getTransactionTypeLabel,
} from "@/lib/transactions/constants";
import type {
  TransactionFilters,
  TransactionListItem,
  TransactionPageData,
} from "@/lib/transactions/data";
import { TransactionPagination } from "./transaction-pagination";

type TransactionHistoryProps = {
  currency: string;
  filters: TransactionFilters;
  pagination: Extract<TransactionPageData, { status: "ok" }>["pagination"];
  transactions: TransactionListItem[];
};

function hasActiveFilters(filters: TransactionFilters) {
  return (
    Boolean(filters.search) ||
    filters.type !== "all" ||
    filters.categoryId !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.date !== "all" ||
    filters.sort !== "newest" ||
    filters.page > 1
  );
}

function TypeBadge({ type }: { type: TransactionListItem["type"] }) {
  const classes =
    type === "income"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${classes}`}
    >
      {getTransactionTypeLabel(type)}
    </span>
  );
}

function Amount({
  amount,
  currency,
  type,
}: {
  amount: string;
  currency: string;
  type: TransactionListItem["type"];
}) {
  return (
    <span
      className={
        type === "income"
          ? "font-bold text-emerald-700"
          : "font-bold text-rose-700"
      }
    >
      {type === "income" ? "+" : "-"}
      {formatCurrency(amount, currency)}
    </span>
  );
}

function EmptyTransactions({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-5 py-12 text-center">
      <h2 className="text-lg font-bold text-slate-950">
        {filtered ? "No transactions match your filters" : "No transactions yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {filtered
          ? "Try adjusting your search or clearing the filters."
          : "Start tracking your business finances by recording your first income or expense."}
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {filtered ? (
          <Link
            href="/transactions"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear Filters
          </Link>
        ) : (
          <Link
            href="/transactions/new"
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add Transaction
          </Link>
        )}
      </div>
    </div>
  );
}

export function TransactionHistory({
  currency,
  filters,
  pagination,
  transactions,
}: TransactionHistoryProps) {
  const filtered = hasActiveFilters(filters);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Transaction History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Recent records for your business.
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyTransactions filtered={filtered} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Category
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Payment
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDisplayDate(transaction.transactionDate)}
                    </td>
                    <td className="max-w-xs px-5 py-4 text-sm">
                      <p className="font-semibold text-slate-900">
                        {transaction.description}
                      </p>
                      {transaction.reference && (
                        <p className="mt-1 text-xs text-slate-500">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {transaction.categoryName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <TypeBadge type={transaction.type} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {getPaymentMethodLabel(transaction.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                      <Amount
                        amount={transaction.amount}
                        currency={currency}
                        type={transaction.type}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/transactions/${transaction.id}/edit`}
                          className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/transactions/${transaction.id}/delete`}
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
            {transactions.map((transaction) => (
              <article key={transaction.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {transaction.description}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {transaction.categoryName} |{" "}
                      {getTransactionTypeLabel(transaction.type)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDisplayDate(transaction.transactionDate)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getPaymentMethodLabel(transaction.paymentMethod)}
                    </p>
                  </div>
                  <Amount
                    amount={transaction.amount}
                    currency={currency}
                    type={transaction.type}
                  />
                </div>

                {transaction.reference && (
                  <p className="mt-3 text-xs text-slate-500">
                    Ref: {transaction.reference}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/transactions/${transaction.id}/edit`}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/transactions/${transaction.id}/delete`}
                    className="flex-1 rounded-lg border border-rose-200 px-3 py-2 text-center text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <TransactionPagination filters={filters} pagination={pagination} />
        </>
      )}
    </section>
  );
}
