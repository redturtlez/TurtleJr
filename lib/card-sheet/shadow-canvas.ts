import { applyShadowLift, type ShadowLevel } from "./shadow";

/** Canvas-only part of the clear sticker shadow lift, kept small so the card editors can use it without the sheet code. */
export function liftCanvas(source: HTMLCanvasElement, level: ShadowLevel): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(source, 0, 0);
  if (level !== 0) {
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height);
    applyShadowLift(pixels.data, level);
    ctx.putImageData(pixels, 0, 0);
  }
  return copy;
}

/** Lifted copy of an artwork bitmap, for exports that lighten only the artwork. Returns the original at level 0. The caller closes the copy. */
export async function liftBitmap(source: ImageBitmap, level: ShadowLevel): Promise<ImageBitmap> {
  if (level === 0) return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyShadowLift(pixels.data, level);
  ctx.putImageData(pixels, 0, 0);
  return createImageBitmap(canvas);
}

/** Applies the lift to a canvas in place. Used by the live preview, which draws onto one long-lived canvas. */
export function liftCanvasInPlace(canvas: HTMLCanvasElement, level: ShadowLevel): void {
  if (level === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyShadowLift(pixels.data, level);
  ctx.putImageData(pixels, 0, 0);
}
