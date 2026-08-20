import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { DeleteCategoryForm } from "@/app/categories/_components/delete-category-form";
import { getCategoryTypeLabel } from "@/lib/categories/constants";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getCategoryRecordPageData } from "@/lib/categories/data";

type DeleteCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function CategoryMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Delete Category
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

function transactionCountLabel(count: number) {
  return count === 1 ? "1 transaction" : `${count} transactions`;
}

export default async function DeleteCategoryPage({
  params,
}: DeleteCategoryPageProps) {
  const { id } = await params;
  const pageData = await getCategoryRecordPageData(id);

  if (pageData.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/categories/${id}/delete`)}`);
  }

  if (pageData.status === "needs_onboarding") {
    redirect(ONBOARDING_ROUTE);
  }

  if (pageData.status !== "ok") {
    return (
      <CategoryMessage
        message={pageData.message ?? "Unable to load this category. Please try again."}
      />
    );
  }

  if (!pageData.category) {
    return <CategoryMessage message="Category not found." />;
  }

  const category = pageData.category;
  const hasTransactions = category.transactionCount > 0;

  return (
    <WorkspaceShell
      active="categories"
      businessName={pageData.business.businessName}
      userName={pageData.user.displayName}
    >
      <div className="space-y-6">
        <Link
          href="/categories"
          className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Back to categories
        </Link>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase text-rose-600">
              Delete Category
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {category.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {getCategoryTypeLabel(category.type)} category
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {hasTransactions ? (
              <>
                <p className="font-semibold">
                  This category is used by{" "}
                  {transactionCountLabel(category.transactionCount)}.
                </p>
                <p className="mt-2">
                  Deleting it will remove the category from those transactions,
                  but the financial transactions will remain.
                </p>
              </>
            ) : (
              <p>
                This category is not used by any transactions. Deleting it will
                remove the category from your list.
              </p>
            )}
          </div>

          <DeleteCategoryForm categoryId={category.id} />
        </section>
      </div>
    </WorkspaceShell>
  );
}
