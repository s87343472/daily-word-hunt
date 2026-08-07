# Daily Word Hunt

Free **daily word search** (划词) in the browser — new puzzle every day, themed series, print & large print. Static site on **Cloudflare Pages**.

**Live:** [https://words.sagasu.art/](https://words.sagasu.art/)

## Features

- Home page = **today’s puzzle** (no account)
- Drag or **tap-first-then-last** selection
- **Series / themes** (`daily`, `nature`, `cities`, …) via pack catalog
- Past days, print view, how-to, FAQ, privacy/terms, cookie consent (analytics opt-in)
- Offline puzzle generator + **GitHub Action** to refill calendars
- SEO: sitemap, robots, per-page meta, JSON-LD

Shell based on [AstroPaper](https://github.com/satnaing/astro-paper) (MIT); product code and content are Daily Word Hunt.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321).

```bash
pnpm build    # dist/ for Cloudflare Pages
pnpm preview  # local preview of dist
```

**Node:** ≥ 22.12 · **Package manager:** pnpm

## Site map (product)

| Path | Purpose |
|------|---------|
| `/` | Today (default series `daily`) |
| `/packs` | Series & themes |
| `/packs/{id}` | Pack hub |
| `/packs/{id}/{date}` | One day of a series |
| `/past`, `/daily/{date}` | Default-pack archive shortcuts |
| `/print` | Print today |
| `/how-to`, `/faq`, `/about` | Help & product |
| `/privacy`, `/terms`, `/contact` | Legal & contact |
| `/posts` | Tips & guides |

## Packs & puzzle pipeline

```
packs/catalog.json                 # registry
wordlists/packs/{id}.json          # word pools
public/puzzles/{id}/YYYY-MM-DD.json
```

```bash
# Fill all calendar packs for the next 21 days (skip existing)
pnpm gen:packs

# One pack
pnpm gen:puzzle --pack nature --horizon 30

# Overwrite
pnpm gen:puzzle --pack daily --date 2026-08-07 --force
```

**CI:** `.github/workflows/generate-puzzles.yml`  
Actions → **Generate pack puzzles** → Run workflow (or daily cron UTC 11:00).

## Deploy (Cloudflare Pages)

| Setting | Value |
|---------|--------|
| Connect | this GitHub repo |
| Build command | `pnpm install && pnpm build` |
| Output directory | `dist` |
| Node | 22+ |

Canonical host: **`https://words.sagasu.art/`** (set in `astro-paper.config.ts`).  
Cloudflare Pages project may still have a `*.pages.dev` URL; prefer the custom domain for links, sitemap, and Search Console.

## UI / design review (optional)

```bash
npx impeccable install --providers=grok --scope=project
# then in your agent: design context lives in PRODUCT.md
# CLI scan: node path/to/impeccable detect dist/index.html
```

## Project docs

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Static vs dynamic, packs, Free tier |
| [PROJECT.md](./PROJECT.md) | Routes, SEO checklist, ops notes |

## Analytics (opt-in only)

**Google Consent Mode (Advanced-style):**

| Visitor choice | What happens |
|----------------|--------------|
| No choice yet / **Reject** | gtag loads; `analytics_storage=denied` → **cookieless pings** (basic volume in GA) |
| **Accept** analytics | `analytics_storage=granted` → full GA cookies + richer reports |

**Cloudflare Pages** → **Settings** → **Environment variables** (Production):

| Name | Value |
|------|--------|
| `PUBLIC_GA_MEASUREMENT_ID` | `G-SZMGNMBD0Z` |
| `PUBLIC_PLAUSIBLE_DOMAIN` | `words.sagasu.art` (optional) |

Then **redeploy**. Local: copy `.env.example` → `.env`.

## Local progress

Completing a daily puzzle stores a streak in `localStorage` (`dwh-progress-v1`) and offers Share on the win dialog.

## Accounts & leaderboard (Cloudflare)

- **Google sign-in** → `/api/auth/google` (Pages Function)
- **D1** stores users, sessions, plays, events, weekly leaderboard
- **Practice** `/practice` — 100k puzzle IDs per theme (deterministic, not pre-stored JSON)
- Setup: see `ARCHITECTURE.md` (OAuth env + `wrangler d1 execute … schema.sql`)

## Roadmap (still open)

- Leaderboard UX polish / share cards
- More languages / deeper wordlists
- Print answer keys

## License

MIT — see [LICENSE](./LICENSE).  
Includes upstream AstroPaper theme under MIT (Sat Naing).
