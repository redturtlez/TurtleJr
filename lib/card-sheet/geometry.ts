/**
 * Print geometry for the 3 x 3 card sheet. Every grid cell is the size of a Pokémon card (63 x 88 mm) plus a
 * 2 mm bleed on each side, 67 x 92 mm. Cards always print at their real size, centered in their cell: a smaller
 * card (Yu-Gi-Oh, 59 x 86 mm) is never enlarged, the rest of the cell is bleed extended from the card's own edge.
 * Pure functions, no DOM, so they can be tested directly.
 */
export const PPI = 300;
export const MM_PER_INCH = 25.4;
/** Bleed on every side of a Yu-Gi-Oh card; always kept, since a Yu-Gi-Oh card is small enough to leave room in any cell. */
export const BLEED_MM = 2;
/** Bleed on every side of a Pokémon card, chosen per sheet. 1 mm lets three rows fit inside a printer's 4 mm margins on Letter. */
export type SheetBleed = 1 | 2;
export const SHEET_BLEEDS: readonly SheetBleed[] = [1, 2];
export const DEFAULT_SHEET_BLEED: SheetBleed = 1;
/** Margin many print shops force on every side of a Letter page. */
export const PRINTER_MARGIN_MM = 4;
export const GRID = { columns: 3, rows: 3, max: 9 } as const;
/** "standard" is the 3 x 3 sheet of regular cards; "jumbo" is two oversized Pokémon cards side by side on a landscape page. */
export type SheetMode = "standard" | "jumbo";
export const SHEET_MODES: readonly SheetMode[] = ["standard", "jumbo"];
export interface GridSize {
  columns: number;
  rows: number;
  max: number;
}
const JUMBO_GRID: GridSize = { columns: 2, rows: 1, max: 2 };
export const gridFor = (mode: SheetMode): GridSize => (mode === "jumbo" ? JUMBO_GRID : GRID);

const round3 = (value: number) => Math.round(value * 1000) / 1000;
export const mmToPx = (mm: number) => Math.round((mm * PPI) / MM_PER_INCH);
export const mmToPt = (mm: number) => (mm * 72) / MM_PER_INCH;

export type CardKind = "pokemon" | "yugioh" | "pokemonJumbo";
export const CARD_KINDS: Record<CardKind, { label: string; widthMm: number; heightMm: number }> = {
  pokemon: { label: "Pokémon (63 × 88 mm)", widthMm: 63, heightMm: 88 },
  yugioh: { label: "Yu-Gi-Oh (59 × 86 mm)", widthMm: 59, heightMm: 86 },
  pokemonJumbo: { label: "Jumbo Pokémon (133.4 × 187 mm)", widthMm: 133.4, heightMm: 187 },
};
/** The card kinds that can be chosen for each sheet mode. */
export const KINDS_BY_MODE: Record<SheetMode, readonly CardKind[]> = { standard: ["pokemon", "yugioh"], jumbo: ["pokemonJumbo"] };
/** Bleed (in millimetres) already present in an uploaded image, on each side of the card. */
export type InputBleed = 0 | 1 | 2;
export const INPUT_BLEEDS: readonly InputBleed[] = [0, 1, 2];

/** A grid cell: a Pokémon card plus the sheet's bleed on each side. */
export function cellMm(sheetBleed: SheetBleed, mode: SheetMode = "standard") {
  if (!SHEET_BLEEDS.includes(sheetBleed)) throw new Error("Unsupported sheet bleed.");
  const card = mode === "jumbo" ? CARD_KINDS.pokemonJumbo : CARD_KINDS.pokemon;
  return {
    width: round3(card.widthMm + 2 * sheetBleed),
    height: round3(card.heightMm + 2 * sheetBleed),
  };
}
/** The sheet mode a card kind belongs to, which decides the size of its cell. */
export const modeOfKind = (kind: CardKind): SheetMode => (kind === "pokemonJumbo" ? "jumbo" : "standard");
/** Bleed a finished card ends up with: the sheet's bleed for Pokémon, always 2 mm for Yu-Gi-Oh. */
export const finalBleedMm = (kind: CardKind, sheetBleed: SheetBleed): number => (kind === "yugioh" ? BLEED_MM : sheetBleed);

/** Physical size of the uploaded artwork (the card plus whatever bleed it already has) and of the guided area. */
export function cardFrame(kind: CardKind, inputBleed: InputBleed, sheetBleed: SheetBleed = DEFAULT_SHEET_BLEED) {
  const card = CARD_KINDS[kind];
  if (!card || !INPUT_BLEEDS.includes(inputBleed)) throw new Error("Unsupported card type or bleed.");
  return {
    trimWidthMm: card.widthMm,
    trimHeightMm: card.heightMm,
    sourceWidthMm: round3(card.widthMm + 2 * inputBleed),
    sourceHeightMm: round3(card.heightMm + 2 * inputBleed),
    /** The bleed boundary around the card (the sheet's bleed, or 2 mm for Yu-Gi-Oh); the white cut guides run along it. */
    guideWidthMm: round3(card.widthMm + 2 * finalBleedMm(kind, sheetBleed)),
    guideHeightMm: round3(card.heightMm + 2 * finalBleedMm(kind, sheetBleed)),
  };
}

/** Sharpness the sheet is built for, and the effective resolution below which an image is flagged as likely to look soft. */
export const RECOMMENDED_PPI = PPI;
export const LOW_PPI_THRESHOLD = 270;
/**
 * Pixels per inch an uploaded image has when printed at its real size, counting the bleed it already contains; the lower
 * of its two directions. A card exported at its own size is about 300; a regular card image placed as a jumbo card is about 140.
 */
export function effectivePpi(kind: CardKind, inputBleed: InputBleed, pixelWidth: number, pixelHeight: number): number {
  if (!(pixelWidth > 0 && pixelHeight > 0)) return 0;
  const frame = cardFrame(kind, inputBleed);
  return Math.min(pixelWidth / (frame.sourceWidthMm / MM_PER_INCH), pixelHeight / (frame.sourceHeightMm / MM_PER_INCH));
}

/** Pixel size of one cell at 300 PPI. */
export function cellPixels(sheetBleed: SheetBleed, mode: SheetMode = "standard") {
  const cell = cellMm(sheetBleed, mode);
  return { width: mmToPx(cell.width), height: mmToPx(cell.height) };
}

export interface SheetCell {
  index: number;
  row: number;
  column: number;
  /** Top-left of the cell (including bleed) in millimetres from the top-left of the page. */
  xMm: number;
  yMm: number;
}
export interface SheetLayout {
  paper: PaperId;
  mode: SheetMode;
  columns: number;
  rows: number;
  sheetBleed: SheetBleed;
  cellWidthMm: number;
  cellHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  gridWidthMm: number;
  gridHeightMm: number;
  /** Space between the page edge and the grid on each side. */
  marginXMm: number;
  marginYMm: number;
  cells: SheetCell[];
}
export type PaperId = "letter" | "a4";
export const PAPERS: Record<PaperId, { label: string; widthMm: number; heightMm: number }> = {
  letter: { label: "US Letter (8.5 × 11 in)", widthMm: 215.9, heightMm: 279.4 },
  a4: { label: "A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
};

/**
 * Centers the grid on the page: 3 x 3 on the portrait page for standard cards, or 2 x 1 on the landscape page for
 * jumbo cards (the jumbo cards are too tall to stack on either paper). Cells touch; their bleeds meet between the cards.
 */
export function sheetLayout(paper: PaperId, sheetBleed: SheetBleed = DEFAULT_SHEET_BLEED, mode: SheetMode = "standard"): SheetLayout {
  const page = PAPERS[paper];
  if (!page) throw new Error("Unsupported paper size.");
  const grid = gridFor(mode),
    pageWidthMm = mode === "jumbo" ? Math.max(page.widthMm, page.heightMm) : page.widthMm,
    pageHeightMm = mode === "jumbo" ? Math.min(page.widthMm, page.heightMm) : page.heightMm;
  const CELL_MM = cellMm(sheetBleed, mode);
  const gridWidthMm = round3(grid.columns * CELL_MM.width),
    gridHeightMm = round3(grid.rows * CELL_MM.height),
    marginXMm = round3((pageWidthMm - gridWidthMm) / 2),
    marginYMm = round3((pageHeightMm - gridHeightMm) / 2);
  if (marginXMm < 0 || marginYMm < 0) throw new Error("The card grid does not fit on this paper size.");
  const cells: SheetCell[] = [];
  for (let index = 0; index < grid.max; index++) {
    const row = Math.floor(index / grid.columns),
      column = index % grid.columns;
    cells.push({ index, row, column, xMm: round3(marginXMm + column * CELL_MM.width), yMm: round3(marginYMm + row * CELL_MM.height) });
  }
  return { paper, mode, columns: grid.columns, rows: grid.rows, sheetBleed, cellWidthMm: CELL_MM.width, cellHeightMm: CELL_MM.height, pageWidthMm, pageHeightMm, gridWidthMm, gridHeightMm, marginXMm, marginYMm, cells };
}

/**
 * The most bleed (2 mm, else 1 mm) that lets both jumbo cards fit on the paper with the printer's 4 mm margin on every
 * side, or null when even 1 mm does not fit. US Letter allows 1 mm (2 mm would leave 2.3 mm at the sides); A4 allows 2 mm.
 */
export function jumboBleedFor(paper: PaperId): SheetBleed | null {
  for (const bleed of [...SHEET_BLEEDS].sort((a, b) => b - a)) {
    try {
      const layout = sheetLayout(paper, bleed, "jumbo");
      if (layout.marginXMm >= PRINTER_MARGIN_MM && layout.marginYMm >= PRINTER_MARGIN_MM) return bleed;
    } catch {
      // does not fit at all at this bleed; try the next smaller one
    }
  }
  return null;
}

export interface PlacedCard {
  cell: SheetCell;
  kind: CardKind;
}
export interface Rect {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}
/** A card's cut rectangle: its real size, centered in the cell. */
export function trimRect(layout: SheetLayout, card: PlacedCard): Rect {
  const { trimWidthMm, trimHeightMm } = cardFrame(card.kind, 0);
  return {
    xMm: round3(card.cell.xMm + (layout.cellWidthMm - trimWidthMm) / 2),
    yMm: round3(card.cell.yMm + (layout.cellHeightMm - trimHeightMm) / 2),
    widthMm: trimWidthMm,
    heightMm: trimHeightMm,
  };
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
/**
 * White cut guides: the grid lines between cells, like a # sign (two vertical, two horizontal), never the outer edge
 * of the grid and never inside a card. Each cell boundary is split per cell so only boundaries next to a filled slot
 * are drawn. Because every cell is a Pokémon card plus 2 mm bleed, these lines run through the bleed shared by two
 * neighbours; a smaller (Yu-Gi-Oh) card is centered with extra extended bleed between it and the line.
 */
export function gridGuides(layout: SheetLayout, cards: PlacedCard[]): Segment[] {
  const filled = (row: number, column: number) => cards.some((card) => card.cell.row === row && card.cell.column === column);
  const segments: Segment[] = [];
  for (let column = 1; column < layout.columns; column++) {
    const x = round3(layout.marginXMm + column * layout.cellWidthMm);
    for (let row = 0; row < layout.rows; row++) {
      if (!filled(row, column - 1) && !filled(row, column)) continue;
      const y1 = round3(layout.marginYMm + row * layout.cellHeightMm);
      segments.push({ x1: x, y1, x2: x, y2: round3(y1 + layout.cellHeightMm) });
    }
  }
  for (let row = 1; row < layout.rows; row++) {
    const y = round3(layout.marginYMm + row * layout.cellHeightMm);
    for (let column = 0; column < layout.columns; column++) {
      if (!filled(row - 1, column) && !filled(row, column)) continue;
      const x1 = round3(layout.marginXMm + column * layout.cellWidthMm);
      segments.push({ x1, y1: y, x2: round3(x1 + layout.cellWidthMm), y2: y });
    }
  }
  return segments;
}

const MARK_GAP_MM = 0.3; // starts just outside the grid's bleed edge
const MARK_MAX_LENGTH_MM = 3;
const MARK_EDGE_CLEARANCE_MM = 0.2;
/** Length of a crop mark that fits in the space outside the grid, or 0 when there is no room. */
export function cropMarkLength(layout: SheetLayout): number {
  const room = Math.min(layout.marginXMm, layout.marginYMm) - MARK_GAP_MM - MARK_EDGE_CLEARANCE_MM;
  return room >= 1 ? Math.min(MARK_MAX_LENGTH_MM, round3(room)) : 0;
}
/**
 * Crop marks for each card's own trim lines, drawn outside the outer edge of the grid. A card gets a mark on a side
 * only if no other card sits between it and that edge, so marks never cross a neighbour's art. Empty when they do
 * not fit on the page.
 */
export function cropMarks(layout: SheetLayout, cards: PlacedCard[]): Segment[] {
  const length = cropMarkLength(layout);
  if (!length) return [];
  const gridLeft = layout.marginXMm,
    gridTop = layout.marginYMm,
    gridRight = gridLeft + layout.gridWidthMm,
    gridBottom = gridTop + layout.gridHeightMm,
    at = (row: number, column: number) => cards.some((card) => card.cell.row === row && card.cell.column === column);
  const marks: Segment[] = [];
  const seen = new Set<string>();
  const add = (s: Segment) => {
    const key = [s.x1, s.y1, s.x2, s.y2].map(round3).join(",");
    if (!seen.has(key)) {
      seen.add(key);
      marks.push(s);
    }
  };
  for (const card of cards) {
    const trim = trimRect(layout, card),
      x1 = trim.xMm,
      x2 = round3(trim.xMm + trim.widthMm),
      y1 = trim.yMm,
      y2 = round3(trim.yMm + trim.heightMm),
      { row, column } = card.cell;
    let blockedAbove = false,
      blockedBelow = false,
      blockedLeft = false,
      blockedRight = false;
    for (let r = 0; r < row; r++) blockedAbove ||= at(r, column);
    for (let r = row + 1; r < layout.rows; r++) blockedBelow ||= at(r, column);
    for (let c = 0; c < column; c++) blockedLeft ||= at(row, c);
    for (let c = column + 1; c < layout.columns; c++) blockedRight ||= at(row, c);
    if (!blockedAbove)
      for (const x of [x1, x2]) add({ x1: x, y1: gridTop - MARK_GAP_MM, x2: x, y2: gridTop - MARK_GAP_MM - length });
    if (!blockedBelow)
      for (const x of [x1, x2]) add({ x1: x, y1: gridBottom + MARK_GAP_MM, x2: x, y2: gridBottom + MARK_GAP_MM + length });
    if (!blockedLeft)
      for (const y of [y1, y2]) add({ x1: gridLeft - MARK_GAP_MM, y1: y, x2: gridLeft - MARK_GAP_MM - length, y2: y });
    if (!blockedRight)
      for (const y of [y1, y2]) add({ x1: gridRight + MARK_GAP_MM, y1: y, x2: gridRight + MARK_GAP_MM + length, y2: y });
  }
  return marks;
}
