export type Env = {
  DB: D1Database;
  /** Google OAuth Web client id (public) */
  GOOGLE_CLIENT_ID: string;
  /** Google OAuth client secret */
  GOOGLE_CLIENT_SECRET: string;
  /**
   * Canonical site origin, e.g. https://words.sagasu.art
   * Used for OAuth redirect_uri.
   */
  SITE_URL?: string;
  /** Optional HMAC secret for extra cookie hardening (falls back to client secret) */
  AUTH_SECRET?: string;
};

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  picture_url: string | null;
};

export const SESSION_COOKIE = "dwh_session";
export const OAUTH_STATE_COOKIE = "dwh_oauth_state";
export const SESSION_DAYS = 30;
