/**
 * Pack / series registry — frontend + build share the same catalog shape.
 * Source of truth: packs/catalog.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type PackSchedule = "calendar" | "catalog";

export type PackMeta = {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  theme: string;
  schedule: PackSchedule;
  wordlist: string;
  featured?: boolean;
  nav?: boolean;
  size?: number;
  wordsPerDay?: number;
  dedupeDays?: number;
  horizonDays?: number;
};

export type PackCatalog = {
  version: number;
  defaultPackId: string;
  packs: PackMeta[];
};

const catalogPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packs/catalog.json"
);

let cached: PackCatalog | null = null;

export function loadCatalog(): PackCatalog {
  if (cached) return cached;
  cached = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as PackCatalog;
  return cached;
}

export function getAllPacks(): PackMeta[] {
  return loadCatalog().packs;
}

export function getPack(id: string): PackMeta | undefined {
  return getAllPacks().find(p => p.id === id);
}

export function getDefaultPack(): PackMeta {
  const cat = loadCatalog();
  return (
    getPack(cat.defaultPackId) ??
    cat.packs[0] ?? {
      id: "daily",
      title: "Daily Word Hunt",
      description: "Daily word search",
      theme: "general",
      schedule: "calendar",
      wordlist: "wordlists/packs/daily.json",
    }
  );
}

export function getNavPacks(): PackMeta[] {
  return getAllPacks().filter(p => p.nav !== false);
}

export function getFeaturedPacks(): PackMeta[] {
  return getAllPacks().filter(p => p.featured);
}

/** Public URL path for a calendar puzzle JSON (leading slash, no base). */
export function puzzleJsonPath(packId: string, isoDate: string): string {
  return `/puzzles/${packId}/${isoDate}.json`;
}

/** Filesystem dir for a pack’s puzzles under public/. */
export function packPuzzlesFsDir(packId: string): string {
  return path.join(process.cwd(), "public/puzzles", packId);
}

/** List YYYY-MM-DD puzzle files for a pack (sorted ascending). */
export function listPackDates(packId: string): string[] {
  const dir = packPuzzlesFsDir(packId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map(f => f.replace(/\.json$/, ""))
    .sort();
}
