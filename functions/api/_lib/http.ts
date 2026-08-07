export function json(
  data: unknown,
  init: ResponseInit & { status?: number } = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function redirect(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: { location },
  });
}

export function badRequest(msg: string): Response {
  return json({ error: msg }, { status: 400 });
}

export function unauthorized(msg = "Unauthorized"): Response {
  return json({ error: msg }, { status: 401 });
}

export function serverError(msg = "Server error"): Response {
  return json({ error: msg }, { status: 500 });
}

export function siteOrigin(request: Request, env: { SITE_URL?: string }): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  return url.origin;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function cookieHeader(
  name: string,
  value: string,
  opts: {
    maxAge?: number;
    httpOnly?: boolean;
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  } = {}
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path ?? "/"}`,
    `SameSite=${opts.sameSite ?? "Lax"}`,
  ];
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

export function clearCookie(name: string): string {
  return cookieHeader(name, "", { maxAge: 0 });
}
