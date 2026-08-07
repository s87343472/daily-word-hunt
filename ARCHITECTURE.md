# Daily Word Hunt — Architecture (Cloudflare Free)

## Goals

- Word **search** (划词), not Wordscapes-style fill
- **Home = play** today’s puzzle from the default series (`daily`)
- **Series / themes** as first-class packs (nature, cities, …)
- Daily release by calendar; static-first for CF Pages Free
- Optional later: D1 leaderboard (no account required for play)

## Content model (packs)

```
packs/catalog.json              ← registry (id, theme, wordlist, horizon…)
wordlists/packs/{id}.json       ← word pools per series
public/puzzles/{id}/YYYY-MM-DD.json  ← generated calendar grids
```

| Field | Meaning |
|-------|---------|
| `schedule: "calendar"` | One puzzle per day per pack |
| `horizonDays` | How far ahead CI/scripts should pre-generate |
| `defaultPackId` | Home page series (`daily`) |

### Routes

| Path | Role |
|------|------|
| `/` | Today for **default pack** (`daily`) |
| `/packs` | Series directory |
| `/packs/{id}` | Pack hub: today play + past dates |
| `/packs/{id}/{date}` | Play one day of a series |
| `/daily/{date}` | Short URL for default pack (canonical → packs/daily/…) |
| `/past` | Default-pack archive list |
| `/print` | Print today’s default pack |

## Pipeline

```
catalog + wordlists
  → pnpm gen:packs   (or --pack / --all-packs --horizon N)
  → public/puzzles/{pack}/{date}.json
  → git commit (Action) / Pages deploy
```

```bash
pnpm gen:packs                          # all calendar packs, 21-day horizon
pnpm gen:puzzle --pack nature --horizon 30
pnpm gen:puzzle --all-packs --horizon 21 --force
```

### GitHub Action

`.github/workflows/generate-puzzles.yml`

- Cron daily + `workflow_dispatch`
- `node scripts/gen-puzzle.mjs --all-packs --horizon 21`
- Commits new files under `public/puzzles/` when needed

## Stack

| Layer | Choice |
|-------|--------|
| Site | Astro + AstroPaper shell |
| Game UI | `WordSearchGame.astro` (`daily` + `packId`) |
| Generator | `@blex41/word-search` offline |
| Hosting | Cloudflare **Pages** |
| Leaderboard (later) | Pages Function + D1 |

## Free tier discipline

- Puzzles: static only (never generate on player request)
- Workers: only for optional score APIs later
- No LLM on the request path

## Phase roadmap

0. ✅ Play UI + static daily  
1. ✅ SEO + legal + cookies  
2. ✅ Packs / series architecture + Action refill  
3. D1 leaderboard (optional nicknames, no forced login)  
4. Optional accounts  
