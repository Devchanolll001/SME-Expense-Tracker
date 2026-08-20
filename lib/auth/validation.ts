export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

export function validateEmail(email: string) {
  if (!email) {
    return "Please enter your email address.";
  }

  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  return null;
}

export function validatePassword(password: string) {
  if (!password) {
    return "Please enter your password.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
) {
  const passwordError = validatePassword(password);

  if (passwordError) {
    return passwordError;
  }

  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}
