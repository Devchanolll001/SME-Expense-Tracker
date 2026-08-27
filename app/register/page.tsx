import Link from "next/link";
import { AuthShell } from "@/app/auth/_components/auth-shell";
import { PasswordField } from "@/app/auth/_components/password-field";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import { register } from "./actions";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start managing your business finances smarter."
      error={params.error}
      success={params.success}
    >
      <form action={register} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  First name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  placeholder="Francis"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Last name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  placeholder="Wapching"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

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

            <PasswordField
              id="password"
              name="password"
              label="Password"
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              helperText="Use at least 8 characters."
            />

            <SubmitButton pendingText="Creating account...">
              Create account
            </SubmitButton>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign in
            </Link>
          </p>
    </AuthShell>
  );
}