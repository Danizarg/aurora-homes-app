// The one sentence a person sees for each thing that can go wrong with their account.
// Codes are Supabase Auth's error codes, plus "network" and "not_configured" from lib/auth/core.

const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Try again or reset your password.",
  email_not_confirmed: "Confirm your email first. We sent you a link when you signed up.",
  user_already_exists: "There's already an account with that email. Log in instead.",
  weak_password: "Choose a stronger password: at least 8 characters.",
  same_password: "Choose a password you haven't used before.",
  over_email_send_rate_limit: "Too many emails just now. Try again in a few minutes.",
  over_request_rate_limit: "Too many tries just now. Wait a minute and try again.",
  otp_expired: "This link has expired or was already used. We can send you a new one.",
  email_address_invalid: "That email address doesn't look right.",
  network: "Can't reach Zouza right now. Check your connection and try again.",
  not_configured: "Accounts aren't available in this version of the app.",
};

export function authErrorMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
