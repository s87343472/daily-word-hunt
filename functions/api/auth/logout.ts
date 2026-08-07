import type { Env } from "../_lib/env";
import { SESSION_COOKIE } from "../_lib/env";
import { clearCookie, json, parseCookies, redirect, siteOrigin } from "../_lib/http";
import { destroySession } from "../_lib/session";

/**
 * POST /api/auth/logout — clear session
 * GET  /api/auth/logout — clear + redirect home
 */
async function logout(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get("cookie"));
  await destroySession(env, cookies[SESSION_COOKIE]);

  const wantsJson =
    request.method === "POST" ||
    (request.headers.get("accept") || "").includes("application/json");

  if (wantsJson && request.method === "POST") {
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", clearCookie(SESSION_COOKIE));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  const origin = siteOrigin(request, env);
  const headers = new Headers({ location: `${origin}/` });
  headers.append("set-cookie", clearCookie(SESSION_COOKIE));
  return new Response(null, { status: 302, headers });
}

export const onRequestGet: PagesFunction<Env> = async ctx =>
  logout(ctx.request, ctx.env);

export const onRequestPost: PagesFunction<Env> = async ctx =>
  logout(ctx.request, ctx.env);
