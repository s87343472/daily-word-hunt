# Daily Word Hunt — local product map

Play lives on **`/`**. GitHub/Pages comes later; perfect content locally first.

## Primary pages

| Path | Purpose |
|------|---------|
| `/` | **Today’s puzzle** (main product) |
| `/how-to` | How to play |
| `/past` | List of released daily dates |
| `/daily/YYYY-MM-DD` | One past day (share / deep link) |
| `/print` | Printable today |
| `/about` | Product about + roadmap |
| `/faq` | Frequently asked questions |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |
| `/contact` | Contact (replace template email before launch) |
| `/posts` | Tips & guides (not the main play entry) |
| `/search` | Search tips |

## Nav

**Today · How to · Past · Tips · About** (+ theme + search)

## Content sources

- Pages: `src/content/pages/*.md`
- Tips: `src/content/posts/*.md`
- Daily grids: `public/puzzles/YYYY-MM-DD.json`
- Word pool: `wordlists/daily-pool.json`
- Demo AstroPaper posts archived under `src/content/_archived-demo-posts/` (not published)

## Generate more dailies

```bash
pnpm gen:puzzle --wordlist wordlists/daily-pool.json --from 2027-01-01 --to 2027-03-31
```

## Cookie consent

- UI: `src/components/CookieConsent.astro`
- Logic: `src/scripts/cookie-consent.ts`
- Storage key: `dwh-cookie-consent` (localStorage)
- Analytics **default off**; load vendor scripts only when `hasAnalyticsConsent()`
- Footer: **Cookie settings** reopens the panel

## SEO (Phase A+)

| Area | Implementation |
|------|----------------|
| Meta | Every product page has unique title + description |
| `noindex` | `/search`; unreleased `/daily/YYYY-MM-DD` (date > today in site TZ) |
| robots.txt | Disallow `/search`; sitemap link |
| sitemap | Excludes search, archives (if off), play redirects, future dailies |
| Home | H1 + copy; JSON-LD `WebSite` + `WebApplication` |
| FAQ / How-to | `FAQPage` / `HowTo` + breadcrumbs |
| Daily | Word list in HTML; `WebPage` schema when released |
| Schemas | `src/lib/seo/schemas.ts`, `JsonLd.astro` |

### After each deploy (manual)

1. [Google Search Console](https://search.google.com/search-console) → add `https://daily-word-hunt.pages.dev`  
2. Submit `https://daily-word-hunt.pages.dev/sitemap-index.xml`  
3. Optional: Bing Webmaster Tools same sitemap  

## Later

- Wire real analytics vendor inside `applyAnalyticsGate`  
- Themed packs UI  
- D1 leaderboard  
- CI auto-generate  
- Custom domain + update `site.url`
