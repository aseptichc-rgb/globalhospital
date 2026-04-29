// Firebase Auth requires email, but we present a username-only UI.
// We map username ↔ a synthetic internal email under a reserved domain
// so the existing email/password provider can be reused transparently.
export const USERNAME_DOMAIN = "globalhospital.local";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (domain !== USERNAME_DOMAIN) return email;
  return local;
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${USERNAME_DOMAIN}`);
}
