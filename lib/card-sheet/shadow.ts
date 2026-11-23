import { PAPERS, type PaperId, type Rect } from "./geometry";

/**
 * "Clear sticker" shadow lift. A laser printer has no white toner, so on clear sticker stock dark tones fill in
 * (dot gain) and fine shadow detail turns into one blotch. The lift pushes dark tones apart.
 *
 * It is driven by the pixel's BRIGHTEST channel (max of red, green, blue), and the resulting gain multiplies all three
 * channels equally. So a pixel is only lifted when every channel is dark: vivid colors (one bright channel) are left
 * exactly as they were, and a dark color keeps its hue and saturation because its channel ratios do not change.
 * The gain fades to nothing at SHADOW_REACH (30% brightness); everything brighter comes out exactly as it went in.
 * Values at or below SHADOW_BLACK_FLOOR stay as they were (true black stays black), with a smooth ramp above it.
 * Level 0 is off; level 3 is the strongest. Pure functions, no DOM, so they can be tested directly.
 */
export const SHADOW_LEVELS = [0, 1, 2, 3] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];
export const DEFAULT_SHADOW_LEVEL: ShadowLevel = 0;
const MAX_SHADOW_LEVEL = 3;
/** Brightness (0 to 1) of the brightest channel at and above which the lift is the identity. */
export const SHADOW_REACH = 0.3;
/** Brightest-channel values (out of 255) at or below this are left alone; the lift ramps in smoothly up to 4x this. */
export const SHADOW_BLACK_FLOOR = 3;
const BLACK_RAMP_END = SHADOW_BLACK_FLOOR * 4;
/** Extra gain at the start of the curve at the strongest level (gain = 1 + this). Up to 3 the curve never reverses tones. */
const MAX_STEEPNESS = 2;

/** What a card export applies the lift to: the whole finished card, or only the artwork (frame and text stay as drawn). */
export type ShadowScope = "card" | "art";
export const DEFAULT_SHADOW_SCOPE: ShadowScope = "art";
export const isShadowScope = (value: unknown): value is ShadowScope => value === "card" || value === "art";

export const isShadowLevel =(value: unknown): value is ShadowLevel => typeof value === "number" && (SHADOW_LEVELS as readonly number[]).includes(value);
export const shadowLevelLabel = (level: ShadowLevel) => (level === 0 ? "Off" : `Level ${level}`);

/** 256-entry gain table, indexed by a pixel's brightest channel (0 to 255): the factor all three channels are multiplied by. */
export function shadowGains(level: ShadowLevel): Float32Array {
  if (!isShadowLevel(level)) throw new Error("Unsupported shadow lift level.");
  const steepness = MAX_STEEPNESS * (level / MAX_SHADOW_LEVEL);
  const gains = new Float32Array(256).fill(1);
  for (let value = 1; value < 256; value++) {
    const x = value / 255;
    if (x >= SHADOW_REACH || value <= SHADOW_BLACK_FLOOR) continue;
    const ramp = Math.min(1, (value - SHADOW_BLACK_FLOOR) / (BLACK_RAMP_END - SHADOW_BLACK_FLOOR)),
      smooth = ramp * ramp * (3 - 2 * ramp);
    gains[value] = 1 + steepness * smooth * Math.pow(1 - x / SHADOW_REACH, 2);
  }
  return gains;
}

/** Output of the curve for a neutral gray (or any pixel's brightest channel): `lut[v]` is what value `v` becomes. */
export function shadowLut(level: ShadowLevel): Uint8Array {
  const gains = shadowGains(level);
  const lut = new Uint8Array(256);
  for (let value = 0; value < 256; value++) lut[value] = Math.min(255, Math.round(value * (gains[value] as number)));
  return lut;
}

/** Lifts one color (each channel 0 to 255) the same way applyShadowLift does. */
export function liftRgb(red: number, green: number, blue: number, level: ShadowLevel): [number, number, number] {
  const gain = (shadowGains(level)[Math.max(red, green, blue)] as number) ?? 1;
  return [Math.min(255, Math.round(red * gain)), Math.min(255, Math.round(green * gain)), Math.min(255, Math.round(blue * gain))];
}

/** Applies the lift to RGBA pixel data in place; alpha is never changed. */
export function applyShadowLift(data: Uint8ClampedArray, level: ShadowLevel): void {
  if (level === 0) return;
  const gains = shadowGains(level);
  for (let index = 0; index + 3 < data.length; index += 4) {
    const red = data[index] as number,
      green = data[index + 1] as number,
      blue = data[index + 2] as number;
    const gain = gains[red > green ? (red > blue ? red : blue) : green > blue ? green : blue] as number;
    if (gain === 1) continue;
    data[index] = Math.round(red * gain);
    data[index + 1] = Math.round(green * gain);
    data[index + 2] = Math.round(blue * gain);
  }
}

/** Gray values (out of 255) in the calibration step strip: dark squares to judge the lift, then light ones that must not change. */
export const CALIBRATION_STEPS: readonly number[] = [0, 10, 20, 30, 41, 51, 64, 77, 102, 128, 170, 220];

/**
 * Colors (red, green, blue) in the calibration color strip, one per gray step. The first eight are vivid or medium colors
 * that must print the same at every level; the last four are dark colors that may lighten but must keep their hue.
 */
export const CALIBRATION_SWATCHES: readonly (readonly [number, number, number])[] = [
  [220, 30, 40], // red
  [240, 140, 30], // orange
  [245, 215, 40], // yellow
  [30, 160, 60], // green
  [20, 150, 160], // teal
  [30, 80, 200], // blue
  [130, 50, 170], // purple
  [224, 172, 140], // skin
  [20, 30, 70], // dark navy
  [90, 15, 20], // dark red
  [15, 50, 25], // dark green
  [18, 16, 14], // black fur
];

export interface CalibrationTile {
  level: ShadowLevel;
  label: { xMm: number; yMm: number };
  image: Rect;
  steps: Rect[];
  swatches: Rect[];
}
export interface CalibrationLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  title: { xMm: number; yMm: number };
  tiles: CalibrationTile[];
  footer: { xMm: number; yMm: number };
  /** Second footer line sits this far below `footer`. */
  footerLineMm: number;
}

const MAX_TILE_WIDTH_MM = 60,
  COLUMNS = 2,
  TEXT_LEFT_MM = 12,
  TILE_GAP_X_MM = 6,
  TILE_GAP_Y_MM = 6,
  TOP_MM = 10,
  TITLE_BLOCK_MM = 18,
  LABEL_BLOCK_MM = 7,
  STRIP_HEIGHT_MM = 6,
  STRIP_GAP_MM = 2,
  SQUARE_GAP_MM = 0.5,
  FOOTER_GAP_MM = 8,
  FOOTER_LINE_MM = 4.5,
  PAGE_MARGIN_MM = 8;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Test page: the same card at every lift level (2 x 2 tiles, level 0 first), each with a strip of gray squares and a
 * strip of color squares lifted the same way. `imageAspect` is the card image's height divided by its width. Tiles
 * shrink if a tall card would not fit. All content stays at least 8 mm from the page edge, clear of a printer's 4 mm margin.
 */
export function calibrationLayout(paper: PaperId, imageAspect: number): CalibrationLayout {
  const page = PAPERS[paper];
  if (!page) throw new Error("Unsupported paper size.");
  if (!(imageAspect > 0.5 && imageAspect < 2)) throw new Error("Unsupported card image shape.");
  const rows = Math.ceil(SHADOW_LEVELS.length / COLUMNS),
    firstRow = TOP_MM + TITLE_BLOCK_MM,
    fixedRowMm = LABEL_BLOCK_MM + 2 + STRIP_HEIGHT_MM + STRIP_GAP_MM + STRIP_HEIGHT_MM,
    availableMm = page.heightMm - PAGE_MARGIN_MM - firstRow - FOOTER_GAP_MM - FOOTER_LINE_MM - (rows - 1) * TILE_GAP_Y_MM,
    tileWidth = round3(Math.min(MAX_TILE_WIDTH_MM, (availableMm / rows - fixedRowMm) / imageAspect));
  if (tileWidth < 30) throw new Error("The page is too small for the shadow lift test.");
  const imageHeight = round3(tileWidth * imageAspect),
    rowHeight = fixedRowMm + imageHeight,
    left = round3((page.widthMm - (COLUMNS * tileWidth + (COLUMNS - 1) * TILE_GAP_X_MM)) / 2),
    squareWidth = (tileWidth - (CALIBRATION_STEPS.length - 1) * SQUARE_GAP_MM) / CALIBRATION_STEPS.length;
  const strip = (x: number, y: number): Rect[] =>
    CALIBRATION_STEPS.map((_, step) => ({ xMm: round3(x + step * (squareWidth + SQUARE_GAP_MM)), yMm: y, widthMm: round3(squareWidth), heightMm: STRIP_HEIGHT_MM }));
  const tiles: CalibrationTile[] = SHADOW_LEVELS.map((level, index) => {
    const column = index % COLUMNS,
      row = Math.floor(index / COLUMNS),
      x = round3(left + column * (tileWidth + TILE_GAP_X_MM)),
      y = round3(firstRow + row * (rowHeight + TILE_GAP_Y_MM));
    const imageY = round3(y + LABEL_BLOCK_MM),
      stepY = round3(imageY + imageHeight + 2),
      swatchY = round3(stepY + STRIP_HEIGHT_MM + STRIP_GAP_MM);
    return {
      level,
      label: { xMm: x, yMm: round3(y + LABEL_BLOCK_MM - 2) },
      image: { xMm: x, yMm: imageY, widthMm: tileWidth, heightMm: imageHeight },
      steps: strip(x, stepY),
      swatches: strip(x, swatchY),
    };
  });
  const last = tiles[tiles.length - 1] as CalibrationTile;
  return {
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    title: { xMm: TEXT_LEFT_MM, yMm: TOP_MM },
    tiles,
    footer: { xMm: TEXT_LEFT_MM, yMm: round3((last.swatches[0] as Rect).yMm + STRIP_HEIGHT_MM + FOOTER_GAP_MM) },
    footerLineMm: FOOTER_LINE_MM,
  };
}
