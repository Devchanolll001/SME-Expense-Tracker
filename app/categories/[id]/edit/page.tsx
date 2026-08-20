import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/_components/workspace-shell";
import { CategoryForm } from "@/app/categories/_components/category-form";
import { updateCategory, type CategoryFormState } from "@/app/categories/actions";
import { ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getCategoryRecordPageData } from "@/lib/categories/data";

type EditCategoryPageProps = {
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
          Edit Category
        </h1>
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      </div>
    </main>
  );
}

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  const { id } = await params;
  const pageData = await getCategoryRecordPageData(id);

  if (pageData.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/categories/${id}/edit`)}`);
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

  const initialState: CategoryFormState = {
    fields: {
      description: pageData.category.description ?? "",
      name: pageData.category.name,
      type: pageData.category.type,
    },
    status: "idle",
  };
  const updateAction = updateCategory.bind(null, pageData.category.id);

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
          action={updateAction}
          initialState={initialState}
          pendingText="Saving..."
          submitText="Save Changes"
          title="Edit Category"
        />
      </div>
    </WorkspaceShell>
  );
}
