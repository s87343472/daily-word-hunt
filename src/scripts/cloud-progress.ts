/**
 * Sync completions to Cloudflare D1 via Pages Functions (when logged in).
 * Listens for dwh:puzzle-complete from WordSearchGame.
 */
export type CompleteDetail = {
  packId: string;
  playDate?: string;
  timeMs: number;
  playKind?: "daily" | "practice";
  practiceBankId?: number;
  hintsUsed?: number;
  success?: boolean;
};

export async function fetchMe(): Promise<{
  user: {
    id: string;
    email: string | null;
    name: string | null;
    picture_url: string | null;
  } | null;
  authConfigured: boolean;
}> {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) return { user: null, authConfigured: false };
    return (await res.json()) as {
      user: {
        id: string;
        email: string | null;
        name: string | null;
        picture_url: string | null;
      } | null;
      authConfigured: boolean;
    };
  } catch {
    return { user: null, authConfigured: false };
  }
}

export async function postProgress(detail: CompleteDetail): Promise<boolean> {
  const kind = detail.playKind === "practice" ? "practice" : "daily";
  const puzzleKey =
    kind === "practice"
      ? String(detail.practiceBankId ?? "")
      : String(detail.playDate ?? "");
  if (!puzzleKey) return false;

  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        pack: detail.packId || "daily",
        puzzleKey,
        timeMs: detail.timeMs,
        hintsUsed: detail.hintsUsed ?? 0,
        success: detail.success !== false,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function onComplete(ev: Event) {
  const detail = (ev as CustomEvent<CompleteDetail>).detail;
  if (!detail) return;
  void postProgress(detail);
}

let wired = false;
export function initCloudProgress() {
  if (wired) return;
  wired = true;
  document.addEventListener("dwh:puzzle-complete", onComplete);
}

initCloudProgress();
document.addEventListener("astro:page-load", initCloudProgress);
