import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import { AUTHENTICATED_HOME, ONBOARDING_ROUTE } from "@/lib/auth/routes";
import { getCurrentUserBusiness } from "@/lib/business/access";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set Up Your Business | SME Expense Tracker",
};

export default async function OnboardingPage() {
  const result = await getCurrentUserBusiness();

  if (result.status === "unauthenticated") {
    redirect(
      `/login?next=${encodeURIComponent(
        ONBOARDING_ROUTE,
      )}&error=Please%20sign%20in%20to%20set%20up%20your%20business.`,
    );
  }

  if (result.status === "authenticated" && result.business) {
    redirect(AUTHENTICATED_HOME);
  }

  const displayName =
    result.status === "authenticated"
      ? [result.user.user_metadata?.first_name, result.user.user_metadata?.last_name]
          .filter(Boolean)
          .join(" ") || result.user.email
      : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto flex min-h-[84vh] max-w-lg items-center">
        <div className="w-full rounded-lg bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-xl font-bold text-white">
                N
              </div>
              <p className="text-sm font-semibold text-emerald-600">
                SME Expense Tracker
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Set Up Your Business
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Set up your business to get started.
              </p>
              {displayName && (
                <p className="mt-3 text-xs font-medium text-slate-400">
                  Signed in as {displayName}
                </p>
              )}
            </div>

            <form action={logout} className="w-28 shrink-0">
              <SubmitButton pendingText="Signing out..." variant="secondary">
                Sign out
              </SubmitButton>
            </form>
          </div>

          {result.status === "error" ? (
            <div
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {result.message}
            </div>
          ) : (
            <OnboardingForm />
          )}
        </div>
      </div>
    </main>
  );
}
