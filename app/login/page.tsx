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
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 transition duration-150 ease-out focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
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
