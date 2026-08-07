#!/usr/bin/env node
/**
 * Offline puzzle generator for Cloudflare Pages (static JSON).
 *
 * Daily model (user-facing):
 *   Puzzles are pre-built and released by calendar date.
 *   Near-term word sets avoid overlap with the previous N days (default 30).
 *
 * Usage:
 *   pnpm gen:puzzle --wordlist wordlists/sample-daily.json --out public/puzzles/sample.json
 *   pnpm gen:puzzle --wordlist wordlists/daily-pool.json --date 2026-08-06
 *   pnpm gen:puzzle --wordlist wordlists/daily-pool.json --from 2026-08-01 --to 2026-08-31
 *   pnpm gen:daily   # convenience: next 14 days from today (UTC date)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WordSearch from "@blex41/word-search";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUZZLES_DIR = path.join(root, "public/puzzles");
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
    dedupeDays: DEFAULT_DEDUPE_DAYS,
    force: false,
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
    else if (a === "--force") args.force = true;
  }
  return args;
}

/** Simple deterministic PRNG from string seed (mulberry32). */
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

function loadPuzzleWords(filePath) {
  try {
    const j = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return new Set((j.words ?? []).map(w => normalizeWord(w.word)));
  } catch {
    return new Set();
  }
}

/** Collect words used by puzzles in [date - dedupeDays, date). */
function recentUsedWords(playDate, dedupeDays) {
  const used = new Set();
  for (let i = 1; i <= dedupeDays; i++) {
    const prev = addDaysISO(playDate, -i);
    const p = path.join(PUZZLES_DIR, `${prev}.json`);
    if (!fs.existsSync(p)) continue;
    for (const w of loadPuzzleWords(p)) used.add(w);
  }
  return used;
}

/**
 * Pick wordsPerDay entries from pool, avoiding recent words when possible.
 * Deterministic for (playDate + pool title).
 */
function pickDailyWords(pool, playDate, wordsPerDay, recent) {
  const rand = mulberry32(hashString(`daily:${playDate}:${pool.pack}`));
  const all = pool.words.map(w => ({
    word: normalizeWord(w.word),
    gloss: w.gloss ?? "",
  }));

  const fresh = all.filter(w => !recent.has(w.word));
  const poolToUse = fresh.length >= wordsPerDay ? fresh : all;

  // Fisher–Yates with seeded rand
  const arr = [...poolToUse];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const picked = arr.slice(0, wordsPerDay);
  if (picked.length < wordsPerDay) {
    throw new Error(
      `Pool too small: need ${wordsPerDay} words, have ${picked.length}`
    );
  }

  // Prefer no overlap; if we had to use full pool, still OK but warn
  const overlap = picked.filter(w => recent.has(w.word)).map(w => w.word);
  return { picked, overlap, usedFresh: fresh.length >= wordsPerDay };
}

function placeGrid(dictionary, size) {
  // Retry placement with slightly larger grids if needed
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

function generatePuzzle(wordlistSlice, { id, playDate, pack, title, description, size }) {
  const dictionary = wordlistSlice.map(w => w.word);
  const glossByWord = new Map(wordlistSlice.map(w => [w.word, w.gloss]));
  const n = size ?? 10;

  const placed = placeGrid(dictionary, n);
  if (!placed || placed.words.length < dictionary.length) {
    const got = placed?.words?.length ?? 0;
    throw new Error(
      `Could not place all words for ${id}: ${got}/${dictionary.length}`
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
    id,
    playDate,
    pack,
    title,
    description,
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

function generateOneDaily(pool, playDate, opts) {
  const wordsPerDay =
    opts.wordsPerDay ?? pool.wordsPerDay ?? Math.min(8, pool.words.length);
  const size = opts.size ?? pool.size ?? 10;
  const outPath = path.join(PUZZLES_DIR, `${playDate}.json`);

  if (fs.existsSync(outPath) && !opts.force) {
    console.log(`Skip ${playDate} (exists; use --force to overwrite)`);
    return { skipped: true, playDate };
  }

  const recent = recentUsedWords(playDate, opts.dedupeDays);
  const { picked, overlap, usedFresh } = pickDailyWords(
    pool,
    playDate,
    wordsPerDay,
    recent
  );

  if (!usedFresh) {
    console.warn(
      `  warn ${playDate}: pool exhausted for ${opts.dedupeDays}d window; allowing some word reuse`
    );
  } else if (overlap.length) {
    console.warn(`  warn ${playDate}: unexpected overlap ${overlap.join(",")}`);
  }

  const title =
    playDate === formatISODate(new Date())
      ? pool.title
      : `${pool.title} · ${playDate}`;

  const puzzle = generatePuzzle(picked, {
    id: `daily-${playDate}`,
    playDate,
    pack: pool.pack ?? "daily",
    title: pool.title ?? "Daily Word Hunt",
    description: pool.description,
    size,
  });

  // Keep display title clean for today; still store playDate
  puzzle.title = title.startsWith(pool.title) ? pool.title : puzzle.title;
  if (playDate) {
    // Always show a stable product title; date is in metadata / UI chrome
    puzzle.title = pool.title ?? "Daily Word Hunt";
  }

  writePuzzle(outPath, puzzle);
  console.log(
    `Wrote public/puzzles/${playDate}.json (${puzzle.words.length} words, ${puzzle.rows}x${puzzle.cols}${overlap.length ? `, reuse:${overlap.length}` : ""})`
  );
  return { skipped: false, playDate, words: puzzle.words.map(w => w.word) };
}

function generatePack(wordlist, outRel, { id, playDate, size }) {
  const slice = wordlist.words.map(w => ({
    word: normalizeWord(w.word),
    gloss: w.gloss ?? "",
  }));
  const puzzle = generatePuzzle(slice, {
    id,
    playDate,
    pack: wordlist.pack,
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
if (!args.wordlist) {
  console.error(
    "Missing --wordlist path\n\nExamples:\n  pnpm gen:puzzle --wordlist wordlists/daily-pool.json --date 2026-08-06\n  pnpm gen:puzzle --wordlist wordlists/daily-pool.json --from 2026-08-01 --to 2026-08-31"
  );
  process.exit(1);
}

const wordlistPath = path.resolve(root, args.wordlist);
const pool = JSON.parse(fs.readFileSync(wordlistPath, "utf8"));

const isDailyRange = args.from && args.to;
const isDailyOne = Boolean(args.date);

if (isDailyRange || isDailyOne) {
  const dates = isDailyRange
    ? eachDate(args.from, args.to)
    : [args.date];

  for (const d of dates) {
    generateOneDaily(pool, d, {
      size: args.size,
      wordsPerDay: args.wordsPerDay,
      dedupeDays: args.dedupeDays,
      force: args.force,
    });
  }
} else {
  const playDate = null;
  const id = `pack-${pool.pack}`;
  const outRel =
    args.out ?? `public/puzzles/${pool.pack}.json`;
  generatePack(pool, outRel, {
    id,
    playDate,
    size: args.size ?? pool.size,
  });
}
