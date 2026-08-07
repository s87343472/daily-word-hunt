import type { APIRoute } from "astro";

const getRobotsTxt = (sitemapURL: URL, sitemapAlias: URL, llmsURL: URL) =>
  `User-agent: *
Allow: /

# Site search is a tool UI, not a landing page
Disallow: /search
Disallow: /search/

# AI / LLM site summary (optional discovery)
# ${llmsURL.href}

Sitemap: ${sitemapAlias.href}
Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  const sitemapAlias = new URL("sitemap.xml", site);
  const llmsURL = new URL("llms.txt", site);
  return new Response(getRobotsTxt(sitemapURL, sitemapAlias, llmsURL));
};
