import Link from "next/link";
import { formatDisplayDate } from "@/lib/date-ranges";
import { formatCurrency } from "@/lib/finance/currency";
import {
  DASHBOARD_PERIODS,
  type DashboardPageData,
  type DashboardPeriod,
} from "@/lib/dashboard/data";

type DashboardOverviewProps = {
  businessCurrency: string;
  dashboard: Extract<DashboardPageData, { status: "ok" }>["data"];
};

function toNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border border-[#e3d7ca] bg-[#fffdfa] p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function PeriodSelector({ value }: { value: DashboardPeriod }) {
  return (
    <form action="/dashboard" className="flex items-center gap-2" method="get">
      <label htmlFor="period" className="sr-only">
        Dashboard period
      </label>
      <select
        id="period"
        name="period"
        defaultValue={value}
        className="rounded-lg border border-[#dfd1c2] bg-[#fffdfa] px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        {DASHBOARD_PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-[#895129] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#6f3f20]"
      >
        Apply
      </button>
    </form>
  );
}

function IncomeExpenseChart({
  currency,
  dashboard,
}: {
  currency: string;
  dashboard: DashboardOverviewProps["dashboard"];
}) {
  const maxAmount = Math.max(
    1,
    ...dashboard.monthlySummary.flatMap((month) => [
      toNumber(month.incomeTotal),
      toNumber(month.expenseTotal),
    ]),
  );
  const hasData = dashboard.monthlySummary.some(
    (month) => toNumber(month.incomeTotal) > 0 || toNumber(month.expenseTotal) > 0,
  );

  return (
    <section className="rounded-xl border border-[#e3d7ca] bg-[#fffdfa] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Income vs Expenses
          </h2>
          <p className="mt-1 text-sm text-slate-500">{dashboard.period.label}</p>
        </div>
      </div>

      {hasData ? (
        <div
          className="mt-5 space-y-5"
          role="img"
          aria-label={`Income and expenses by month for ${dashboard.period.label}`}
        >
          {dashboard.monthlySummary.map((month) => {
            const incomeWidth = Math.round(
              (toNumber(month.incomeTotal) / maxAmount) * 100,
            );
            const expenseWidth = Math.round(
              (toNumber(month.expenseTotal) / maxAmount) * 100,
            );

            return (
              <div key={month.monthStartsOn} className="grid gap-2 sm:grid-cols-[56px_1fr]">
                <p className="text-sm font-semibold text-slate-600">
                  {month.monthLabel}
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      Income
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-lg bg-slate-100">
                        <div
                          className="h-3 rounded-lg bg-[#2f7d4a]"
                          style={{ width: `${Math.max(incomeWidth, 2)}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-xs font-medium text-slate-600">
                        {formatCurrency(month.incomeTotal, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      Expense
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-lg bg-slate-100">
                        <div
                          className="h-3 rounded-lg bg-[#660f09]"
                          style={{ width: `${Math.max(expenseWidth, 2)}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-xs font-medium text-slate-600">
                        {formatCurrency(month.expenseTotal, currency)}
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

function ExpenseBreakdown({
  currency,
  dashboard,
}: {
  currency: string;
  dashboard: DashboardOverviewProps["dashboard"];
}) {
  return (
    <section className="rounded-xl border border-[#e3d7ca] bg-[#fffdfa] p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Expense Breakdown</h2>

      {dashboard.breakdown.length > 0 ? (
        <div className="mt-5 space-y-4">
          {dashboard.breakdown.map((item) => (
            <div key={item.categoryName}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">
                  {item.categoryName}
                </span>
                <span className="text-slate-500">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-lg bg-slate-100">
                  <div
                    className="h-2 rounded-lg bg-[#8a6e29]"
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                  />
                </div>
                <span className="w-28 text-right text-xs font-medium text-slate-600">
                  {formatCurrency(item.expenseTotal, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No expense categories to show for this period.
        </p>
      )}
    </section>
  );
}

function RecentTransactions({
  currency,
  dashboard,
}: {
  currency: string;
  dashboard: DashboardOverviewProps["dashboard"];
}) {
  return (
    <section className="rounded-xl border border-[#e3d7ca] bg-[#fffdfa] shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Recent Transactions
          </h2>
          <p className="mt-1 text-sm text-slate-500">{dashboard.period.label}</p>
        </div>
        <Link
          href="/transactions"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View all
        </Link>
      </div>

      {dashboard.recentTransactions.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {dashboard.recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid gap-3 p-5 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {transaction.description}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDisplayDate(transaction.transactionDate)} |{" "}
                  {transaction.categoryName} |{" "}
                  {transaction.type === "income" ? "Income" : "Expense"}
                </p>
              </div>
              <p
                className={
                  transaction.type === "income"
                    ? "font-bold text-[#2f7d4a]"
                    : "font-bold text-[#660f09]"
                }
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatCurrency(transaction.amount, currency)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5">
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No recent transactions for this period.
          </p>
        </div>
      )}
    </section>
  );
}

export function DashboardOverview({
  businessCurrency,
  dashboard,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">
            {dashboard.period.start} to {dashboard.period.end}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector value={dashboard.period.value} />
          <Link
            href="/transactions/new"
            className="rounded-lg bg-[#895129] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f3f20]"
          >
            Add Transaction
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Income"
          value={formatCurrency(dashboard.summary.incomeTotal, businessCurrency)}
          detail={dashboard.period.label}
        />
        <SummaryCard
          label="Total Expenses"
          value={formatCurrency(
            dashboard.summary.expenseTotal,
            businessCurrency,
          )}
          detail={dashboard.period.label}
        />
        <SummaryCard
          label="Current Balance"
          value={formatCurrency(
            dashboard.summary.balanceTotal,
            businessCurrency,
          )}
          detail="Income minus expenses"
        />
        <SummaryCard
          label="Total Transactions"
          value={dashboard.summary.transactionCount.toLocaleString("en-NG")}
          detail={dashboard.period.label}
        />
      </div>

      {!dashboard.hasTransactions && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
          <h3 className="text-lg font-bold text-slate-950">
            No transactions yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Start tracking your business finances by recording your first income
            or expense.
          </p>
          <Link
            href="/transactions/new"
            className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add Transaction
          </Link>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <IncomeExpenseChart
          currency={businessCurrency}
          dashboard={dashboard}
        />
        <ExpenseBreakdown currency={businessCurrency} dashboard={dashboard} />
      </div>

      <RecentTransactions currency={businessCurrency} dashboard={dashboard} />
    </div>
  );
}
