/**
 * Cookie / storage consent for analytics-ready compliance.
 *
 * - Necessary prefs (theme) do not require opt-in
 * - Analytics is OFF until the user opts in
 * - Choice in localStorage; reopen via footer "Cookie settings"
 * - Load analytics vendors only inside applyAnalyticsGate when granted
 */

export type ConsentState = {
  v: number;
  necessary: true;
  analytics: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "dwh-cookie-consent";
/** Bump to re-prompt after material category / policy changes */
export const CONSENT_VERSION = 1;
const EVENT = "dwh:cookie-consent";

export function defaultConsent(analytics = false): ConsentState {
  return {
    v: CONSENT_VERSION,
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
}

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (!parsed || parsed.v !== CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      v: CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState): void {
  const next: ConsentState = {
    v: CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(state.analytics),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  applyAnalyticsGate(next);
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

/**
 * Load analytics only after opt-in.
 * Configure via public env (Cloudflare Pages → Environment variables):
 *   PUBLIC_PLAUSIBLE_DOMAIN=words.sagasu.art
 *   PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
 * Never inject third-party scripts unless analytics === true.
 */
export function applyAnalyticsGate(
  state: ConsentState | null = readConsent()
): void {
  const allowed = state?.analytics === true;
  document.documentElement.dataset.analytics = allowed ? "granted" : "denied";

  if (allowed) {
    loadPlausible();
    loadGa4();
  } else {
    document.getElementById("dwh-plausible")?.remove();
    document.getElementById("dwh-ga4")?.remove();
    document.getElementById("dwh-ga4-config")?.remove();
  }

  if (import.meta.env.DEV) {
    (window as unknown as { __dwhAnalytics?: string }).__dwhAnalytics = allowed
      ? "granted"
      : "denied";
  }
}

function env(name: string): string {
  try {
    // Vite / Astro public env
    const v = (import.meta as ImportMeta & { env: Record<string, string> }).env[
      name
    ];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function loadPlausible() {
  const domain = env("PUBLIC_PLAUSIBLE_DOMAIN");
  if (!domain || document.getElementById("dwh-plausible")) return;
  const s = document.createElement("script");
  s.id = "dwh-plausible";
  s.defer = true;
  s.dataset.domain = domain;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

function loadGa4() {
  const id = env("PUBLIC_GA_MEASUREMENT_ID");
  if (!id || document.getElementById("dwh-ga4")) return;
  const s = document.createElement("script");
  s.id = "dwh-ga4";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  const cfg = document.createElement("script");
  cfg.id = "dwh-ga4-config";
  cfg.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', ${JSON.stringify(id)}, { anonymize_ip: true });
  `;
  document.head.appendChild(cfg);
}

export type CookieConsentApi = {
  get: () => ConsentState | null;
  hasAnalytics: () => boolean;
  open: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
};

declare global {
  interface Window {
    __cookieConsent?: CookieConsentApi;
  }
}

function qs<T extends HTMLElement>(sel: string) {
  return document.querySelector<T>(sel);
}

function setVisible(el: HTMLElement | null, open: boolean) {
  if (!el) return;
  el.hidden = !open;
  el.setAttribute("aria-hidden", open ? "false" : "true");
}

function openPreferences() {
  const panel = qs("[data-cc-panel]");
  const banner = qs("[data-cc-banner]");
  const analyticsToggle = qs<HTMLInputElement>("[data-cc-analytics]");
  const current = readConsent() ?? defaultConsent(false);
  if (analyticsToggle) analyticsToggle.checked = current.analytics;
  setVisible(banner, false);
  setVisible(panel, true);
  panel
    ?.querySelector<HTMLElement>("button, [href], input")
    ?.focus();
}

function closePreferences() {
  const panel = qs("[data-cc-panel]");
  const banner = qs("[data-cc-banner]");
  setVisible(panel, false);
  if (!readConsent()) setVisible(banner, true);
}

function acceptAll() {
  writeConsent(defaultConsent(true));
  setVisible(qs("[data-cc-banner]"), false);
  setVisible(qs("[data-cc-panel]"), false);
}

function rejectOptional() {
  writeConsent(defaultConsent(false));
  setVisible(qs("[data-cc-banner]"), false);
  setVisible(qs("[data-cc-panel]"), false);
}

function saveCustom() {
  const analyticsToggle = qs<HTMLInputElement>("[data-cc-analytics]");
  writeConsent(defaultConsent(Boolean(analyticsToggle?.checked)));
  setVisible(qs("[data-cc-banner]"), false);
  setVisible(qs("[data-cc-panel]"), false);
}

function refreshUi() {
  const banner = qs("[data-cc-banner]");
  const panel = qs("[data-cc-panel]");
  const existing = readConsent();
  applyAnalyticsGate(existing);
  setVisible(panel, false);
  setVisible(banner, !existing);
}

function onClick(e: MouseEvent) {
  const t = (e.target as HTMLElement | null)?.closest?.(
    "[data-cc-accept], [data-cc-reject], [data-cc-manage], [data-cc-save], [data-cc-close], [data-cc-open]"
  ) as HTMLElement | null;
  if (!t) return;

  if (t.hasAttribute("data-cc-open") || t.hasAttribute("data-cc-manage")) {
    e.preventDefault();
    openPreferences();
    return;
  }
  if (t.hasAttribute("data-cc-accept")) {
    e.preventDefault();
    acceptAll();
    return;
  }
  if (t.hasAttribute("data-cc-reject")) {
    e.preventDefault();
    rejectOptional();
    return;
  }
  if (t.hasAttribute("data-cc-save")) {
    e.preventDefault();
    saveCustom();
    return;
  }
  if (t.hasAttribute("data-cc-close")) {
    e.preventDefault();
    closePreferences();
  }
}

let wired = false;

function ensureWired() {
  if (wired) return;
  wired = true;
  document.addEventListener("click", onClick);
  window.__cookieConsent = {
    get: readConsent,
    hasAnalytics: hasAnalyticsConsent,
    open: openPreferences,
    acceptAll,
    rejectOptional,
  };
}

function init() {
  ensureWired();
  // CookieConsent lives in Layout; after client navigations re-sync visibility
  refreshUi();
}

init();
document.addEventListener("astro:page-load", init);
