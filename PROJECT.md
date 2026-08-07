# Daily Word Hunt — project map

**Live:** https://words.sagasu.art/  
**Repo:** https://github.com/s87343472/daily-word-hunt  
**Pages project URL (legacy):** https://daily-word-hunt.pages.dev/ (redirect to custom domain if configured)

Play lives on **`/`**. Hosting: Cloudflare Pages + GitHub.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Today’s puzzle (series `daily`) |
| `/packs` | Series & themes directory |
| `/packs/{id}` | Pack hub (today + archive) |
| `/packs/{id}/{date}` | One day of a series |
| `/past` | Default-pack date list |
| `/daily/YYYY-MM-DD` | Short URL for default pack day |
| `/print` | Printable today |
| `/how-to`, `/faq`, `/about` | Help & product |
| `/privacy`, `/terms`, `/contact` | Legal & contact |
| `/posts` | Tips & guides |
| `/search` | Search tips (`noindex`) |

**Nav:** Today · How to · Series · Past · Tips · FAQ · About

## Packs

| Piece | Location |
|-------|----------|
| Registry | `packs/catalog.json` |
| Word pools | `wordlists/packs/{id}.json` |
| Generated grids | `public/puzzles/{id}/YYYY-MM-DD.json` |
| CLI | `pnpm gen:packs` / `pnpm gen:puzzle --pack …` |
| Action | `.github/workflows/generate-puzzles.yml` |

Content pages: `src/content/pages/*.md`  
Tips: `src/content/posts/*.md`  
Old AstroPaper demo posts: `src/content/_archived-demo-posts/` (not published)

## Cookie consent

- UI: `src/components/CookieConsent.astro`
- Logic: `src/scripts/cookie-consent.ts`
- Key: `dwh-cookie-consent` (localStorage)
- Analytics **off** until opt-in; wire vendor in `applyAnalyticsGate`

## SEO

- Unique title/description on product pages
- `noindex`: `/search`, unreleased future pack dates
- robots + filtered sitemap
- Home: WebSite + WebApplication JSON-LD
- FAQ / How-to schemas; daily/pack pages with word lists

After deploy: Search Console → property **https://words.sagasu.art** + submit  
`https://words.sagasu.art/sitemap-index.xml`

## Later

- D1 leaderboard (optional nicknames)
- Optional login
- More packs / languages
- Real analytics after consent
