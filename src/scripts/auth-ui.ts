/**
 * Header auth chip: Sign in with Google / avatar + Sign out.
 */
import { fetchMe } from "./cloud-progress";

function qs<T extends HTMLElement>(sel: string) {
  return document.querySelector<T>(sel);
}

async function refreshAuthUi() {
  const root = qs("[data-auth-root]");
  if (!root) return;

  const signIn = qs<HTMLAnchorElement>("[data-auth-signin]");
  const menu = qs("[data-auth-menu]");
  const nameEl = qs("[data-auth-name]");
  const img = qs<HTMLImageElement>("[data-auth-avatar]");

  const { user, authConfigured } = await fetchMe();

  if (!authConfigured) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  if (!user) {
    if (signIn) signIn.hidden = false;
    if (menu) menu.hidden = true;
    return;
  }

  if (signIn) signIn.hidden = true;
  if (menu) menu.hidden = false;
  if (nameEl) {
    nameEl.textContent = user.name || user.email || "Signed in";
  }
  if (img) {
    if (user.picture_url) {
      img.src = user.picture_url;
      img.hidden = false;
    } else {
      img.hidden = true;
    }
  }
}

function wireLogout() {
  const btn = qs("[data-auth-logout]");
  if (!btn || btn.dataset.wired === "1") return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", async e => {
    e.preventDefault();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
      });
    } catch {
      /* ignore */
    }
    location.href = "/";
  });
}

function boot() {
  wireLogout();
  void refreshAuthUi();
}

boot();
document.addEventListener("astro:page-load", boot);
