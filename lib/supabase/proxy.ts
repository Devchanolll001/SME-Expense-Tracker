import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath, isProtectedRoute } from "@/lib/auth/routes";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;
  const isAuthenticated = Boolean(data?.claims?.sub) && !error;

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    const next = `${pathname}${request.nextUrl.search}`;

    url.pathname = "/login";
    url.searchParams.set("next", getSafeRedirectPath(next));

    return NextResponse.redirect(url);
  }

  return response;
}
