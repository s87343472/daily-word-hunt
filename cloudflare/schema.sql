-- Cloudflare D1 schema (Free tier friendly)
-- Apply later: wrangler d1 execute daily-word-hunt --file=cloudflare/schema.sql
-- MVP: scores only. Puzzle JSON stays on Pages (Git = source of truth).

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  nickname TEXT NOT NULL,
  time_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_week_time
  ON scores (week_key, time_ms);

-- Optional later: puzzle metadata if moving off Git-only storage
-- CREATE TABLE IF NOT EXISTS puzzles (
--   id TEXT PRIMARY KEY,
--   pack TEXT,
--   play_date TEXT,
--   title TEXT,
--   storage_path TEXT NOT NULL,
--   status TEXT NOT NULL DEFAULT 'published'
-- );
