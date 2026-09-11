/**
 * src/lib/auth.ts
 *
 * Centralized authentication utilities.
 * Use these functions instead of directly accessing localStorage for tokens.
 *
 * Token priority: auth_token > bmo_token > sessionToken
 * (First found is used)
 */

const TOKEN_KEYS = ["auth_token", "bmo_token", "sessionToken"] as const;

/**
 * Get the current auth token from any of the supported storage keys.
 * Priority: auth_token > bmo_token > sessionToken
 */
export function getAuthToken(): string {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return "";
}

/**
 * Set the auth token. Uses the primary key (auth_token).
 */
export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

/**
 * Clear all auth tokens (logout).
 */
export function clearAuthToken(): void {
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * Check if user is logged in.
 */
export function isAuthenticated(): boolean {
  return getAuthToken().length > 0;
}

/**
 * Get auth headers for API requests.
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
