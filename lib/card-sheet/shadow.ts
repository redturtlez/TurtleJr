import { PAPERS, type PaperId, type Rect } from "./geometry";

/**
 * "Clear sticker" shadow lift. A laser printer has no white toner, so on clear sticker stock dark tones fill in
 * (dot gain) and fine shadow detail turns into one blotch. The lift pushes dark tones apart: black stays black, the
 * curve is steepest just above it (so near-black tones stop merging with each other) and it eases back to nothing at
 * 55% brightness. Every tone from there up to white comes out exactly as it went in, so one level is safe for any
 * image: a bright photo is unchanged except for its darkest spots. Level 0 is off; level 5 is the strongest. Pure functions, no DOM, so they can be tested directly.
 */
export const SHADOW_LEVELS = [0, 1, 2, 3, 4, 5] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];
export const DEFAULT_SHADOW_LEVEL: ShadowLevel = 0;
const MAX_SHADOW_LEVEL = 5;
/** Brightness (0 to 1) at and above which the curve is the identity. */
export const SHADOW_REACH = 0.55;
/** Slope added at black at level 5 (the curve starts at slope 1 + this). Below 3 the curve never reverses tones. */
const MAX_STEEPNESS = 2;

/** What a card export applies the lift to: the whole finished card, or only the artwork (frame and text stay as drawn). */
export type ShadowScope = "card" | "art";
export const DEFAULT_SHADOW_SCOPE: ShadowScope = "art";
export const isShadowScope = (value: unknown): value is ShadowScope => value === "card" || value === "art";

export const isShadowLevel =(value: unknown): value is ShadowLevel => typeof value === "number" && (SHADOW_LEVELS as readonly number[]).includes(value);
export const shadowLevelLabel = (level: ShadowLevel) => (level === 0 ? "Off" : `Level ${level}`);

/** 256-entry lookup applied to each of the red, green and blue values (0 to 255). */
export function shadowLut(level: ShadowLevel): Uint8Array {
  if (!isShadowLevel(level)) throw new Error("Unsupported shadow lift level.");
  const steepness = MAX_STEEPNESS * (level / MAX_SHADOW_LEVEL);
  const lut = new Uint8Array(256);
  for (let value = 0; value < 256; value++) {
    const x = value / 255,
      toe = x < SHADOW_REACH ? steepness * x * Math.pow(1 - x / SHADOW_REACH, 2) : 0;
    lut[value] = value === 255 ? 255 : Math.min(255, Math.round(255 * (x + toe)));
  }
  return lut;
}

/** Applies the lift to RGBA pixel data in place; alpha is never changed. */
export function applyShadowLift(data: Uint8ClampedArray, level: ShadowLevel): void {
  if (level === 0) return;
  const lut = shadowLut(level);
  for (let index = 0; index + 3 < data.length; index += 4) {
    data[index] = lut[data[index] as number] as number;
    data[index + 1] = lut[data[index + 1] as number] as number;
    data[index + 2] = lut[data[index + 2] as number] as number;
  }
}

/** Gray values (out of 255) in the calibration step strip: dark squares to judge the lift, then light ones that must not change. */
export const CALIBRATION_STEPS: readonly number[] = [0, 10, 20, 30, 41, 51, 64, 77, 102, 128, 170, 220];

export interface CalibrationTile {
  level: ShadowLevel;
  label: { xMm: number; yMm: number };
  image: Rect;
  steps: Rect[];
}
export interface CalibrationLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  title: { xMm: number; yMm: number };
  tiles: CalibrationTile[];
  footer: { xMm: number; yMm: number };
}

const TILE_WIDTH_MM = 60,
  TILE_GAP_X_MM = 6,
  TILE_GAP_Y_MM = 8,
  TOP_MM = 12,
  TITLE_BLOCK_MM = 20,
  LABEL_BLOCK_MM = 7,
  STEP_HEIGHT_MM = 8,
  STEP_GAP_MM = 2;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Test page: the same card at every lift level (3 x 2 tiles, level 0 first), each with a strip of dark gray squares
 * lifted the same way. `imageAspect` is the card image's height divided by its width. All content stays at least
 * 8 mm from the page edge, clear of a printer's 4 mm margin.
 */
export function calibrationLayout(paper: PaperId, imageAspect: number): CalibrationLayout {
  const page = PAPERS[paper];
  if (!page) throw new Error("Unsupported paper size.");
  if (!(imageAspect > 0.5 && imageAspect < 2)) throw new Error("Unsupported card image shape.");
  const imageHeight = round3(TILE_WIDTH_MM * imageAspect),
    rowHeight = LABEL_BLOCK_MM + imageHeight + 2 + STEP_HEIGHT_MM,
    left = round3((page.widthMm - (3 * TILE_WIDTH_MM + 2 * TILE_GAP_X_MM)) / 2),
    firstRow = TOP_MM + TITLE_BLOCK_MM;
  const stepWidth = (TILE_WIDTH_MM - (CALIBRATION_STEPS.length - 1) * STEP_GAP_MM / 4) / CALIBRATION_STEPS.length;
  const tiles: CalibrationTile[] = SHADOW_LEVELS.map((level, index) => {
    const column = index % 3,
      row = Math.floor(index / 3),
      x = round3(left + column * (TILE_WIDTH_MM + TILE_GAP_X_MM)),
      y = round3(firstRow + row * (rowHeight + TILE_GAP_Y_MM));
    const imageY = round3(y + LABEL_BLOCK_MM),
      stepY = round3(imageY + imageHeight + 2);
    return {
      level,
      label: { xMm: x, yMm: round3(y + LABEL_BLOCK_MM - 2) },
      image: { xMm: x, yMm: imageY, widthMm: TILE_WIDTH_MM, heightMm: imageHeight },
      steps: CALIBRATION_STEPS.map((_, step) => ({ xMm: round3(x + step * (stepWidth + STEP_GAP_MM / 4)), yMm: stepY, widthMm: round3(stepWidth), heightMm: STEP_HEIGHT_MM })),
    };
  });
  const last = tiles[tiles.length - 1] as CalibrationTile;
  return {
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    title: { xMm: left, yMm: TOP_MM },
    tiles,
    footer: { xMm: left, yMm: round3((last.steps[0] as Rect).yMm + STEP_HEIGHT_MM + 8) },
  };
}
