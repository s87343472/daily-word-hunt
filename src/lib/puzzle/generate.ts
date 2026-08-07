import WordSearch from "@blex41/word-search";
import type { Cell, Puzzle, PuzzleWord, WordlistFile } from "./types";

export type GenerateOptions = {
  id: string;
  playDate?: string;
  size?: number;
  maxWords?: number;
  seedLabel?: string;
};

/**
 * Build a publishable puzzle from a wordlist using @blex41/word-search.
 * Generation is offline/CI only — never on the player request path.
 */
export function generatePuzzle(
  wordlist: WordlistFile,
  options: GenerateOptions
): Puzzle {
  const size = options.size ?? wordlist.size ?? 12;
  const dictionary = wordlist.words.map(w =>
    w.word.replace(/[^a-zA-Z]/g, "").toUpperCase()
  );
  const glossByWord = new Map(
    wordlist.words.map(w => [
      w.word.replace(/[^a-zA-Z]/g, "").toUpperCase(),
      w.gloss,
    ])
  );

  const ws = new WordSearch({
    cols: size,
    rows: size,
    dictionary,
    maxWords: options.maxWords ?? dictionary.length,
    upperCase: true,
    backwardsProbability: 0.35,
    maxRetries: 20,
  });

  const grid: string[][] = ws.data.grid.map((row: string[]) =>
    row.map((ch: string) => ch.toUpperCase())
  );

  const words: PuzzleWord[] = ws.words.map(w => ({
    word: w.word.toUpperCase(),
    gloss: glossByWord.get(w.word.toUpperCase()) ?? "",
    // library path uses { x: col, y: row }
    path: w.path.map(
      (p): Cell => ({
        r: p.y,
        c: p.x,
      })
    ),
  }));

  return {
    id: options.id,
    playDate: options.playDate,
    pack: wordlist.pack,
    title: wordlist.title,
    description: wordlist.description,
    rows: size,
    cols: size,
    grid,
    words,
    largePrintFriendly: size <= 12,
    createdAt: new Date().toISOString(),
  };
}
