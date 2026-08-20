export const AUTHENTICATED_HOME = "/dashboard";
export const ONBOARDING_ROUTE = "/onboarding";

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

export const PUBLIC_ROUTE_PREFIXES = ["/auth"] as const;

export const PROTECTED_ROUTE_PREFIXES = [
  ONBOARDING_ROUTE,
  "/dashboard",
  "/transactions",
  "/expenses",
  "/income",
  "/categories",
  "/reports",
  "/settings",
] as const;

export function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.some((route) => route === pathname) ||
    PUBLIC_ROUTE_PREFIXES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  );
}

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function getSafeRedirectPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = AUTHENTICATED_HOME,
) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://app.local");

    if (url.origin !== "https://app.local") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getPostLoginRedirect(
  value: FormDataEntryValue | string | null | undefined,
) {
  const path = getSafeRedirectPath(value);
  const pathname = new URL(path, "https://app.local").pathname;

  if (isPublicRoute(pathname)) {
    return AUTHENTICATED_HOME;
  }

  return path;
}
