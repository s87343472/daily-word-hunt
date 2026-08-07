/**
 * Client-safe random print-pack generation (browser or Node).
 * Uses @blex41/word-search — same engine as offline calendar puzzles.
 *
 * Uniqueness: never reuses a word across sheets in one pack, and callers
 * can pass excludeWords so a browser session stays non-repeating until leave.
 */
import WordSearch from "@blex41/word-search";
import type { Cell, Puzzle, PuzzleWord, WordlistFile } from "./types";

export type PrintPackOptions = {
  /** How many worksheets the user asked for (1–30) */
  count: number;
  /** Grid edge length (10 | 12 | 15) */
  size: number;
  /** Target words placed per sheet */
  wordsPerSheet: number;
  packTitle?: string;
  packId?: string;
  /**
   * Words already used this session (uppercase). They will not appear again
   * until the user leaves the page or resets the session pool.
   */
  excludeWords?: Iterable<string>;
};

export type PrintPackResult = {
  sheets: Puzzle[];
  /** Words placed on these sheets (uppercase) */
  usedWords: string[];
  size: number;
  wordsPerSheet: number;
  /** True if we returned fewer sheets than requested (pool exhausted) */
  truncated: boolean;
  /** How many more sheets were requested but not possible without reuse */
  shortfall: number;
  /** Unused words still available in pool after this pack (for UI) */
  remainingInPool: number;
};

type Entry = { word: string; gloss: string };

function normalizeWord(w: string): string {
  return String(w).replace(/[^a-zA-Z]/g, "").toUpperCase();
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]!;
  }
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

/**
 * Build one puzzle from candidates that are already unique to this sheet.
 * Only words that actually get placed are considered “used”.
 */
function generateSheet(
  entries: Entry[],
  opts: {
    id: string;
    size: number;
    maxWords: number;
    packId: string;
    title: string;
    sheetIndex: number;
  }
): Puzzle {
  const dictionary = entries.map(e => e.word).filter(Boolean);
  const glossByWord = new Map(entries.map(e => [e.word, e.gloss]));

  let best: {
    grid: string[][];
    words: PuzzleWord[];
  } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const dict =
      attempt === 0
        ? dictionary
        : shuffle(dictionary, mulberry32(randomSeed() + attempt));
    try {
      const ws = new WordSearch({
        cols: opts.size,
        rows: opts.size,
        dictionary: dict,
        maxWords: opts.maxWords,
        upperCase: true,
        backwardsProbability: 0.35,
        maxRetries: 25,
      });
      const grid: string[][] = ws.data.grid.map(row =>
        row.map(ch => String(ch).toUpperCase())
      );
      const words: PuzzleWord[] = ws.words.map(w => ({
        word: w.word.toUpperCase(),
        gloss: glossByWord.get(w.word.toUpperCase()) ?? "",
        path: w.path.map(
          (p): Cell => ({
            r: p.y,
            c: p.x,
          })
        ),
      }));
      if (!best || words.length > best.words.length) {
        best = { grid, words };
      }
      if (words.length >= Math.min(opts.maxWords, dict.length)) break;
    } catch {
      /* try again */
    }
  }

  if (!best || best.words.length === 0) {
    throw new Error("Could not place words — try fewer words or a larger grid.");
  }

  return {
    id: opts.id,
    pack: opts.packId,
    title: `${opts.title} · Sheet ${opts.sheetIndex}`,
    description: "Print pack worksheet",
    rows: opts.size,
    cols: opts.size,
    grid: best.grid,
    words: best.words,
    largePrintFriendly: opts.size <= 12,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Draw a random multi-sheet print pack.
 * Words never repeat across sheets. Words in excludeWords are skipped entirely.
 * If the unique pool runs out, returns fewer sheets (truncated=true) instead of
 * reusing words.
 */
export function generatePrintPack(
  wordlist: WordlistFile,
  options: PrintPackOptions
): PrintPackResult {
  const requested = Math.min(30, Math.max(1, Math.floor(options.count)));
  const size = [8, 10, 12, 15].includes(options.size) ? options.size : 10;
  const wordsPerSheet = Math.min(
    20,
    Math.max(4, Math.floor(options.wordsPerSheet))
  );
  const packId = options.packId || wordlist.pack || "print";
  const packTitle = options.packTitle || wordlist.title || "Word Search";

  const excluded = new Set(
    [...(options.excludeWords ?? [])].map(normalizeWord).filter(Boolean)
  );

  const pool: Entry[] = wordlist.words
    .map(w => ({
      word: normalizeWord(w.word),
      gloss: w.gloss || "",
    }))
    .filter(
      w =>
        w.word.length >= 3 &&
        w.word.length <= size &&
        !excluded.has(w.word)
    );

  // Dedupe pool by word form
  const seen = new Set<string>();
  const uniquePool: Entry[] = [];
  for (const e of pool) {
    if (seen.has(e.word)) continue;
    seen.add(e.word);
    uniquePool.push(e);
  }

  if (uniquePool.length < 4) {
    throw new Error(
      "Not enough unused words left in this theme for a new pack. Reset the session pool or pick another theme."
    );
  }

  const rand = mulberry32(randomSeed());
  /** Mutable remaining deck — only unused words */
  let remaining = shuffle(uniquePool, rand);
  const sheets: Puzzle[] = [];
  const usedWords: string[] = [];
  const usedSet = new Set<string>();

  let sheetIndex = 0;
  while (sheetIndex < requested) {
    // Need at least a few unused words to attempt a sheet
    const available = remaining.filter(e => !usedSet.has(e.word));
    if (available.length < 4) break;

    const target = Math.min(wordsPerSheet, available.length);
    // Primary slice + extras only from still-unused words (helps placer fit)
    const primary = available.slice(0, target);
    const extras = available.slice(target, target + Math.min(16, target * 2));
    const candidates = [...primary, ...extras];

    let sheet: Puzzle;
    try {
      sheet = generateSheet(candidates, {
        id: `print-${packId}-${Date.now().toString(36)}-${sheetIndex + 1}`,
        size,
        maxWords: target,
        packId,
        title: packTitle,
        sheetIndex: sheetIndex + 1,
      });
    } catch {
      // If placement fails, drop the hardest (longest) candidates and retry once
      const shorter = candidates
        .slice()
        .sort((a, b) => a.word.length - b.word.length)
        .slice(0, Math.max(4, target - 1));
      if (shorter.length < 4) break;
      try {
        sheet = generateSheet(shorter, {
          id: `print-${packId}-${Date.now().toString(36)}-${sheetIndex + 1}`,
          size,
          maxWords: Math.min(target, shorter.length),
          packId,
          title: packTitle,
          sheetIndex: sheetIndex + 1,
        });
      } catch {
        break;
      }
    }

    // Guard: never accept a sheet that reuses a word already in this pack/session
    const placed = sheet.words.map(w => w.word.toUpperCase());
    const overlap = placed.filter(w => usedSet.has(w) || excluded.has(w));
    if (overlap.length > 0) {
      // Filter to unique-only words; if grid still has only unique paths, rebuild word list
      const uniquePlaced = placed.filter(
        w => !usedSet.has(w) && !excluded.has(w)
      );
      if (uniquePlaced.length < 4) {
        // Can't keep this sheet without duplicates — stop rather than reuse
        break;
      }
      // Rebuild sheet metadata with only unique words (grid still valid for those paths)
      sheet = {
        ...sheet,
        words: sheet.words.filter(w => uniquePlaced.includes(w.word.toUpperCase())),
      };
    }

    // Final uniqueness enforce
    const finalWords = sheet.words.filter(w => {
      const u = w.word.toUpperCase();
      return !usedSet.has(u) && !excluded.has(u);
    });
    if (finalWords.length < 4) break;

    sheet = { ...sheet, words: finalWords };
    sheets.push(sheet);
    sheetIndex++;

    for (const w of finalWords) {
      const u = w.word.toUpperCase();
      usedSet.add(u);
      usedWords.push(u);
    }
    remaining = remaining.filter(e => !usedSet.has(e.word));
  }

  if (sheets.length === 0) {
    throw new Error(
      "Could not build any unique sheets. Reset the session pool or choose a larger theme."
    );
  }

  const shortfall = Math.max(0, requested - sheets.length);
  return {
    sheets,
    usedWords,
    size,
    wordsPerSheet,
    truncated: shortfall > 0,
    shortfall,
    remainingInPool: remaining.filter(e => !usedSet.has(e.word)).length,
  };
}
