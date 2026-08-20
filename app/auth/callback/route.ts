import { NextResponse, type NextRequest } from "next/server";
import { getFriendlyAuthError } from "@/lib/auth/errors";
import { getSafeRedirectPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    const message = getFriendlyAuthError(error, "callback");
    return NextResponse.redirect(
      new URL(
        `/reset-password?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }

  const message = getFriendlyAuthError(null, "callback");
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
  );
}
