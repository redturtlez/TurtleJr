#!/usr/bin/env node
// @ts-nocheck -- standalone image-processing tool operating on raw pixel buffers; not part of the app build.
/**
 * Derives the full-art and golden full-art Trainer/Energy frames from the frames already in
 * public/pokemon-card-creator/frames. Pure local image processing (sharp, already a dependency);
 * no network access, nothing is downloaded.
 *
 *   node scripts/prepare-trainer-full-art-frames.cjs [--out <dir>]
 *
 * Inputs (must exist): trainer/{item,tool,stadium,supporter}.png, trainer/supporter-full-art.png,
 * energy/special.png. With --out the results are written there instead of the public folder
 * (useful for previewing); existing inputs are never overwritten.
 */
const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

const frames = path.join(__dirname, '..', 'public', 'pokemon-card-creator', 'frames');
const outFlag = process.argv.indexOf('--out');
const outRoot = outFlag > 0 ? path.resolve(String(process.argv[outFlag + 1])) : frames;
const W = 747, H = 1038;

async function load(file, crop = false) {
  let img = sharp(file).ensureAlpha();
  if (crop) img = img.extract({ left: 0, top: 0, width: W, height: H });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`${file}: expected ${W}x${H}, got ${info.width}x${info.height}`);
  return Buffer.from(data);
}
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const sat = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
/** @param {number} x @param {number} y @param {readonly number[]} rect */
const inRect = (x, y, rect) => { const [l = 0, t = 0, r = 0, b = 0] = rect; return x >= l && x < r && y >= t && y < b; };
async function save(buf, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png({ palette: false, compressionLevel: 9 }).toFile(tmp);
  fs.renameSync(tmp, file);
}

// Type-specific regions of a trainer frame (same layout in every Trainer frame).
const LABEL = [520, 30, 712, 72];
const PILL = [236, 898, 722, 1006];
const STRIPS = [[28, 140, 50, 1006], [698, 140, 720, 1006]];
const isBorderYellow = (r, g, b, a) => a > 0 && r > 200 && g > 165 && b < 200 && r - b > 50;

/** Full-art Trainer frame: supporter full-art base with the type word, side strips and rules pill of the standard frame. */
function trainerFullArt(base, stdType) {
  const out = Buffer.from(base);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const label = inRect(x, y, LABEL);
    const pasted = label || ((inRect(x, y, PILL) || STRIPS.some((r) => inRect(x, y, r))) && base[i + 3] > 0 && !isBorderYellow(stdType[i], stdType[i + 1], stdType[i + 2], stdType[i + 3]));
    if (pasted) { out[i] = stdType[i]; out[i + 1] = stdType[i + 1]; out[i + 2] = stdType[i + 2]; out[i + 3] = 255; }
  }
  return out;
}

// The Pokémon Tool band of a full-art Tool card sits just under the header. Its golden artwork was taken from
// pokecardmaker.net (the band area is free of that site's footer watermark) and is stored as a small PNG.
const BAND_ORIGIN = [30, 139];
async function loadBand(silver) {
  const { data, info } = await sharp(path.join(__dirname, 'assets', 'tool-band-golden.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const band = Buffer.from(data);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (x < 6) band[i + 3] = 0; // stray strip pixels at the far left edge
    if (!silver || band[i + 3] === 0) continue;
    const r = band[i], g = band[i + 1], b = band[i + 2];
    if (b > r + 25) continue; // the blue "Pokémon Tool" label keeps its colour
    const grey = Math.min(255, Math.round(lum(r, g, b) * 0.92 + 14));
    band[i] = band[i + 1] = grey; band[i + 2] = Math.min(255, grey + 3);
  }
  return { data: band, width: info.width, height: info.height };
}
function pasteBand(frame, band) {
  const out = Buffer.from(frame);
  for (let y = 0; y < band.height; y++) for (let x = 0; x < band.width; x++) {
    const i = (y * band.width + x) * 4, a = band.data[i + 3] / 255;
    if (a === 0) continue;
    const j = ((y + BAND_ORIGIN[1]) * W + x + BAND_ORIGIN[0]) * 4;
    for (let c = 0; c < 3; c++) out[j + c] = Math.round(band.data[i + c] * a + out[j + c] * (1 - a));
    out[j + 3] = Math.max(out[j + 3], band.data[i + 3]);
  }
  return out;
}

const GOLD = [[0, [38, 24, 0]], [70, [112, 74, 4]], [135, [190, 138, 16]], [185, [232, 187, 38]], [225, [253, 232, 112]], [255, [255, 251, 222]]];
function goldAt(l) {
  for (let k = 1; k < GOLD.length; k++) if (l <= GOLD[k][0]) {
    const [l0, c0] = GOLD[k - 1], [l1, c1] = GOLD[k], t = (l - l0) / (l1 - l0);
    return c0.map((v, n) => v + (c1[n] - v) * t);
  }
  return GOLD[GOLD.length - 1][1];
}
/** Re-tint a frame gold, keeping brightness. Saturated pixels inside `keepRect` (the type word) stay as they are. */
function golden(src, keepRect) {
  const out = Buffer.from(src);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (out[i + 3] === 0) continue;
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const [gr, gg, gb] = goldAt(lum(r, g, b));
    let keep = 0;
    if (keepRect && inRect(x, y, keepRect)) { const s = sat(r, g, b); keep = Math.min(1, Math.max(0, (s - 0.18) / 0.35)); }
    out[i] = Math.round(gr + (r - gr) * keep); out[i + 1] = Math.round(gg + (g - gg) * keep); out[i + 2] = Math.round(gb + (b - gb) * keep);
  }
  return out;
}

/** Special Energy full art: standard frame with the art window and rules panel cleared and a silver border. */
function energyFullArt(std, silver) {
  const out = Buffer.from(std);
  const window = [33, 141, 715, 962];
  // Silver border pixels come from the full-art Trainer frame, avoiding its baked-in footer text and pill.
  const silverAt = (x, y) => {
    let sx = x, sy = y;
    if (x < 34) sx = Math.min(x, 27); // the base's own strip starts at x=30
    if (y >= 1006 && x >= 150 && x <= 565) sx = 140; // copyright line sits on the bottom border
    if (x >= 716 && y >= 900 && y <= 1006) sy = 890; // right end of the rules pill
    const j = (sy * W + sx) * 4;
    return [silver[j], silver[j + 1], silver[j + 2], silver[j + 3] || 255];
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (inRect(x, y, window)) { out[i + 3] = 0; continue; }
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const warm = out[i + 3] > 0 && r > 180 && g > 150 && r - b > 30 && sat(r, g, b) > 0.15;
    if (warm) [out[i], out[i + 1], out[i + 2], out[i + 3]] = silverAt(x, y);
  }
  return out;
}

(async () => {
  const t = (n) => path.join(frames, 'trainer', n), e = (n) => path.join(frames, 'energy', n);
  const base = await load(t('supporter-full-art.png'), true);
    const tasks = [];
  const fullArt = { supporter: base };
  for (const type of ['item', 'tool', 'stadium']) {
    fullArt[type] = trainerFullArt(base, await load(t(`${type}.png`)));
    if (type !== 'tool') tasks.push(save(fullArt[type], path.join(outRoot, 'trainer', `${type}-full-art.png`)));
  }
  const plain = { ...fullArt };
  fullArt.tool = pasteBand(plain.tool, await loadBand(true));
  tasks.push(save(fullArt.tool, path.join(outRoot, 'trainer', 'tool-full-art.png')));
  for (const [type, buf] of Object.entries(plain)) {
    const gold = golden(buf, LABEL);
    tasks.push(save(type === 'tool' ? pasteBand(gold, await loadBand(false)) : gold, path.join(outRoot, 'trainer', `${type}-golden-full-art.png`)));
  }
  const energy = energyFullArt(await load(e('special.png')), base);
  tasks.push(save(energy, path.join(outRoot, 'energy', 'special-full-art.png')));
  tasks.push(save(golden(energy, null), path.join(outRoot, 'energy', 'special-golden-full-art.png')));
  await Promise.all(tasks);
  console.log(`Wrote ${tasks.length} frames to ${outRoot}`);
})().catch((error) => { console.error(error.message); process.exit(1); });
