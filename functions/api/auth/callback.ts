import type { Env } from "../_lib/env";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "../_lib/env";
import { upsertGoogleUser } from "../_lib/db";
import {
  clearCookie,
  cookieHeader,
  parseCookies,
  redirect,
  siteOrigin,
  serverError,
  badRequest,
} from "../_lib/http";
import { createSession, sessionMaxAgeSec } from "../_lib/session";

type TokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserinfo = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

/**
 * GET /api/auth/callback — Google OAuth redirect
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.DB || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return serverError("Auth or DB not configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const origin = siteOrigin(request, env);

  if (err) {
    return redirect(`${origin}/?auth=error&reason=${encodeURIComponent(err)}`);
  }
  if (!code || !state) return badRequest("Missing code/state");

  const cookies = parseCookies(request.headers.get("cookie"));
  if (!cookies[OAUTH_STATE_COOKIE] || cookies[OAUTH_STATE_COOKIE] !== state) {
    return redirect(`${origin}/?auth=error&reason=state`);
  }

  const redirectUri = `${origin}/api/auth/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as TokenResponse;
  if (!tokenJson.access_token) {
    return redirect(`${origin}/?auth=error&reason=token`);
  }

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!infoRes.ok) {
    return redirect(`${origin}/?auth=error&reason=userinfo`);
  }
  const profile = (await infoRes.json()) as GoogleUserinfo;
  if (!profile.sub) {
    return redirect(`${origin}/?auth=error&reason=profile`);
  }

  const userId = await upsertGoogleUser(env, profile);
  const session = await createSession(env, userId);

  // Behavior: login event (best-effort)
  try {
    await env.DB.prepare(
      `INSERT INTO events (user_id, name, props_json) VALUES (?, 'login', ?)`
    )
      .bind(userId, JSON.stringify({ provider: "google" }))
      .run();
  } catch {
    /* ignore if events table missing mid-migrate */
  }

  const headers = new Headers({ location: `${origin}/?auth=ok` });
  headers.append(
    "set-cookie",
    cookieHeader(SESSION_COOKIE, session.id, {
      maxAge: sessionMaxAgeSec(),
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
    })
  );
  headers.append("set-cookie", clearCookie(OAUTH_STATE_COOKIE));

  return new Response(null, { status: 302, headers });
};
