function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-lg bg-slate-100 ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-600">
            Loading reports...
          </p>
          <SkeletonBlock className="mt-4 h-8 w-64" />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SkeletonBlock className="h-6 w-40" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SkeletonBlock className="h-6 w-48" />
            <div className="mt-6 space-y-4">
              <SkeletonBlock className="h-8" />
              <SkeletonBlock className="h-8" />
              <SkeletonBlock className="h-8" />
              <SkeletonBlock className="h-8" />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SkeletonBlock className="h-6 w-40" />
            <div className="mt-6 space-y-4">
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SkeletonBlock className="h-6 w-48" />
          <div className="mt-5 space-y-3">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        </div>
      </div>
    </main>
  );
}
