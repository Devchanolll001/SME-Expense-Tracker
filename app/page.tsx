import { redirect } from "next/navigation";
import {
  AUTHENTICATED_HOME,
  ONBOARDING_ROUTE,
} from "@/lib/auth/routes";
import { getCurrentUserBusiness } from "@/lib/business/access";

export default async function Home() {
  const result = await getCurrentUserBusiness();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  if (result.status === "error") {
    redirect("/login?error=Unable%20to%20load%20your%20account.%20Please%20try%20again.");
  }

  redirect(result.business ? AUTHENTICATED_HOME : ONBOARDING_ROUTE);
}
