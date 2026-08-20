import { getCurrentUserBusiness } from "@/lib/business/access";
import {
  formatDisplayDate,
  getDateRange,
  isDateFilter,
  isValidDateOnly,
} from "@/lib/date-ranges";
import {
  normalizeDecimal,
  subtractCurrencyAmounts,
} from "@/lib/finance/currency";
import { createClient } from "@/lib/supabase/server";

export const REPORT_PERIODS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all" },
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number]["value"] | "custom";
export type ReportGranularity = "day" | "month";

export type ReportSummary = {
  balanceTotal: string;
  expenseTotal: string;
  incomeTotal: string;
  transactionCount: number;
};

export type ReportRange = {
  end?: string;
  fromInput: string;
  granularity: ReportGranularity;
  label: string;
  start?: string;
  toInput: string;
  value: ReportPeriod;
};

export type ReportSeriesItem = {
  bucketLabel: string;
  bucketStartsOn: string;
  expenseTotal: string;
  incomeTotal: string;
};

export type ReportCategoryBreakdown = {
  categoryName: string;
  percentage: number;
  transactionCount: number;
  transactionTotal: string;
  transactionType: "income" | "expense";
};

export type ReportTransaction = {
  amount: string;
  categoryName: string;
  description: string;
  id: string;
  transactionDate: string;
  type: "income" | "expense";
};

export type ReportComparison = {
  expenseChangePercent: number | null;
  incomeChangePercent: number | null;
  previousRange: {
    end: string;
    label: string;
    start: string;
  };
  previousSummary: ReportSummary;
};

export type ReportsPageData =
  | {
      business: null;
      message?: string;
      status: "unauthenticated" | "needs_onboarding";
    }
  | {
      business: null;
      message: string;
      status: "duplicate_business" | "error";
    }
  | {
      business: {
        businessName: string;
        currency: string;
        id: string;
      };
      data: {
        allTimeTransactionCount: number;
        comparison: ReportComparison | null;
        coveredRange: {
          end?: string;
          start?: string;
        };
        expenseBreakdown: ReportCategoryBreakdown[];
        hasAnyTransactions: boolean;
        hasTransactions: boolean;
        incomeBreakdown: ReportCategoryBreakdown[];
        largestExpenses: ReportTransaction[];
        range: ReportRange;
        summary: ReportSummary;
        timeSeries: ReportSeriesItem[];
        topExpenseCategories: ReportCategoryBreakdown[];
        transactions: ReportTransaction[];
      };
      status: "ok";
      user: {
        displayName: string;
      };
    };

type SearchParams = Record<string, string | string[] | undefined>;

type SummaryRow = {
  expense_total: number | string | null;
  first_transaction_date: string | null;
  income_total: number | string | null;
  last_transaction_date: string | null;
  transaction_count: number | string | null;
};

type TimeSeriesRow = {
  bucket_starts_on: string;
  expense_total: number | string | null;
  income_total: number | string | null;
};

type CategoryBreakdownRow = {
  category_name: string | null;
  percentage: number | string | null;
  transaction_count: number | string | null;
  transaction_total: number | string | null;
  transaction_type: string | null;
};

type TransactionRow = {
  amount: number | string;
  categories?: { name?: string | null } | { name?: string | null }[] | null;
  category_name?: string | null;
  description: string;
  id: string;
  transaction_date: string;
  type?: string | null;
};

const DATE_ONLY_PARTS_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_DAILY_BUCKET_DAYS = 62;
const REPORT_TRANSACTION_LIMIT = 10;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

function toNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseDateOnlyParts(dateOnly: string) {
  const match = DATE_ONLY_PARTS_PATTERN.exec(dateOnly);

  if (!match) {
    return null;
  }

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  };
}

function formatDateOnly(year: number, month: number, day: number) {
  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function getUtcDayNumber(dateOnly: string) {
  const parts = parseDateOnlyParts(dateOnly);

  if (!parts) {
    return 0;
  }

  return Math.floor(
    Date.UTC(parts.year, parts.month - 1, parts.day) / MILLISECONDS_PER_DAY,
  );
}

function addDays(dateOnly: string, days: number) {
  const parts = parseDateOnlyParts(dateOnly);

  if (!parts) {
    return dateOnly;
  }

  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) +
      days * MILLISECONDS_PER_DAY,
  );

  return formatDateOnly(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function getInclusiveDaySpan(start: string, end: string) {
  return Math.max(1, getUtcDayNumber(end) - getUtcDayNumber(start) + 1);
}

function getReportGranularity(start?: string, end?: string): ReportGranularity {
  if (!start || !end) {
    return "month";
  }

  return getInclusiveDaySpan(start, end) <= MAX_DAILY_BUCKET_DAYS
    ? "day"
    : "month";
}

function getBucketLabel(bucketStartsOn: string, granularity: ReportGranularity) {
  if (!isValidDateOnly(bucketStartsOn)) {
    return bucketStartsOn;
  }

  const [year, month, day] = bucketStartsOn.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (granularity === "day") {
    return new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function getReportPeriod(searchParams: SearchParams): ReportPeriod {
  const period = getSearchParam(searchParams.period);

  if (period === "custom") {
    return period;
  }

  if (period && isDateFilter(period)) {
    return period as ReportPeriod;
  }

  return "this_month";
}

function getReportRange(searchParams: SearchParams): ReportRange {
  const period = getReportPeriod(searchParams);
  const from = getSearchParam(searchParams.from);
  const to = getSearchParam(searchParams.to);
  const validFrom = from && isValidDateOnly(from) ? from : undefined;
  const validTo = to && isValidDateOnly(to) ? to : undefined;

  if (period === "custom" && validFrom && validTo) {
    const start = validFrom <= validTo ? validFrom : validTo;
    const end = validFrom <= validTo ? validTo : validFrom;

    return {
      end,
      fromInput: start,
      granularity: getReportGranularity(start, end),
      label: `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`,
      start,
      toInput: end,
      value: "custom",
    };
  }

  const range = getDateRange(period === "custom" ? "this_month" : period);

  return {
    end: range.end,
    fromInput: range.start ?? "",
    granularity: getReportGranularity(range.start, range.end),
    label: REPORT_PERIODS.find((item) => item.value === range.value)?.label ?? range.label,
    start: range.start,
    toInput: range.end ?? "",
    value: range.value,
  };
}

function getPreviousEquivalentRange(range: ReportRange) {
  if (!range.start || !range.end) {
    return null;
  }

  const daySpan = getInclusiveDaySpan(range.start, range.end);
  const previousEnd = addDays(range.start, -1);
  const previousStart = addDays(previousEnd, -(daySpan - 1));

  return {
    end: previousEnd,
    label: `${formatDisplayDate(previousStart)} to ${formatDisplayDate(
      previousEnd,
    )}`,
    start: previousStart,
  };
}

function getPercentChange(current: string, previous: string) {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);

  if (previousValue <= 0) {
    return null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function mapSummary(row: SummaryRow | null | undefined): ReportSummary {
  const incomeTotal = normalizeDecimal(row?.income_total);
  const expenseTotal = normalizeDecimal(row?.expense_total);

  return {
    balanceTotal: subtractCurrencyAmounts(incomeTotal, expenseTotal),
    expenseTotal,
    incomeTotal,
    transactionCount: normalizeCount(row?.transaction_count),
  };
}

function getCategoryName(categories: TransactionRow["categories"]) {
  if (Array.isArray(categories)) {
    return categories[0]?.name ?? "Uncategorized";
  }

  return categories?.name ?? "Uncategorized";
}

function mapBreakdown(row: CategoryBreakdownRow): ReportCategoryBreakdown {
  return {
    categoryName: row.category_name ?? "Uncategorized",
    percentage: normalizePercentage(row.percentage),
    transactionCount: normalizeCount(row.transaction_count),
    transactionTotal: normalizeDecimal(row.transaction_total),
    transactionType: row.transaction_type === "income" ? "income" : "expense",
  };
}

function mapTransaction(row: TransactionRow): ReportTransaction {
  return {
    amount: normalizeDecimal(row.amount),
    categoryName: row.category_name ?? getCategoryName(row.categories),
    description: row.description,
    id: row.id,
    transactionDate: row.transaction_date,
    type: row.type === "income" ? "income" : "expense",
  };
}

function getDisplayName(
  user: Extract<
    Awaited<ReturnType<typeof getCurrentUserBusiness>>,
    { status: "authenticated" | "error" }
  >["user"],
) {
  return (
    [user.user_metadata?.first_name, user.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user.email ||
    "Account owner"
  );
}

export async function getReportsPageData(
  searchParams: SearchParams,
): Promise<ReportsPageData> {
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
        "More than one business is connected to this account. Resolve duplicate business records before viewing reports.",
      status: "duplicate_business",
    };
  }

  const range = getReportRange(searchParams);
  const previousRange = getPreviousEquivalentRange(range);
  const supabase = await createClient();

  const summaryQuery = supabase
    .rpc("sme_reports_summary", {
      period_ends_on: range.end ?? null,
      period_starts_on: range.start ?? null,
    })
    .single();
  const allTimeSummaryQuery =
    range.value === "all"
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .rpc("sme_reports_summary", {
            period_ends_on: null,
            period_starts_on: null,
          })
          .single();
  const previousSummaryQuery = previousRange
    ? supabase
        .rpc("sme_reports_summary", {
          period_ends_on: previousRange.end,
          period_starts_on: previousRange.start,
        })
        .single()
    : Promise.resolve({ data: null, error: null });
  const timeSeriesQuery = supabase.rpc("sme_reports_time_series", {
    period_ends_on: range.end ?? null,
    period_starts_on: range.start ?? null,
    report_bucket: range.granularity,
  });
  const expenseBreakdownQuery = supabase.rpc("sme_reports_category_breakdown", {
    period_ends_on: range.end ?? null,
    period_starts_on: range.start ?? null,
    report_transaction_type: "expense",
  });
  const incomeBreakdownQuery = supabase.rpc("sme_reports_category_breakdown", {
    period_ends_on: range.end ?? null,
    period_starts_on: range.start ?? null,
    report_transaction_type: "income",
  });
  const largestExpensesQuery = supabase.rpc("sme_reports_largest_expenses", {
    max_transactions: 5,
    period_ends_on: range.end ?? null,
    period_starts_on: range.start ?? null,
  });

  let transactionSummaryQuery = supabase
    .from("transactions")
    .select("id, type, amount, description, transaction_date, categories(name)")
    .eq("business_id", businessResult.business.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(REPORT_TRANSACTION_LIMIT);

  if (range.start) {
    transactionSummaryQuery = transactionSummaryQuery.gte(
      "transaction_date",
      range.start,
    );
  }

  if (range.end) {
    transactionSummaryQuery = transactionSummaryQuery.lte(
      "transaction_date",
      range.end,
    );
  }

  const [
    summaryResult,
    allTimeSummaryResult,
    previousSummaryResult,
    timeSeriesResult,
    expenseBreakdownResult,
    incomeBreakdownResult,
    largestExpensesResult,
    transactionSummaryResult,
  ] = await Promise.all([
    summaryQuery,
    allTimeSummaryQuery,
    previousSummaryQuery,
    timeSeriesQuery,
    expenseBreakdownQuery,
    incomeBreakdownQuery,
    largestExpensesQuery,
    transactionSummaryQuery,
  ]);

  if (
    summaryResult.error ||
    allTimeSummaryResult.error ||
    previousSummaryResult.error ||
    timeSeriesResult.error ||
    expenseBreakdownResult.error ||
    incomeBreakdownResult.error ||
    largestExpensesResult.error ||
    transactionSummaryResult.error
  ) {
    return {
      business: null,
      message: "Unable to load reports. Please try again.",
      status: "error",
    };
  }

  const summaryRow = summaryResult.data as SummaryRow | null;
  const allTimeSummaryRow =
    range.value === "all"
      ? summaryRow
      : (allTimeSummaryResult.data as SummaryRow | null);
  const previousSummaryRow = previousSummaryResult.data as SummaryRow | null;
  const summary = mapSummary(summaryRow);
  const previousSummary = mapSummary(previousSummaryRow);
  const allTimeSummary = mapSummary(allTimeSummaryRow);
  const comparison =
    previousRange && previousSummary.transactionCount > 0
      ? {
          expenseChangePercent: getPercentChange(
            summary.expenseTotal,
            previousSummary.expenseTotal,
          ),
          incomeChangePercent: getPercentChange(
            summary.incomeTotal,
            previousSummary.incomeTotal,
          ),
          previousRange,
          previousSummary,
        }
      : null;
  const expenseBreakdown = (
    (expenseBreakdownResult.data ?? []) as CategoryBreakdownRow[]
  ).map(mapBreakdown);
  const timeSeries = ((timeSeriesResult.data ?? []) as TimeSeriesRow[]).map(
    (row) => ({
      bucketLabel: getBucketLabel(row.bucket_starts_on, range.granularity),
      bucketStartsOn: row.bucket_starts_on,
      expenseTotal: normalizeDecimal(row.expense_total),
      incomeTotal: normalizeDecimal(row.income_total),
    }),
  );

  return {
    business: {
      businessName: businessResult.business.business_name,
      currency: businessResult.business.currency,
      id: businessResult.business.id,
    },
    data: {
      allTimeTransactionCount: allTimeSummary.transactionCount,
      comparison,
      coveredRange: {
        end: range.end ?? summaryRow?.last_transaction_date ?? undefined,
        start: range.start ?? summaryRow?.first_transaction_date ?? undefined,
      },
      expenseBreakdown,
      hasAnyTransactions: allTimeSummary.transactionCount > 0,
      hasTransactions: summary.transactionCount > 0,
      incomeBreakdown: (
        (incomeBreakdownResult.data ?? []) as CategoryBreakdownRow[]
      ).map(mapBreakdown),
      largestExpenses: (
        (largestExpensesResult.data ?? []) as TransactionRow[]
      ).map(mapTransaction),
      range,
      summary,
      timeSeries,
      topExpenseCategories: expenseBreakdown.slice(0, 5),
      transactions: (
        (transactionSummaryResult.data ?? []) as TransactionRow[]
      ).map(mapTransaction),
    },
    status: "ok",
    user: {
      displayName: getDisplayName(businessResult.user),
    },
  };
}
