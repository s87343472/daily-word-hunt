import type { Env } from "./_lib/env";
import { badRequest, json, serverError } from "./_lib/http";
import { getUserFromRequest } from "./_lib/session";

/**
 * POST /api/events — optional behavior beacon (login required for user_id attach;
 * anonymous events stored with session_anon only).
 * body: { name, pack?, puzzleKey?, props?, anonId? }
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.DB) return serverError("DB not configured");

  let body: {
    name?: string;
    pack?: string;
    puzzleKey?: string;
    props?: Record<string, unknown>;
    anonId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Invalid JSON");
  }

  const name = String(body.name || "").slice(0, 64);
  if (!name) return badRequest("name required");

  const sess = await getUserFromRequest(request, env).catch(() => null);

  try {
    await env.DB.prepare(
      `INSERT INTO events (user_id, session_anon, name, pack, puzzle_key, props_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        sess?.user.id ?? null,
        body.anonId?.slice(0, 64) ?? null,
        name,
        body.pack?.slice(0, 64) ?? null,
        body.puzzleKey?.slice(0, 128) ?? null,
        body.props ? JSON.stringify(body.props).slice(0, 2000) : null
      )
      .run();
  } catch {
    return json({ ok: false, note: "events insert failed" }, { status: 503 });
  }

  return json({ ok: true });
};
