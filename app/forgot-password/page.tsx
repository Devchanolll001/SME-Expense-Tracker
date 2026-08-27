import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthShell } from "@/app/auth/_components/auth-shell";
import { SubmitButton } from "@/app/auth/_components/submit-button";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send recovery instructions."
      error={params.error}
      success={params.success}
    >
      <form action={requestPasswordReset} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <SubmitButton pendingText="Sending reset link...">
          Send reset link
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
