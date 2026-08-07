#!/usr/bin/env node
/**
 * Offline puzzle generator — pack / series aware.
 *
 * Layout:
 *   packs/catalog.json          → pack registry
 *   wordlists/packs/{id}.json   → word pools
 *   public/puzzles/{id}/YYYY-MM-DD.json  → calendar series output
 *
 * Usage:
 *   pnpm gen:puzzle --pack daily --date 2026-08-07
 *   pnpm gen:puzzle --pack nature --from 2026-08-07 --to 2026-08-28
 *   pnpm gen:puzzle --all-packs --horizon 21
 *   pnpm gen:puzzle --wordlist wordlists/sample-daily.json --out public/puzzles/sample.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WordSearch from "@blex41/word-search";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUZZLES_DIR = path.join(root, "public/puzzles");
const CATALOG_PATH = path.join(root, "packs/catalog.json");
const DEFAULT_DEDUPE_DAYS = 30;

function parseArgs(argv) {
  const args = {
    wordlist: null,
    out: null,
    date: null,
    from: null,
    to: null,
    size: null,
    wordsPerDay: null,
    dedupeDays: null,
    force: false,
    pack: null,
    allPacks: false,
    horizon: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--wordlist") args.wordlist = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--date") args.date = argv[++i];
    else if (a === "--from") args.from = argv[++i];
    else if (a === "--to") args.to = argv[++i];
    else if (a === "--size") args.size = Number(argv[++i]);
    else if (a === "--words-per-day") args.wordsPerDay = Number(argv[++i]);
    else if (a === "--dedupe-days") args.dedupeDays = Number(argv[++i]);
    else if (a === "--pack") args.pack = argv[++i];
    else if (a === "--all-packs") args.allPacks = true;
    else if (a === "--horizon") args.horizon = Number(argv[++i]);
    else if (a === "--force") args.force = true;
  }
  return args;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeWord(w) {
  return String(w).replace(/[^a-zA-Z]/g, "").toUpperCase();
}

function parseISODate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid date (want YYYY-MM-DD): ${s}`);
  }
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatISODate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDate(from, to) {
  const out = [];
  let cur = parseISODate(from);
  const end = parseISODate(to);
  if (cur > end) throw new Error(`--from must be <= --to`);
  while (cur <= end) {
    out.push(formatISODate(cur));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

function addDaysISO(iso, delta) {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return formatISODate(d);
}

function todayUTC() {
  return formatISODate(new Date());
}

function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}

function packDir(packId) {
  return path.join(PUZZLES_DIR, packId);
}

function puzzleFilePath(packId, playDate) {
  return path.join(packDir(packId), `${playDate}.json`);
}

function loadPuzzleWords(filePath) {
  try {
    const j = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return new Set((j.words ?? []).map(w => normalizeWord(w.word)));
  } catch {
    return new Set();
  }
}

function recentUsedWords(packId, playDate, dedupeDays) {
  const used = new Set();
  for (let i = 1; i <= dedupeDays; i++) {
    const prev = addDaysISO(playDate, -i);
    const p = puzzleFilePath(packId, prev);
    if (!fs.existsSync(p)) continue;
    for (const w of loadPuzzleWords(p)) used.add(w);
  }
  return used;
}

function pickDailyWords(pool, packId, playDate, wordsPerDay, recent) {
  const rand = mulberry32(hashString(`pack:${packId}:${playDate}`));
  const all = pool.words.map(w => ({
    word: normalizeWord(w.word),
    gloss: w.gloss ?? "",
  }));
  const fresh = all.filter(w => !recent.has(w.word));
  const poolToUse = fresh.length >= wordsPerDay ? fresh : all;
  const arr = [...poolToUse];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const picked = arr.slice(0, wordsPerDay);
  if (picked.length < wordsPerDay) {
    throw new Error(
      `Pool too small for ${packId}: need ${wordsPerDay}, have ${picked.length}`
    );
  }
  const overlap = picked.filter(w => recent.has(w.word)).map(w => w.word);
  return { picked, overlap, usedFresh: fresh.length >= wordsPerDay };
}

function placeGrid(dictionary, size) {
  const sizes = [size, size + 1, size + 2];
  let last = null;
  for (const n of sizes) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const ws = new WordSearch({
        cols: n,
        rows: n,
        dictionary,
        maxWords: dictionary.length,
        upperCase: true,
        backwardsProbability: 0.35,
        maxRetries: 25,
      });
      const words = ws.words ?? [];
      last = { ws, n, words };
      if (words.length === dictionary.length) return last;
    }
  }
  return last;
}

function generatePuzzle(wordlistSlice, meta) {
  const dictionary = wordlistSlice.map(w => w.word);
  const glossByWord = new Map(wordlistSlice.map(w => [w.word, w.gloss]));
  const n = meta.size ?? 10;
  const placed = placeGrid(dictionary, n);
  if (!placed || placed.words.length < dictionary.length) {
    const got = placed?.words?.length ?? 0;
    throw new Error(
      `Could not place all words for ${meta.id}: ${got}/${dictionary.length}`
    );
  }
  const { ws, n: rows } = placed;
  const grid = ws.data.grid.map(row => row.map(ch => String(ch).toUpperCase()));
  const words = placed.words.map(w => ({
    word: w.word.toUpperCase(),
    gloss: glossByWord.get(w.word.toUpperCase()) ?? "",
    path: w.path.map(p => ({
      r: typeof p.y === "number" ? p.y : p.r ?? 0,
      c: typeof p.x === "number" ? p.x : p.c ?? 0,
    })),
  }));

  return {
    id: meta.id,
    playDate: meta.playDate,
    pack: meta.pack,
    series: meta.series ?? meta.pack,
    theme: meta.theme,
    title: meta.title,
    description: meta.description,
    rows,
    cols: rows,
    grid,
    words,
    largePrintFriendly: rows <= 12,
    createdAt: new Date().toISOString(),
  };
}

function writePuzzle(outPath, puzzle) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(puzzle, null, 2) + "\n");
}

function generateOneCalendarDay(packMeta, pool, playDate, opts) {
  const packId = packMeta.id;
  const wordsPerDay =
    opts.wordsPerDay ??
    packMeta.wordsPerDay ??
    pool.wordsPerDay ??
    Math.min(8, pool.words.length);
  const size = opts.size ?? packMeta.size ?? pool.size ?? 10;
  const dedupeDays =
    opts.dedupeDays ?? packMeta.dedupeDays ?? DEFAULT_DEDUPE_DAYS;
  const outPath = puzzleFilePath(packId, playDate);

  if (fs.existsSync(outPath) && !opts.force) {
    console.log(`Skip ${packId}/${playDate} (exists; use --force)`);
    return { skipped: true, packId, playDate };
  }

  const recent = recentUsedWords(packId, playDate, dedupeDays);
  const { picked, overlap, usedFresh } = pickDailyWords(
    pool,
    packId,
    playDate,
    wordsPerDay,
    recent
  );

  if (!usedFresh) {
    console.warn(
      `  warn ${packId}/${playDate}: pool exhausted for ${dedupeDays}d window`
    );
  }

  const puzzle = generatePuzzle(picked, {
    id: `${packId}-${playDate}`,
    playDate,
    pack: packId,
    series: packId,
    theme: packMeta.theme,
    title: packMeta.title ?? pool.title,
    description: packMeta.description ?? pool.description,
    size,
  });

  writePuzzle(outPath, puzzle);
  console.log(
    `Wrote public/puzzles/${packId}/${playDate}.json (${puzzle.words.length} words, ${puzzle.rows}x${puzzle.cols}${overlap.length ? `, reuse:${overlap.length}` : ""})`
  );
  return { skipped: false, packId, playDate };
}

function generatePackRange(packMeta, from, to, opts) {
  const wordlistPath = path.resolve(root, packMeta.wordlist);
  if (!fs.existsSync(wordlistPath)) {
    throw new Error(`Missing wordlist for pack ${packMeta.id}: ${packMeta.wordlist}`);
  }
  const pool = JSON.parse(fs.readFileSync(wordlistPath, "utf8"));
  const dates = eachDate(from, to);
  let wrote = 0;
  let skipped = 0;
  for (const d of dates) {
    const r = generateOneCalendarDay(packMeta, pool, d, opts);
    if (r.skipped) skipped++;
    else wrote++;
  }
  return { wrote, skipped, packId: packMeta.id };
}

function generateLegacyOut(wordlist, outRel, { id, playDate, size }) {
  const slice = wordlist.words.map(w => ({
    word: normalizeWord(w.word),
    gloss: w.gloss ?? "",
  }));
  const puzzle = generatePuzzle(slice, {
    id,
    playDate,
    pack: wordlist.pack,
    series: wordlist.pack,
    theme: wordlist.theme,
    title: wordlist.title,
    description: wordlist.description,
    size: size ?? wordlist.size ?? 12,
  });
  const outPath = path.resolve(root, outRel);
  writePuzzle(outPath, puzzle);
  console.log(
    `Wrote ${outRel} (${puzzle.words.length} words, ${puzzle.rows}x${puzzle.cols})`
  );
}

// --- main ---
const args = parseArgs(process.argv);
const catalog = loadCatalog();

if (args.allPacks || args.pack || args.horizon != null) {
  const packs = args.pack
    ? catalog.packs.filter(p => p.id === args.pack)
    : catalog.packs.filter(p => p.schedule === "calendar");

  if (!packs.length) {
    console.error(args.pack ? `Unknown pack: ${args.pack}` : "No calendar packs");
    process.exit(1);
  }

  const horizon =
    args.horizon ??
    Math.max(...packs.map(p => p.horizonDays ?? 14), 14);
  const start = args.from ?? args.date ?? todayUTC();
  const end =
    args.to ??
    args.date ??
    addDaysISO(start, Math.max(horizon - 1, 0));

  console.log(`Generating packs [${packs.map(p => p.id).join(", ")}] ${start} → ${end}`);

  let totalWrote = 0;
  for (const packMeta of packs) {
    const r = generatePackRange(packMeta, start, end, {
      size: args.size,
      wordsPerDay: args.wordsPerDay,
      dedupeDays: args.dedupeDays,
      force: args.force,
    });
    totalWrote += r.wrote;
    console.log(`  ${r.packId}: wrote ${r.wrote}, skipped ${r.skipped}`);
  }
  console.log(`Done. New files: ${totalWrote}`);
  process.exit(0);
}

// Legacy single wordlist → single out (sample packs etc.)
if (!args.wordlist) {
  console.error(`Missing args.

Pack / series mode (preferred):
  pnpm gen:puzzle --all-packs --horizon 21
  pnpm gen:puzzle --pack nature --from 2026-08-07 --to 2026-09-01
  pnpm gen:puzzle --pack daily --date 2026-08-07 --force

Legacy single file:
  pnpm gen:puzzle --wordlist wordlists/sample-daily.json --out public/puzzles/sample.json
`);
  process.exit(1);
}

const wordlistPath = path.resolve(root, args.wordlist);
const pool = JSON.parse(fs.readFileSync(wordlistPath, "utf8"));
const playDate = args.date ?? null;
const id = playDate ? `pack-${pool.pack}-${playDate}` : `pack-${pool.pack}`;
const outRel =
  args.out ??
  (playDate
    ? `public/puzzles/${pool.pack}/${playDate}.json`
    : `public/puzzles/${pool.pack}.json`);

generateLegacyOut(pool, outRel, {
  id,
  playDate,
  size: args.size ?? pool.size,
});
