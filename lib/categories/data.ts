import {
  isCategoryFilter,
  isCategoryType,
  type CategoryFilter,
  type CategoryType,
} from "@/lib/categories/constants";
import { getCurrentUserBusiness } from "@/lib/business/access";
import { createClient } from "@/lib/supabase/server";

export type CategoryListItem = {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  transactionCount: number;
  type: CategoryType;
};

export type CategoryFilters = {
  search: string;
  type: CategoryFilter;
};

export type CategoryFormPageData =
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
      status: "ok";
      user: {
        displayName: string;
      };
    };

export type CategoryPageData =
  | Exclude<CategoryFormPageData, { status: "ok" }>
  | {
      business: {
        businessName: string;
        currency: string;
        id: string;
      };
      categories: CategoryListItem[];
      filters: CategoryFilters;
      status: "ok";
      user: {
        displayName: string;
      };
    };

export type CategoryRecordPageData =
  | Exclude<CategoryFormPageData, { status: "ok" }>
  | {
      business: {
        businessName: string;
        currency: string;
        id: string;
      };
      category: CategoryListItem | null;
      status: "ok";
      user: {
        displayName: string;
      };
    };

type SearchParams = Record<string, string | string[] | undefined>;

type CategoryRow = {
  created_at: string | null;
  description: string | null;
  id: string;
  name: string;
  transactions?:
    | { count?: number | string | null }
    | { count?: number | string | null }[]
    | null;
  type: string;
};

const CATEGORY_SELECT =
  "id, name, type, description, created_at, transactions(count)";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function isValidUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeCount(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  return Number(value ?? 0);
}

function getTransactionCount(transactions: CategoryRow["transactions"]) {
  if (Array.isArray(transactions)) {
    return normalizeCount(transactions[0]?.count);
  }

  return normalizeCount(transactions?.count);
}

function parseCategoryFilters(searchParams: SearchParams): CategoryFilters {
  const type = getSearchParam(searchParams.type) ?? "all";

  return {
    search: normalizeSearch(getSearchParam(searchParams.q)),
    type: isCategoryFilter(type) ? type : "all",
  };
}

function mapCategory(row: CategoryRow): CategoryListItem {
  return {
    createdAt: row.created_at ?? "",
    description: row.description,
    id: row.id,
    name: row.name,
    transactionCount: getTransactionCount(row.transactions),
    type: isCategoryType(row.type) ? row.type : "expense",
  };
}

async function getCategoryBusinessContext(): Promise<CategoryFormPageData> {
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
        "More than one business is connected to this account. Resolve duplicate business records before managing categories.",
      status: "duplicate_business",
    };
  }

  return {
    business: {
      businessName: result.business.business_name,
      currency: result.business.currency,
      id: result.business.id,
    },
    status: "ok",
    user: {
      displayName: getDisplayName(result.user),
    },
  };
}

export async function getCategoryFormPageData() {
  return getCategoryBusinessContext();
}

export async function getCategoriesPageData(
  searchParams: SearchParams,
): Promise<CategoryPageData> {
  const context = await getCategoryBusinessContext();

  if (context.status !== "ok") {
    return context;
  }

  const filters = parseCategoryFilters(searchParams);
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("business_id", context.business.id);

  if (filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data, error } = await query
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return {
      business: null,
      message: "Unable to load categories. Please try again.",
      status: "error",
    };
  }

  return {
    ...context,
    categories: ((data ?? []) as CategoryRow[]).map(mapCategory),
    filters,
  };
}

export async function getCategoryRecordPageData(
  categoryId: string,
): Promise<CategoryRecordPageData> {
  const context = await getCategoryBusinessContext();

  if (context.status !== "ok") {
    return context;
  }

  if (!isValidUuid(categoryId)) {
    return {
      ...context,
      category: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("business_id", context.business.id)
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    return {
      business: null,
      message: "Unable to load this category. Please try again.",
      status: "error",
    };
  }

  return {
    ...context,
    category: data ? mapCategory(data as CategoryRow) : null,
  };
}
