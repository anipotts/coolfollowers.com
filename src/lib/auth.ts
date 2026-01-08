export const AUTH_COOKIE_NAME = "coolfollowers_auth";

// Simple hash function for auth token
export function generateAuthToken(password: string): string {
  let hash = 0;
  const str = `coolfollowers_${password}_secret`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function verifyPassword(inputPassword: string): boolean {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    console.error("SITE_PASSWORD environment variable not set");
    return false;
  }
  return inputPassword === sitePassword;
}
