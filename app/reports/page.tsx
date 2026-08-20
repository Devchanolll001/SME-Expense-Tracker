import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { ReportsOverview } from "@/app/reports/_components/reports-overview";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getReportsPageData } from "@/lib/reports/data";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function ReportsMessage({ message }: { message: string }) {
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
          {message}
        </div>
      </div>
    </main>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const reports = await getReportsPageData(await searchParams);

  if (reports.status === "unauthenticated") {
    redirect("/login?next=%2Freports");
  }

  if (reports.status === "needs_onboarding") {
    redirect(ONBOARDING_ROUTE);
  }

  if (reports.status !== "ok") {
    return (
      <ReportsMessage
        message={reports.message ?? "Unable to load reports. Please try again."}
      />
    );
  }

  return (
    <WorkspaceShell
      active="reports"
      businessName={reports.business.businessName}
      userName={reports.user.displayName}
    >
      <ReportsOverview
        businessCurrency={reports.business.currency}
        reports={reports.data}
      />
    </WorkspaceShell>
  );
}
