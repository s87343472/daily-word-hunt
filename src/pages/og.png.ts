import type { APIRoute } from "astro";

/**
 * Dynamic OG generation needs Google fonts at build time.
 * On Free/offline builds we serve the static default image instead.
 */
export const GET: APIRoute = async ({ redirect }) => {
  return redirect("/default-og.jpg", 302);
};
