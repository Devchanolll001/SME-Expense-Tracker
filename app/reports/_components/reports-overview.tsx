import Link from "next/link";
import { formatDisplayDate } from "@/lib/date-ranges";
import { formatCurrency } from "@/lib/finance/currency";
import {
  REPORT_PERIODS,
  type ReportCategoryBreakdown,
  type ReportGranularity,
  type ReportsPageData,
  type ReportSummary,
  type ReportTransaction,
} from "@/lib/reports/data";
import { getTransactionTypeLabel } from "@/lib/transactions/constants";

type ReportsOverviewProps = {
  businessCurrency: string;
  reports: Extract<ReportsPageData, { status: "ok" }>["data"];
};

function toNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatPercentChange(value: number | null) {
  if (value === null) {
    return null;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function getTrendText(value: number | null, metric: string) {
  if (value === null) {
    return `${metric} percentage change is not shown because the previous period was zero.`;
  }

  if (value > 0) {
    return `${metric} increased by ${formatPercentChange(
      value,
    )} compared with the previous period.`;
  }

  if (value < 0) {
    return `${metric} decreased by ${formatPercentChange(
      value,
    )} compared with the previous period.`;
  }

  return `${metric} was unchanged compared with the previous period.`;
}

function getRangeText(
  range: ReportsOverviewProps["reports"]["range"],
  coveredRange: ReportsOverviewProps["reports"]["coveredRange"],
) {
  const start = range.start ?? coveredRange.start;
  const end = range.end ?? coveredRange.end;

  if (start && end) {
    return `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`;
  }

  return "All time";
}

function getAmountClass(tone: "income" | "expense" | "neutral") {
  if (tone === "income") {
    return "text-[#2f7d4a]";
  }

  if (tone === "expense") {
    return "text-[#660f09]";
  }

  return "text-[#2f241f]";
}

function SummaryCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "expense" | "income" | "neutral";
  value: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${getAmountClass(tone)}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function ReportFilters({
  range,
}: {
  range: ReportsOverviewProps["reports"]["range"];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Date Range</h2>
          <div
            aria-label="Report period"
            className="mt-3 flex flex-wrap gap-2"
          >
            {REPORT_PERIODS.map((period) => {
              const isActive = range.value === period.value;

              return (
                <Link
                  key={period.value}
                  href={`/reports?period=${period.value}`}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {period.label}
                </Link>
              );
            })}
          </div>
        </div>

        <form
          action="/reports"
          method="get"
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="period" value="custom" />
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Start Date
            </label>
            <input
              id="from"
              name="from"
              type="date"
              required
              defaultValue={range.fromInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              End Date
            </label>
            <input
              id="to"
              name="to"
              type="date"
              required
              defaultValue={range.toInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Apply
            </button>
            <Link
              href="/reports"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

function FinancialOverview({
  currency,
  rangeLabel,
  summary,
}: {
  currency: string;
  rangeLabel: string;
  summary: ReportSummary;
}) {
  const balance = toNumber(summary.balanceTotal);
  const balanceTone = balance < 0 ? "expense" : balance > 0 ? "income" : "neutral";

  return (
    <section>
      <h2 className="sr-only">Financial Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Income"
          value={formatCurrency(summary.incomeTotal, currency)}
          detail={rangeLabel}
          tone="income"
        />
        <SummaryCard
          label="Total Expenses"
          value={formatCurrency(summary.expenseTotal, currency)}
          detail={rangeLabel}
          tone="expense"
        />
        <SummaryCard
          label="Net Balance"
          value={formatCurrency(summary.balanceTotal, currency)}
          detail="Income minus expenses"
          tone={balanceTone}
        />
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Transactions
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {summary.transactionCount.toLocaleString("en-NG")}
          </p>
          <p className="mt-2 text-xs text-slate-500">{rangeLabel}</p>
        </article>
      </div>
    </section>
  );
}

function EmptyFinancialData({
  hasAnyTransactions,
}: {
  hasAnyTransactions: boolean;
}) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
      <h2 className="text-lg font-bold text-slate-950">
        {hasAnyTransactions
          ? "No financial data for this date range"
          : "No financial data yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {hasAnyTransactions
          ? "Choose a different date range or add a transaction for this period."
          : "Add your first transaction to start seeing reports and analytics."}
      </p>
      <Link
        href="/transactions/new"
        className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Add Transaction
      </Link>
    </section>
  );
}

function IncomeExpenseChart({
  currency,
  granularity,
  rangeLabel,
  reports,
}: {
  currency: string;
  granularity: ReportGranularity;
  rangeLabel: string;
  reports: ReportsOverviewProps["reports"];
}) {
  const maxAmount = Math.max(
    1,
    ...reports.timeSeries.flatMap((item) => [
      toNumber(item.incomeTotal),
      toNumber(item.expenseTotal),
    ]),
  );
  const hasData = reports.timeSeries.some(
    (item) => toNumber(item.incomeTotal) > 0 || toNumber(item.expenseTotal) > 0,
  );
  const label = granularity === "day" ? "Daily Summary" : "Monthly Summary";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-950">
          Income vs Expenses
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {label} | {rangeLabel}
        </p>
      </div>

      {hasData ? (
        <div
          className="mt-5 space-y-5"
          role="img"
          aria-label={`Income and expenses by ${granularity} for ${rangeLabel}`}
        >
          {reports.timeSeries.map((item) => {
            const incomeValue = toNumber(item.incomeTotal);
            const expenseValue = toNumber(item.expenseTotal);
            const incomeWidth = Math.round((incomeValue / maxAmount) * 100);
            const expenseWidth = Math.round((expenseValue / maxAmount) * 100);

            return (
              <div
                key={item.bucketStartsOn}
                className="grid gap-2 sm:grid-cols-[84px_1fr]"
              >
                <p className="text-sm font-semibold text-slate-600">
                  {item.bucketLabel}
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      Income
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-3 min-w-0 flex-1 rounded-lg bg-slate-100">
                        <div
                          className="h-3 rounded-lg bg-[#2f7d4a]"
                          style={{
                            width: `${incomeValue > 0 ? Math.max(incomeWidth, 2) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-32 shrink-0 text-right text-xs font-medium text-slate-600">
                        {formatCurrency(item.incomeTotal, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      Expense
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-3 min-w-0 flex-1 rounded-lg bg-slate-100">
                        <div
                          className="h-3 rounded-lg bg-[#660f09]"
                          style={{
                            width: `${expenseValue > 0 ? Math.max(expenseWidth, 2) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-32 shrink-0 text-right text-xs font-medium text-slate-600">
                        {formatCurrency(item.expenseTotal, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No income or expenses in this period yet.
        </p>
      )}
    </section>
  );
}

function BreakdownList({
  currency,
  emptyMessage,
  items,
  title,
  tone,
}: {
  currency: string;
  emptyMessage: string;
  items: ReportCategoryBreakdown[];
  title: string;
  tone: "expense" | "income";
}) {
  const barColor = tone === "income" ? "bg-[#2f7d4a]" : "bg-[#660f09]";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>

      {items.length > 0 ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div key={`${item.transactionType}-${item.categoryName}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 font-medium text-slate-700">
                  {item.categoryName}
                </span>
                <span className="shrink-0 text-slate-500">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-2 min-w-0 flex-1 rounded-lg bg-slate-100">
                  <div
                    className={`h-2 rounded-lg ${barColor}`}
                    style={{
                      width: `${item.percentage > 0 ? Math.max(item.percentage, 2) : 0}%`,
                    }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-xs font-medium text-slate-600">
                  {formatCurrency(item.transactionTotal, currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.transactionCount.toLocaleString("en-NG")}{" "}
                {item.transactionCount === 1 ? "transaction" : "transactions"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

function FinancialSummary({
  currency,
  reports,
}: {
  currency: string;
  reports: ReportsOverviewProps["reports"];
}) {
  const comparison = reports.comparison;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Financial Summary</h2>

      {!reports.hasAnyTransactions ? (
        <p className="mt-4 text-sm text-slate-500">
          No financial data yet. Add a transaction to calculate period insights.
        </p>
      ) : !reports.hasTransactions ? (
        <p className="mt-4 text-sm text-slate-500">
          No transactions were recorded in the selected period.
        </p>
      ) : comparison ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Current Period
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Income:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(reports.summary.incomeTotal, currency)}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Expenses:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(reports.summary.expenseTotal, currency)}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Previous Period
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Income:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    comparison.previousSummary.incomeTotal,
                    currency,
                  )}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Expenses:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    comparison.previousSummary.expenseTotal,
                    currency,
                  )}
                </span>
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-slate-600">
            <li className="text-[#2f7d4a]">
              {getTrendText(comparison.incomeChangePercent, "Income")}
            </li>
            <li className="text-[#660f09]">
              {getTrendText(comparison.expenseChangePercent, "Expenses")}
            </li>
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          No previous-period data available.
        </p>
      )}
    </section>
  );
}

function TopExpenseCategories({
  currency,
  items,
}: {
  currency: string;
  items: ReportCategoryBreakdown[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">
        Top Expense Categories
      </h2>

      {items.length > 0 ? (
        <ol className="mt-4 divide-y divide-slate-100">
          {items.map((item, index) => (
            <li
              key={item.categoryName}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="min-w-0 font-medium text-slate-700">
                {index + 1}. {item.categoryName}
              </span>
              <span className="shrink-0 font-semibold text-slate-950">
                {formatCurrency(item.transactionTotal, currency)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No expense categories to rank for this period.
        </p>
      )}
    </section>
  );
}

function LargestExpenses({
  currency,
  transactions,
}: {
  currency: string;
  transactions: ReportTransaction[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Largest Expenses</h2>

      {transactions.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {transaction.description}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDisplayDate(transaction.transactionDate)} |{" "}
                  {transaction.categoryName}
                </p>
              </div>
              <p className="font-bold text-rose-700">
                -{formatCurrency(transaction.amount, currency)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No expenses in this period yet.
        </p>
      )}
    </section>
  );
}

function TypeBadge({ type }: { type: ReportTransaction["type"] }) {
  const classes =
    type === "income"
      ? "border-[#b8d8c0] bg-[#e5f2e8] text-[#2f7d4a]"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${classes}`}
    >
      {getTransactionTypeLabel(type)}
    </span>
  );
}

function TransactionAmount({
  amount,
  currency,
  type,
}: {
  amount: string;
  currency: string;
  type: ReportTransaction["type"];
}) {
  return (
    <span
      className={
        type === "income"
          ? "font-bold text-[#2f7d4a]"
          : "font-bold text-rose-700"
      }
    >
      {type === "income" ? "+" : "-"}
      {formatCurrency(amount, currency)}
    </span>
  );
}

function TransactionSummary({
  currency,
  transactions,
}: {
  currency: string;
  transactions: ReportTransaction[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-950">
          Transaction Summary
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest transactions in the selected range.
        </p>
      </div>

      {transactions.length > 0 ? (
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
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Amount
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
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {transaction.categoryName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <TypeBadge type={transaction.type} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                      <TransactionAmount
                        amount={transaction.amount}
                        currency={currency}
                        type={transaction.type}
                      />
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
                  <div className="min-w-0">
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
                  </div>
                  <TransactionAmount
                    amount={transaction.amount}
                    currency={currency}
                    type={transaction.type}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="p-5">
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No transactions in this period yet.
          </p>
        </div>
      )}
    </section>
  );
}

export function ReportsOverview({
  businessCurrency,
  reports,
}: ReportsOverviewProps) {
  const rangeText = getRangeText(reports.range, reports.coveredRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Reports & Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {reports.range.label} | {rangeText}
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Add Transaction
        </Link>
      </div>

      <ReportFilters range={reports.range} />

      <FinancialOverview
        currency={businessCurrency}
        rangeLabel={reports.range.label}
        summary={reports.summary}
      />

      {!reports.hasTransactions && (
        <EmptyFinancialData hasAnyTransactions={reports.hasAnyTransactions} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <IncomeExpenseChart
          currency={businessCurrency}
          granularity={reports.range.granularity}
          rangeLabel={reports.range.label}
          reports={reports}
        />
        <FinancialSummary currency={businessCurrency} reports={reports} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownList
          currency={businessCurrency}
          emptyMessage="No expense categories to show for this period."
          items={reports.expenseBreakdown}
          title="Expense Breakdown"
          tone="expense"
        />
        <BreakdownList
          currency={businessCurrency}
          emptyMessage="No income categories to show for this period."
          items={reports.incomeBreakdown}
          title="Income Breakdown"
          tone="income"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TopExpenseCategories
          currency={businessCurrency}
          items={reports.topExpenseCategories}
        />
        <LargestExpenses
          currency={businessCurrency}
          transactions={reports.largestExpenses}
        />
      </div>

      <TransactionSummary
        currency={businessCurrency}
        transactions={reports.transactions}
      />
    </div>
  );
}
