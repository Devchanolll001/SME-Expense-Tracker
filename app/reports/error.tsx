"use client";

import { useEffect } from "react";

export default function ReportsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Reports & Analytics
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load reports. Please try again.
        </div>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
