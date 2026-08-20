import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type OwnedBusiness = {
  business_name: string;
  currency: string;
  id: string;
};

type CurrentBusinessResult =
  | {
      business: null;
      businessCount: 0;
      message?: string;
      status: "unauthenticated";
      user: null;
    }
  | {
      business: null;
      businessCount: 0;
      message: string;
      status: "error";
      user: User;
    }
  | {
      business: OwnedBusiness | null;
      businessCount: number;
      status: "authenticated";
      user: User;
    };

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getOwnedBusinessesForUser(
  supabase: ServerSupabaseClient,
  ownerId: string,
) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, business_name, currency")
    .eq("owner_id", ownerId)
    .limit(2);

  if (error) {
    return {
      businesses: [],
      error,
    };
  }

  return {
    businesses: (data ?? []) as OwnedBusiness[],
    error: null,
  };
}

export async function getCurrentUserBusiness(): Promise<CurrentBusinessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      business: null,
      businessCount: 0,
      status: "unauthenticated",
      user: null,
    };
  }

  const { businesses, error } = await getOwnedBusinessesForUser(
    supabase,
    user.id,
  );

  if (error) {
    return {
      business: null,
      businessCount: 0,
      message: "We couldn't check your business setup. Please try again.",
      status: "error",
      user,
    };
  }

  return {
    business: businesses[0] ?? null,
    businessCount: businesses.length,
    status: "authenticated",
    user,
  };
}
