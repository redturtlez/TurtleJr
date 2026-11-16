"use client";
import { useEffect, useRef, useState } from "react";
import { decodeArtwork } from "../../../lib/card-creator/artwork";
import { cloneCell, cellToJpeg, composeCell, loadYugiohBorder } from "../../../lib/card-sheet/bleed";
import { CARD_KINDS, CELL_MM, GRID, INPUT_BLEEDS, PAPERS, cropMarkLength, cropMarks, gridGuides, sheetLayout, trimRect, type CardKind, type InputBleed, type PaperId, type PlacedCard, type SheetLayout } from "../../../lib/card-sheet/geometry";
import { guessCard } from "../../../lib/card-sheet/detect";
import { buildPdf, type PdfLines } from "../../../lib/card-sheet/pdf";
import PdfCombiner from "./PdfCombiner";
import styles from "./sheet.module.css";

type Slot = {
  id: number;
  name: string;
  /** Kept so the card can be rebuilt when its type or bleed changes; never uploaded anywhere. */
  file: File;
  /** Chosen after upload; null until the user picks it (the preview uses Pokémon size meanwhile). */
  kind: CardKind | null;
  /** Bleed (mm) already present in the image. */
  bleed: InputBleed;
  /** True when the type and bleed came from the image's proportions rather than the user. */
  guessed: boolean;
  rev: number;
  pending: boolean;
  cell: HTMLCanvasElement;
} | null;
const placedCards = (layout: SheetLayout, slots: Slot[]): PlacedCard[] =>
  layout.cells.flatMap((cell) => {
    const slot = slots[cell.index];
    return slot ? [{ cell, kind: slot.kind ?? "pokemon" }] : [];
  });
const emptySlots = (): Slot[] => Array.from({ length: GRID.max }, () => null);
const PREVIEW_PX_PER_MM = 2.4;
const FULL_PX_PER_MM = 300 / 25.4; // the full-size preview is drawn at the PDF's 300 PPI
const CSS_PX_PER_MM = 96 / 25.4; // "actual size" on screen

function CellThumb({ cell }: { cell: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = 160;
    canvas.height = Math.round((160 * cell.height) / cell.width);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cell, 0, 0, canvas.width, canvas.height);
  }, [cell]);
  return <canvas ref={ref} className={styles.thumb} aria-hidden="true" />;
}

function drawPreview(canvas: HTMLCanvasElement, slots: Slot[], paper: PaperId, guides: boolean, marks: boolean, k: number = PREVIEW_PX_PER_MM) {
  const layout = sheetLayout(paper);
  canvas.width = Math.round(layout.pageWidthMm * k);
  canvas.height = Math.round(layout.pageHeightMm * k);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  for (const cell of layout.cells) {
    const slot = slots[cell.index];
    const x = cell.xMm * k,
      y = cell.yMm * k,
      w = CELL_MM.width * k,
      h = CELL_MM.height * k;
    if (slot) ctx.drawImage(slot.cell, x, y, w, h);
    else {
      ctx.strokeStyle = "#b8b8b8";
      ctx.setLineDash([2.5 * k, 2 * k]);
      const outline = trimRect({ cell, kind: "pokemon" });
      ctx.strokeRect(outline.xMm * k, outline.yMm * k, outline.widthMm * k, outline.heightMm * k);
      ctx.setLineDash([]);
      ctx.fillStyle = "#9a9a9a";
      ctx.font = `600 ${Math.round(9 * k)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(cell.index + 1), x + w / 2, y + h / 2 + 3.3 * k);
    }
  }
  if (guides) {
    // 1 px white guides along the grid lines between cells, like a # sign (never on a card).
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    for (const s of gridGuides(layout, placedCards(layout, slots))) {
      ctx.beginPath();
      ctx.moveTo(s.x1 * k, s.y1 * k);
      ctx.lineTo(s.x2 * k, s.y2 * k);
      ctx.stroke();
    }
  }
  if (marks) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    for (const s of cropMarks(layout, placedCards(layout, slots))) {
      ctx.beginPath();
      ctx.moveTo(s.x1 * k, s.y1 * k);
      ctx.lineTo(s.x2 * k, s.y2 * k);
      ctx.stroke();
    }
  }
}

const MIN_WIDTH = 240,
  MAX_WIDTH = 9000;
/** Modal full-size view of the sheet, drawn at 300 PPI so it matches the PDF; zoom with the buttons, slider, +/- keys or Ctrl+wheel, drag to pan. */
function FullPreview({ slots, paper, guides, marks, onClose }: { slots: Slot[]; paper: PaperId; guides: boolean; marks: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const layout = sheetLayout(paper);
  const actualWidth = layout.pageWidthMm * CSS_PX_PER_MM;
  const [width, setWidth] = useState(0);
  const clamp = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
  const fitWidth = () => {
    const box = viewport.current;
    if (!box) return actualWidth;
    const byWidth = box.clientWidth - 32,
      byHeight = ((box.clientHeight - 32) * layout.pageWidthMm) / layout.pageHeightMm;
    return clamp(Math.min(byWidth, byHeight));
  };
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    setWidth(fitWidth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (canvas.current) drawPreview(canvas.current, slots, paper, guides, marks, FULL_PX_PER_MM);
  }, [slots, paper, guides, marks]);
  useEffect(() => {
    const box = viewport.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setWidth((old) => clamp(old * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);
  const zoomBy = (factor: number) => setWidth((old) => clamp(old * factor));
  const percent = Math.round((width / actualWidth) * 100);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="Full-size sheet preview"
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "+" || e.key === "=") zoomBy(1.25);
        else if (e.key === "-") zoomBy(1 / 1.25);
        else if (e.key === "0") setWidth(fitWidth());
      }}
    >
      <div className={styles.toolbar}>
        <strong>Full-size preview</strong>
        <div className={styles.zoomControls}>
          <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out" disabled={width <= MIN_WIDTH}>
            −
          </button>
          <input type="range" min={MIN_WIDTH} max={MAX_WIDTH} step={10} value={Math.round(width)} onChange={(e) => setWidth(clamp(Number(e.target.value)))} aria-label="Zoom" />
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" disabled={width >= MAX_WIDTH}>
            +
          </button>
          <output aria-live="off">{percent}%</output>
          <button type="button" onClick={() => setWidth(fitWidth())}>
            Fit
          </button>
          <button type="button" onClick={() => setWidth(clamp(actualWidth))}>
            Actual size
          </button>
        </div>
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
      <div
        ref={viewport}
        className={styles.viewport}
        tabIndex={0}
        aria-label="Sheet preview. Scroll or drag to move; plus and minus keys zoom."
        onPointerDown={(e) => {
          const box = viewport.current;
          if (!box || e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop };
          box.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const box = viewport.current,
            start = drag.current;
          if (!box || !start) return;
          box.scrollLeft = start.left - (e.clientX - start.x);
          box.scrollTop = start.top - (e.clientY - start.y);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <canvas ref={canvas} className={styles.fullCanvas} style={{ width: width ? `${width}px` : undefined }} role="img" aria-label="Full-size preview of the card sheet" />
      </div>
      <p className={styles.hint}>
        {PAPERS[paper].label} · drawn at 300 PPI like the PDF · drag to pan · Ctrl + wheel or +/− to zoom · 0 to fit
      </p>
    </dialog>
  );
}

export default function SheetEditor() {
  const [slots, setSlots] = useState<Slot[]>(emptySlots);
  const [paper, setPaper] = useState<PaperId>("letter");
  const [guides, setGuides] = useState(true);
  const [marks, setMarks] = useState(false);
  const [status, setStatus] = useState("Add up to 9 card images to begin.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const nextId = useRef(1);
  const replaceTarget = useRef<number | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const layout = sheetLayout(paper);
  const marksAvailable = cropMarkLength(layout) > 0;
  const marksOn = marks && marksAvailable;
  const filled = slots.filter(Boolean).length;
  const pending = slots.some((slot) => slot?.pending);
  const untyped = slots.filter((slot) => slot && !slot.kind).length;

  useEffect(() => {
    if (preview.current) drawPreview(preview.current, slots, paper, guides, marksOn);
  }, [slots, paper, guides, marksOn]);

  async function buildCell(file: File, kind: CardKind, bleed: InputBleed): Promise<HTMLCanvasElement> {
    const bitmap = await decodeArtwork(file);
    try {
      return composeCell(bitmap, kind, bleed, kind === "yugioh" ? await loadYugiohBorder().catch(() => undefined) : undefined);
    } finally {
      bitmap.close();
    }
  }
  async function makeSlot(file: File, fallback: { kind: CardKind | null; bleed: InputBleed }): Promise<NonNullable<Slot>> {
    const bitmap = await decodeArtwork(file);
    try {
      const guess = guessCard(bitmap.width, bitmap.height);
      const kind = guess ? guess.kind : fallback.kind,
        bleed = guess ? guess.bleed : fallback.bleed;
      return { id: nextId.current++, name: file.name.slice(0, 80), file, kind, bleed, guessed: Boolean(guess), rev: 0, pending: false, cell: composeCell(bitmap, kind ?? "pokemon", bleed, kind === "yugioh" ? await loadYugiohBorder().catch(() => undefined) : undefined) };
    } finally {
      bitmap.close();
    }
  }
  /** Rebuilds one card after its type or bleed changed; a newer change supersedes an older rebuild still running. */
  async function reconfigure(slot: NonNullable<Slot>, patch: { kind?: CardKind; bleed?: InputBleed }) {
    const kind = patch.kind ?? slot.kind,
      bleed = patch.bleed ?? slot.bleed,
      rev = slot.rev + 1;
    setSlots((old) => old.map((value) => (value && value.id === slot.id ? { ...value, kind, bleed, guessed: false, rev, pending: true } : value)));
    try {
      const cell = await buildCell(slot.file, kind ?? "pokemon", bleed);
      setSlots((old) => old.map((value) => (value && value.id === slot.id && value.rev === rev ? { ...value, cell, pending: false } : value)));
    } catch (e) {
      setSlots((old) => old.map((value) => (value && value.id === slot.id && value.rev === rev ? { ...value, pending: false } : value)));
      setError(e instanceof Error ? e.message : "The card could not be rebuilt.");
    }
  }
  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const free = slots.flatMap((slot, index) => (slot ? [] : [index]));
    if (!free.length) {
      setError("All 9 slots are full. Remove a card to add another.");
      return;
    }
    setBusy(true);
    setError("");
    const accepted = Array.from(files).slice(0, free.length);
    const problems: string[] = files.length > free.length ? [`Only ${free.length} free slot${free.length === 1 ? "" : "s"}; ${files.length - free.length} image(s) skipped.`] : [];
    const made: [number, NonNullable<Slot>][] = [];
    for (const [i, file] of accepted.entries()) {
      try {
        made.push([free[i] as number, await makeSlot(file, { kind: null, bleed: 0 })]);
      } catch (e) {
        problems.push(`${file.name.slice(0, 40)}: ${e instanceof Error ? e.message : "could not be read."}`);
      }
    }
    // Failed files leave their slot free, so successful ones are packed into the first free slots.
    setSlots((old) => {
      const next = [...old];
      const open = next.flatMap((slot, index) => (slot ? [] : [index]));
      made.forEach(([, slot], i) => {
        const index = open[i];
        if (index !== undefined) next[index] = slot;
      });
      return next;
    });
    setStatus(made.length ? `Added ${made.length} image${made.length === 1 ? "" : "s"}${made.filter(([, slot]) => slot.guessed).length ? `; ${made.filter(([, slot]) => slot.guessed).length} auto-detected` : ""}. Check each card's type and bleed below.` : "No images were added.");
    setError(problems.join(" "));
    setBusy(false);
  }

  async function replaceFile(file?: File) {
    const index = replaceTarget.current;
    replaceTarget.current = null;
    if (!file || index === null) return;
    setBusy(true);
    setError("");
    try {
      const current = slots[index];
      const slot = await makeSlot(file, { kind: current?.kind ?? null, bleed: current?.bleed ?? 0 });
      setSlots((old) => old.map((value, i) => (i === index ? slot : value)));
      setStatus(`Replaced card ${index + 1}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The image could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function remove(index: number) {
    setSlots((old) => old.map((value, i) => (i === index ? null : value)));
    setStatus(`Removed card ${index + 1}.`);
  }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= GRID.max) return;
    setSlots((old) => {
      const next = [...old];
      [next[index], next[target]] = [next[target] ?? null, next[index] ?? null];
      return next;
    });
    setStatus(`Moved card ${index + 1} to position ${target + 1}.`);
  }
  function duplicate(index: number) {
    const source = slots[index];
    if (!source) return;
    const free = slots.findIndex((slot, i) => !slot && i > index) >= 0 ? slots.findIndex((slot, i) => !slot && i > index) : slots.findIndex((slot) => !slot);
    if (free < 0) {
      setError("All 9 slots are full. Remove a card to make a copy.");
      return;
    }
    setError("");
    setSlots((old) => old.map((value, i) => (i === free ? { ...source, id: nextId.current++, rev: 0, cell: cloneCell(source.cell) } : value)));
    setStatus(`Copied card ${index + 1} into position ${free + 1}.`);
  }
  function clearAll() {
    setSlots(emptySlots());
    setStatus("Cleared all cards.");
    setError("");
  }

  async function download() {
    setBusy(true);
    setError("");
    try {
      const placed = placedCards(layout, slots);
      const cells = placed.map((card) => ({ cell: card.cell, canvas: (slots[card.cell.index] as NonNullable<Slot>).cell }));
      const images = await Promise.all(
        cells.map(async ({ cell, canvas }) => ({
          jpeg: await cellToJpeg(canvas),
          pixelWidth: canvas.width,
          pixelHeight: canvas.height,
          xMm: cell.xMm,
          yMm: cell.yMm,
          widthMm: CELL_MM.width,
          heightMm: CELL_MM.height,
        })),
      );
      const lines: PdfLines[] = [];
      if (guides) lines.push({ segments: gridGuides(layout, placed), gray: 1 as const, widthPt: 0.24 });
      if (marksOn) lines.push({ segments: cropMarks(layout, placed), gray: 0 as const, widthPt: 0.35 });
      const pdf = buildPdf({ widthMm: layout.pageWidthMm, heightMm: layout.pageHeightMm, images, lines });
      const bytes = new ArrayBuffer(pdf.byteLength);
      new Uint8Array(bytes).set(pdf);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `card-sheet-${paper}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus(`Downloaded card-sheet-${paper}.pdf with ${cells.length} card${cells.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The PDF could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header>
        <div>
          <p className={styles.eyebrow}>The Card Studio</p>
          <h1>Card Sheet Maker</h1>
          <p>
            Upload up to 9 card images and download a print-ready 3 × 3 PDF. Cards print at their real size, Pokémon {CARD_KINDS.pokemon.widthMm} × {CARD_KINDS.pokemon.heightMm} mm or Yu-Gi-Oh {CARD_KINDS.yugioh.widthMm} × {CARD_KINDS.yugioh.heightMm} mm, centered in a {CELL_MM.width} × {CELL_MM.height} mm cell; missing bleed is extended. Images never leave your device.
          </p>
        </div>
        <span>No sign-in needed</span>
      </header>
      <div className={styles.workspace}>
        <section className={styles.controls} aria-label="Sheet settings and cards">
          <h2>Cards ({filled}/{GRID.max})</h2>
          <div className={styles.actions}>
            <button type="button" onClick={() => addInput.current?.click()} disabled={busy || filled >= GRID.max}>
              Add images
            </button>
            <button type="button" onClick={clearAll} disabled={busy || !filled}>
              Clear all
            </button>
          </div>
          <input
            ref={addInput}
            className={styles.hidden}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            aria-label="Add card images"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={replaceInput}
            className={styles.hidden}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Replace card image"
            onChange={(e) => {
              void replaceFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className={styles.note}>PNG, JPEG or WebP, up to 10 MB each. After adding images, the type and bleed are detected from the image's proportions where possible. Check them, and choose the type yourself for any card left unset, so each prints at its real size and is never stretched. Bleed is extended up to 2 mm per side where missing. Add the same image to several slots, or use Copy, for duplicates.</p>
          <ol className={styles.slots}>
            {slots.map((slot, index) => (
              <li key={slot ? slot.id : `empty-${index}`} className={slot ? styles.slot : `${styles.slot} ${styles.empty}`}>
                <span className={styles.slotNumber}>{index + 1}</span>
                {slot ? (
                  <>
                    <CellThumb cell={slot.cell} />
                    <span className={styles.slotName} title={slot.name}>
                      {slot.name}
                    </span>
                    <div className={styles.slotSelects}>
                      <select
                        value={slot.kind ?? ""}
                        onChange={(e) => e.target.value && void reconfigure(slot, { kind: e.target.value as CardKind })}
                        aria-label={`Card ${index + 1} type`}
                        aria-invalid={!slot.kind}
                        className={slot.kind ? undefined : styles.needsType}
                      >
                        {!slot.kind && <option value="">Choose card type…</option>}
                        <option value="pokemon">Pokémon</option>
                        <option value="yugioh">Yu-Gi-Oh</option>
                      </select>
                      <select
                        value={slot.bleed}
                        onChange={(e) => void reconfigure(slot, { bleed: Number(e.target.value) as InputBleed })}
                        aria-label={`Card ${index + 1} bleed already in the image`}
                      >
                        {INPUT_BLEEDS.map((value) => (
                          <option key={value} value={value}>
                            {value} mm bleed
                          </option>
                        ))}
                      </select>
                    </div>
                    {slot.pending ? <span className={styles.slotName}>Updating…</span> : slot.guessed ? <span className={styles.slotName}>Auto-detected: check it</span> : null}
                    <div className={styles.slotActions}>
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move card ${index + 1} earlier`}>
                        ←
                      </button>
                      <button type="button" onClick={() => move(index, 1)} disabled={index === GRID.max - 1} aria-label={`Move card ${index + 1} later`}>
                        →
                      </button>
                      <button type="button" onClick={() => duplicate(index)} disabled={busy || filled >= GRID.max} aria-label={`Copy card ${index + 1}`}>
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          replaceTarget.current = index;
                          replaceInput.current?.click();
                        }}
                        disabled={busy}
                        aria-label={`Replace card ${index + 1}`}
                      >
                        Replace
                      </button>
                      <button type="button" onClick={() => remove(index)} aria-label={`Remove card ${index + 1}`}>
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <span className={styles.slotName}>Empty</span>
                )}
              </li>
            ))}
          </ol>
          <h2>Page</h2>
          <div className={styles.field}>
            <label htmlFor="sheet-paper">Paper size</label>
            <select id="sheet-paper" value={paper} onChange={(e) => setPaper(e.target.value as PaperId)}>
              {(Object.keys(PAPERS) as PaperId[]).map((id) => (
                <option key={id} value={id}>
                  {PAPERS[id].label}
                </option>
              ))}
            </select>
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
            1 px white cut guides on the grid lines (like a # sign)
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={marksOn} disabled={!marksAvailable} onChange={(e) => setMarks(e.target.checked)} />
            Crop marks{marksAvailable ? "" : " (needs more margin; available on A4)"}
          </label>
          {paper === "letter" && (
            <p className={styles.warning}>
              Letter leaves only {layout.marginYMm.toFixed(2)} mm above and below the grid. Most printers cannot print that close to the edge, so print at 100% (Actual size) with borderless printing if available, or choose A4. Expect the outer bleed to be clipped, never scaled.
            </p>
          )}
        </section>
        <section className={styles.preview} aria-label="Sheet preview">
          <div className={styles.previewHeader}>
            <h2>Preview</h2>
            <span>
              {PAPERS[paper].label} · cells {CELL_MM.width} × {CELL_MM.height} mm
            </span>
          </div>
          <div className={styles.stage}>
            <canvas ref={preview} role="img" aria-label={`Preview of the 3 by 3 card sheet with ${filled} card${filled === 1 ? "" : "s"}`} />
          </div>
          <button type="button" className={styles.secondary} onClick={() => setFullOpen(true)}>
            Open full-size preview
          </button>
          <button type="button" className={styles.download} onClick={() => void download()} disabled={busy || pending || !filled || untyped > 0}>
            {busy || pending ? "Working…" : `Download PDF (${filled} card${filled === 1 ? "" : "s"})`}
          </button>
          {untyped > 0 && (
            <p className={styles.warning}>
              Choose a card type (Pokémon or Yu-Gi-Oh) for {untyped} card{untyped === 1 ? "" : "s"} before downloading, so each prints at its real size.
            </p>
          )}
          <p className={styles.status} role="status" aria-live="polite">
            {status}
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      <PdfCombiner />
      {fullOpen && <FullPreview slots={slots} paper={paper} guides={guides} marks={marksOn} onClose={() => setFullOpen(false)} />}
    </div>
  );
}
