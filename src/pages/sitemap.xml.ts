import type { APIRoute } from "astro";

/**
 * SEO tools often probe /sitemap.xml only.
 * Astro's @astrojs/sitemap writes sitemap-index.xml + sitemap-0.xml;
 * this route serves a valid sitemap index at the conventional path.
 */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://words.sagasu.art/");
  const child = new URL("sitemap-0.xml", base).href;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${child}</loc>
  </sitemap>
</sitemapindex>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
