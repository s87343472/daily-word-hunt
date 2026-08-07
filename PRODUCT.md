# Daily Word Hunt — product context (Impeccable)

## Product

Free browser **word search** (find-the-word / 划词). Home plays **today’s** puzzle from the default series. Themed calendars under `/packs`. Static on Cloudflare Pages.

## Surface: Home `/`

**Mode:** Operate first (play the board), then Read (explain below the fold).

**Visitor success:** Start today’s puzzle within one second of load; optionally learn rules and trust signals without leaving the page.

## Priority (reading order)

1. Letter grid + interaction (hero)
2. Minimal identity: title + today’s date
3. Secondary tools: how-to, series, past, print
4. Citable explainer for SEO/GEO (secondary)

## Voice

Calm, clear, product-first. Short sentences. No hype stacks. Prefer plain words over “delightful / seamless / powerful”.

## Visual world

- Dark and light themes via existing CSS variables in `src/styles/theme.css`
- Accent: orange in dark (`#ff6b01`), blue in light (`#006cac`)
- System UI type stack (no decorative display face)
- Board is the only “hero object”; no card-of-cards chrome around the grid
- Reading column ~65ch; body contrast WCAG AA on both themes

## Anti-references

- Purple gradients, Inter-only SaaS marketing kits
- Nested metric cards above the product
- Em-dash-heavy AI cadence
- Gray text on colored panels
