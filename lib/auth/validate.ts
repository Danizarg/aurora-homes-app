// Checks run on the phone before anything is sent, so people get a clear message at once.
// Each returns the first problem as the sentence to show, or null when the input is fine.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHORT_PASSWORD = "Use at least 8 characters for your password.";

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function checkSignup(v: { fullName: string; email: string; password: string }): string | null {
  const name = v.fullName.trim();
  if (!name) return "Add your name.";
  if (name.length > 80) return "Use 80 characters or fewer for your name.";
  if (!EMAIL.test(normalizeEmail(v.email))) return "That email address doesn't look right.";
  if (v.password.length < 8) return SHORT_PASSWORD;
  return null;
}

export function checkLogin(email: string, password: string): string | null {
  if (!email.trim() || !password) return "Enter your email and password.";
  return null;
}

export function checkNewPassword(pw: string, confirm: string): string | null {
  if (pw.length < 8) return SHORT_PASSWORD;
  if (pw !== confirm) return "The two passwords don't match.";
  return null;
}
