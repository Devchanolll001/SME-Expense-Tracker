import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { DeleteTransactionForm } from "@/app/transactions/_components/delete-transaction-form";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { formatDisplayDate } from "@/lib/date-ranges";
import { formatCurrency } from "@/lib/finance/currency";
import {
  getPaymentMethodLabel,
  getTransactionTypeLabel,
} from "@/lib/transactions/constants";
import { getTransactionRecordPageData } from "@/lib/transactions/data";

type DeleteTransactionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function TransactionMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Delete Transaction
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

export default async function DeleteTransactionPage({
  params,
}: DeleteTransactionPageProps) {
  const { id } = await params;
  const pageData = await getTransactionRecordPageData(id);

  if (pageData.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/transactions/${id}/delete`)}`);
  }

  if (pageData.status === "needs_onboarding") {
    redirect(ONBOARDING_ROUTE);
  }

  if (pageData.status !== "ok") {
    return (
      <TransactionMessage
        message={
          pageData.message ??
          "Unable to load this transaction. Please try again."
        }
      />
    );
  }

  if (!pageData.transaction) {
    return <TransactionMessage message="Transaction not found." />;
  }

  const transaction = pageData.transaction;

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

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase text-rose-600">
              Delete Transaction
            </p>
            <h2 className="mt-2 wrap-break-word text-xl font-bold text-slate-950">
              {transaction.description}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {getTransactionTypeLabel(transaction.type)} recorded on{" "}
              {formatDisplayDate(transaction.transactionDate)}
            </p>
          </div>

          <dl className="mt-6 grid gap-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-rose-900">Amount</dt>
              <dd className="mt-1 font-bold text-rose-900">
                {formatCurrency(transaction.amount, pageData.business.currency)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-rose-900">Category</dt>
              <dd className="mt-1 text-rose-800">
                {transaction.categoryName}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-rose-900">Payment</dt>
              <dd className="mt-1 text-rose-800">
                {getPaymentMethodLabel(transaction.paymentMethod)}
              </dd>
            </div>
            {transaction.reference && (
              <div>
                <dt className="font-medium text-rose-900">Reference</dt>
                <dd className="mt-1 wrap-break-word text-rose-800">
                  {transaction.reference}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This will permanently delete the financial record from your
            transaction history and dashboard totals.
          </p>

          <DeleteTransactionForm transactionId={transaction.id} />
        </section>
      </div>
    </WorkspaceShell>
  );
}
