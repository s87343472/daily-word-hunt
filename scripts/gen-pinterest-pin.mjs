#!/usr/bin/env node
/**
 * Generate ONE daily Pinterest pin image + copy-paste caption (manual upload).
 *
 * Usage:
 *   node scripts/gen-pinterest-pin.mjs
 *   node scripts/gen-pinterest-pin.mjs --date 2026-08-07
 *   node scripts/gen-pinterest-pin.mjs --pack nature --date 2026-08-07
 *
 * Output (not committed by default):
 *   out/pinterest/YYYY-MM-DD-pack.png
 *   out/pinterest/YYYY-MM-DD-pack.txt   ← title / description / link
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const W = 1000;
const H = 1500;

function parseArgs(argv) {
  const args = { date: null, pack: "daily" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--date") args.date = argv[++i];
    else if (argv[i] === "--pack") args.pack = argv[++i];
  }
  return args;
}

function todayNY() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadPuzzle(pack, date) {
  const p = path.join(root, "public/puzzles", pack, `${date}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Puzzle not found: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildGridSvg(grid, x0, y0, cell, gap) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  let out = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (cell + gap);
      const y = y0 + r * (cell + gap);
      const ch = escapeXml(grid[r][c] || "");
      out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="6" fill="#1e293b" stroke="#334155" stroke-width="2"/>`;
      out += `<text x="${x + cell / 2}" y="${y + cell / 2 + 1}" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${Math.floor(cell * 0.48)}" font-weight="700" fill="#f1f5f9">${ch}</text>`;
    }
  }
  return { svg: out, width: cols * cell + (cols - 1) * gap, height: rows * cell + (rows - 1) * gap };
}

function buildPinSvg(puzzle, date, pack) {
  const words = (puzzle.words || []).map(w => String(w.word || "").toUpperCase());
  const wordLine = words.slice(0, 8).join(" · ");
  const displayDate = formatDisplayDate(date);
  const packLabel = pack === "daily" ? "Daily" : pack.charAt(0).toUpperCase() + pack.slice(1);

  const cell = 52;
  const gap = 6;
  const grid = puzzle.grid || [];
  const g = buildGridSvg(grid, 0, 0, cell, gap);
  const gridX = Math.round((W - g.width) / 2);
  const gridY = 420;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- accent dots -->
  <circle cx="80" cy="120" r="4" fill="#fb923c" opacity="0.7"/>
  <circle cx="920" cy="200" r="4" fill="#fb923c" opacity="0.5"/>
  <circle cx="100" cy="1380" r="4" fill="#fb923c" opacity="0.5"/>
  <circle cx="900" cy="1320" r="4" fill="#fb923c" opacity="0.6"/>

  <text x="500" y="120" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="700" letter-spacing="4" fill="#94a3b8">FREE · NO ACCOUNT</text>

  <text x="500" y="220" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="72" font-weight="800" fill="#f8fafc">Daily Word Hunt</text>
  <rect x="320" y="245" width="120" height="8" rx="4" fill="#f97316"/>
  <rect x="450" y="245" width="230" height="8" rx="4" fill="#f97316" opacity="0.35"/>

  <text x="500" y="310" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="36" font-weight="600" fill="#e2e8f0">Free daily word search</text>
  <text x="500" y="365" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="30" font-weight="600" fill="#fb923c">${escapeXml(packLabel)} · ${escapeXml(displayDate)}</text>

  <g transform="translate(${gridX}, ${gridY})">
    ${g.svg}
  </g>

  <text x="500" y="${gridY + g.height + 70}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="26" font-weight="600" fill="#94a3b8">Find: ${escapeXml(wordLine.slice(0, 72))}${wordLine.length > 72 ? "…" : ""}</text>

  <rect x="200" y="1320" width="600" height="72" rx="36" fill="#f97316"/>
  <text x="500" y="1366" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="32" font-weight="800" fill="#0f172a">Play free → words.sagasu.art</text>

  <text x="500" y="1455" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="22" fill="#64748b">Printable · Large print · No signup</text>
</svg>`;
}

function buildCaption(puzzle, date, pack) {
  const displayDate = formatDisplayDate(date);
  const words = (puzzle.words || []).map(w => String(w.word || "").toUpperCase());
  const link =
    pack === "daily"
      ? `https://words.sagasu.art/?utm_source=pinterest&utm_medium=pin&utm_campaign=daily_${date}`
      : `https://words.sagasu.art/packs/${pack}/${date}/?utm_source=pinterest&utm_medium=pin&utm_campaign=${pack}_${date}`;

  const title = `Free Daily Word Search Puzzle – ${displayDate}`;
  const description = [
    `Free online word search for ${displayDate}. No account needed.`,
    `Find: ${words.join(", ")}.`,
    `Play or print free at Daily Word Hunt.`,
    `#wordsearch #freeprintable #puzzles #dailypuzzle #wordgame #kidsactivities`,
  ].join(" ");

  return {
    title,
    description,
    link,
    board_suggestion: pack === "daily" ? "Free Word Search / Daily Puzzles" : `Word Search – ${pack}`,
    text: [
      "=== Pinterest manual upload ===",
      "",
      "TITLE:",
      title,
      "",
      "DESCRIPTION:",
      description,
      "",
      "LINK / DESTINATION:",
      link,
      "",
      "BOARD (suggestion):",
      pack === "daily" ? "Free Word Search / Daily Puzzles" : `Word Search – ${pack}`,
      "",
      "IMAGE:",
      `(see PNG next to this file)`,
      "",
      "NOTE: 1 pin/day is normal cadence — not spam.",
    ].join("\n"),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const date = args.date || todayNY();
  const pack = args.pack || "daily";

  const puzzle = loadPuzzle(pack, date);
  const svg = buildPinSvg(puzzle, date, pack);
  const caption = buildCaption(puzzle, date, pack);

  const outDir = path.join(root, "out/pinterest");
  fs.mkdirSync(outDir, { recursive: true });
  const base = `${date}-${pack}`;
  const pngPath = path.join(outDir, `${base}.png`);
  const txtPath = path.join(outDir, `${base}.txt`);

  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  fs.writeFileSync(txtPath, caption.text, "utf8");

  console.log(`Wrote ${path.relative(root, pngPath)}`);
  console.log(`Wrote ${path.relative(root, txtPath)}`);
  console.log("");
  console.log("Upload steps:");
  console.log("  1. Open https://www.pinterest.com/ (personal account is fine)");
  console.log("  2. Create Pin → upload the PNG");
  console.log("  3. Paste title / description / link from the .txt file");
  console.log("  4. One pin per day is fine — not spam.");
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
