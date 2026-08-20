type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

type AuthErrorContext =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "logout"
  | "callback";

const FALLBACK_MESSAGES: Record<AuthErrorContext, string> = {
  login: "We could not sign you in. Please check your details and try again.",
  register:
    "We could not create your account. Please check your details and try again.",
  "forgot-password":
    "We could not send a reset link right now. Please try again shortly.",
  "reset-password":
    "We could not update your password. Please request a fresh reset link and try again.",
  logout: "We could not sign you out cleanly. Please try again.",
  callback:
    "This authentication link is invalid or has expired. Please request a new link.",
};

export function getFriendlyAuthError(
  error: AuthErrorLike | null | undefined,
  context: AuthErrorContext,
) {
  const message = error?.message?.toLowerCase() ?? "";
  const code = error?.code?.toLowerCase() ?? "";
  const status = error?.status;

  if (
    code.includes("invalid_credentials") ||
    message.includes("invalid login") ||
    message.includes("invalid credentials")
  ) {
    return "Email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (
    context === "register" &&
    (message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("user already"))
  ) {
    return "An account already exists for this email. Please sign in instead.";
  }

  if (
    code.includes("weak_password") ||
    message.includes("weak password") ||
    message.includes("password should be")
  ) {
    return "Please choose a stronger password.";
  }

  if (
    message.includes("expired") ||
    message.includes("invalid token") ||
    message.includes("otp") ||
    code.includes("otp") ||
    code.includes("token")
  ) {
    return "This authentication link is invalid or has expired. Please request a new link.";
  }

  if (status === 429 || message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch failed")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return FALLBACK_MESSAGES[context];
}
