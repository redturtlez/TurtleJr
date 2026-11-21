import { assets, template } from "../card-creator/model";
import { cardFrame, cellPixels, finalBleedMm, isYugiohKind, mmToPx, modeOfKind, type CardKind, type InputBleed, type SheetBleed } from "./geometry";

/**
 * Builds one print cell (the full cell: a Pokémon card plus the sheet bleed, 300 PPI) from an uploaded card image.
 * The image is the card plus `inputBleed` mm of bleed on every side, so it is scaled to its real physical size
 * (never stretched) and centered; if its proportions differ slightly from the card it is fitted evenly. Every card
 * ends up with exactly the sheet bleed (2 mm for Yu-Gi-Oh): any missing bleed (0 or 1 mm declared) is extended outward from the card's own
 * edge pixels and nothing is added to a card that already has 2 mm. A card smaller than the cell (Yu-Gi-Oh) is
 * centered, and the space beyond its 2 mm bleed is left blank. Runs entirely in the browser; nothing is uploaded.
 */
export function composeCell(source: CanvasImageSource & { width: number; height: number }, kind: CardKind, inputBleed: InputBleed, sheetBleed: SheetBleed, yugiohBorder?: HTMLCanvasElement): HTMLCanvasElement {
  const g = cellPixels(sheetBleed, modeOfKind(kind));
  const sourceWidth = source.width,
    sourceHeight = source.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error("The image has no size.");

  // An image with more bleed than the cell gives it (a 2 mm Pokémon image on a 1 mm sheet) is cropped evenly to the final bleed first.
  const excess = inputBleed - finalBleedMm(kind, sheetBleed);
  if (excess > 0) {
    const full = cardFrame(kind, inputBleed, sheetBleed),
      cropX = Math.round((excess / full.sourceWidthMm) * sourceWidth),
      cropY = Math.round((excess / full.sourceHeightMm) * sourceHeight);
    if (sourceWidth - 2 * cropX < 2 || sourceHeight - 2 * cropY < 2) throw new Error("The image is too small to crop.");
    const cropped = document.createElement("canvas");
    cropped.width = sourceWidth - 2 * cropX;
    cropped.height = sourceHeight - 2 * cropY;
    const croppedCtx = cropped.getContext("2d");
    if (!croppedCtx) throw new Error("Canvas is unavailable in this browser.");
    croppedCtx.drawImage(source, cropX, cropY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return composeCell(cropped, kind, finalBleedMm(kind, sheetBleed) as InputBleed, sheetBleed, yugiohBorder);
  }

  const frame = cardFrame(kind, inputBleed, sheetBleed);
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
  let seal: (() => void) | null = null;
  if (kind === "yugioh" && yugiohBorder) {
    // Cards from the Yu-Gi-Oh card creator: extend the creator's own square border graphic, exactly as the creator does
    // for its print bleed (outermost row/column stretched outward, true corner pixels). The card is drawn on top, so a
    // rounded card's transparent corners reveal the square border corner beneath, as before it was rounded.
    const bw = yugiohBorder.width,
      bh = yugiohBorder.height,
      tx = Math.floor((g.width - bw) / 2),
      ty = Math.floor((g.height - bh) / 2),
      tr = g.width - tx - bw,
      tb = g.height - ty - bh;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(yugiohBorder, 0, 0, bw, 1, tx, 0, bw, ty);
    ctx.drawImage(yugiohBorder, 0, bh - 1, bw, 1, tx, ty + bh, bw, tb);
    ctx.drawImage(yugiohBorder, 0, 0, 1, bh, 0, ty, tx, bh);
    ctx.drawImage(yugiohBorder, bw - 1, 0, 1, bh, tx + bw, ty, tr, bh);
    ctx.drawImage(yugiohBorder, 0, 0, 1, 1, 0, 0, tx, ty);
    ctx.drawImage(yugiohBorder, bw - 1, 0, 1, 1, tx + bw, 0, tr, ty);
    ctx.drawImage(yugiohBorder, 0, bh - 1, 1, 1, 0, ty + bh, tx, tb);
    ctx.drawImage(yugiohBorder, bw - 1, bh - 1, 1, 1, tx + bw, ty + bh, tr, tb);
    // The border itself fills the trim area beneath the card so a rounded card's corners show it.
    ctx.drawImage(yugiohBorder, tx, ty);
  } else if (isYugiohKind(kind)) {
    // Anime cards always take this path: the anime frame is the whole card, so its own edge is what gets extended.
    // Same method as the Yu-Gi-Oh card creator: the outermost row/column of pixels is stretched outward with no
    // smoothing, and each corner is filled from the card's own corner pixel, so the bleed is one seamless border.
    ctx.imageSmoothingEnabled = false;
    const alphaAt = (px: number, py: number) => artCtx.getImageData(px, py, 1, 1).data[3] ?? 0;
    // A rounded (or otherwise transparent-cornered) card has see-through corner pixels and an anti-aliased outer ring.
    const rounded = alphaAt(0, 0) < 255 || alphaAt(w - 1, 0) < 255 || alphaAt(0, h - 1) < 255 || alphaAt(w - 1, h - 1) < 255;
    if (rounded) {
      // Sample a few pixels inside the edge and stretch only the straight part of each side, so no transparent
      // corner pixels reach the bleed.
      const e = Math.min(3, Math.floor(w / 2) - 1),
        c = Math.min(mmToPx(2), Math.floor(Math.min(w, h) / 2) - 1);
      ctx.drawImage(art, c, e, w - c * 2, 1, x + c, 0, w - c * 2, y);
      ctx.drawImage(art, c, h - e - 1, w - c * 2, 1, x + c, y + h, w - c * 2, bottom);
      ctx.drawImage(art, e, c, 1, h - c * 2, 0, y + c, x, h - c * 2);
      ctx.drawImage(art, w - e - 1, c, 1, h - c * 2, x + w, y + c, right, h - c * 2);
      // Each corner blends smoothly between the two sides that meet there. A is the color where the horizontal strip
      // ends and B where the vertical strip ends, so the corner joins both strips with no visible step; with the sides
      // alike it is flat, as in the creator's own corner.
      const px = (sx: number, sy: number) => {
        const d = artCtx.getImageData(sx, sy, 1, 1).data;
        return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
      };
      const cornerFill = (bx: number, by: number, bw: number, bh: number, rightSide: boolean, bottomSide: boolean) => {
        if (bw <= 0 || bh <= 0) return;
        const A = px(rightSide ? w - c - 1 : c, bottomSide ? h - e - 1 : e),
          B = px(rightSide ? w - e - 1 : e, bottomSide ? h - c - 1 : c);
        const img = ctx.createImageData(bw, bh);
        for (let j = 0; j < bh; j++)
          for (let i = 0; i < bw; i++) {
            // 0 at the outer corner, 1 at the joint with the horizontal / vertical strip.
            const u = ((rightSide ? bw - 1 - i : i) + 0.5) / bw,
              v = ((bottomSide ? bh - 1 - j : j) + 0.5) / bh;
            const wa = u * u * u,
              wb = v * v * v,
              total = wa + wb,
              o = (j * bw + i) * 4;
            for (let k = 0; k < 3; k++) img.data[o + k] = Math.round(total > 0 ? ((A[k] ?? 0) * wa + (B[k] ?? 0) * wb) / total : ((A[k] ?? 0) + (B[k] ?? 0)) / 2);
            img.data[o + 3] = 255;
          }
        // putImageData ignores the clip, so go through a scratch canvas: the bleed must stop at its 2 mm box.
        const tile = document.createElement("canvas");
        tile.width = bw;
        tile.height = bh;
        const tileCtx = tile.getContext("2d");
        if (!tileCtx) throw new Error("Canvas is unavailable in this browser.");
        tileCtx.putImageData(img, 0, 0);
        ctx.drawImage(tile, bx, by);
      };
      cornerFill(0, 0, x + c, y + c, false, false);
      cornerFill(x + w - c, 0, right + c, y + c, true, false);
      cornerFill(0, y + h - c, x + c, bottom + c, false, true);
      cornerFill(x + w - c, y + h - c, right + c, bottom + c, true, true);
      // The card's own outermost few pixels are anti-aliased and differ from the bleed, which leaves a visible seam.
      // Once the card is placed, repaint that thin ring from the same sample the bleed uses (about 0.25 mm, inside the trim tolerance).
      seal = () => {
        ctx.drawImage(art, c, e, w - c * 2, 1, x + c, y, w - c * 2, e);
        ctx.drawImage(art, c, h - e - 1, w - c * 2, 1, x + c, y + h - e, w - c * 2, e);
        ctx.drawImage(art, e, c, 1, h - c * 2, x, y + c, e, h - c * 2);
        ctx.drawImage(art, w - e - 1, c, 1, h - c * 2, x + w - e, y + c, e, h - c * 2);
      };
    } else {
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
      for (const [sx, sy, dx, dy, dw, dh] of corners) ctx.drawImage(art, sx, sy, 1, 1, dx, dy, dw, dh);
    }
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
  if (seal) (seal as () => void)();
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

let borderCache: Promise<HTMLCanvasElement> | null = null;
/** The Yu-Gi-Oh creator's outer border graphic at trim size (59 x 86 mm, 300 PPI); loaded once and reused. */
export function loadYugiohBorder(): Promise<HTMLCanvasElement> {
  if (!borderCache) {
    borderCache = (async () => {
      const id = template.fixed.find((item) => item.role === "border")?.layer_id;
      const asset = id ? assets[id] : undefined;
      if (!asset) throw new Error("Border graphic unavailable.");
      const image = new Image();
      image.src = asset.url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = mmToPx(59);
      canvas.height = mmToPx(86);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable in this browser.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    })();
    borderCache.catch(() => {
      borderCache = null;
    });
  }
  return borderCache;
}
