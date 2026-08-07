/**
 * Cookie consent UI + Google Consent Mode updates.
 *
 * GA4 gtag + consent defaults live in Layout.astro <head> (static HTML so
 * Google’s installer / Tag Assistant can detect the measurement ID).
 *
 * This module only:
 * - updates consent when the user Accept / Reject / Save
 * - optionally loads Plausible (cookieless aggregate stats)
 *
 * Advanced Consent Mode:
 * - Default (head): analytics_storage / ad_* = denied → cookieless pings
 * - Accept: consent update → granted → full cookies + detailed measurement
 * - Reject: stays denied → still cookieless pings for basic volume/modeling
 *
 * @see https://support.google.com/tagmanager/answer/10000067
 * @see https://developers.google.com/tag-platform/security/guides/consent
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
 * Apply consent state to DOM + gtag (head already loaded GA when configured).
 * Env (Cloudflare Pages build):
 *   PUBLIC_GA_MEASUREMENT_ID=G-SZMGNMBD0Z  (Layout head)
 *   PUBLIC_PLAUSIBLE_DOMAIN=words.sagasu.art  (optional, cookieless)
 */
export function applyAnalyticsGate(
  state: ConsentState | null = readConsent()
): void {
  const allowed = state?.analytics === true;
  document.documentElement.dataset.analytics = allowed ? "granted" : "denied";

  updateGaConsent(allowed);
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

function updateGaConsent(analyticsGranted: boolean) {
  // Head snippet only present when PUBLIC_GA_MEASUREMENT_ID was set at build
  const fn = window.gtag;
  if (typeof fn !== "function") return;
  const storage = analyticsGranted ? "granted" : "denied";
  fn("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: storage,
  });
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
  // Sync consent update (gtag already in head; cookieless until Accept)
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
