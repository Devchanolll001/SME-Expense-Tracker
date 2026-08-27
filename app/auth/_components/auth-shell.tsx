type AuthShellProps = {
  children: React.ReactNode;
  error?: string;
  success?: string;
  subtitle: string;
  title: string;
};

export function AuthShell({
  children,
  error,
  success,
  subtitle,
  title,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <section className="auth-atmosphere hidden min-h-screen items-center px-10 py-12 lg:flex xl:px-20">
        <div className="auth-copy max-w-lg">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--campfire-brown)] text-2xl font-bold text-white shadow-lg shadow-[#895129]/20">
            N
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--campfire-brown)]">
            SME Expense Tracker
          </p>
          <h2 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-[#3d2a20]">
            Clarity for every business decision.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#6f5747]">
            Keep income, expenses, and the health of your business in one calm,
            dependable workspace.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border border-[#e3d7ca] bg-[#fffdfa] p-6 shadow-[0_22px_55px_rgba(89,55,30,0.12)] sm:p-9">
          <div className="mb-7 lg:hidden">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--campfire-brown)]">
              SME Expense Tracker
            </p>
          </div>
          <div className="mb-7">
            <p className="hidden text-sm font-semibold uppercase tracking-[0.08em] text-[var(--campfire-brown)] lg:block">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#2f241f]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#806f64]">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
              {success}
            </div>
          )}
          {children}
        </div>
      </section>
    </main>
  );
}
