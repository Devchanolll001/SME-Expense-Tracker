import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { createCategory, type CategoryFormState } from "@/app/categories/actions";
import { CategoryForm } from "@/app/categories/_components/category-form";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getCategoryFormPageData } from "@/lib/categories/data";

const initialState: CategoryFormState = {
  fields: {
    description: "",
    name: "",
    type: "expense",
  },
  status: "idle",
};

function CategoryMessage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          SME Expense Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Add Category
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

export default async function NewCategoryPage() {
  const pageData = await getCategoryFormPageData();

  if (pageData.status === "unauthenticated") {
    redirect("/login?next=%2Fcategories%2Fnew");
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
        <CategoryForm
          action={createCategory}
          initialState={initialState}
          pendingText="Creating..."
          submitText="Create Category"
          title="Add Category"
        />
      </div>
    </WorkspaceShell>
  );
}
