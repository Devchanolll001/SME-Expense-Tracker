import Link from "next/link";
import { login } from "@/app/auth/actions";
import { AuthShell } from "@/app/auth/_components/auth-shell";
import { PasswordField } from "@/app/auth/_components/password-field";
import { SubmitButton } from "@/app/auth/_components/submit-button";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    success?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your business finance workspace."
      error={params.error}
      success={params.success}
    >
      <form action={login} className="space-y-5">
        <input type="hidden" name="next" value={params.next ?? ""} />

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
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
        />

        <SubmitButton pendingText="Signing in...">Sign in</SubmitButton>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-500">
        <Link
          href="/forgot-password"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Forgot password?
        </Link>

        <p>
          New here?{" "}
          <Link
            href="/register"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
