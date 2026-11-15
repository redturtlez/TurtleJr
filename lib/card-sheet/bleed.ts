import { cardFrame, cellPixels, mmToPx, type CardKind, type InputBleed } from "./geometry";

/**
 * Builds one print cell (the full cell: a Pokémon card plus 2 mm bleed, 300 PPI) from an uploaded card image.
 * The image is the card plus `inputBleed` mm of bleed on every side, so it is scaled to its real physical size
 * (never stretched) and centered; if its proportions differ slightly from the card it is fitted evenly. Every card
 * ends up with exactly 2 mm of bleed: any missing bleed (0 or 1 mm declared) is extended outward from the card's own
 * edge pixels and nothing is added to a card that already has 2 mm. A card smaller than the cell (Yu-Gi-Oh) is
 * centered, and the space beyond its 2 mm bleed is left blank. Runs entirely in the browser; nothing is uploaded.
 */
export function composeCell(source: CanvasImageSource & { width: number; height: number }, kind: CardKind, inputBleed: InputBleed): HTMLCanvasElement {
  const g = cellPixels();
  const sourceWidth = source.width,
    sourceHeight = source.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error("The image has no size.");

  const frame = cardFrame(kind, inputBleed);
  const boxWidth = mmToPx(frame.sourceWidthMm),
    boxHeight = mmToPx(frame.sourceHeightMm);
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const w = Math.max(2, Math.round(sourceWidth * scale)),
    h = Math.max(2, Math.round(sourceHeight * scale));
  const x = Math.floor((g.width - w) / 2),
    y = Math.floor((g.height - h) / 2);

  const art = document.createElement("canvas");
  art.width = w;
  art.height = h;
  const artCtx = art.getContext("2d");
  if (!artCtx) throw new Error("Canvas is unavailable in this browser.");
  artCtx.imageSmoothingEnabled = true;
  artCtx.imageSmoothingQuality = "high";
  artCtx.drawImage(source, 0, 0, w, h);

  const cell = document.createElement("canvas");
  cell.width = g.width;
  cell.height = g.height;
  const ctx = cell.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, g.width, g.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // The finished card spans its trim plus exactly 2 mm of bleed, centered; bleed is only extended inside this box.
  const bleedWidth = mmToPx(frame.guideWidthMm),
    bleedHeight = mmToPx(frame.guideHeightMm),
    bleedX = Math.floor((g.width - bleedWidth) / 2),
    bleedY = Math.floor((g.height - bleedHeight) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(bleedX, bleedY, bleedWidth, bleedHeight);
  ctx.clip();
  const right = g.width - x - w,
    bottom = g.height - y - h;
  if (kind === "yugioh") {
    // Same method as the Yu-Gi-Oh card creator: the outermost row/column of pixels is stretched outward with no
    // smoothing, and each corner is filled from the card's own corner pixel, so the bleed is one seamless border.
    ctx.imageSmoothingEnabled = false;
    const opaque = (px: number, py: number) => (artCtx.getImageData(px, py, 1, 1).data[3] ?? 0) === 255;
    const midY = Math.floor(h / 2);
    // Rounded or transparent corner pixels would smear, so fall back to the side's middle pixel in that case.
    const corners: Array<[number, number, number, number, number, number]> = [
      [0, 0, 0, 0, x, y],
      [w - 1, 0, x + w, 0, right, y],
      [0, h - 1, 0, y + h, x, bottom],
      [w - 1, h - 1, x + w, y + h, right, bottom],
    ];
    ctx.drawImage(art, 0, 0, w, 1, x, 0, w, y);
    ctx.drawImage(art, 0, h - 1, w, 1, x, y + h, w, bottom);
    ctx.drawImage(art, 0, 0, 1, h, 0, y, x, h);
    ctx.drawImage(art, w - 1, 0, 1, h, x + w, y, right, h);
    for (const [sx, sy, dx, dy, dw, dh] of corners) ctx.drawImage(art, sx, opaque(sx, sy) ? sy : midY, 1, 1, dx, dy, dw, dh);
  } else {
    // Edge pixels are sampled a few pixels inside the card so rounded or anti-aliased corners are never smeared.
    const edge = Math.min(Math.max(2, Math.round(w * 0.003)), Math.floor(w / 2) - 1),
      corner = Math.min(Math.round(w * 0.055), Math.floor(Math.min(w, h) / 2) - 1),
      midY = Math.floor(h / 2);
    // Corner blocks use a single edge pixel from the middle of the side.
    ctx.drawImage(art, edge, midY, 1, 1, 0, 0, x + corner, y + corner);
    ctx.drawImage(art, w - edge - 1, midY, 1, 1, x + w - corner, 0, right + corner, y + corner);
    ctx.drawImage(art, edge, midY, 1, 1, 0, y + h - corner, x + corner, bottom + corner);
    ctx.drawImage(art, w - edge - 1, midY, 1, 1, x + w - corner, y + h - corner, right + corner, bottom + corner);
    // Straight edges are stretched outward.
    ctx.drawImage(art, corner, edge, w - corner * 2, 1, x, 0, w, y + corner);
    ctx.drawImage(art, corner, h - edge - 1, w - corner * 2, 1, x, y + h - corner, w, bottom + corner);
    ctx.drawImage(art, edge, corner, 1, h - corner * 2, 0, y, x + corner, h);
    ctx.drawImage(art, w - edge - 1, corner, 1, h - corner * 2, x + w - corner, y, right + corner, h);
  }
  ctx.restore();

  ctx.drawImage(art, x, y);
  return cell;
}

/** Duplicates a finished cell so the same card can be placed in more than one slot. */
export function cloneCell(cell: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = cell.width;
  copy.height = cell.height;
  const ctx = copy.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(cell, 0, 0);
  return copy;
}

/** JPEG bytes for one cell, for embedding in the PDF. */
export async function cellToJpeg(cell: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => cell.toBlob((value) => (value ? resolve(value) : reject(new Error("Image encoding failed."))), "image/jpeg", 0.95));
  return new Uint8Array(await blob.arrayBuffer());
}
