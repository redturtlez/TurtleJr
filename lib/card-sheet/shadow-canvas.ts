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
