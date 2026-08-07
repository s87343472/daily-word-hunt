/** Shared puzzle schema for static JSON + generator output. */

export type Cell = { r: number; c: number };

export type PuzzleWord = {
  /** Display / list form (usually UPPERCASE, no spaces) */
  word: string;
  /** Short definition or lore blurb shown after finding the word */
  gloss: string;
  /** Path of cells when placed (optional in hand-authored files) */
  path?: Cell[];
};

export type Puzzle = {
  id: string;
  /** YYYY-MM-DD when this is a calendar-series puzzle */
  playDate?: string;
  /** Pack / series id, e.g. daily | nature | cities */
  pack: string;
  /** Alias of pack for series naming in UI */
  series?: string;
  theme?: string;
  title: string;
  description?: string;
  rows: number;
  cols: number;
  /** row-major uppercase letters */
  grid: string[][];
  words: PuzzleWord[];
  /** Accessibility / vertical flags */
  largePrintFriendly?: boolean;
  createdAt?: string;
};

export type WordlistEntry = {
  word: string;
  gloss: string;
};

export type WordlistFile = {
  pack: string;
  title: string;
  description?: string;
  size?: number;
  wordsPerDay?: number;
  words: WordlistEntry[];
};
