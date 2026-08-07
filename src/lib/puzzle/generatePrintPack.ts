/**
 * Client-safe random print-pack generation (browser or Node).
 * Uses @blex41/word-search — same engine as offline calendar puzzles.
 */
import WordSearch from "@blex41/word-search";
import type { Cell, Puzzle, PuzzleWord, WordlistFile } from "./types";

export type PrintPackOptions = {
  /** How many worksheets */
  count: number;
  /** Grid edge length (10 | 12 | 15) */
  size: number;
  /** Target words placed per sheet */
  wordsPerSheet: number;
  packTitle?: string;
  packId?: string;
};

export type PrintPackResult = {
  sheets: Puzzle[];
  usedWords: string[];
  size: number;
  wordsPerSheet: number;
};

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
 * Build one puzzle from an explicit word subset.
 * Retries with slightly different subsets if placement is thin.
 */
function generateSheet(
  entries: { word: string; gloss: string }[],
  opts: {
    id: string;
    size: number;
    maxWords: number;
    packId: string;
    title: string;
    sheetIndex: number;
  }
): Puzzle {
  const dictionary = entries.map(e => normalizeWord(e.word)).filter(Boolean);
  const glossByWord = new Map(
    entries.map(e => [normalizeWord(e.word), e.gloss])
  );

  let best: {
    grid: string[][];
    words: PuzzleWord[];
  } | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
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
 * Draw a random multi-sheet print pack from a wordlist.
 * Prefers non-overlapping words across sheets when the pool is large enough.
 */
export function generatePrintPack(
  wordlist: WordlistFile,
  options: PrintPackOptions
): PrintPackResult {
  const count = Math.min(20, Math.max(1, Math.floor(options.count)));
  const size = [8, 10, 12, 15].includes(options.size) ? options.size : 10;
  const wordsPerSheet = Math.min(
    20,
    Math.max(4, Math.floor(options.wordsPerSheet))
  );
  const packId = options.packId || wordlist.pack || "print";
  const packTitle = options.packTitle || wordlist.title || "Word Search";

  const pool = wordlist.words
    .map(w => ({
      word: normalizeWord(w.word),
      gloss: w.gloss || "",
    }))
    .filter(w => w.word.length >= 3 && w.word.length <= size);

  if (pool.length < wordsPerSheet) {
    throw new Error(
      `Word pool too small for ${wordsPerSheet} words on a ${size}×${size} grid.`
    );
  }

  const rand = mulberry32(randomSeed());
  const deck = shuffle(pool, rand);
  const sheets: Puzzle[] = [];
  const usedWords: string[] = [];
  let cursor = 0;

  for (let i = 0; i < count; i++) {
    let slice: typeof pool;
    if (cursor + wordsPerSheet <= deck.length) {
      slice = deck.slice(cursor, cursor + wordsPerSheet);
      cursor += wordsPerSheet;
    } else {
      // Pool exhausted — reshuffle remainder + full deck for more sheets
      slice = shuffle(pool, rand).slice(0, wordsPerSheet);
    }

    // Extra candidates help the placer when some words won't fit
    const extras = shuffle(
      pool.filter(p => !slice.some(s => s.word === p.word)),
      rand
    ).slice(0, Math.min(12, wordsPerSheet));
    const candidates = [...slice, ...extras];

    const sheet = generateSheet(candidates, {
      id: `print-${packId}-${Date.now().toString(36)}-${i + 1}`,
      size,
      maxWords: wordsPerSheet,
      packId,
      title: packTitle,
      sheetIndex: i + 1,
    });
    sheets.push(sheet);
    for (const w of sheet.words) usedWords.push(w.word);
  }

  return { sheets, usedWords, size, wordsPerSheet };
}
