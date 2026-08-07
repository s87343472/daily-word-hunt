import type { APIRoute } from "astro";
import config from "@/config";

/**
 * Per-post dynamic OG images need Astro font providers (e.g. Google).
 * We use a system font stack offline — keep this route disabled.
 * Re-enable with fonts in astro.config.ts + features.dynamicOgImage: true.
 */
export async function getStaticPaths() {
  return [];
}

export const GET: APIRoute = async () => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }
  return new Response("Dynamic OG requires font config", { status: 501 });
};
