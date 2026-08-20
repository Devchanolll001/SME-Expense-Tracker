"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import {
  deleteTransaction,
  type DeleteTransactionState,
} from "@/app/transactions/actions";

type DeleteTransactionFormProps = {
  transactionId: string;
};

const initialState: DeleteTransactionState = {
  status: "idle",
};

export function DeleteTransactionForm({
  transactionId,
}: DeleteTransactionFormProps) {
  const deleteAction = deleteTransaction.bind(null, transactionId);
  const [state, formAction] = useActionState(deleteAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.message && (
        <div
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/transactions"
          className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
        <div className="sm:w-44">
          <SubmitButton pendingText="Deleting..." variant="destructive">
            Delete
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
