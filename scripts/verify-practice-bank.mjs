#!/usr/bin/env node
/**
 * Smoke-test practice bank generation at a few IDs (not all 100k).
 *   node scripts/verify-practice-bank.mjs
 */
import daily from "../wordlists/packs/daily.json" with { type: "json" };
import WordSearch from "@blex41/word-search";

const BANK = 100_000;
const ids = [1, 2, 3, 100, 999, 50_000, 99_999, 100_000];

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gen(bankId) {
  const size = daily.size || 10;
  const wpd = daily.wordsPerDay || 8;
  const pool = daily.words
    .map(w => String(w.word).replace(/[^a-zA-Z]/g, "").toUpperCase())
    .filter(w => w.length >= 3 && w.length <= size);
  const seed = hashString(`daily:practice:${bankId}`);
  const rand = mulberry32(seed);
  const deck = shuffle(pool, rand);
  const offset = bankId % deck.length;
  const rotated = deck.slice(offset).concat(deck.slice(0, offset));
  const dictionary = rotated.slice(0, Math.min(rotated.length, wpd + 16));
  const ws = new WordSearch({
    cols: size,
    rows: size,
    dictionary,
    maxWords: wpd,
    upperCase: true,
    backwardsProbability: 0.35,
    maxRetries: 25,
  });
  return { words: ws.words.length, grid: ws.data.grid.length };
}

let ok = 0;
for (const id of ids) {
  try {
    const r = gen(id);
    console.log(`#${id}: ${r.grid}x grid, ${r.words} words`);
    ok++;
  } catch (e) {
    console.error(`#${id} FAIL`, e.message);
  }
}
console.log(`\nBank size claim: ${BANK.toLocaleString()} IDs`);
console.log(`Smoke OK: ${ok}/${ids.length}`);
process.exit(ok === ids.length ? 0 : 1);
