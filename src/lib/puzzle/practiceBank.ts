/**
 * Practice puzzle bank — 100_000 IDs per pack, deterministic generation.
 *
 * We do NOT store 100k JSON files. Given (pack, bankId) + wordlist, the same
 * puzzle is always produced. Progress in D1 only records which IDs a user played.
 */
import WordSearch from "@blex41/word-search";
import type { Cell, Puzzle, PuzzleWord, WordlistFile } from "./types";

/** Public bank size — product guarantee for non-daily endless play */
export const PRACTICE_BANK_SIZE = 100_000;

export function isValidBankId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= PRACTICE_BANK_SIZE;
}

function normalizeWord(w: string): string {
  return String(w).replace(/[^a-zA-Z]/g, "").toUpperCase();
}

/** Stable 32-bit hash */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

export type PracticeGenOptions = {
  bankId: number;
  size?: number;
  wordsPerSheet?: number;
};

/**
 * Build a practice puzzle for bankId ∈ [1, PRACTICE_BANK_SIZE].
 * Same inputs → same grid (good enough for “no short-term repeat” via ID tracking).
 */
export function generatePracticePuzzle(
  wordlist: WordlistFile,
  options: PracticeGenOptions
): Puzzle {
  const bankId = options.bankId;
  if (!isValidBankId(bankId)) {
    throw new Error(`bankId must be 1..${PRACTICE_BANK_SIZE}`);
  }

  const size = options.size ?? wordlist.size ?? 10;
  const wordsPerSheet = options.wordsPerSheet ?? wordlist.wordsPerDay ?? 8;
  const packId = wordlist.pack || "daily";

  const pool = wordlist.words
    .map(w => ({
      word: normalizeWord(w.word),
      gloss: w.gloss || "",
    }))
    .filter(w => w.word.length >= 3 && w.word.length <= size);

  if (pool.length < 4) {
    throw new Error("Word pool too small for practice generation");
  }

  const seed = hashString(`${packId}:practice:${bankId}`);
  const rand = mulberry32(seed);
  const deck = shuffle(pool, rand);
  // Rotate starting offset by bankId so nearby IDs diverge
  const offset = bankId % deck.length;
  const rotated = deck.slice(offset).concat(deck.slice(0, offset));
  const candidates = rotated.slice(
    0,
    Math.min(rotated.length, wordsPerSheet + 16)
  );
  const dictionary = candidates.map(c => c.word);
  const glossByWord = new Map(candidates.map(c => [c.word, c.gloss]));

  let best: { grid: string[][]; words: PuzzleWord[] } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const dict =
      attempt === 0
        ? dictionary
        : shuffle(dictionary, mulberry32(seed + attempt * 9973));
    try {
      const ws = new WordSearch({
        cols: size,
        rows: size,
        dictionary: dict,
        maxWords: wordsPerSheet,
        upperCase: true,
        backwardsProbability: 0.35,
        maxRetries: 25,
      });
      const grid = ws.data.grid.map(row =>
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
      if (!best || words.length > best.words.length) best = { grid, words };
      if (words.length >= Math.min(wordsPerSheet, dict.length)) break;
    } catch {
      /* retry */
    }
  }

  if (!best || best.words.length === 0) {
    throw new Error(`Failed to generate practice puzzle #${bankId}`);
  }

  return {
    id: `practice-${packId}-${bankId}`,
    pack: packId,
    title: `${wordlist.title} · Practice #${bankId}`,
    description: `Practice bank puzzle ${bankId} of ${PRACTICE_BANK_SIZE}`,
    rows: size,
    cols: size,
    grid: best.grid,
    words: best.words,
    largePrintFriendly: size <= 12,
    createdAt: new Date().toISOString(),
  };
}

/** Pick a random bank id not in `exclude` (client or server). */
export function pickUnusedBankId(
  exclude: Iterable<number>,
  rand: () => number = Math.random
): number | null {
  const used = new Set(
    [...exclude].filter(n => isValidBankId(n))
  );
  if (used.size >= PRACTICE_BANK_SIZE) return null;

  // Random probes then linear scan fallback
  for (let i = 0; i < 40; i++) {
    const id = 1 + Math.floor(rand() * PRACTICE_BANK_SIZE);
    if (!used.has(id)) return id;
  }
  for (let id = 1; id <= PRACTICE_BANK_SIZE; id++) {
    if (!used.has(id)) return id;
  }
  return null;
}
