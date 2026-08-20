import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { TransactionFilters } from "@/app/transactions/_components/transaction-filters";
import { TransactionHistory } from "@/app/transactions/_components/transaction-history";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getTransactionsPageData } from "@/lib/transactions/data";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function TransactionMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Transactions
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

function getSuccessMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const pageData = await getTransactionsPageData(params);

  if (pageData.status === "unauthenticated") {
    redirect("/login?next=%2Ftransactions");
  }

  if (pageData.status === "needs_onboarding") {
    redirect(ONBOARDING_ROUTE);
  }

  if (pageData.status !== "ok") {
    return (
      <TransactionMessage
        message={
          pageData.message ?? "Unable to load transactions. Please try again."
        }
      />
    );
  }

  const successMessage = getSuccessMessage(params.success);

  return (
    <WorkspaceShell
      active="transactions"
      businessName={pageData.business.businessName}
      userName={pageData.user.displayName}
    >
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Transactions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Business income and expenses.
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add Transaction
          </Link>
        </div>

        {successMessage && (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <TransactionFilters
          categories={pageData.categories}
          filters={pageData.filters}
        />

        <TransactionHistory
          currency={pageData.business.currency}
          filters={pageData.filters}
          pagination={pageData.pagination}
          transactions={pageData.transactions}
        />
      </div>
    </WorkspaceShell>
  );
}
