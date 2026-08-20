import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { CategoryFilters } from "@/app/categories/_components/category-filters";
import { CategoryList } from "@/app/categories/_components/category-list";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getCategoriesPageData } from "@/lib/categories/data";

type CategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function CategoryMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Categories</h1>
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

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const params = await searchParams;
  const pageData = await getCategoriesPageData(params);

  if (pageData.status === "unauthenticated") {
    redirect("/login?next=%2Fcategories");
  }

  if (pageData.status === "needs_onboarding") {
    redirect(ONBOARDING_ROUTE);
  }

  if (pageData.status !== "ok") {
    return (
      <CategoryMessage
        message={pageData.message ?? "Unable to load categories. Please try again."}
      />
    );
  }

  const successMessage = getSuccessMessage(params.success);

  return (
    <WorkspaceShell
      active="categories"
      businessName={pageData.business.businessName}
      userName={pageData.user.displayName}
    >
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage the labels used to classify income and expenses.
            </p>
          </div>
          <Link
            href="/categories/new"
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            + Add Category
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

        <CategoryFilters filters={pageData.filters} />
        <CategoryList categories={pageData.categories} filters={pageData.filters} />
      </div>
    </WorkspaceShell>
  );
}
