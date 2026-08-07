/**
 * Temporary: list env binding *names* (no secret values).
 * Remove after OAuth is verified.
 */
export const onRequestGet: PagesFunction<Record<string, unknown>> = async ({
  env,
}) => {
  const keys = Object.keys(env || {}).sort();
  const out = {
    keys,
    has_DB: !!env.DB,
    has_GOOGLE_CLIENT_ID: typeof env.GOOGLE_CLIENT_ID === "string" && !!env.GOOGLE_CLIENT_ID,
    has_GOOGLE_CLIENT_SECRET:
      typeof env.GOOGLE_CLIENT_SECRET === "string" && !!env.GOOGLE_CLIENT_SECRET,
    has_SITE_URL: typeof env.SITE_URL === "string" && !!env.SITE_URL,
    client_id_prefix:
      typeof env.GOOGLE_CLIENT_ID === "string"
        ? String(env.GOOGLE_CLIENT_ID).slice(0, 12)
        : null,
    site_url: typeof env.SITE_URL === "string" ? env.SITE_URL : null,
  };
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
