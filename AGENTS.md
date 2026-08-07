# Agent notes — Daily Word Hunt

## Product

- Word **search** (划词), not fill-in Wordscapes
- Home `/` plays **today** from pack `daily`
- Series live under `/packs` and `public/puzzles/{packId}/`
- Static-first on Cloudflare Pages; no puzzle generation on request

## Dev

```bash
pnpm install
pnpm dev
pnpm build
pnpm gen:packs
```

Node ≥ 22.12. Prefer `pnpm`.

## Important paths

| Path | Role |
|------|------|
| `packs/catalog.json` | Pack registry |
| `wordlists/packs/` | Theme word pools |
| `public/puzzles/{id}/` | Dated JSON grids |
| `scripts/gen-puzzle.mjs` | Generator CLI |
| `src/components/game/WordSearchGame.astro` | Player UI |
| `src/lib/puzzle/packs.ts` | Pack helpers |
| `ARCHITECTURE.md` | System design |
| `PROJECT.md` | Route / ops map |

## Do not

- Generate puzzles on the player request path
- Commit secrets / `.env`
- Restore AstroPaper demo posts into the published `posts` collection without intent

## Docs

Astro framework: https://docs.astro.build  
This product: README + ARCHITECTURE + PROJECT.
