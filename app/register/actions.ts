"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getFriendlyAuthError } from "@/lib/auth/errors";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(message: string) {
  redirect(`/register?error=${encodeURIComponent(message)}`);
}

async function getRequestOrigin() {
  const headersList = await headers();
  const origin = headersList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function register(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!firstName || !lastName || !email || !password) {
    redirectWithError("Please complete all fields.");
  }

  const emailError = validateEmail(email);

  if (emailError) {
    redirectWithError(emailError);
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    redirectWithError(passwordError);
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    redirectWithError(getFriendlyAuthError(error, "register"));
  }

  redirect(
    "/register?success=Account%20created.%20Check%20your%20email%20to%20continue."
  );
}
