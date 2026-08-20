import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { DashboardOverview } from "@/app/dashboard/_components/dashboard-overview";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getDashboardPageData } from "@/lib/dashboard/data";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function DashboardMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const dashboard = await getDashboardPageData(await searchParams);

  if (dashboard.status === "unauthenticated") {
    redirect(
      "/login?error=Your%20session%20has%20expired.%20Please%20sign%20in%20again.",
    );
  }

  if (dashboard.status === "needs_onboarding") {
    redirect(ONBOARDING_ROUTE);
  }

  if (dashboard.status !== "ok") {
    return (
      <DashboardMessage
        message={
          dashboard.message ?? "Unable to load your dashboard. Please try again."
        }
      />
    );
  }

  return (
    <WorkspaceShell
      active="dashboard"
      businessName={dashboard.business.businessName}
      userName={dashboard.user.displayName}
    >
      <DashboardOverview
        businessCurrency={dashboard.business.currency}
        dashboard={dashboard.data}
      />
    </WorkspaceShell>
  );
}
