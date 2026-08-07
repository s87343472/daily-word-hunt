import type { Env } from "./_lib/env";
import { isoWeekKey } from "./_lib/db";
import { json, serverError } from "./_lib/http";

/**
 * GET /api/leaderboard?pack=daily&puzzleKey=2026-08-07&week=2026-W32&limit=20
 * Defaults: current ISO week, pack=daily.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.DB) return serverError("DB not configured");

  const url = new URL(request.url);
  const pack = (url.searchParams.get("pack") || "daily").slice(0, 64);
  const puzzleKey = url.searchParams.get("puzzleKey") || undefined;
  const week = url.searchParams.get("week") || isoWeekKey();
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") || 20))
  );

  try {
    let sql: string;
    let binds: (string | number)[];

    if (puzzleKey) {
      sql = `SELECT display_name, best_time_ms, user_id, puzzle_key, updated_at
             FROM leaderboard_week
             WHERE week_key = ? AND pack = ? AND puzzle_key = ?
             ORDER BY best_time_ms ASC
             LIMIT ?`;
      binds = [week, pack, puzzleKey, limit];
    } else {
      // Best time per user on any daily in this week for pack
      sql = `SELECT display_name, MIN(best_time_ms) AS best_time_ms, user_id,
                    MIN(puzzle_key) AS puzzle_key, MAX(updated_at) AS updated_at
             FROM leaderboard_week
             WHERE week_key = ? AND pack = ?
             GROUP BY user_id
             ORDER BY best_time_ms ASC
             LIMIT ?`;
      binds = [week, pack, limit];
    }

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    return json({
      week,
      pack,
      puzzleKey: puzzleKey ?? null,
      rows: results ?? [],
    });
  } catch {
    return json({
      week,
      pack,
      puzzleKey: puzzleKey ?? null,
      rows: [],
      note: "Leaderboard empty or DB not migrated yet.",
    });
  }
};
