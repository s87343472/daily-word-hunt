import type { Env, SessionUser } from "./env";
import { SESSION_COOKIE, SESSION_DAYS } from "./env";
import { parseCookies } from "./http";

export async function createSession(
  env: Env,
  userId: string
): Promise<{ id: string; expiresAt: string }> {
  const id = crypto.randomUUID();
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + SESSION_DAYS);
  const expiresAt = expires.toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  )
    .bind(id, userId, expiresAt)
    .run();
  return { id, expiresAt };
}

export async function destroySession(
  env: Env,
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId) return;
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
    .bind(sessionId)
    .run();
}

export async function getUserFromRequest(
  request: Request,
  env: Env
): Promise<{ user: SessionUser; sessionId: string } | null> {
  if (!env.DB) return null;
  const cookies = parseCookies(request.headers.get("cookie"));
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.name, u.picture_url
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`
  )
    .bind(sessionId)
    .first<{
      session_id: string;
      expires_at: string;
      id: string;
      email: string | null;
      name: string | null;
      picture_url: string | null;
    }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(env, sessionId);
    return null;
  }

  return {
    sessionId: row.session_id,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      picture_url: row.picture_url,
    },
  };
}

export function sessionMaxAgeSec(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}
