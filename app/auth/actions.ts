"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getFriendlyAuthError } from "@/lib/auth/errors";
import { getPostLoginRedirect } from "@/lib/auth/routes";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

function redirectWithMessage(
  pathname: string,
  type: "error" | "success",
  message: string,
) {
  redirect(`${pathname}?${type}=${encodeURIComponent(message)}`);
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

async function clearSupabaseAuthCookies() {
  const cookieStore = await cookies();

  cookieStore
    .getAll()
    .filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"))
    .forEach(({ name }) => {
      cookieStore.delete(name);
    });
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getPostLoginRedirect(formData.get("next"));

  const emailError = validateEmail(email);

  if (emailError) {
    redirectWithMessage("/login", "error", emailError);
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    redirectWithMessage("/login", "error", passwordError);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage(
      "/login",
      "error",
      getFriendlyAuthError(error, "login"),
    );
  }

  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  await clearSupabaseAuthCookies();

  if (error) {
    redirectWithMessage("/login", "error", getFriendlyAuthError(error, "logout"));
  }

  redirectWithMessage("/login", "success", "You have been signed out.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateEmail(email);

  if (emailError) {
    redirectWithMessage("/forgot-password", "error", emailError);
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirectWithMessage(
      "/forgot-password",
      "error",
      getFriendlyAuthError(error, "forgot-password"),
    );
  }

  redirectWithMessage(
    "/forgot-password",
    "success",
    "If an account exists for that email, we sent a password reset link.",
  );
}

export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const passwordError = validatePasswordConfirmation(password, confirmPassword);

  if (passwordError) {
    redirectWithMessage("/reset-password", "error", passwordError);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirectWithMessage(
      "/reset-password",
      "error",
      getFriendlyAuthError(userError, "callback"),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithMessage(
      "/reset-password",
      "error",
      getFriendlyAuthError(error, "reset-password"),
    );
  }

  await supabase.auth.signOut();
  await clearSupabaseAuthCookies();

  redirectWithMessage(
    "/login",
    "success",
    "Password updated. Please sign in with your new password.",
  );
}

