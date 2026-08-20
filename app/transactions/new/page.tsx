import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { TransactionForm } from "@/app/transactions/_components/transaction-form";
import {
  createTransaction,
  type TransactionFormState,
} from "@/app/transactions/actions";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getTodayInputDate } from "@/lib/date-ranges";
import { getTransactionFormPageData } from "@/lib/transactions/data";

const initialState: TransactionFormState = {
  fields: {
    amount: "",
    categoryId: "",
    description: "",
    notes: "",
    paymentMethod: "cash",
    reference: "",
    transactionDate: getTodayInputDate(),
    type: "expense",
  },
  status: "idle",
};

function TransactionMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Add Transaction
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

export default async function NewTransactionPage() {
  const pageData = await getTransactionFormPageData();

  if (pageData.status === "unauthenticated") {
    redirect("/login?next=%2Ftransactions%2Fnew");
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

  return (
    <WorkspaceShell
      active="transactions"
      businessName={pageData.business.businessName}
      userName={pageData.user.displayName}
    >
      <div className="space-y-6">
        <Link
          href="/transactions"
          className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Back to transactions
        </Link>
        <TransactionForm
          action={createTransaction}
          categories={pageData.categories}
          currency={pageData.business.currency}
          initialState={initialState}
          pendingText="Saving..."
          submitText="Add Transaction"
          title="Add Transaction"
        />
      </div>
    </WorkspaceShell>
  );
}
