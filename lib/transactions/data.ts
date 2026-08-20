import { getCurrentUserBusiness } from "@/lib/business/access";
import { isCategoryType, type CategoryType } from "@/lib/categories/constants";
import {
  DATE_FILTERS,
  getDateRange,
  isDateFilter,
  type DateFilter,
} from "@/lib/date-ranges";
import { createClient } from "@/lib/supabase/server";
import { normalizeDecimal } from "@/lib/finance/currency";
import {
  isPaymentMethod,
  isTransactionSort,
  isTransactionType,
  TRANSACTIONS_PAGE_SIZE,
  type PaymentMethod,
  type TransactionSort,
  type TransactionType,
} from "@/lib/transactions/constants";
import { isValidUuid } from "@/lib/transactions/validation";

export type TransactionCategory = {
  id: string;
  name: string;
  type: CategoryType;
};

export type TransactionListItem = {
  amount: string;
  categoryId: string | null;
  categoryName: string;
  description: string;
  id: string;
  notes: string | null;
  paymentMethod: PaymentMethod;
  reference: string | null;
  transactionDate: string;
  type: TransactionType;
};

export type TransactionFilters = {
  categoryId: string;
  date: DateFilter;
  page: number;
  paymentMethod: PaymentMethod | "all";
  search: string;
  sort: TransactionSort;
  type: TransactionType | "all";
};

export type TransactionPageData =
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
      categories: TransactionCategory[];
      filters: TransactionFilters;
      pagination: {
        currentPage: number;
        endItem: number;
        pageSize: number;
        startItem: number;
        totalItems: number;
        totalPages: number;
      };
      status: "ok";
      transactions: TransactionListItem[];
      user: {
        displayName: string;
      };
    };

export type TransactionFormPageData =
  | Exclude<TransactionPageData, { status: "ok" }>
  | {
      business: {
        businessName: string;
        currency: string;
        id: string;
      };
      categories: TransactionCategory[];
      status: "ok";
      user: {
        displayName: string;
      };
    };

export type EditableTransaction =
  TransactionListItem & {
    createdAt: string;
  };

export type TransactionRecordPageData =
  | Exclude<TransactionFormPageData, { status: "ok" }>
  | {
      business: {
        businessName: string;
        currency: string;
        id: string;
      };
      categories: TransactionCategory[];
      status: "ok";
      transaction: EditableTransaction | null;
      user: {
        displayName: string;
      };
    };

type SearchParams = Record<string, string | string[] | undefined>;

type CategoryRow = {
  id: string;
  name: string;
  type: string;
};

type TransactionRow = {
  amount: number | string;
  categories?:
    | {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      }
    | {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      }[]
    | null;
  category_id: string | null;
  created_at?: string;
  description: string;
  id: string;
  notes: string | null;
  payment_method: string;
  reference: string | null;
  transaction_date: string;
  type: string;
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(value: string | undefined) {
  return (
    value
      ?.trim()
      .slice(0, 80)
      .replace(/[%_,()]/g, " ")
      .replace(/\s+/g, " ") ?? ""
  );
}

function normalizePage(value: string | undefined) {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, 9999);
}

function parseTransactionFilters(
  searchParams: SearchParams,
): TransactionFilters {
  const type = getSearchParam(searchParams.type) ?? "all";
  const paymentMethod = getSearchParam(searchParams.paymentMethod) ?? "all";
  const date = getSearchParam(searchParams.date) ?? "all";
  const sort = getSearchParam(searchParams.sort) ?? "newest";
  const categoryId = getSearchParam(searchParams.category) ?? "all";

  return {
    categoryId: isValidUuid(categoryId) ? categoryId : "all",
    date: isDateFilter(date) ? date : "all",
    page: normalizePage(getSearchParam(searchParams.page)),
    paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : "all",
    search: normalizeSearch(getSearchParam(searchParams.q)),
    sort: isTransactionSort(sort) ? sort : "newest",
    type: isTransactionType(type) ? type : "all",
  };
}

function mapCategory(row: CategoryRow): TransactionCategory {
  return {
    id: row.id,
    name: row.name,
    type: isCategoryType(row.type) ? row.type : "expense",
  };
}

function getCategory(
  categories: TransactionRow["categories"],
): { id: string | null; name: string; type: string | null } {
  if (Array.isArray(categories)) {
    return {
      id: categories[0]?.id ?? null,
      name: categories[0]?.name ?? "Uncategorized",
      type: categories[0]?.type ?? null,
    };
  }

  return {
    id: categories?.id ?? null,
    name: categories?.name ?? "Uncategorized",
    type: categories?.type ?? null,
  };
}

function mapTransaction(row: TransactionRow): TransactionListItem {
  const category = getCategory(row.categories);

  return {
    amount: normalizeDecimal(row.amount),
    categoryId: row.category_id ?? category.id,
    categoryName: category.name,
    description: row.description,
    id: row.id,
    notes: row.notes,
    paymentMethod: isPaymentMethod(row.payment_method)
      ? row.payment_method
      : "other",
    reference: row.reference,
    transactionDate: row.transaction_date,
    type: row.type === "income" ? "income" : "expense",
  };
}

async function getBusinessPageContext(): Promise<TransactionFormPageData> {
  const result = await getCurrentUserBusiness();

  if (result.status === "unauthenticated") {
    return {
      business: null,
      status: "unauthenticated",
    };
  }

  if (result.status === "error") {
    return {
      business: null,
      message: result.message,
      status: "error",
    };
  }

  if (!result.business) {
    return {
      business: null,
      status: "needs_onboarding",
    };
  }

  if (result.businessCount > 1) {
    return {
      business: null,
      message:
        "More than one business is connected to this account. Resolve duplicate business records before managing transactions.",
      status: "duplicate_business",
    };
  }

  const supabase = await createClient();
  const { data: categoryData, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("business_id", result.business.id)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (categoryError) {
    return {
      business: null,
      message: "Unable to load transaction categories. Please try again.",
      status: "error",
    };
  }

  const displayName =
    [
      result.user.user_metadata?.first_name,
      result.user.user_metadata?.last_name,
    ]
      .filter(Boolean)
      .join(" ") || result.user.email || "Account owner";

  return {
    business: {
      businessName: result.business.business_name,
      currency: result.business.currency,
      id: result.business.id,
    },
    categories: ((categoryData ?? []) as CategoryRow[]).map(mapCategory),
    status: "ok",
    user: {
      displayName,
    },
  };
}

export async function getTransactionFormPageData() {
  return getBusinessPageContext();
}

export async function getTransactionsPageData(
  searchParams: SearchParams,
): Promise<TransactionPageData> {
  const context = await getBusinessPageContext();

  if (context.status !== "ok") {
    return context;
  }

  const business = context.business;
  const user = context.user;
  const filters = parseTransactionFilters(searchParams);
  const categoryIsOwned =
    filters.categoryId === "all" ||
    context.categories.some((category) => category.id === filters.categoryId);
  const safeFilters = {
    ...filters,
    categoryId: categoryIsOwned ? filters.categoryId : "all",
    page: filters.page,
  };
  const dateRange = getDateRange(safeFilters.date);
  const supabase = await createClient();

  async function fetchTransactionsPage(page: number) {
    const from = (page - 1) * TRANSACTIONS_PAGE_SIZE;
    const to = from + TRANSACTIONS_PAGE_SIZE - 1;
    let query = supabase
      .from("transactions")
      .select(
        "id, category_id, type, amount, description, transaction_date, payment_method, reference, notes, categories(id, name, type)",
        { count: "exact" },
      )
      .eq("business_id", business.id);

    if (safeFilters.type !== "all") {
      query = query.eq("type", safeFilters.type);
    }

    if (safeFilters.categoryId !== "all") {
      query = query.eq("category_id", safeFilters.categoryId);
    }

    if (safeFilters.paymentMethod !== "all") {
      query = query.eq("payment_method", safeFilters.paymentMethod);
    }

    if (dateRange.start) {
      query = query.gte("transaction_date", dateRange.start);
    }

    if (dateRange.end) {
      query = query.lte("transaction_date", dateRange.end);
    }

    if (safeFilters.search) {
      query = query.or(
        `description.ilike.%${safeFilters.search}%,reference.ilike.%${safeFilters.search}%`,
      );
    }

    if (safeFilters.sort === "oldest") {
      query = query
        .order("transaction_date", { ascending: true })
        .order("created_at", { ascending: true });
    } else if (safeFilters.sort === "highest_amount") {
      query = query
        .order("amount", { ascending: false })
        .order("transaction_date", { ascending: false });
    } else if (safeFilters.sort === "lowest_amount") {
      query = query
        .order("amount", { ascending: true })
        .order("transaction_date", { ascending: false });
    } else {
      query = query
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
    }

    return query.range(from, to);
  }

  const { data, error, count } = await fetchTransactionsPage(safeFilters.page);

  if (error) {
    return {
      business: null,
      message: "Unable to load transactions. Please try again.",
      status: "error",
    };
  }

  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / TRANSACTIONS_PAGE_SIZE));
  const currentPage = Math.min(safeFilters.page, totalPages);
  let transactionRows = (data ?? []) as TransactionRow[];

  if (currentPage !== safeFilters.page) {
    const pageResult = await fetchTransactionsPage(currentPage);

    if (pageResult.error) {
      return {
        business: null,
        message: "Unable to load transactions. Please try again.",
        status: "error",
      };
    }

    transactionRows = (pageResult.data ?? []) as TransactionRow[];
  }

  const transactions = transactionRows.map(mapTransaction);
  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * TRANSACTIONS_PAGE_SIZE + 1;
  const endItem =
    totalItems === 0
      ? 0
      : Math.min(startItem + transactions.length - 1, totalItems);

  return {
    business,
    categories: context.categories,
    filters: {
      ...safeFilters,
      page: currentPage,
    },
    pagination: {
      currentPage,
      endItem,
      pageSize: TRANSACTIONS_PAGE_SIZE,
      startItem,
      totalItems,
      totalPages,
    },
    status: "ok",
    transactions,
    user: {
      displayName: user.displayName,
    },
  };
}

export async function getTransactionRecordPageData(
  transactionId: string,
): Promise<TransactionRecordPageData> {
  const context = await getBusinessPageContext();

  if (context.status !== "ok") {
    return context;
  }

  if (!isValidUuid(transactionId)) {
    return {
      ...context,
      transaction: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, category_id, type, amount, description, transaction_date, payment_method, reference, notes, created_at, categories(id, name, type)",
    )
    .eq("business_id", context.business.id)
    .eq("id", transactionId)
    .maybeSingle();

  if (error) {
    return {
      business: null,
      message: "Unable to load this transaction. Please try again.",
      status: "error",
    };
  }

  const row = data as TransactionRow | null;

  return {
    ...context,
    transaction: row
      ? {
          ...mapTransaction(row),
          createdAt: row.created_at ?? "",
        }
      : null,
  };
}

export { DATE_FILTERS };
