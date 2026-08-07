# Contributing to Daily Word Hunt

Thanks for your interest. This repo is a **product site** (daily word search), not the upstream AstroPaper theme.

## Setup

```bash
pnpm install
pnpm dev
```

## Useful commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Local site |
| `pnpm build` | Production `dist/` |
| `pnpm gen:packs` | Refill calendar puzzles for all packs |
| `pnpm lint` / `pnpm format` | Code quality |

## Adding a themed series

1. Add an entry to `packs/catalog.json`
2. Add `wordlists/packs/{id}.json`
3. Run `pnpm gen:puzzle --pack {id} --horizon 21`
4. Open `/packs/{id}` after `pnpm dev`

## PRs

- Keep play static-first (no server-side grid generation for players)
- Prefer small, focused PRs
- Run `pnpm build` before opening a PR when you touch routes or puzzles

## Issues

Bug reports: include **date**, **pack** (e.g. `daily` / `nature`), browser, and what you expected.
