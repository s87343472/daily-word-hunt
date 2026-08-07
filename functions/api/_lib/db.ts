import type { Env } from "./env";

export async function upsertGoogleUser(
  env: Env,
  profile: {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  }
): Promise<string> {
  const existing = await env.DB.prepare(
    `SELECT id FROM users WHERE google_sub = ?`
  )
    .bind(profile.sub)
    .first<{ id: string }>();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE users SET email = ?, name = ?, picture_url = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        profile.email ?? null,
        profile.name ?? null,
        profile.picture ?? null,
        existing.id
      )
      .run();
    return existing.id;
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, name, picture_url)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      profile.sub,
      profile.email ?? null,
      profile.name ?? null,
      profile.picture ?? null
    )
    .run();
  return id;
}

export function isoWeekKey(d = new Date()): string {
  // ISO week: YYYY-Www
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  const y = date.getUTCFullYear();
  return `${y}-W${String(weekNo).padStart(2, "0")}`;
}
