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
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-lg bg-white p-8 shadow-2xl">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-xl font-bold text-white">
              N
            </div>

            <p className="text-sm font-semibold text-emerald-600">
              SME Expense Tracker
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>

            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          {error && (
            <div
              className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              role="status"
            >
              {success}
            </div>
          )}

          {children}
        </div>
      </div>
    </main>
  );
}
