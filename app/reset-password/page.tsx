import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPassword } from "@/app/auth/actions";
import { AuthShell } from "@/app/auth/_components/auth-shell";
import { PasswordField } from "@/app/auth/_components/password-field";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    sb_flow_id?: string;
    success?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  if (params.code) {
    const callbackParams = new URLSearchParams({
      code: params.code,
      next: "/reset-password",
    });

    if (params.sb_flow_id) {
      callbackParams.set("sb_flow_id", params.sb_flow_id);
    }

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  if (params.token_hash && params.type) {
    const confirmParams = new URLSearchParams({
      next: "/reset-password",
      token_hash: params.token_hash,
      type: params.type,
    });

    redirect(`/auth/confirm?${confirmParams.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canResetPassword = Boolean(user);

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a secure password for your account."
      error={
        params.error ??
        (!canResetPassword
          ? "This password reset link is invalid or has expired. Please request a new link."
          : undefined)
      }
      success={params.success}
    >
      {canResetPassword ? (
        <form action={resetPassword} className="space-y-5">
          <PasswordField
            id="password"
            name="password"
            label="New password"
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            helperText={`Use at least ${MIN_PASSWORD_LENGTH} characters.`}
          />

          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            placeholder="Repeat your new password"
          />

          <SubmitButton pendingText="Updating password...">
            Update password
          </SubmitButton>
        </form>
      ) : (
        <div className="space-y-4">
          <Link
            href="/forgot-password"
            className="block w-full rounded-lg bg-emerald-600 px-4 py-3.5 text-center font-semibold text-white transition hover:bg-emerald-700"
          >
            Request a new reset link
          </Link>

          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
