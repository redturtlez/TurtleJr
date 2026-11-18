// Deterministic checks for the browser-only card sheet maker (layout math and PDF writer). No network or secrets.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const names = ["lib/card-sheet/geometry", "lib/card-sheet/detect", "lib/card-sheet/pdf", "lib/card-sheet/merge", "lib/card-sheet/shadow"];
const compiled = Object.fromEntries(
  names.map((name) => [
    name,
    ts.transpileModule(fs.readFileSync(path.join(root, name + ".ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  ]),
);
const cache = {};
function load(name) {
  if (cache[name]) return cache[name].exports;
  const loaded = { exports: {} };
  cache[name] = loaded;
  const req = (relative) => {
    if (!relative.startsWith(".")) return require(relative); // installed packages such as pdf-lib
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), relative));
    if (!compiled[target]) throw new Error("Unexpected test dependency: " + target);
    return load(target);
  };
  new Function("require", "module", "exports", String(compiled[name]))(req, loaded, loaded.exports);
  return loaded.exports;
}
const geometry = load("lib/card-sheet/geometry");
const { buildPdf } = load("lib/card-sheet/pdf");
const { guessCard } = load("lib/card-sheet/detect");
const merge = load("lib/card-sheet/merge");
const shadow = load("lib/card-sheet/shadow");

const pk = (cell) => ({ cell, kind: "pokemon" }), yg = (cell) => ({ cell, kind: "yugioh" });
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test("cells are a Pokémon card (63 x 88 mm) plus the sheet bleed on every side", () => {
  assert.equal(geometry.DEFAULT_SHEET_BLEED, 1);
  assert.deepEqual(geometry.cellMm(1), { width: 65, height: 90 });
  assert.deepEqual(geometry.cellMm(2), { width: 67, height: 92 });
  assert.deepEqual(geometry.cellPixels(1), { width: 768, height: 1063 });
  assert.deepEqual(geometry.cellPixels(2), { width: 791, height: 1087 });
  assert.throws(() => geometry.cellMm(3));
});

test("three rows fit Letter inside a 4 mm printer margin at 1 mm sheet bleed, not at 2 mm", () => {
  const one = geometry.sheetLayout("letter", 1), two = geometry.sheetLayout("letter", 2);
  assert.equal(one.gridHeightMm, 270);
  assert.ok(one.marginYMm >= geometry.PRINTER_MARGIN_MM && one.marginXMm >= geometry.PRINTER_MARGIN_MM);
  assert.equal(two.gridHeightMm, 276);
  assert.ok(two.marginYMm < geometry.PRINTER_MARGIN_MM);
  assert.equal(geometry.sheetLayout("letter").sheetBleed, 1, "default");
});

test("Yu-Gi-Oh keeps 2 mm of bleed on either sheet; Pokémon gets the sheet bleed", () => {
  for (const bleed of [1, 2]) {
    const y = geometry.cardFrame("yugioh", 0, bleed), cell = geometry.cellMm(bleed);
    assert.ok(near(y.guideWidthMm, 63) && near(y.guideHeightMm, 90));
    assert.ok(y.guideWidthMm <= cell.width && y.guideHeightMm <= cell.height, "fits in the cell");
    const p = geometry.cardFrame("pokemon", 0, bleed);
    assert.ok(near(p.guideWidthMm, 63 + 2 * bleed) && near(p.guideHeightMm, 88 + 2 * bleed));
  }
});

test("physical size of the artwork depends on card type and the bleed it already has", () => {
  const p0 = geometry.cardFrame("pokemon", 0), p2 = geometry.cardFrame("pokemon", 2);
  assert.ok(near(p0.sourceWidthMm, 63) && near(p0.sourceHeightMm, 88));
  assert.ok(near(p2.sourceWidthMm, 67) && near(p2.sourceHeightMm, 92));
  const y0 = geometry.cardFrame("yugioh", 0), y1 = geometry.cardFrame("yugioh", 1);
  assert.ok(near(y0.sourceWidthMm, 59) && near(y0.sourceHeightMm, 86), "Yu-Gi-Oh keeps its real size");
  assert.ok(near(y1.sourceWidthMm, 61) && near(y1.sourceHeightMm, 88));
  assert.ok(near(y0.guideWidthMm, 63) && near(y0.guideHeightMm, 90));
  assert.throws(() => geometry.cardFrame("yugioh", 3));
  assert.throws(() => geometry.cardFrame("magic", 0));
});

test("3 x 3 grid is centered, ordered row by row and non-overlapping", () => {
  for (const paper of ["letter", "a4"]) {
    const layout = geometry.sheetLayout(paper, 2);
    assert.equal(layout.cells.length, 9);
    assert.equal(layout.gridWidthMm, 201);
    assert.equal(layout.gridHeightMm, 276);
    const first = layout.cells[0], last = layout.cells[8];
    assert.equal(first.xMm, layout.marginXMm);
    assert.equal(first.yMm, layout.marginYMm);
    assert.ok(near(layout.marginXMm * 2 + layout.gridWidthMm, layout.pageWidthMm));
    assert.ok(near(layout.marginYMm * 2 + layout.gridHeightMm, layout.pageHeightMm));
    assert.ok(near(last.xMm + 67, layout.pageWidthMm - layout.marginXMm));
    layout.cells.forEach((cell, index) => {
      assert.equal(cell.index, index);
      assert.equal(cell.row, Math.floor(index / 3));
      assert.equal(cell.column, index % 3);
    });
  }
});

test("each card is cut at its real size, centered in its cell", () => {
  const layout = geometry.sheetLayout("letter", 2), cell = layout.cells[4];
  const p = geometry.trimRect(layout, pk(cell)), y = geometry.trimRect(layout, yg(cell));
  assert.ok(near(p.widthMm, 63) && near(p.heightMm, 88));
  assert.ok(near(p.xMm, cell.xMm + 2) && near(p.yMm, cell.yMm + 2));
  assert.ok(near(y.widthMm, 59) && near(y.heightMm, 86));
  // Centered: equal space on opposite sides.
  assert.ok(near(y.xMm - cell.xMm, cell.xMm + 67 - (y.xMm + y.widthMm)));
  assert.ok(near(y.yMm - cell.yMm, cell.yMm + 92 - (y.yMm + y.heightMm)));
});

test("white guides are the # grid lines between cells, never inside a card or on the grid's outer edge", () => {
  const layout = geometry.sheetLayout("letter", 2);
  const all = geometry.gridGuides(layout, layout.cells.map(pk));
  // 2 vertical lines x 3 rows + 2 horizontal lines x 3 columns.
  assert.equal(all.length, 12);
  const xs = new Set(all.filter((s) => s.x1 === s.x2).map((s) => s.x1)), ys = new Set(all.filter((s) => s.y1 === s.y2).map((s) => s.y1));
  assert.deepEqual([...xs].sort((a, b) => a - b), [layout.marginXMm + 67, layout.marginXMm + 134].map((v) => Math.round(v * 1000) / 1000));
  assert.deepEqual([...ys].sort((a, b) => a - b), [layout.marginYMm + 92, layout.marginYMm + 184].map((v) => Math.round(v * 1000) / 1000));
  for (const s of all) {
    assert.ok(s.x1 > layout.marginXMm && s.x1 < layout.marginXMm + 201 || s.x1 !== s.x2);
    assert.ok(near(Math.hypot(s.x2 - s.x1, s.y2 - s.y1), s.x1 === s.x2 ? 92 : 67), "one cell long");
  }
  // Same lines for a Yu-Gi-Oh card: they stay on the cell boundary, outside the smaller card's trim.
  const yugi = [yg(layout.cells[4])];
  const around = geometry.gridGuides(layout, yugi);
  assert.equal(around.length, 4, "only boundaries next to the filled slot");
  const trim = geometry.trimRect(layout, yugi[0]);
  for (const s of around) {
    if (s.x1 === s.x2) assert.ok(s.x1 < trim.xMm - 2 || s.x1 > trim.xMm + trim.widthMm + 2, "outside 2 mm bleed");
    else assert.ok(s.y1 < trim.yMm - 2 || s.y1 > trim.yMm + trim.heightMm + 2, "outside 2 mm bleed");
  }
  assert.equal(geometry.gridGuides(layout, []).length, 0);
  assert.equal(geometry.gridGuides(layout, [pk(layout.cells[0])]).length, 2, "corner card: one vertical and one horizontal boundary");
});

test("crop marks are sized to the margin; on A4 they follow each card's own trim lines", () => {
  const letter = geometry.sheetLayout("letter", 2);
  assert.ok(near(geometry.cropMarkLength(letter), 1.2));
  for (const m of geometry.cropMarks(letter, letter.cells.map(pk))) for (const v of [m.y1, m.y2]) assert.ok(v >= 0 && v <= letter.pageHeightMm);
  const a4 = geometry.sheetLayout("a4", 2);
  const full = geometry.cropMarks(a4, a4.cells.map(pk));
  // 6 vertical + 6 horizontal cut lines, a mark at each end.
  assert.equal(full.length, 24);
  for (const m of full) {
    for (const v of [m.x1, m.x2]) assert.ok(v >= 0 && v <= a4.pageWidthMm);
    for (const v of [m.y1, m.y2]) assert.ok(v >= 0 && v <= a4.pageHeightMm);
    for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]]) {
      const inside = x > a4.marginXMm + 1e-6 && x < a4.marginXMm + a4.gridWidthMm - 1e-6 && y > a4.marginYMm + 1e-6 && y < a4.marginYMm + a4.gridHeightMm - 1e-6;
      assert.equal(inside, false, "marks stay outside the grid");
    }
  }
  // A lone Yu-Gi-Oh card in the center cell: marks at its real trim lines, on all four sides.
  const center = a4.cells[4];
  const lone = geometry.cropMarks(a4, [yg(center)]);
  assert.equal(lone.length, 8);
  const trim = geometry.trimRect(a4, yg(center));
  assert.ok(lone.some((m) => near(m.x1, trim.xMm) && m.y1 < a4.marginYMm));
  assert.ok(lone.some((m) => near(m.y1, trim.yMm + trim.heightMm) && m.x1 > a4.marginXMm + a4.gridWidthMm));
  // A card with a neighbour between it and an edge gets no mark on that side.
  const stacked = geometry.cropMarks(a4, [pk(a4.cells[1]), pk(a4.cells[4])]);
  assert.equal(stacked.length, 12); // top marks only for the upper card, bottom only for the lower; left/right for both
});

test("PDF is structurally valid, deterministic and sized to the page", () => {
  const layout = geometry.sheetLayout("letter");
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const spec = {
    widthMm: layout.pageWidthMm,
    heightMm: layout.pageHeightMm,
    images: layout.cells.slice(0, 2).map((cell) => ({ jpeg, pixelWidth: 791, pixelHeight: 1087, xMm: cell.xMm, yMm: cell.yMm, widthMm: 67, heightMm: 92 })),
    lines: [{ segments: geometry.gridGuides(layout, [pk(layout.cells[0]), pk(layout.cells[1])]), gray: 1, widthPt: 0.24 }],
  };
  const a = buildPdf(spec), b = buildPdf(spec);
  assert.deepEqual(a, b);
  const text = Buffer.from(a).toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/MediaBox \[0 0 612 792\]/);
  assert.equal((text.match(/\/Subtype \/Image/g) || []).length, 2);
  assert.equal((text.match(/\/Filter \/DCTDecode/g) || []).length, 2);
  assert.ok(!/\/Producer|\/CreationDate/.test(text), "no timestamps or producer strings");
  const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(text)?.[1]);
  assert.equal(text.slice(startxref, startxref + 4), "xref");
  const entries = text.slice(startxref).split("\n").filter((line) => /^\d{10} 00000 n $/.test(line));
  assert.equal(entries.length, 6); // catalog, pages, page, contents, 2 images
  entries.forEach((entry, index) => assert.ok(text.slice(Number(entry.slice(0, 10))).startsWith(`${index + 1} 0 obj`)));
  const a4 = buildPdf({ ...spec, widthMm: 210, heightMm: 297 });
  assert.match(Buffer.from(a4).toString("latin1"), /\/MediaBox \[0 0 595\.276 841\.89\]/);
});

test("PDF rejects an invalid page size", () => {
  assert.throws(() => buildPdf({ widthMm: 0, heightMm: 10, images: [], lines: [] }));
});

test("type and bleed are guessed from proportions, never from a poor match", () => {
  // Exact shapes of every real combination, at several pixel scales.
  for (const kind of ["pokemon", "yugioh"]) {
    for (const bleed of [0, 1, 2]) {
      const frame = geometry.cardFrame(kind, bleed);
      for (const scale of [10, 11.811, 20.3]) {
        const guess = guessCard(Math.round(frame.sourceWidthMm * scale), Math.round(frame.sourceHeightMm * scale));
        assert.deepEqual(guess, { kind, bleed }, `${kind} ${bleed} mm at ${scale} px/mm`);
      }
    }
  }
  // Common real-world pixel sizes.
  assert.deepEqual(guessCard(421, 614), { kind: "yugioh", bleed: 0 });
  assert.deepEqual(guessCard(791, 1087), { kind: "pokemon", bleed: 2 });
  assert.deepEqual(guessCard(750, 1050), { kind: "pokemon", bleed: 0 });
  // Unrelated shapes are left for the user to choose.
  assert.equal(guessCard(1000, 1000), null);
  assert.equal(guessCard(600, 800), null);
  assert.equal(guessCard(1920, 1080), null);
  assert.equal(guessCard(0, 100), null);
  assert.equal(guessCard(NaN, 100), null);
});

function sheetPdf(paper, cards) {
  const layout = geometry.sheetLayout(paper);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  return buildPdf({
    widthMm: layout.pageWidthMm,
    heightMm: layout.pageHeightMm,
    images: layout.cells.slice(0, cards).map((cell) => ({ jpeg, pixelWidth: 791, pixelHeight: 1087, xMm: cell.xMm, yMm: cell.yMm, widthMm: 67, heightMm: 92 })),
    lines: [],
  });
}
const text = (bytes) => Buffer.from(bytes).toString("latin1");

test("page sizes are named from the PDF itself, in either orientation", () => {
  assert.equal(merge.describePageSize(215.9, 279.4), "Letter");
  assert.equal(merge.describePageSize(279.4, 215.9), "Letter");
  assert.equal(merge.describePageSize(210, 297), "A4");
  assert.equal(merge.describePageSize(150.2, 200.4), "150 × 200 mm");
});

test("a card sheet PDF is read back with its page count and size", async () => {
  const info = await merge.inspectPdf("sheet.pdf", sheetPdf("letter", 3));
  assert.equal(info.pageCount, 1);
  assert.equal(info.pages[0].label, "Letter");
  assert.ok(Math.abs(info.pages[0].widthMm - 215.9) < 0.2 && Math.abs(info.pages[0].heightMm - 279.4) < 0.2);
  assert.equal((await merge.inspectPdf("a4.pdf", sheetPdf("a4", 1))).pages[0].label, "A4");
});

test("sheets are combined in order, keeping each page's size and its embedded images", async () => {
  const a = sheetPdf("letter", 4), b = sheetPdf("a4", 2), c = sheetPdf("letter", 1);
  const result = await merge.mergePdfs([{ name: "a.pdf", bytes: a }, { name: "b.pdf", bytes: b }, { name: "c.pdf", bytes: c }]);
  assert.equal(result.pageCount, 3);
  assert.deepEqual(result.pages.map((page) => page.label), ["Letter", "A4", "Letter"]);
  const body = text(result.bytes);
  assert.ok(body.startsWith("%PDF-"));
  assert.equal((body.match(/DCTDecode/g) || []).length, 4 + 2 + 1, "images are copied, not dropped or duplicated");
  const reread = await merge.inspectPdf("combined.pdf", result.bytes);
  assert.equal(reread.pageCount, 3);
  assert.deepEqual(reread.pages.map((page) => page.label), ["Letter", "A4", "Letter"]);
  // Order matters: swapping inputs swaps the pages.
  const swapped = await merge.mergePdfs([{ name: "b.pdf", bytes: b }, { name: "a.pdf", bytes: a }]);
  assert.deepEqual(swapped.pages.map((page) => page.label), ["A4", "Letter"]);
  // Deterministic output.
  const again = await merge.mergePdfs([{ name: "a.pdf", bytes: a }, { name: "b.pdf", bytes: b }, { name: "c.pdf", bytes: c }]);
  assert.deepEqual(again.bytes, result.bytes);
  assert.ok(!/pdf-lib/i.test(body.slice(body.indexOf("/Producer"), body.indexOf("/Producer") + 40)), "no tool name in the producer field");
});

test("bad, empty, oversized and too many files are rejected with clear messages", async () => {
  const good = sheetPdf("letter", 1);
  await assert.rejects(merge.mergePdfs([]), /at least one/i);
  await assert.rejects(merge.mergePdfs([{ name: "notes.pdf", bytes: new TextEncoder().encode("hello world") }]), /not a PDF/);
  await assert.rejects(merge.mergePdfs([{ name: "empty.pdf", bytes: new Uint8Array(0) }]), /empty/);
  await assert.rejects(merge.mergePdfs([{ name: "cut.pdf", bytes: good.slice(0, Math.floor(good.length / 2)) }]), /incomplete or damaged/);
  await assert.rejects(merge.mergePdfs([{ name: "big.pdf", bytes: new Uint8Array(merge.MERGE_LIMITS.maxFileBytes + 1) }]), /larger than/);
  const many = Array.from({ length: merge.MERGE_LIMITS.maxFiles + 1 }, (_, i) => ({ name: `${i}.pdf`, bytes: good }));
  await assert.rejects(merge.mergePdfs(many), /at most/);
});

test("shadow lift: off is identity, everything from 55% brightness up is untouched, darks get lighter with each level", () => {
  const off = shadow.shadowLut(0);
  for (let v = 0; v < 256; v++) assert.equal(off[v], v);
  let previousBlack = -1, previousDark = -1;
  for (const level of shadow.SHADOW_LEVELS) {
    const lut = shadow.shadowLut(level);
    assert.equal(lut[255], 255, "white stays white");
    for (let v = Math.ceil(shadow.SHADOW_REACH * 255); v < 256; v++) assert.equal(lut[v], v, "light tones and midtones are exactly unchanged");
    for (let v = 1; v < 256; v++) assert.ok(lut[v] >= lut[v - 1], "monotonic: no tones swap order");
    for (let v = 0; v < 256; v++) assert.ok(lut[v] >= v, "never darker than the input");
    assert.equal(lut[0], 0, "black stays black");
    if (level > 0) assert.ok(lut[40] > previousDark, "each level lightens the darks");
    if (level > 0) assert.ok(lut[20] - lut[10] > 10 && lut[40] - lut[30] > 10, "near-black tones are pushed apart, never squeezed together");
    previousBlack = lut[0];
    previousDark = lut[40];
  }
  assert.equal(shadow.shadowLut(5)[0], 0);
  assert.ok(shadow.shadowLut(5)[40] - shadow.shadowLut(5)[0] > 70, "level 5 spreads the darkest 40 values over more than 70");
  assert.ok(shadow.shadowLut(5)[128] - 128 <= 3, "midtones are essentially unchanged (at most 3 of 255 at the strongest level)");
  assert.throws(() => shadow.shadowLut(6));
  assert.throws(() => shadow.shadowLut(1.5));
});

test("shadow lift changes color channels only, never alpha, and level 0 changes nothing", () => {
  const pixels = new Uint8ClampedArray([0, 10, 20, 77, 255, 255, 255, 0]);
  const copy = pixels.slice();
  shadow.applyShadowLift(copy, 0);
  assert.deepEqual([...copy], [...pixels]);
  shadow.applyShadowLift(copy, 3);
  assert.equal(copy[3], 77);
  assert.equal(copy[7], 0);
  assert.equal(copy[0], 0, "black stays black");
  assert.ok(Number(copy[1]) > 10 && Number(copy[2]) > 20);
  assert.deepEqual([...copy.slice(4, 7)], [255, 255, 255]);
});

test("calibration sheet lays out 6 levels in reading order, well inside the page on Letter and A4", () => {
  for (const paper of ["letter", "a4"]) {
    const page = geometry.PAPERS[paper];
    const layout = shadow.calibrationLayout(paper, 90 / 65);
    assert.deepEqual(layout.tiles.map((t) => t.level), [0, 1, 2, 3, 4, 5]);
    assert.equal(layout.tiles[0].steps.length, shadow.CALIBRATION_STEPS.length);
    const rects = layout.tiles.flatMap((t) => [t.image, ...t.steps]);
    for (const r of rects) {
      assert.ok(r.xMm >= 8 - 1e-6 && r.yMm >= 8 - 1e-6, "8 mm from the left and top");
      assert.ok(r.xMm + r.widthMm <= page.widthMm - 8 + 1e-6, "8 mm from the right");
      assert.ok(r.yMm + r.heightMm <= page.heightMm - 8, "8 mm from the bottom");
    }
    assert.ok(layout.footer.yMm < page.heightMm - 8);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const apart = a.xMm + a.widthMm <= b.xMm + 1e-6 || b.xMm + b.widthMm <= a.xMm + 1e-6 || a.yMm + a.heightMm <= b.yMm + 1e-6 || b.yMm + b.heightMm <= a.yMm + 1e-6;
      assert.ok(apart, "tiles and squares never overlap");
    }
  }
  assert.throws(() => shadow.calibrationLayout("letter", 0));
});

test("combining with a shadow lift re-encodes only RGB JPEGs, once each, and leaves other images alone", async () => {
  const { PDFDocument } = require("pdf-lib");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const other = await PDFDocument.create();
  other.addPage([100, 100]).drawImage(await other.embedPng(png), { x: 0, y: 0, width: 50, height: 50 });
  const otherBytes = await other.save();
  const calls = [];
  const liftJpeg = async (jpeg, level) => { calls.push(level); return new Uint8Array([0xff, 0xd8, 9, 9, 9, 0xff, 0xd9]); };
  const sheet = sheetPdf("letter", 3);
  const lifted = await merge.mergePdfs([{ name: "a.pdf", bytes: sheet }, { name: "o.pdf", bytes: otherBytes }], { shadowLevel: 2, liftJpeg });
  assert.equal(lifted.liftedImages, 3);
  assert.ok(lifted.skippedImages >= 1);
  assert.deepEqual(calls, [2, 2, 2]);
  const body = Buffer.from(lifted.bytes).toString("latin1");
  assert.equal((body.match(/ÿØ			ÿÙ/g) || []).length, 3, "new JPEG bytes were written");
  assert.equal((await merge.inspectPdf("lifted.pdf", lifted.bytes)).pageCount, 2, "still a valid, readable PDF");
  // Level 0 and no options behave exactly as before: no transform is called.
  calls.length = 0;
  const plain = await merge.mergePdfs([{ name: "a.pdf", bytes: sheet }], { shadowLevel: 0, liftJpeg });
  assert.equal(calls.length, 0);
  assert.equal(plain.liftedImages, 0);
  assert.deepEqual((await merge.mergePdfs([{ name: "a.pdf", bytes: sheet }])).bytes, plain.bytes);
  await assert.rejects(merge.mergePdfs([{ name: "a.pdf", bytes: sheet }], { shadowLevel: 3 }), /unavailable/);
  await assert.rejects(merge.mergePdfs([{ name: "a.pdf", bytes: sheet }], { shadowLevel: 9, liftJpeg }), /Unsupported/);
});

test("shadow scope accepts only entire card or artwork, defaulting to artwork", () => {
  assert.equal(shadow.DEFAULT_SHADOW_SCOPE, "art");
  assert.equal(shadow.isShadowScope("art"), true);
  assert.equal(shadow.isShadowScope("card"), true);
  assert.equal(shadow.isShadowScope("frame"), false);
  assert.equal(shadow.isShadowScope(undefined), false);
});
