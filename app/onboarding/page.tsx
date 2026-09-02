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
    <main className="min-h-screen bg-[#f5f1e8] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[84vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-2xl border border-[#e7ded2] bg-white p-6 shadow-[0_22px_55px_rgba(89,55,30,0.12)] sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white shadow-sm shadow-emerald-600/25">
                SME
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700">
                SME Expense Tracker
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Set Up Your Business
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Set up your business to get started.
              </p>
              {displayName && (
                <p className="mt-3 text-xs font-medium text-slate-500">
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
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
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
