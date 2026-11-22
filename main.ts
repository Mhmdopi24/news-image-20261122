// news-image-20261122 - "One day on Earth: Sunday 22 November 2026"
// A code-drawn one-page atlas of the day's world news. The program paints
// the whole 1024x1024 image itself: masthead, UTC timeline, numbers strip,
// three illustrated leads, eight story tiles, nineteen briefs and a date
// check. The three lead pictures are flat vector illustrations made for
// this entry (art/*.rgb, raw RGB, 480x288 each); every word on the page is
// drawn here with the small pixel font below, so no text can come out
// garbled. Output is deterministic: same bytes on every run.
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Writes: $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- PNG out

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(width: number, height: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter type 0: none
    rgb.copy(raw, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- pixel font
// Classic 5x7 glyphs: each glyph is 7 rows, each row 5 bits (bit 4 = left).
// Uppercase, lowercase, digits and the punctuation this page needs.

const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x1e],
  c: [0x00, 0x00, 0x0e, 0x11, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0d, 0x13, 0x11, 0x11, 0x0f],
  e: [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x08, 0x08, 0x1e, 0x08, 0x08, 0x08],
  g: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0x00, 0x00, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0x00, 0x00, 0x16, 0x19, 0x11, 0x11, 0x11],
  o: [0x00, 0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0x00, 0x00, 0x1e, 0x11, 0x1e, 0x10, 0x10],
  q: [0x00, 0x00, 0x0d, 0x13, 0x0f, 0x01, 0x01],
  r: [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0x00, 0x00, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x08, 0x08, 0x1e, 0x08, 0x08, 0x09, 0x06],
  u: [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0x00, 0x00, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0x00, 0x00, 0x11, 0x15, 0x15, 0x15, 0x0a],
  x: [0x00, 0x00, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0x00, 0x00, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0x00, 0x00, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  ";": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "\u00b7": [0x00, 0x00, 0x00, 0x0c, 0x0c, 0x00, 0x00], // middle dot
};

const CHAR_W = 6; // glyph advance in font units (5 px + 1 px gap)
const CHAR_H = 7;

function textWidth(text: string, scale: number): number {
  return text.length * CHAR_W * scale;
}

// Greedy word wrap: returns lines that fit maxWidth px at the given scale.
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (textWidth(test, scale) <= maxWidth || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ------------------------------------------------------------------ canvas

type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly buf: Buffer;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  setPixel(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
      }
    }
  }
  hline(x: number, y: number, w: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, t, h, c);
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.hline(x, y, w, c, t);
    this.hline(x, y + h - t, w, c, t);
    this.vline(x, y, h, c, t);
    this.vline(x + w - t, y, h, c, t);
  }
  // Paste a raw RGB image (srcW x srcH) scaled to dw x dh at (dx, dy).
  drawImage(raw: Buffer, srcW: number, srcH: number, dx: number, dy: number, dw: number, dh: number): void {
    for (let y = 0; y < dh; y++) {
      const sy = Math.min(srcH - 1, Math.floor((y * srcH) / dh));
      for (let x = 0; x < dw; x++) {
        const sx = Math.min(srcW - 1, Math.floor((x * srcW) / dw));
        const si = (sy * srcW + sx) * 3;
        this.setPixel(dx + x, dy + y, [raw[si], raw[si + 1], raw[si + 2]]);
      }
    }
  }
  // Draw one line of text; returns the pixel width drawn.
  drawText(x: number, y: number, text: string, scale: number, c: RGB): number {
    let cx = x;
    for (const ch of text) {
      const glyph = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < CHAR_H; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += CHAR_W * scale;
    }
    return cx - x;
  }
  drawTextCentered(cx: number, y: number, text: string, scale: number, c: RGB): void {
    this.drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, c);
  }
  // Draw wrapped text; returns the y just below the last line.
  drawPara(x: number, y: number, text: string, maxWidth: number, scale: number, c: RGB, leading = 3): number {
    const lines = wrapText(text, maxWidth, scale);
    let yy = y;
    for (const line of lines) {
      this.drawText(x, yy, line, scale, c);
      yy += CHAR_H * scale + leading;
    }
    return yy;
  }
}

// ------------------------------------------------------------ the day itself
// Every story below was first reported on Sunday 22 November 2026 (any time
// zone). Stories from 19-21 Nov are named only in the DATE CHECK box, as
// deliberately left out. Sources: Reuters, AP, AFP, BBC, ABC, TOI.

const PAPER: RGB = [247, 242, 228];
const PANEL: RGB = [255, 253, 246];
const INK: RGB = [25, 25, 25];
const RED: RGB = [179, 38, 30];
const NAVY: RGB = [32, 56, 94];
const TEAL: RGB = [47, 107, 102];
const GOLD: RGB = [201, 154, 43];
const GREY: RGB = [90, 86, 76];
const RULE: RGB = [200, 190, 168];

const W = 1024;
const H = 1024;
const M = 24; // page margin

interface Lead {
  art: string;
  kicker: string;
  head: string;
  body: string;
  source: string;
}

const LEADS: Lead[] = [
  {
    art: "lead-cop31.rgb",
    kicker: "1  CLIMATE - ANTALYA",
    head: "COP31: still no deal as talks run into Sunday",
    body: "Draft drops fossil fuels and the $120bn target.",
    source: "REPORTED - REUTERS, AP",
  },
  {
    art: "lead-pentagon.rgb",
    kicker: "2  DEFENCE - WASHINGTON",
    head: "Pentagon limits US-Canada contact",
    body: "Troops told to keep distance from allies.",
    source: "REPORTED - 00:10 UTC",
  },
  {
    art: "lead-cricket.rgb",
    kicker: "3  SPORT - CRICKET",
    head: "Australia ends England's T20 win streak",
    body: "Hosts snap England's streak under lights.",
    source: "REPORTED - ABC",
  },
];

interface Tile {
  n: number;
  region: string;
  head: string;
}

const TILES: Tile[] = [
  { n: 4, region: "GULF", head: "Bahrain probes Patriot crash" },
  { n: 5, region: "MIDDLE EAST", head: "Iran: Qeshm blasts were US disposal" },
  { n: 6, region: "USA", head: "Trump: Iran deal may last 20 years" },
  { n: 7, region: "UKRAINE", head: "Melania Trump urges more ceasefires" },
  { n: 8, region: "USA", head: "US airlines warned over Thanksgiving" },
  { n: 9, region: "INDIA", head: "Cyclone Akvan cuts flights at Ranchi" },
  { n: 10, region: "NEPAL", head: "Nepal PM to meet Modi on first visit" },
  { n: 11, region: "LONDON", head: "Trafalgar tree leaves Oslo for London" },
];

// [number, place, brief] - each brief is one line of news, grouped by region.
const BRIEFS: [number, string, string][] = [
  [12, "Pakistan", "checkpoint blast kills 5, injures 13"],
  [13, "Pakistan", "74 militants killed in 10 days"],
  [14, "Pakistan", "11 die as vehicle falls into river"],
  [15, "Pakistan", "Imran Khan sisters freed, deal buzz"],
  [16, "S. Korea", "$75,000 bounty for exam cheats"],
  [17, "India", "Air India halts Jeddah flights to 24 Nov"],
  [18, "Cricket", "Cummins keeps Australia captaincy"],
  [19, "Cricket", "India face NZ in windy Wellington"],
  [20, "Snooker", "Advani wins world opener"],
  [21, "Israel", "Eisenkot invites Likud to talks"],
  [22, "Gulf", "two sailors saved off Bab el-Mandeb"],
  [23, "USA", "Rubio rejects Iran dirty-bomb report"],
  [24, "Italy", "paper bombs at ministry"],
  [25, "France", "Depardieu probed over rape claim"],
  [26, "UK", "councillor stabbed shielding staff"],
  [27, "UK", "Princess Catherine on cancer journey"],
  [28, "USA", "bed bugs shut FEMA office"],
  [29, "USA", "Princeton student held by ICE at airport"],
  [30, "USA", "Senate honours Fiona the hippo"],
];

const TIMELINE: [string, string][] = [
  ["OVERNIGHT", "Pentagon memo"],
  ["MORNING", "COP31 resumes"],
  ["MORNING", "Australia ends run"],
  ["AFTERNOON", "Bahrain probes"],
  ["EVENING", "Trump on Iran"],
  ["NIGHT", "No COP31 deal"],
];

// ------------------------------------------------------------------- layout

function build(): Buffer {
  const cv = new Canvas(W, H, PAPER);
  cv.rect(4, 4, W - 8, H - 8, NAVY, 3);
  let y = M;

  // Masthead: kicker, giant date, counts line.
  cv.drawText(M, y, "THE WORLD IN ONE DAY", 2, RED);
  const right = "SUNDAY";
  cv.drawText(W - M - textWidth(right, 2), y, right, 2, RED);
  y += 20;
  cv.drawTextCentered(W / 2, y, "22 NOVEMBER 2026", 6, INK);
  y += 7 * 6 + 8;
  cv.hline(M, y, W - 2 * M, INK, 3);
  y += 8;
  cv.drawTextCentered(
    W / 2,
    y,
    "30 STORIES - 6 REGIONS - 10 FIELDS - ALL FROM SUNDAY 22 NOV 2026",
    2,
    NAVY,
  );
  y += 7 * 2 + 4;
  y += 7 * 2 + 10;
  cv.hline(M, y, W - 2 * M, RULE, 1);
  y += 8;

  // UTC timeline strip.
  cv.drawText(M, y + 2, "THE DAY", 2, RED);
  cv.drawText(M, y + 18, "IN UTC", 2, RED);
  const tlX = M + 96;
  const tlW = W - M - tlX;
  const slotW = Math.floor(tlW / TIMELINE.length);
  TIMELINE.forEach(([when, what], i) => {
    const x = tlX + i * slotW;
    if (i > 0) cv.vline(x - 5, y, 44, RULE, 1);
    cv.drawText(x, y, when, 2, RED);
    cv.drawPara(x, y + 15, what, slotW - 12, 2, INK, 2);
  });
  y += 44;
  cv.hline(M, y, W - 2 * M, RULE, 1);
  y += 8;

  // Three lead stories.
  const gap = 10;
  const leadW = Math.floor((W - 2 * M - gap * 2) / 3);
  const leadH = 280;
  const imgH = 125;
  LEADS.forEach((lead, i) => {
    const x = M + i * (leadW + gap);
    cv.fillRect(x, y, leadW, leadH, PANEL);
    cv.rect(x, y, leadW, leadH, INK, 1);
    const artPath = join(dirname(fileURLToPath(import.meta.url)), "art", lead.art);
    const raw = readFileSync(artPath);
    cv.drawImage(raw, 480, 288, x + 1, y + 1, leadW - 2, imgH);
    cv.hline(x, y + imgH + 1, leadW, INK, 1);
    let ly = y + imgH + 8;
    cv.drawText(x + 8, ly, lead.kicker, 2, RED);
    ly += 17;
    ly = cv.drawPara(x + 8, ly, lead.head, leadW - 16, 3, INK, 3);
    ly += 2;
    ly = cv.drawPara(x + 8, ly, lead.body, leadW - 16, 2, INK, 2);
    cv.drawText(x + 8, y + leadH - 18, lead.source, 2, GREY);
  });
  y += leadH + 10;

  // Eight tiles, 4 columns x 2 rows.
  const tileW = Math.floor((W - 2 * M - gap * 3) / 4);
  const tileH = 80;
  TILES.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = M + col * (tileW + gap);
    const ty = y + row * (tileH + gap);
    cv.fillRect(x, ty, tileW, tileH, PANEL);
    cv.rect(x, ty, tileW, tileH, INK, 1);
    cv.fillRect(x, ty, tileW, 20, NAVY);
    const nW = cv.drawText(x + 8, ty + 3, String(t.n), 2, GOLD);
    cv.drawText(x + 8 + nW + 8, ty + 3, t.region, 2, [255, 253, 246]);
    cv.drawPara(x + 8, ty + 28, t.head, tileW - 16, 2, INK, 3);
  });
  y += tileH * 2 + gap + 8;

  // Briefs, 3 columns.
  cv.drawText(M, y, "ALSO ON SUNDAY 22 NOVEMBER - 19 BRIEFS", 2, RED);
  y += 18;
  const colW = Math.floor((W - 2 * M - gap * 2) / 3);
  const perCol = Math.ceil(BRIEFS.length / 3);
  let briefBottom = y;
  for (let c = 0; c < 3; c++) {
    const x = M + c * (colW + gap);
    let by = y;
    for (let k = 0; k < perCol; k++) {
      const b = BRIEFS[c * perCol + k];
      if (!b) break;
      const [n, place, text] = b;
      const full = n + " " + place + ": " + text;
      const head = n + " " + place + ": ";
      const startY = by;
      by = cv.drawPara(x, by, full, colW, 2, INK, 2);
      cv.drawText(x, startY, head, 2, RED);
    }
    briefBottom = Math.max(briefBottom, by);
  }
  y = briefBottom + 8;
  cv.hline(M, y, W - 2 * M, RULE, 1);
  y += 8;

  // Date check box (height fits the wrapped text).
  const dc =
    "Every story here was reported Sun 22 Nov 2026. Left out: Peru quake (20 Nov), " +
    "Iran hit (19 Nov), FBI hack (20 Nov), Rikers plan (20 Nov), Japan-India drills " +
    "(19 Nov), Setu bridge (21 Nov), Sparta II (21 Nov), Estonia call. " +
    "Not yet: COP31 deal.";
  const dcLines = wrapText(dc, W - 2 * M - 16, 2).length;
  const boxH = 24 + dcLines * (CHAR_H * 2 + 2) + 6;
  cv.fillRect(M, y, W - 2 * M, boxH, [255, 248, 235]);
  cv.rect(M, y, W - 2 * M, boxH, RED, 2);
  cv.drawText(M + 8, y + 6, "DATE CHECK", 2, RED);
  cv.drawPara(M + 8, y + 24, dc, W - 2 * M - 16, 2, INK, 2);
  y += boxH + 8;

  // Footer.
  cv.drawTextCentered(W / 2, y, "Sources: Reuters, AP, AFP, BBC, ABC - Drawings: original.", 2, GREY);
  return encodePng(W, H, cv.buf);
}

// ---------------------------------------------------------------------- main

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const png = build();
writeFileSync(join(outDir, "entry.png"), png);
