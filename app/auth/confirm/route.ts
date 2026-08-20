import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getFriendlyAuthError } from "@/lib/auth/errors";
import { getSafeRedirectPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
    type === "recovery" ? "/reset-password" : "/dashboard",
  );

  if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

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
