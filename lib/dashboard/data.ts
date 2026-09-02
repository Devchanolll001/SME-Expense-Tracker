import { getCurrentUserBusiness } from "@/lib/business/access";
import { getDateRange, isDateFilter, type DateFilter } from "@/lib/date-ranges";
import {
  normalizeDecimal,
  subtractCurrencyAmounts,
} from "@/lib/finance/currency";
import { createClient } from "@/lib/supabase/server";

export type DashboardPeriod = Exclude<DateFilter, "all">;

export const DASHBOARD_PERIODS = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This year", value: "this_year" },
] as const;

export type DashboardSummary = {
  balanceTotal: string;
  expenseTotal: string;
  incomeTotal: string;
  transactionCount: number;
};

export type DashboardMonthlySummary = {
  expenseTotal: string;
  incomeTotal: string;
  monthLabel: string;
  monthStartsOn: string;
};

export type DashboardExpenseBreakdown = {
  categoryName: string;
  expenseTotal: string;
  percentage: number;
};

export type DashboardRecentTransaction = {
  amount: string;
  categoryName: string;
  description: string;
  id: string;
  transactionDate: string;
  type: "income" | "expense";
};

export type DashboardPageData =
  | {
      business: null;
      message?: string;
      status: "unauthenticated" | "needs_onboarding";
    }
  | {
      business: null;
      message: string;
      status: "error" | "duplicate_business";
    }
  | {
      business: {
        businessName: string;
        currency: string;
        id: string;
      };
      data: {
        breakdown: DashboardExpenseBreakdown[];
        hasTransactions: boolean;
        monthlySummary: DashboardMonthlySummary[];
        period: {
          end: string;
          label: string;
          start: string;
          value: DashboardPeriod;
        };
        recentTransactions: DashboardRecentTransaction[];
        summary: DashboardSummary;
      };
      status: "ok";
      user: {
        displayName: string;
      };
    };

type SearchParams = Record<string, string | string[] | undefined>;

type SummaryRow = {
  expense_total: number | string | null;
  income_total: number | string | null;
  transaction_count: number | string | null;
};

type MonthlySummaryRow = {
  expense_total: number | string | null;
  income_total: number | string | null;
  month_starts_on: string;
};

type ExpenseBreakdownRow = {
  category_name: string | null;
  expense_total: number | string | null;
  percentage: number | string | null;
};

type RecentTransactionRow = {
  amount: number | string;
  categories?: { name?: string | null } | { name?: string | null }[] | null;
  description: string;
  id: string;
  transaction_date: string;
  type: string;
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCount(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  return Number(value ?? 0);
}

function normalizePercentage(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function getCategoryName(
  categories: RecentTransactionRow["categories"],
): string {
  if (Array.isArray(categories)) {
    return categories[0]?.name ?? "Uncategorized";
  }

  return categories?.name ?? "Uncategorized";
}

function getMonthLabel(monthStartsOn: string) {
  const [year, month] = monthStartsOn.split("-").map(Number);

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getDashboardPeriod(searchParams: SearchParams) {
  const period = getSearchParam(searchParams.period);

  if (period && isDateFilter(period) && period !== "all") {
    return period;
  }

  return "this_month";
}

export async function getDashboardPageData(
  searchParams: SearchParams,
): Promise<DashboardPageData> {
  const businessResult = await getCurrentUserBusiness();

  if (businessResult.status === "unauthenticated") {
    return {
      business: null,
      status: "unauthenticated",
    };
  }

  if (businessResult.status === "error") {
    return {
      business: null,
      message: businessResult.message,
      status: "error",
    };
  }

  if (!businessResult.business) {
    return {
      business: null,
      status: "needs_onboarding",
    };
  }

  if (businessResult.businessCount > 1) {
    return {
      business: null,
      message:
        "More than one business is connected to this account. Resolve duplicate business records before continuing.",
      status: "duplicate_business",
    };
  }

  const period = getDashboardPeriod(searchParams);
  const range = getDateRange(period);

  if (!range.start || !range.end) {
    return {
      business: null,
      message: "Unable to resolve the dashboard period.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const summaryQuery = supabase
    .rpc("sme_dashboard_summary", {
      period_ends_on: range.end,
      period_starts_on: range.start,
    })
    .single();
  const allTimeSummaryQuery = supabase
    .rpc("sme_reports_summary", {
      period_ends_on: null,
      period_starts_on: null,
    })
    .single();
  const monthlySummaryQuery = supabase.rpc("sme_dashboard_monthly_summary", {
    period_ends_on: range.end,
    period_starts_on: range.start,
  });
  const breakdownQuery = supabase.rpc("sme_dashboard_expense_breakdown", {
    max_categories: 5,
    period_ends_on: range.end,
    period_starts_on: range.start,
  });
  const recentTransactionsQuery = supabase
    .from("transactions")
    .select(
      "id, type, amount, description, transaction_date, categories(name)",
    )
    .eq("business_id", businessResult.business.id)
    .gte("transaction_date", range.start)
    .lte("transaction_date", range.end)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const [
    summaryResult,
    allTimeSummaryResult,
    monthlySummaryResult,
    breakdownResult,
    recentTransactionsResult,
  ] = await Promise.all([
    summaryQuery,
    allTimeSummaryQuery,
    monthlySummaryQuery,
    breakdownQuery,
    recentTransactionsQuery,
  ]);

  if (
    summaryResult.error ||
    allTimeSummaryResult.error ||
    monthlySummaryResult.error ||
    breakdownResult.error ||
    recentTransactionsResult.error
  ) {
    return {
      business: null,
      message: "Unable to load your dashboard. Please try again.",
      status: "error",
    };
  }

  const summaryRow = summaryResult.data as SummaryRow | null;
  const allTimeSummaryRow = allTimeSummaryResult.data as SummaryRow | null;
  const incomeTotal = normalizeDecimal(summaryRow?.income_total);
  const expenseTotal = normalizeDecimal(summaryRow?.expense_total);
  const allTimeIncomeTotal = normalizeDecimal(allTimeSummaryRow?.income_total);
  const allTimeExpenseTotal = normalizeDecimal(allTimeSummaryRow?.expense_total);
  const recentTransactions = (recentTransactionsResult.data ??
    []) as RecentTransactionRow[];

  const displayName =
    [
      businessResult.user.user_metadata?.first_name,
      businessResult.user.user_metadata?.last_name,
    ]
      .filter(Boolean)
      .join(" ") || businessResult.user.email || "Account owner";

  return {
    business: {
      businessName: businessResult.business.business_name,
      currency: businessResult.business.currency,
      id: businessResult.business.id,
    },
    data: {
      breakdown: ((breakdownResult.data ?? []) as ExpenseBreakdownRow[]).map(
        (row) => ({
          categoryName: row.category_name ?? "Uncategorized",
          expenseTotal: normalizeDecimal(row.expense_total),
          percentage: normalizePercentage(row.percentage),
        }),
      ),
      hasTransactions: normalizeCount(allTimeSummaryRow?.transaction_count) > 0,
      monthlySummary: (
        (monthlySummaryResult.data ?? []) as MonthlySummaryRow[]
      ).map((row) => ({
        expenseTotal: normalizeDecimal(row.expense_total),
        incomeTotal: normalizeDecimal(row.income_total),
        monthLabel: getMonthLabel(row.month_starts_on),
        monthStartsOn: row.month_starts_on,
      })),
      period: {
        end: range.end,
        label: range.label,
        start: range.start,
        value: range.value as DashboardPeriod,
      },
      recentTransactions: recentTransactions.map((transaction) => ({
        amount: normalizeDecimal(transaction.amount),
        categoryName: getCategoryName(transaction.categories),
        description: transaction.description,
        id: transaction.id,
        transactionDate: transaction.transaction_date,
        type: transaction.type === "income" ? "income" : "expense",
      })),
      summary: {
        balanceTotal: subtractCurrencyAmounts(
          allTimeIncomeTotal,
          allTimeExpenseTotal,
        ),
        expenseTotal,
        incomeTotal,
        transactionCount: normalizeCount(summaryRow?.transaction_count),
      },
    },
    status: "ok",
    user: {
      displayName,
    },
  };
}
