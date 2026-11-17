import { cellToJpeg } from "./bleed";
import { PAPERS, PPI, MM_PER_INCH, type PaperId } from "./geometry";
import { buildPdf } from "./pdf";
import { CALIBRATION_STEPS, applyShadowLift, calibrationLayout, shadowLevelLabel, shadowLut, type ShadowLevel } from "./shadow";

/** Browser-only helpers for the clear sticker shadow lift. Everything runs on the device; nothing is uploaded. */
const pxPerMm = PPI / MM_PER_INCH;
const JPEG_QUALITY = 0.95;

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  return ctx;
}

/** A copy of the canvas with the lift applied; the original is untouched. */
export function liftCanvas(source: HTMLCanvasElement, level: ShadowLevel): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const ctx = context(copy);
  ctx.drawImage(source, 0, 0);
  if (level !== 0) {
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height);
    applyShadowLift(pixels.data, level);
    ctx.putImageData(pixels, 0, 0);
  }
  return copy;
}

/** Re-encodes one JPEG with the lift applied, keeping its pixel size. Used for images inside existing PDFs. */
export async function liftJpegBytes(bytes: Uint8Array, level: ShadowLevel): Promise<Uint8Array> {
  const view = new Uint8Array(bytes.byteLength);
  view.set(bytes);
  const bitmap = await createImageBitmap(new Blob([view], { type: "image/jpeg" }));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    context(canvas).drawImage(bitmap, 0, 0);
    return await cellToJpeg(liftCanvas(canvas, level));
  } finally {
    bitmap.close();
  }
}

/**
 * One-page PDF to print on the sticker stock: the given card at every lift level, plus dark gray squares lifted the
 * same way, so a single print shows which level keeps the dark detail. The page is one 300 PPI image.
 */
export async function buildCalibrationPdf(card: HTMLCanvasElement, paper: PaperId): Promise<Uint8Array> {
  const page = PAPERS[paper];
  const layout = calibrationLayout(paper, card.height / card.width);
  const mm = (value: number) => Math.round(value * pxPerMm);
  const canvas = document.createElement("canvas");
  canvas.width = mm(page.widthMm);
  canvas.height = mm(page.heightMm);
  const ctx = context(canvas);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  const font = (mmSize: number, weight = "normal") => `${weight} ${Math.round(mmSize * pxPerMm)}px Arial, Helvetica, sans-serif`;
  ctx.font = font(5.5, "bold");
  ctx.fillText("Clear sticker shadow lift test", mm(layout.title.xMm), mm(layout.title.yMm + 5.5));
  ctx.font = font(3.4);
  ctx.fillText("Same card at each level. Higher levels lighten the dark areas. Pick the lowest level where the dark", mm(layout.title.xMm), mm(layout.title.yMm + 11));
  ctx.fillText("detail and the dark squares are still clearly separate.", mm(layout.title.xMm), mm(layout.title.yMm + 15));
  for (const tile of layout.tiles) {
    ctx.fillStyle = "#000";
    ctx.font = font(4, "bold");
    ctx.fillText(`${tile.level} · ${shadowLevelLabel(tile.level)}`, mm(tile.label.xMm), mm(tile.label.yMm));
    const w = mm(tile.image.widthMm),
      h = mm(tile.image.heightMm);
    const scaled = document.createElement("canvas");
    scaled.width = w;
    scaled.height = h;
    const scaledCtx = context(scaled);
    scaledCtx.imageSmoothingQuality = "high";
    scaledCtx.drawImage(card, 0, 0, w, h);
    ctx.drawImage(liftCanvas(scaled, tile.level), mm(tile.image.xMm), mm(tile.image.yMm));
    const lut = shadowLut(tile.level);
    tile.steps.forEach((step, index) => {
      const value = lut[CALIBRATION_STEPS[index] as number] as number;
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      ctx.fillRect(mm(step.xMm), mm(step.yMm), mm(step.widthMm), mm(step.heightMm));
    });
  }
  ctx.fillStyle = "#000";
  ctx.font = font(3.4);
  ctx.fillText("Print at 100% (Actual size), not Fit to page. Photo or high-quality mode if offered.", mm(layout.footer.xMm), mm(layout.footer.yMm));
  const jpeg = await cellToJpeg(canvas);
  return buildPdf({
    widthMm: page.widthMm,
    heightMm: page.heightMm,
    images: [{ jpeg, pixelWidth: canvas.width, pixelHeight: canvas.height, xMm: 0, yMm: 0, widthMm: page.widthMm, heightMm: page.heightMm }],
    lines: [],
  });
}

function pdfFile(pdf: Uint8Array, filename: string) {
  const bytes = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(bytes).set(pdf);
  return new File([bytes], filename, { type: "application/pdf" });
}
/** True when this browser can hand a PDF file to another app (the phone share sheet: email, messages, print). */
export function canSharePdf(): boolean {
  try {
    return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [pdfFile(new Uint8Array(8), "test.pdf")] });
  } catch {
    return false;
  }
}
/** Opens the share sheet. Returns false when sharing is unavailable; cancelling the sheet counts as handled. */
export async function sharePdf(pdf: Uint8Array, filename: string): Promise<boolean> {
  if (!canSharePdf()) return false;
  try {
    await navigator.share({ files: [pdfFile(pdf, filename)], title: filename });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) return false;
  }
  return true;
}
/** Saves the PDF through the browser's download. */
export function savePdf(pdf: Uint8Array, filename: string): void {
  const bytes = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(bytes).set(pdf);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
