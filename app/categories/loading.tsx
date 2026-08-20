export default function CategoriesLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-600">
            Loading categories...
          </p>
          <div className="mt-4 h-8 w-48 rounded-lg bg-slate-100" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-16 rounded-lg bg-slate-100" />
            <div className="h-9 w-20 rounded-lg bg-slate-100" />
            <div className="h-9 w-24 rounded-lg bg-slate-100" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-36 rounded bg-slate-100" />
          <div className="mt-5 space-y-3">
            <div className="h-14 rounded-lg bg-slate-100" />
            <div className="h-14 rounded-lg bg-slate-100" />
            <div className="h-14 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
