-- Daily Word Hunt — Cloudflare D1
-- Apply:
--   wrangler d1 create daily-word-hunt
--   wrangler d1 execute daily-word-hunt --remote --file=cloudflare/schema.sql
--
-- Calendar puzzles stay static on Pages (Git).
-- Practice bank = deterministic IDs 1..100000 (no 100k JSON rows required).

PRAGMA foreign_keys = ON;

-- Google-linked account
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- uuid
  google_sub TEXT NOT NULL UNIQUE,     -- Google subject
  email TEXT,
  name TEXT,
  picture_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Server sessions (cookie holds session id)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- Completed plays (daily calendar OR practice bank)
-- kind: 'daily' | 'practice'
CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                  -- daily | practice
  pack TEXT NOT NULL,                  -- daily | nature | …
  puzzle_key TEXT NOT NULL,            -- YYYY-MM-DD for daily; bank id string for practice
  time_ms INTEGER,                     -- completion time if finished
  hints_used INTEGER NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 1,  -- 1 complete, 0 abandon (optional)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, kind, pack, puzzle_key)
);

CREATE INDEX IF NOT EXISTS idx_plays_user_created ON plays (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_plays_leaderboard
  ON plays (kind, pack, puzzle_key, success, time_ms);

-- Lightweight behavior events for funnels / leaderboard support
-- name: level_start | level_end | hint_used | share | login | …
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_anon TEXT,                   -- optional pre-login browser id
  name TEXT NOT NULL,
  pack TEXT,
  puzzle_key TEXT,
  props_json TEXT,                     -- small JSON blob
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_name_created ON events (name, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user ON events (user_id, created_at);

-- Denormalized weekly leaderboard rows (fast reads; rebuildable from plays)
CREATE TABLE IF NOT EXISTS leaderboard_week (
  week_key TEXT NOT NULL,              -- e.g. 2026-W32 (ISO week)
  pack TEXT NOT NULL,
  puzzle_key TEXT NOT NULL,            -- usually that week's daily date or 'all'
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  best_time_ms INTEGER NOT NULL,
  display_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (week_key, pack, puzzle_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lb_week_time
  ON leaderboard_week (week_key, pack, puzzle_key, best_time_ms);
