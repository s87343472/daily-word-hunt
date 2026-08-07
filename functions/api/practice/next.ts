import type { Env } from "../_lib/env";
import { json, serverError } from "../_lib/http";
import { getUserFromRequest } from "../_lib/session";

/** Must match src/lib/puzzle/practiceBank.ts */
const PRACTICE_BANK_SIZE = 100_000;

/**
 * GET /api/practice/next?pack=daily
 * Returns a practice bankId the user has not completed (logged-in),
 * or a random id for anonymous visitors.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pack = (url.searchParams.get("pack") || "daily").slice(0, 64);

  const sess =
    env.DB != null ? await getUserFromRequest(request, env).catch(() => null) : null;

  if (!sess) {
    const bankId = 1 + Math.floor(Math.random() * PRACTICE_BANK_SIZE);
    return json({
      pack,
      bankId,
      bankSize: PRACTICE_BANK_SIZE,
      authenticated: false,
    });
  }

  if (!env.DB) return serverError("DB not configured");

  // Fetch played practice keys for pack (cap for free tier)
  const { results } = await env.DB.prepare(
    `SELECT puzzle_key FROM plays
     WHERE user_id = ? AND kind = 'practice' AND pack = ? AND success = 1
     LIMIT 20000`
  )
    .bind(sess.user.id, pack)
    .all<{ puzzle_key: string }>();

  const used = new Set(
    (results ?? [])
      .map(r => Number(r.puzzle_key))
      .filter(n => Number.isInteger(n) && n >= 1 && n <= PRACTICE_BANK_SIZE)
  );

  if (used.size >= PRACTICE_BANK_SIZE) {
    return json({
      pack,
      bankId: null,
      bankSize: PRACTICE_BANK_SIZE,
      authenticated: true,
      exhausted: true,
      played: used.size,
    });
  }

  let bankId: number | null = null;
  for (let i = 0; i < 48; i++) {
    const id = 1 + Math.floor(Math.random() * PRACTICE_BANK_SIZE);
    if (!used.has(id)) {
      bankId = id;
      break;
    }
  }
  if (bankId == null) {
    for (let id = 1; id <= PRACTICE_BANK_SIZE; id++) {
      if (!used.has(id)) {
        bankId = id;
        break;
      }
    }
  }

  return json({
    pack,
    bankId,
    bankSize: PRACTICE_BANK_SIZE,
    authenticated: true,
    exhausted: bankId == null,
    played: used.size,
  });
};
