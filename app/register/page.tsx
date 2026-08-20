import Link from "next/link";
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
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
              ₦
            </div>

            <p className="text-sm font-semibold text-emerald-600">
              SME Expense Tracker
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Start managing your business finances smarter.
            </p>
          </div>

          {params.error && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          {params.success && (
            <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {params.success}
            </div>
          )}

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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Use at least 8 characters.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}