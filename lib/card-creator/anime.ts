import { cardTemplate, template, type AnimeParts, type Asset, type Card, type Issues, type LinkArrowKey } from './model';
import { coverCrop } from './layout';
import { fontStyle, type CardFonts } from './fonts';
import type { Images } from './render';

/**
 * Anime-style layout. Numbers are in the 421 x 614 design space the anime frames were drawn in. The anime frame is the
 * whole card, so the design space is stretched over the entire canvas: there is no separate black border, no corner
 * sticker, and the card's own outer edge is what the print bleed extends.
 */
const DESIGN_WIDTH = 421, DESIGN_HEIGHT = 614;
type DesignBox = readonly [x: number, y: number, width: number, height: number];

export const ANIME_ART: DesignBox = [12, 12, 397, 437];
const SYMBOL_MONSTER: DesignBox = [344, 477, 40, 40];
const SYMBOL_BACKROW: DesignBox = [190, 517, 40, 40];
const ATK_BOX: DesignBox = [53, 527, 124, 66];
const DEF_BOX: DesignBox = [244, 527, 124, 66];
const STAT_FONT_SIZE = 46;
const STAR_SIZE = 28, STAR_TOP = 483;
const STAR_STYLES = [
  { from: 1, to: 10, left: 36, maxWidth: 284 },
  { from: 11, to: 11, left: 21, maxWidth: 312 },
  { from: 12, to: 12, left: 14, maxWidth: 320 },
] as const;
const MARKER_BOXES: Readonly<Record<LinkArrowKey, DesignBox>> = {
  'up-left': [0, 0, 43, 43], 'up': [161.5, 0, 97, 24], 'up-right': [378, 0, 43, 43],
  'left': [0, 182, 24, 97], 'right': [397, 182, 24, 97],
  'down-left': [0, 418, 43, 43], 'down': [161.5, 437, 97, 24], 'down-right': [378, 418, 43, 43],
};

/** Star x positions (design space) for a level. Stars run right to left and may overlap slightly, as on anime cards. */
export function animeStarPositions(level: number): number[] {
  const count = Math.min(Math.max(Math.trunc(level), 0), 12);
  const style = STAR_STYLES.find(item => count >= item.from && count <= item.to);
  if (!style) return [];
  const widest = STAR_STYLES[2];
  const spacing = (widest.maxWidth - 12 * STAR_SIZE) / 12;
  const start = style.left + style.maxWidth - (STAR_SIZE + spacing);
  return Array.from({ length: count }, (_, index) => start - index * (STAR_SIZE + spacing));
}

function image(images: Images, asset: Asset): HTMLImageElement {
  const found = images[asset.url];
  if (!found) throw new Error('A card graphic is missing.');
  return found;
}

function drawStat(ctx: CanvasRenderingContext2D, text: string, box: readonly [number, number, number, number], fonts: CardFonts, startSize: number): void {
  if (!text) return;
  const [x, y, width, height] = box;
  const style = fontStyle('attack', fonts);
  for (let size = Math.round(startSize); size >= 20; size--) {
    ctx.font = `${style.prefix}${size}px ${style.family}`;
    if (ctx.measureText(text).width <= width) break;
  }
  ctx.fillStyle = '#14100b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

export interface AnimeFoils { picture?: HTMLImageElement }

/** Draws an anime-style card. Text fields are not drawn: the anime layout carries no name, type or effect text. */
export function drawAnime(ctx: CanvasRenderingContext2D, card: Card, parts: AnimeParts, images: Images, artwork: ImageBitmap | null,
  errors: Issues, fonts: CardFonts, guides: boolean, foils: AnimeFoils): void {
  const selected = cardTemplate(card);
  const [fx, fy, fr, fb] = [0, 0, template.width, template.height];
  const sx = (fr - fx) / DESIGN_WIDTH, sy = (fb - fy) / DESIGN_HEIGHT;
  const box = ([x, y, w, h]: DesignBox): [number, number, number, number] => [fx + x * sx, fy + y * sy, w * sx, h * sy];

  const [ax, ay, aw, ah] = box(ANIME_ART);
  ctx.save();
  ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
  if (artwork) {
    const crop = errors.artwork ? coverCrop(artwork.width, artwork.height, aw, ah)
      : coverCrop(artwork.width, artwork.height, aw, ah, card.artX, card.artY, card.artZoom);
    ctx.drawImage(artwork, ...crop, ax, ay, aw, ah);
  } else {
    ctx.fillStyle = '#e8e1d4'; ctx.fillRect(ax, ay, aw, ah);
    ctx.fillStyle = '#70675b'; ctx.font = '26px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('Your artwork', ax + aw / 2, ay + ah / 2);
  }
  if (foils.picture) { ctx.globalCompositeOperation = 'color-dodge'; ctx.drawImage(foils.picture, ax, ay, aw, ah); }
  ctx.restore();

  ctx.drawImage(image(images, parts.frame), fx, fy, fr - fx, fb - fy);

  if (parts.symbol) {
    const [x, y, w, h] = box(selected.category ? SYMBOL_BACKROW : SYMBOL_MONSTER);
    ctx.drawImage(image(images, parts.symbol), x, y, w, h);
  }
  if (parts.star && !errors.level) {
    const star = image(images, parts.star);
    for (const left of animeStarPositions(card.level)) {
      const [x, y, w, h] = box([left, STAR_TOP, STAR_SIZE, STAR_SIZE]);
      ctx.drawImage(star, x, y, w, h);
    }
  }
  for (const marker of parts.markers) {
    const markerBox = MARKER_BOXES[marker.key];
    if (!markerBox) continue;
    const [x, y, w, h] = box(markerBox);
    ctx.drawImage(image(images, marker.asset), x, y, w, h);
  }
  if (!selected.category) {
    const statSize = STAT_FONT_SIZE * sx;
    if (!errors.attack) drawStat(ctx, card.attack, box(ATK_BOX), fonts, statSize);
    if (selected.arrows) { if (!errors.linkArrows) drawStat(ctx, `L-${card.linkArrows.length}`, box(DEF_BOX), fonts, statSize); }
    else if (!errors.defense) drawStat(ctx, card.defense, box(DEF_BOX), fonts, statSize);
  }
  if (guides) {
    ctx.strokeStyle = '#cf2828'; ctx.lineWidth = 2;
    const targets = [ANIME_ART, ...(selected.category ? [] : [ATK_BOX, DEF_BOX])];
    for (const target of targets) { const [x, y, w, h] = box(target); ctx.strokeRect(x, y, w, h); }
  }
}
