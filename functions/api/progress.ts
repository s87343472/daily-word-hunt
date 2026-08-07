import type { Env } from "./_lib/env";
import { isoWeekKey } from "./_lib/db";
import {
  badRequest,
  json,
  unauthorized,
  serverError,
} from "./_lib/http";
import { getUserFromRequest } from "./_lib/session";

/**
 * GET /api/progress?kind=practice&pack=daily
 * → list of puzzle_key played
 *
 * POST /api/progress
 * body: { kind, pack, puzzleKey, timeMs?, hintsUsed?, success? }
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.DB) return serverError("DB not configured");

  const sess = await getUserFromRequest(request, env);
  if (!sess) return unauthorized();

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || undefined;
  const pack = url.searchParams.get("pack") || undefined;

  let sql = `SELECT kind, pack, puzzle_key, time_ms, hints_used, success, created_at
             FROM plays WHERE user_id = ?`;
  const binds: string[] = [sess.user.id];
  if (kind) {
    sql += ` AND kind = ?`;
    binds.push(kind);
  }
  if (pack) {
    sql += ` AND pack = ?`;
    binds.push(pack);
  }
  sql += ` ORDER BY created_at DESC LIMIT 5000`;

  const { results } = await env.DB.prepare(sql)
    .bind(...binds)
    .all();

  return json({ plays: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.DB) return serverError("DB not configured");

  const sess = await getUserFromRequest(request, env);
  if (!sess) return unauthorized();

  let body: {
    kind?: string;
    pack?: string;
    puzzleKey?: string;
    timeMs?: number;
    hintsUsed?: number;
    success?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Invalid JSON");
  }

  const kind = body.kind === "practice" ? "practice" : "daily";
  const pack = (body.pack || "daily").slice(0, 64);
  const puzzleKey = String(body.puzzleKey || "").slice(0, 128);
  if (!puzzleKey) return badRequest("puzzleKey required");

  const timeMs =
    typeof body.timeMs === "number" && body.timeMs >= 0
      ? Math.floor(body.timeMs)
      : null;
  const hintsUsed =
    typeof body.hintsUsed === "number" && body.hintsUsed >= 0
      ? Math.floor(body.hintsUsed)
      : 0;
  const success = body.success === false ? 0 : 1;

  await env.DB.prepare(
    `INSERT INTO plays (user_id, kind, pack, puzzle_key, time_ms, hints_used, success)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, kind, pack, puzzle_key) DO UPDATE SET
       time_ms = CASE
         WHEN excluded.time_ms IS NOT NULL AND (plays.time_ms IS NULL OR excluded.time_ms < plays.time_ms)
         THEN excluded.time_ms ELSE plays.time_ms END,
       hints_used = excluded.hints_used,
       success = MAX(plays.success, excluded.success),
       created_at = CASE WHEN plays.success = 0 AND excluded.success = 1
         THEN excluded.created_at ELSE plays.created_at END`
  )
    .bind(sess.user.id, kind, pack, puzzleKey, timeMs, hintsUsed, success)
    .run();

  // Leaderboard: daily completes with a time
  if (success && timeMs != null && kind === "daily") {
    const weekKey = isoWeekKey();
    const display =
      sess.user.name || sess.user.email?.split("@")[0] || "Player";
    await env.DB.prepare(
      `INSERT INTO leaderboard_week (week_key, pack, puzzle_key, user_id, best_time_ms, display_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(week_key, pack, puzzle_key, user_id) DO UPDATE SET
         best_time_ms = MIN(leaderboard_week.best_time_ms, excluded.best_time_ms),
         display_name = excluded.display_name,
         updated_at = datetime('now')`
    )
      .bind(weekKey, pack, puzzleKey, sess.user.id, timeMs, display)
      .run();
  }

  try {
    await env.DB.prepare(
      `INSERT INTO events (user_id, name, pack, puzzle_key, props_json)
       VALUES (?, 'level_end', ?, ?, ?)`
    )
      .bind(
        sess.user.id,
        pack,
        puzzleKey,
        JSON.stringify({ kind, timeMs, hintsUsed, success: !!success })
      )
      .run();
  } catch {
    /* optional */
  }

  return json({ ok: true });
};
