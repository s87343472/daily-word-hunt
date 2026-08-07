declare module "@blex41/word-search" {
  type PathCell = { x: number; y: number };

  type WordSearchOptions = {
    cols?: number;
    rows?: number;
    dictionary?: string[];
    maxWords?: number;
    upperCase?: boolean;
    backwardsProbability?: number;
    maxRetries?: number;
    disabledDirections?: string[];
    diacritics?: boolean;
  };

  export default class WordSearch {
    constructor(options?: WordSearchOptions);
    data: { grid: string[][] };
    words: { word: string; clean: string; path: PathCell[] }[];
  }
}
