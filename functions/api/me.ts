import type { Env } from "./_lib/env";
import { json, unauthorized } from "./_lib/http";
import { getUserFromRequest } from "./_lib/session";

/**
 * GET /api/me — current user (null if anonymous)
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  if (!env.DB) {
    return json({ user: null, authConfigured: false });
  }
  try {
    const sess = await getUserFromRequest(request, env);
    if (!sess) return json({ user: null, authConfigured: true });
    return json({ user: sess.user, authConfigured: true });
  } catch {
    // DB not provisioned yet
    return json({ user: null, authConfigured: false });
  }
};
