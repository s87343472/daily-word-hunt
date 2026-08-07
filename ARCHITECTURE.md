# Daily Word Hunt — Architecture (Cloudflare Free)

## Goals

- Word **search** (划词), not Wordscapes-style fill
- **Home = play**: open `/` and start today's puzzle (no `/play/date` required)
- Daily release by calendar rules; vertical packs later
- Static-first for performance + SEO
- Free Cloudflare tier: Pages + optional D1/Worker for scores only

## User-facing daily model

| Idea | Implementation |
|------|----------------|
| “Every day has a puzzle” | Pre-built JSON files released by **date** |
| “Don’t repeat recent content” | Generator avoids word-set overlap with prior **30 days** |
| Primary URL | **`/`** loads today in site timezone |
| Optional share / SEO archive | `/daily/YYYY-MM-DD` (past only) |
| Legacy | `/play` → 301 `/` |

Release is **not** a runtime generator service. Files may exist early in git; the client only treats **today (and past)** as playable. Future dates on `/daily/...` redirect home.

```
Player opens /
  → HTML/CSS/JS from Pages CDN
  → client resolves YYYY-MM-DD in site TZ (e.g. America/New_York)
  → fetch /puzzles/YYYY-MM-DD.json
  → if missing → sample.json fallback
  → all swipe logic in browser
  → NO Worker call for play
```

## Stack

| Layer | Choice |
|-------|--------|
| Site shell | [AstroPaper](https://github.com/satnaing/astro-paper) (SEO, a11y, dark mode) |
| Game UI | Custom client JS (`WordSearchGame.astro`) |
| Grid generator | [`@blex41/word-search`](https://www.npmjs.com/package/@blex41/word-search) (MIT) offline/CI |
| Hosting | Cloudflare **Pages** |
| Leaderboard (phase 2) | Pages Function + **D1** |
| Puzzle source of truth | **Git** → `public/puzzles/YYYY-MM-DD.json` |

## Puzzle pipeline (never on request)

```
wordlists/daily-pool.json   (large pool)
  → pnpm gen:puzzle --from … --to …
     · pick ~8 words/day
     · exclude words used in previous 30 days when pool allows
     · place grid; fail if incomplete
  → public/puzzles/YYYY-MM-DD.json
  → git commit / Pages build
```

```bash
# One day
pnpm gen:puzzle --wordlist wordlists/daily-pool.json --date 2026-08-06

# Range (dedupe against already-written neighbors)
pnpm gen:puzzle --wordlist wordlists/daily-pool.json --from 2026-08-01 --to 2026-08-31

# Overwrite
pnpm gen:puzzle --wordlist wordlists/daily-pool.json --date 2026-08-06 --force
```

Human review optional: open `/` after generate. Blocklists can hook into `scripts/gen-puzzle.mjs` later.

**No “unique solution service”** — 划词 solutions are the pre-placed paths in JSON. Quality = placement + word variety + content rules, not Sudoku-style uniqueness.

## Free tier discipline

| Resource | MVP usage |
|----------|-----------|
| Pages | Home play + packs + print + archive |
| Workers requests | Only score APIs (if enabled) |
| D1 writes | One row per completed run (optional) |
| KV | Avoid; optional later |
| R2 | Optional PDF archives later |

**Never** place LLM/Agent generation on the player request path.

## Routes

| Path | Role |
|------|------|
| `/` | **Today’s puzzle** (product home) |
| `/print` | Printable view of today |
| `/daily/YYYY-MM-DD` | Archive / share (SEO); past only |
| `/play` | 301 → `/` |
| `/posts` | Content / SEO articles (secondary) |

## Phase roadmap

0. ✅ Shell + sample + play UI + generator CLI  
1. ✅ Home = play + daily date files + 30d word dedupe in generator  
2. Packs index + more themed wordlists  
3. D1 leaderboard Functions  
4. GitHub Action cron (generate/commit next day in advance)  
5. Optional R2 for PDF archives  
