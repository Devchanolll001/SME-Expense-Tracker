"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import {
  deleteCategory,
  type DeleteCategoryState,
} from "@/app/categories/actions";

type DeleteCategoryFormProps = {
  categoryId: string;
};

const initialState: DeleteCategoryState = {
  status: "idle",
};

export function DeleteCategoryForm({ categoryId }: DeleteCategoryFormProps) {
  const deleteAction = deleteCategory.bind(null, categoryId);
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
          href="/categories"
          className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
        <div className="sm:w-48">
          <SubmitButton pendingText="Deleting..." variant="destructive">
            Delete Category
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
