/**
 * Cookie consent + Google Consent Mode (Advanced).
 *
 * Product requirement: even if the user rejects optional analytics cookies,
 * we still need baseline traffic visibility in GA4.
 *
 * Implementation (Google Consent Mode v2 — Advanced style):
 * - gtag always loads when PUBLIC_GA_MEASUREMENT_ID is set
 * - Default: analytics_storage / ad_* = denied → cookieless pings only
 * - Accept: consent update → granted → full cookies + detailed measurement
 * - Reject: stays denied → still cookieless pings for basic volume/modeling
 *
 * Plausible (if configured) is cookieless and loads for aggregate pageviews.
 *
 * @see https://support.google.com/tagmanager/answer/10000067
 * @see https://support.google.com/tagmanager/answer/13802165
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

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    __cookieConsent?: CookieConsentApi;
  }
}

/**
 * Apply consent + ensure baseline GA (cookieless when denied).
 * Env (Cloudflare Pages build):
 *   PUBLIC_GA_MEASUREMENT_ID=G-SZMGNMBD0Z
 *   PUBLIC_PLAUSIBLE_DOMAIN=words.sagasu.art  (optional, cookieless)
 */
export function applyAnalyticsGate(
  state: ConsentState | null = readConsent()
): void {
  const allowed = state?.analytics === true;
  document.documentElement.dataset.analytics = allowed ? "granted" : "denied";

  // Always arm GA when configured (Advanced consent mode)
  ensureGa4Loaded();
  updateGaConsent(allowed);

  // Plausible is cookieless aggregate stats — always on when domain configured
  ensurePlausibleLoaded();

  if (import.meta.env.DEV) {
    (window as unknown as { __dwhAnalytics?: string }).__dwhAnalytics = allowed
      ? "granted"
      : "denied-cookieless";
  }
}

function env(name: string): string {
  try {
    const v = (import.meta as ImportMeta & { env: Record<string, string> }).env[
      name
    ];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // dataLayer.push with Arguments-like object (Google's pattern)
  window.dataLayer.push(args);
  if (typeof window.gtag === "function" && window.gtag !== gtag) {
    window.gtag(...args);
  }
}

/**
 * Ensure gtag exists and consent defaults are denied *before* config fires.
 */
function ensureGa4Loaded() {
  const id = env("PUBLIC_GA_MEASUREMENT_ID");
  if (!id) return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtagStub() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    } as GtagFn;
  }

  // Consent defaults must run before any config (Consent Mode v2)
  if (!document.getElementById("dwh-ga4-consent-default")) {
    const def = document.createElement("script");
    def.id = "dwh-ga4-consent-default";
    def.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500
      });
    `;
    document.head.appendChild(def);
  }

  if (!document.getElementById("dwh-ga4")) {
    const s = document.createElement("script");
    s.id = "dwh-ga4";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  }

  if (!document.getElementById("dwh-ga4-config")) {
    const cfg = document.createElement("script");
    cfg.id = "dwh-ga4-config";
    cfg.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', ${JSON.stringify(id)}, {
        anonymize_ip: true,
        send_page_view: true
      });
    `;
    document.head.appendChild(cfg);
  }
}

function updateGaConsent(analyticsGranted: boolean) {
  if (!env("PUBLIC_GA_MEASUREMENT_ID")) return;
  const storage = analyticsGranted ? "granted" : "denied";
  const fn = window.gtag;
  if (typeof fn === "function") {
    fn("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: storage,
    });
  }
}

function ensurePlausibleLoaded() {
  const domain = env("PUBLIC_PLAUSIBLE_DOMAIN");
  if (!domain || document.getElementById("dwh-plausible")) return;
  const s = document.createElement("script");
  s.id = "dwh-plausible";
  s.defer = true;
  s.dataset.domain = domain;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

export type CookieConsentApi = {
  get: () => ConsentState | null;
  hasAnalytics: () => boolean;
  open: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
};

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
  panel?.querySelector<HTMLElement>("button, [href], input")?.focus();
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
  // Always start measurement (cookieless until Accept)
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
  refreshUi();
}

init();
document.addEventListener("astro:page-load", init);
