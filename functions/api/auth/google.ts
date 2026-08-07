import type { Env } from "../_lib/env";
import { OAUTH_STATE_COOKIE } from "../_lib/env";
import { cookieHeader, redirect, siteOrigin, serverError } from "../_lib/http";

/**
 * GET /api/auth/google — start Google OAuth
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.GOOGLE_CLIENT_ID) {
    return serverError("GOOGLE_CLIENT_ID not configured");
  }

  const origin = siteOrigin(request, env);
  const redirectUri = `${origin}/api/auth/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  const res = redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
  const headers = new Headers(res.headers);
  headers.append(
    "set-cookie",
    cookieHeader(OAUTH_STATE_COOKIE, state, {
      maxAge: 600,
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
    })
  );
  return new Response(null, { status: 302, headers });
};
