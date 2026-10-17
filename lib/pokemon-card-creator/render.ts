import {
  dexStatsText,
  framePath,
  frameSourceSize,
  isEvolvedStage,
  isExStage,
  isGxStage,
  isLegacyExStage,
  isMegaExStage,
  isXyBlackWhiteExStage,
  isXyBlackWhiteMegaStage,
  noCostIconPath,
  rarityPath,
  setMarkPath,
  supportsFullArt,
  typeIconPath,
  type CardEra,
  type PokemonCard,
} from "./model";
import { pngWithPrintDensity } from "../card-creator/print";
import { pokemonPrintGeometry, type PokemonBleed } from "./geometry";
export { pokemonPrintGeometry, type PokemonBleed } from "./geometry";

const cache = new Map<string, Promise<HTMLImageElement>>();
const fontSpecs = [
  "400 28px PokemonGill",
  "700 42px PokemonGill",
  "italic 700 18px PokemonGill",
  "700 42px PokemonGillCondensed",
  "400 44px PokemonSymbols",
  "700 21px PokemonGillExtraBold",
  "700 56px PokemonFutura",
  "700 34px PokemonFuturaStdHeavy",
  "italic 700 15px PokemonFuturaOblique",
  "400 18px PokemonFrutiger",
  "italic 700 16px PokemonFrutigerItalic",
  "400 18px PokemonOptima",
];
let fontsReady: Promise<void> | null = null;
function preloadFonts() {
  if (!fontsReady) fontsReady = Promise.all(fontSpecs.map((spec) => document.fonts.load(spec))).then(() => undefined);
  return fontsReady;
}
const exTexturePath = (card: PokemonCard) => `/pokemon-card-creator/frames/scarlet-violet/${card.type}-basic.png`;
function image(src: string) {
  let pending = cache.get(src);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${src}`));
      img.src = src;
    });
    cache.set(src, pending);
  }
  return pending;
}
export async function preload(card: PokemonCard) {
  const paths = [framePath(card)];
  if (card.rarity !== "none") paths.push(rarityPath(card.rarity));
  if (card.setMark === "era") paths.push(setMarkPath(card));
  if (card.supertype === "pokemon" && card.era === "scarletAndViolet" && isExStage(card.stage)) paths.push(exTexturePath(card));
  if (card.supertype === "energy") paths.push(typeIconPath(card.energySymbol));
  if (card.supertype !== "pokemon") {
    await Promise.all([...new Set(paths)].map(image));
    return;
  }
  paths.push(typeIconPath(card.weakness, card.era), typeIconPath(card.retreatType, card.era));
  if (card.era === "scarletAndViolet" && card.abilityName) paths.push("/pokemon-card-creator/icons/ability-scarlet-violet.webp");
  if (card.era === "swordAndShield" && card.abilityName) paths.push("/pokemon-card-creator/icons/ability-sword-and-shield.webp");
  if (card.era === "sunAndMoon" && card.abilityName) paths.push("/pokemon-card-creator/icons/ability-sun-and-moon.webp");
  if (card.era === "xAndYBlackAndWhite" && card.abilityName) paths.push("/pokemon-card-creator/icons/ability-x-and-y-black-white.webp");
  if ((card.era === "ex" || card.era === "exECard") && card.abilityName) paths.push("/pokemon-card-creator/icons/poke-power-legacy.webp");
  if (isGxStage(card.stage)) paths.push("/pokemon-card-creator/icons/gx-sun-and-moon.webp", "/pokemon-card-creator/icons/gx-move-sun-and-moon.png");
  if (isXyBlackWhiteExStage(card.stage))
    paths.push(card.illustrationStyle === "fullArt" ? "/pokemon-card-creator/icons/ex-xybw-outlined.png" : "/pokemon-card-creator/icons/ex-xybw.webp");
  if (isXyBlackWhiteMegaStage(card.stage))
    paths.push(
      card.illustrationStyle === "fullArt"
        ? "/pokemon-card-creator/icons/mega-xybw-outlined.webp"
        : card.type === "dark" || card.type === "dragon"
          ? "/pokemon-card-creator/icons/mega-xybw-white.webp"
          : "/pokemon-card-creator/icons/mega-xybw-black.webp",
      card.illustrationStyle === "fullArt" ? "/pokemon-card-creator/icons/ex-xybw-outlined.png" : "/pokemon-card-creator/icons/ex-xybw.webp",
    );
  if ((card.era === "ex" || card.era === "exECard") && isLegacyExStage(card.stage)) paths.push("/pokemon-card-creator/icons/ex-legacy.webp");
  if (card.era === "ex" && card.exEraVariation === "goldStar") paths.push("/pokemon-card-creator/icons/star-legacy.webp");
  if (card.era === "ex" && card.exEraVariation === "deltaGoldStar") paths.push("/pokemon-card-creator/icons/delta-gold-star-legacy.webp");
  if (card.stage === "v") paths.push("/pokemon-card-creator/icons/v.png");
  if (card.stage === "vmax") paths.push("/pokemon-card-creator/icons/vmax.png");
  if (isExStage(card.stage))
    paths.push(
      isMegaExStage(card.stage)
        ? "/pokemon-card-creator/icons/ex-sv-mega.webp"
        : card.illustrationStyle === "fullArt"
          ? "/pokemon-card-creator/icons/ex-sv-outlined.webp"
          : "/pokemon-card-creator/icons/ex-sv.webp",
    );
  if (card.resistance !== "none") paths.push(typeIconPath(card.resistance, card.era));
  for (const energy of [
    ...card.move1Energy,
    ...card.move2Energy,
    ...(isGxStage(card.stage) ? card.gxMoveEnergy : []),
    ...(card.stage === "vstar" && card.vstarPowerType === "attack" ? card.vstarPowerEnergy : []),
  ])
    paths.push(typeIconPath(energy, card.era));
  if (
    (card.move1Name && card.move1Energy.length === 0) ||
    (card.move2Name && card.move2Energy.length === 0) ||
    (isGxStage(card.stage) && card.gxMoveName && card.gxMoveEnergy.length === 0) ||
    (card.stage === "vstar" && card.vstarPowerType === "attack" && card.vstarPowerName && card.vstarPowerEnergy.length === 0)
  )
    paths.push(noCostIconPath(card.era));
  await Promise.all([...new Set(paths)].map(image));
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number, limit: number) {
  const words = text.trim().split(/\s+/);
  let row = "",
    n = 0;
  for (const word of words) {
    const test = row ? `${row} ${word}` : word;
    if (ctx.measureText(test).width > max && row) {
      ctx.fillText(row, x, y + n * line);
      row = word;
      if (++n >= limit) return;
    } else row = test;
  }
  if (row && n < limit) ctx.fillText(row, x, y + n * line);
}
function lineWrap(ctx: CanvasRenderingContext2D, text: string, max: number, limit: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let row = "";
  for (const word of words) {
    const test = row ? `${row} ${word}` : word;
    if (row && ctx.measureText(test).width > max) {
      lines.push(row);
      row = word;
      if (lines.length === limit) return lines;
    } else row = test;
  }
  if (row && lines.length < limit) lines.push(row);
  return lines;
}
function drawCenteredFlavor(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  lineHeight: number,
  align: "left" | "right",
) {
  ctx.font = `400 ${fontSize}px PokemonOptima,Georgia,serif`;
  const lines = lineWrap(ctx, text, width, 3);
  const blockHeight = Math.max(1, lines.length) * lineHeight;
  const firstBaseline = y + (height - blockHeight) / 2 + fontSize;
  ctx.textAlign = align;
  const drawX = align === "right" ? x + width : x;
  lines.forEach((line, index) => ctx.fillText(line, drawX, firstBaseline + index * lineHeight));
  ctx.textAlign = "left";
}

type CopyrightRecipe = {
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  fontSize: number;
  textX: number;
  textAlign: CanvasTextAlign;
  maxWidth: number;
};
function copyrightRecipe(card: PokemonCard): CopyrightRecipe {
  return card.supertype === "pokemon" && card.era === "exECard"
    ? { x: 252, y: 943, width: 246, height: 27, baseline: 964, fontSize: 14, textX: 372.5, textAlign: "center", maxWidth: 238 }
    : card.supertype === "pokemon" && card.era === "ex"
    ? { x: 252, y: 981, width: 246, height: 27, baseline: 1002, fontSize: 14, textX: 372.5, textAlign: "center", maxWidth: 238 }
    : card.supertype === "pokemon" && card.era === "xAndYBlackAndWhite"
    ? { x: 40, y: 1011, width: 665, height: 25, baseline: 1030, fontSize: 12, textX: 372.5, textAlign: "center", maxWidth: 610 }
    : card.supertype === "pokemon" && card.era === "sunAndMoon"
    ? { x: 44, y: 994, width: 205, height: 20, baseline: 1011, fontSize: 12, textX: 52, textAlign: "left", maxWidth: 500 }
    : card.supertype === "pokemon" && card.stage === "vstar"
      ? { x: 205, y: 1014, width: 340, height: 20, baseline: 1030, fontSize: 12, textX: 372.5, textAlign: "center", maxWidth: 610 }
    : card.supertype === "pokemon" && card.era === "scarletAndViolet"
      ? { x: 180, y: 1012, width: 390, height: 21, baseline: 1028, fontSize: 13, textX: 372.5, textAlign: "center", maxWidth: 610 }
      : { x: 180, y: 1012, width: 388, height: 15, baseline: 1024, fontSize: 12, textX: 373.5, textAlign: "center", maxWidth: 610 };
}
function repairCopyrightBand(ctx: CanvasRenderingContext2D, recipe: CopyrightRecipe) {
  const { x, y, width, height } = recipe;
  const original = ctx.getImageData(x, y, width, height);
  const top = ctx.getImageData(x, y - 1, width, 1).data;
  const bottom = ctx.getImageData(x, y + height, width, 1).data;
  const edgeFade = 10;
  for (let row = 0; row < height; row++) {
    const vertical = (row + 1) / (height + 1);
    for (let column = 0; column < width; column++) {
      const pixel = (row * width + column) * 4;
      const horizontal = Math.min(1, column / edgeFade, (width - 1 - column) / edgeFade);
      for (let channel = 0; channel < 4; channel++) {
        const repaired = top[column * 4 + channel]! * (1 - vertical) + bottom[column * 4 + channel]! * vertical;
        original.data[pixel + channel] = Math.round(original.data[pixel + channel]! * (1 - horizontal) + repaired * horizontal);
      }
    }
  }
  ctx.putImageData(original, x, y);
}
function repairCopyrightFromSide(ctx: CanvasRenderingContext2D, recipe: CopyrightRecipe, sourceX: number) {
  const { x, y, width, height } = recipe;
  const original = ctx.getImageData(x, y, width, height);
  const source = ctx.getImageData(sourceX, y, width, height).data;
  const edgeFade = 14;
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const pixel = (row * width + column) * 4;
      const horizontal = Math.min(1, column / edgeFade, (width - 1 - column) / edgeFade);
      for (let channel = 0; channel < 4; channel++)
        original.data[pixel + channel] = Math.round(original.data[pixel + channel]! * (1 - horizontal) + source[pixel + channel]! * horizontal);
    }
  }
  ctx.putImageData(original, x, y);
}
function repairCopyrightHorizontally(ctx: CanvasRenderingContext2D, recipe: CopyrightRecipe) {
  const { x, y, width, height } = recipe,
    repaired = ctx.getImageData(x, y, width, height),
    left = ctx.getImageData(x - 1, y, 1, height).data,
    right = ctx.getImageData(x + width, y, 1, height).data;
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const pixel = (row * width + column) * 4,
        mix = (column + 1) / (width + 1);
      for (let channel = 0; channel < 4; channel++)
        repaired.data[pixel + channel] = Math.round(left[row * 4 + channel]! * (1 - mix) + right[row * 4 + channel]! * mix);
    }
  }
  ctx.putImageData(repaired, x, y);
}
function drawCopyright(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const recipe = copyrightRecipe(card);
  if (card.supertype === "pokemon" && (card.era === "ex" || card.era === "exECard")) repairCopyrightHorizontally(ctx, recipe);
  else if (card.supertype === "pokemon" && card.era === "sunAndMoon" && isGxStage(card.stage)) {
    repairCopyrightBand(ctx, recipe);
    repairCopyrightBand(ctx, { x: 566, y: 1017, width: 143, height: 18, baseline: 0, fontSize: 0, textX: 0, textAlign: "left", maxWidth: 0 });
  } else if (card.supertype === "pokemon" && card.era === "sunAndMoon") {
    repairCopyrightFromSide(ctx, recipe, 260);
    repairCopyrightBand(ctx, { x: 566, y: 1017, width: 143, height: 18, baseline: 0, fontSize: 0, textX: 0, textAlign: "left", maxWidth: 0 });
  } else repairCopyrightBand(ctx, recipe);
  const text = card.copyrightText.trim();
  if (!text) return;
  ctx.save();
  const outlinedFullArt =
    card.supertype === "pokemon" &&
    ((card.era === "sunAndMoon" && isGxStage(card.stage) && card.gxStyle === "fullArt") ||
      (card.era === "xAndYBlackAndWhite" && (isXyBlackWhiteExStage(card.stage) || isXyBlackWhiteMegaStage(card.stage)) && card.illustrationStyle === "fullArt"));
  const legacyCopyright = card.supertype === "pokemon" && (card.era === "ex" || card.era === "exECard"),
    legacyDarkness = legacyCopyright && (card.type === "dark" || card.exSecondaryType === "dark");
  ctx.fillStyle = legacyDarkness ? "#fff" : outlinedFullArt ? "#111" : card.supertype === "pokemon" && card.era === "sunAndMoon" && card.type === "dark" ? "#fff" : "#111";
  ctx.textAlign = recipe.textAlign;
  ctx.textBaseline = "alphabetic";
  if (outlinedFullArt) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
  }
  let size = recipe.fontSize;
  do {
    ctx.font = `700 ${size}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(text).width <= recipe.maxWidth) break;
    size--;
  } while (size > 9);
  if (outlinedFullArt) ctx.strokeText(text, recipe.textX, recipe.baseline, recipe.maxWidth);
  ctx.fillText(text, recipe.textX, recipe.baseline, recipe.maxWidth);
  ctx.restore();
}

function drawRegulationMark(ctx: CanvasRenderingContext2D, card: PokemonCard, x: number, y: number, shape: "octagon" | "rectangle", ink: string) {
  if (!card.showRegulation || !card.regulationLetter) return 0;
  const width = shape === "octagon" ? 17 : 16;
  const height = 26;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.beginPath();
  if (shape === "octagon") {
    const cut = height / 6;
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + width - cut, y);
    ctx.lineTo(x + width, y + cut);
    ctx.lineTo(x + width, y + height - cut);
    ctx.lineTo(x + width - cut, y + height);
    ctx.lineTo(x + cut, y + height);
    ctx.lineTo(x, y + height - cut);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
  } else ctx.roundRect(x, y, width, height, 3);
  ctx.fill();
  ctx.fillStyle = ink === "#fff" ? "#111" : "#fff";
  ctx.font = "700 19px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(card.regulationLetter.slice(0, 1).toUpperCase(), x + width / 2, y + height / 2 + 1);
  ctx.restore();
  return width;
}

async function drawSetSlot(ctx: CanvasRenderingContext2D, card: PokemonCard, x: number, y: number, height: number, maxWidth: number, ink: string, outlined = false) {
  if (card.setMark === "era") {
    const mark = await image(setMarkPath(card));
    const width = Math.min(maxWidth, (mark.naturalWidth / mark.naturalHeight) * height);
    if (outlined) {
      ctx.save();
      ctx.filter = "brightness(0) invert(1)";
      for (const [offsetX, offsetY] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]] as const)
        ctx.drawImage(mark, x + offsetX, y + offsetY, width, height);
      ctx.restore();
    }
    ctx.drawImage(mark, x, y, width, height);
    return width;
  }
  const text = card.setCode.trim();
  if (!text) return 0;
  let size = 17;
  do {
    ctx.font = `700 ${size}px PokemonGillCondensed,PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size--;
  } while (size > 10);
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (outlined) ctx.strokeText(text, x, y + height - 3);
  ctx.fillText(text, x, y + height - 3);
  return Math.min(maxWidth, ctx.measureText(text).width);
}

function defaultNameInk(card: PokemonCard, fallback: string) {
  const selected = card.nameColor.trim().toLowerCase();
  return card.type === "dark" && (!selected || selected === "#111111") ? "#fff" : card.nameColor || fallback;
}

function drawRarityIcon(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number, ink: string, outlined = false) {
  if (outlined) {
    ctx.save();
    ctx.filter = "brightness(0) invert(1)";
    for (const [offsetX, offsetY] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]] as const)
      ctx.drawImage(img, x + offsetX, y + offsetY, size, size);
    ctx.restore();
  }
  ctx.save();
  if (ink === "#fff") ctx.filter = "brightness(0) invert(1)";
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

async function drawSwordShieldCollector(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, outlined = false, illustratorY = 962) {
  ctx.save();
  if (outlined) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "italic 700 14px PokemonFuturaOblique,Arial,sans-serif";
  const illustrator = `Illus. ${card.illustrator}`;
  if (outlined) ctx.strokeText(illustrator, 51, illustratorY);
  ctx.fillText(illustrator, 51, illustratorY);

  await drawSetSlot(ctx, card, 50, 969, 26, 46, ink, outlined);
  drawRegulationMark(ctx, card, 100, 969, "octagon", ink);
  let x = 124;
  ctx.fillStyle = ink;
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  const numerals = `${card.cardNumber}/${card.setTotal}`;
  if (outlined) ctx.strokeText(numerals, x, 990);
  ctx.fillText(numerals, x, 990);
  x += ctx.measureText(numerals).width + 9.5;
  if (card.rarity !== "none") drawRarityIcon(ctx, await image(rarityPath(card.rarity)), x, 973, 18, ink, outlined);
  ctx.restore();
}

async function drawSunMoonCollector(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, outlined = false, rarityInk = ink) {
  ctx.save();
  if (outlined) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "italic 700 14px PokemonFuturaOblique,Arial,sans-serif";
  const illustrator = `Illus. ${card.illustrator}`;
  if (outlined) ctx.strokeText(illustrator, 51, 961);
  ctx.fillText(illustrator, 51, 961);
  await drawSetSlot(ctx, card, 50, 969, 26, 66, ink, outlined);
  let x = 124;
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  const numerals = `${card.cardNumber}/${card.setTotal}`;
  if (outlined) ctx.strokeText(numerals, x, 991);
  ctx.fillText(numerals, x, 991);
  x += ctx.measureText(numerals).width + 9.5;
  if (card.rarity !== "none") drawRarityIcon(ctx, await image(rarityPath(card.rarity)), x, 975, 18, rarityInk, outlined);
  ctx.restore();
}

async function drawScarletCollector(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, exLayout = false, outlined = false) {
  ctx.save();
  if (outlined) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "italic 700 14px PokemonFuturaOblique,Arial,sans-serif";
  const illustratorX = exLayout ? 50 : 45;
  const illustrator = `Illus. ${card.illustrator}`;
  if (outlined) ctx.strokeText(illustrator, illustratorX, 970);
  ctx.fillText(illustrator, illustratorX, 970);

  let x: number;
  if (exLayout) {
    const setWidth = await drawSetSlot(ctx, card, 46, 974, 31.2, 55, ink, outlined);
    const regulationX = 46 + (setWidth || 46) + 15;
    const regulationWidth = drawRegulationMark(ctx, card, regulationX, 978, "rectangle", ink);
    x = Math.max(124, regulationX + (regulationWidth ? regulationWidth + 7 : 0));
  } else {
    const regulationWidth = drawRegulationMark(ctx, card, 47, 976, "rectangle", ink);
    const setX = 47 + (regulationWidth ? regulationWidth + 8 : 0);
    await drawSetSlot(ctx, card, setX, 976, 26, 46, ink, outlined);
    x = 124;
  }
  ctx.fillStyle = ink;
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  const numerals = `${card.cardNumber}/${card.setTotal}`;
  if (outlined) ctx.strokeText(numerals, x, exLayout ? 1004 : 1002);
  ctx.fillText(numerals, x, exLayout ? 1004 : 1002);
  x += ctx.measureText(numerals).width + (exLayout ? 5 : 7);
  if (card.rarity !== "none") drawRarityIcon(ctx, await image(rarityPath(card.rarity)), x, exLayout ? 981 : 979, 24, ink, outlined);
  ctx.restore();
}
function drawIcon(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size = 38, outlined = false) {
  if (outlined) {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.drawImage(img, x, y, size, size);
}
function attackEnergyStart(nameX: number, iconSize: number, iconGap: number, count: number, gutter = 12) {
  const visibleCount = Math.min(4, count),
    groupWidth = visibleCount > 0 ? iconSize + (visibleCount - 1) * iconGap : 0,
    maximumGroupWidth = iconSize + 3 * iconGap,
    reservedLeft = nameX - gutter - maximumGroupWidth;
  return reservedLeft + (maximumGroupWidth - groupWidth) / 2;
}
async function drawAttackEnergy(
  ctx: CanvasRenderingContext2D,
  energy: PokemonCard["move1Energy"],
  era: CardEra,
  nameX: number,
  y: number,
  iconSize = 39,
  iconGap = 41,
  outlined = false,
) {
  const visibleEnergy = energy.slice(0, 4),
    icons = visibleEnergy.length > 0 ? visibleEnergy.map((type) => typeIconPath(type, era)) : [noCostIconPath(era)],
    energyStart = attackEnergyStart(nameX, iconSize, iconGap, icons.length);
  for (const [index, src] of icons.entries()) drawIcon(ctx, await image(src), energyStart + index * iconGap, y, iconSize, outlined);
}
function cover(ctx: CanvasRenderingContext2D, art: ImageBitmap, x: number, y: number, w: number, h: number, cropX: number, cropY: number, zoom: number) {
  const scale = Math.max(w / art.width, h / art.height) * zoom;
  const sw = w / scale,
    sh = h / scale;
  const sx = (art.width - sw) * cropX,
    sy = (art.height - sh) * cropY;
  ctx.drawImage(art, sx, sy, sw, sh, x, y, w, h);
}
function drawEvolutionArt(ctx: CanvasRenderingContext2D, card: PokemonCard, art: ImageBitmap) {
  const scarlet = card.era === "scarletAndViolet",
    sunMoon = card.era === "sunAndMoon",
    xyBlackWhite = card.era === "xAndYBlackAndWhite",
    legacy = card.era === "ex" || card.era === "exECard",
    vstar = card.stage === "vstar",
    x = scarlet ? 27 : sunMoon ? 32 : xyBlackWhite ? 32 : legacy ? 38 : vstar ? 31 : 36,
    y = scarlet ? 74 : sunMoon ? 77 : xyBlackWhite ? 68 : legacy ? 472 : vstar ? 80 : 84,
    w = scarlet ? 94 : sunMoon ? 81 : xyBlackWhite ? 105 : legacy ? 94 : vstar ? 87 : 80,
    h = scarlet ? 90 : sunMoon ? 82 : xyBlackWhite ? 93 : legacy ? 78 : vstar ? 82 : 80;
  ctx.save();
  ctx.beginPath();
  if (scarlet || xyBlackWhite || legacy) ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (sunMoon) {
    const cut = 18;
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut);
    ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    ctx.lineTo(x + cut, y + h);
    ctx.lineTo(x, y + h - cut);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
  }
  else ctx.roundRect(x, y, w, h, vstar ? 15 : 12);
  ctx.clip();
  cover(ctx, art, x, y, w, h, card.evolutionArtX, card.evolutionArtY, card.evolutionArtZoom);
  ctx.restore();
}

async function drawXyBlackWhiteMove(
  ctx: CanvasRenderingContext2D,
  card: PokemonCard,
  name: string,
  description: string,
  damage: string,
  energy: PokemonCard["move1Energy"],
  y: number,
  ink: string,
  descriptionLines: number,
) {
  if (!name) return;
  await drawAttackEnergy(ctx, energy, card.era, 207, y - 32);
  ctx.fillStyle = ink;
  ctx.font = "700 42px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
  ctx.fillText(name, 207, y);
  ctx.textAlign = "right";
  ctx.font = "700 37px PokemonFuturaStdHeavy,PokemonFutura,Arial,sans-serif";
  ctx.fillText(damage, 680, y);
  ctx.textAlign = "left";
  ctx.font = "400 30px PokemonGill,Arial,sans-serif";
  wrap(ctx, description, 100, y + 39, 545, 32, descriptionLines);
}

async function renderXyBlackWhitePokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const reversed = card.type === "dark" || card.type === "dragon",
    ink = reversed ? "#fff" : "#111",
    selectedName = card.nameColor.trim().toLowerCase(),
    nameInk = reversed && (!selectedName || selectedName === "#111111") ? "#fff" : card.nameColor || ink;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = nameInk;
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(51, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 320) break;
    nameSize--;
  }
  ctx.fillText(name, 183, 84);

  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 45px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.hp || "—", 643, 84);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 20px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.fillText("HP", 638 - hpWidth, 84);
  ctx.textAlign = "left";

  if (isEvolvedStage(card.stage) && card.evolvesFrom) {
    ctx.fillStyle = "#111";
    ctx.font = "italic 700 15px PokemonFrutigerItalic,PokemonGill,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 155, 116);
  }
  ctx.fillStyle = "#111";
  ctx.font = "400 15px PokemonFrutiger,Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(dexStatsText(card), 373, 537, 520);
  ctx.textAlign = "left";
  ctx.fillStyle = ink;

  const regularMoves = [
    [card.move1Name, card.move1Text, card.move1Damage, card.move1Energy] as const,
    [card.move2Name, card.move2Text, card.move2Damage, card.move2Energy] as const,
  ].filter(([moveName]) => Boolean(moveName));
  let firstY = regularMoves.length > 1 ? 630 : 700;
  if (card.abilityName) {
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-x-and-y-black-white.webp"), 63, 570, 197, 38);
    ctx.fillStyle = "#d70523";
    ctx.font = "700 31px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    ctx.fillText(card.abilityName, 245, 601);
    ctx.fillStyle = ink;
    ctx.font = "400 24px PokemonGill,Arial,sans-serif";
    wrap(ctx, card.abilityText, 100, 635, 545, 27, 2);
    firstY = regularMoves.length > 1 ? 702 : 745;
  }
  const gap = card.abilityName ? 102 : 128;
  for (const [index, move] of regularMoves.entries())
    await drawXyBlackWhiteMove(ctx, card, move[0], move[1], move[2], move[3], firstY + index * gap, ink, regularMoves.length > 1 || card.abilityName ? 2 : 3);

  ctx.fillStyle = ink;
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 69, 905, 30);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 200, 905, 30);
  ctx.font = "700 25px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 103, 931);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 234, 931);
  for (let index = 0; index < Math.min(5, card.retreat); index++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 152 + index * 32, 954, 30);

  ctx.fillStyle = ink;
  drawCenteredFlavor(ctx, card.flavorText, 371, 888, 264, 85, 19, 19, "left");
  ctx.font = "italic 700 13.4px PokemonFuturaOblique,Arial,sans-serif";
  ctx.fillText(`Illus. ${card.illustrator}`, 421, 1001, 155);
  await drawSetSlot(ctx, card, 671, 971, 28, 28, ink);
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${card.cardNumber}/${card.setTotal}`, 650, 1000);
  ctx.textAlign = "left";
  if (card.rarity !== "none") drawRarityIcon(ctx, await image(rarityPath(card.rarity)), 548, 984, 19, ink);
}

async function drawXyBlackWhiteExMove(
  ctx: CanvasRenderingContext2D,
  card: PokemonCard,
  name: string,
  description: string,
  damage: string,
  energy: PokemonCard["move1Energy"],
  y: number,
  ink: string,
  outlined: boolean,
  descriptionLines: number,
) {
  if (!name) return;
  await drawAttackEnergy(ctx, energy, card.era, 207, y - 32, 39, 41, outlined);
  ctx.save();
  ctx.fillStyle = ink;
  if (outlined) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
  }
  ctx.font = "700 42px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
  if (outlined) ctx.strokeText(name, 207, y);
  ctx.fillText(name, 207, y);
  ctx.textAlign = "right";
  ctx.font = "700 37px PokemonFuturaStdHeavy,PokemonFutura,Arial,sans-serif";
  if (outlined) ctx.strokeText(damage, 680, y);
  ctx.fillText(damage, 680, y);
  ctx.textAlign = "left";
  ctx.font = "400 30px PokemonGill,Arial,sans-serif";
  const lines = lineWrap(ctx, description, 545, descriptionLines);
  if (outlined) ctx.lineWidth = 3.5;
  for (const [index, line] of lines.entries()) {
    const lineY = y + 39 + index * 32;
    if (outlined) ctx.strokeText(line, 100, lineY);
    ctx.fillText(line, 100, lineY);
  }
  ctx.restore();
}

async function renderXyBlackWhiteExPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const fullArt = card.illustrationStyle === "fullArt",
    mega = isXyBlackWhiteMegaStage(card.stage),
    reversed = card.type === "dark" || card.type === "dragon",
    ink = fullArt ? "#111" : reversed ? "#fff" : "#111",
    selectedName = card.nameColor.trim().toLowerCase(),
    nameInk = fullArt ? card.nameColor || ink : reversed && (!selectedName || selectedName === "#111111") ? "#fff" : card.nameColor || ink;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.fillStyle = nameInk;
  if (fullArt) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
  }
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(51, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  let titleX = mega ? 175 : 183;
  if (mega) {
    const megaSymbol = await image(
      fullArt
        ? "/pokemon-card-creator/icons/mega-xybw-outlined.webp"
        : reversed
          ? "/pokemon-card-creator/icons/mega-xybw-white.webp"
          : "/pokemon-card-creator/icons/mega-xybw-black.webp",
    );
    const megaHeight = fullArt ? 42 : 38,
      megaWidth = (megaSymbol.naturalWidth / megaSymbol.naturalHeight) * megaHeight;
    ctx.drawImage(megaSymbol, titleX, 39, megaWidth, megaHeight);
    titleX += megaWidth + 5;
  }
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= (mega ? 205 : 305)) break;
    nameSize--;
  }
  if (fullArt) ctx.strokeText(name, titleX, 84);
  ctx.fillText(name, titleX, 84);
  const symbol = await image(fullArt ? "/pokemon-card-creator/icons/ex-xybw-outlined.png" : "/pokemon-card-creator/icons/ex-xybw.webp");
  const symbolHeight = fullArt ? 50 : 44,
    symbolWidth = (symbol.naturalWidth / symbol.naturalHeight) * symbolHeight;
  ctx.drawImage(symbol, titleX + ctx.measureText(name).width + 4, fullArt ? 42 : 40, symbolWidth, symbolHeight);

  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 45px PokemonFutura,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText(card.hp || "—", 643, 84);
  ctx.fillText(card.hp || "—", 643, 84);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 20px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText("HP", 638 - hpWidth, 84);
  ctx.fillText("HP", 638 - hpWidth, 84);
  ctx.textAlign = "left";
  if (mega && card.evolvesFrom) {
    ctx.fillStyle = "#111";
    ctx.font = "italic 700 15px PokemonFrutigerItalic,PokemonGill,Arial,sans-serif";
    if (fullArt) ctx.strokeText(`Evolves from ${card.evolvesFrom}`, 155, 116);
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 155, 116);
    ctx.fillStyle = ink;
  }

  const regularMoves = [
    [card.move1Name, card.move1Text, card.move1Damage, card.move1Energy] as const,
    [card.move2Name, card.move2Text, card.move2Damage, card.move2Energy] as const,
  ].filter(([moveName]) => Boolean(moveName));
  let firstY = mega ? (regularMoves.length > 1 ? 735 : 755) : regularMoves.length > 1 ? 650 : 720;
  if (card.abilityName) {
    const abilityY = mega ? 704 : 580;
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-x-and-y-black-white.webp"), 63, abilityY, 197, 38);
    ctx.save();
    ctx.fillStyle = "#d70523";
    ctx.font = "700 31px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    if (fullArt) {
      ctx.strokeStyle = "#fff";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeText(card.abilityName, 245, abilityY + 31);
    }
    ctx.fillText(card.abilityName, 245, abilityY + 31);
    ctx.fillStyle = ink;
    ctx.font = "400 24px PokemonGill,Arial,sans-serif";
    for (const [index, line] of lineWrap(ctx, card.abilityText, 545, 2).entries()) {
      const lineY = abilityY + 66 + index * 27;
      if (fullArt) ctx.strokeText(line, 100, lineY);
      ctx.fillText(line, 100, lineY);
    }
    ctx.restore();
    firstY = mega ? (regularMoves.length > 1 ? 782 : 810) : regularMoves.length > 1 ? 708 : 755;
  }
  const gap = mega ? (card.abilityName ? 72 : 84) : card.abilityName ? 98 : 128;
  for (const [index, move] of regularMoves.entries())
    await drawXyBlackWhiteExMove(
      ctx,
      card,
      move[0],
      move[1],
      move[2],
      move[3],
      firstY + index * gap,
      ink,
      fullArt,
      mega ? (regularMoves.length > 1 || card.abilityName ? 1 : 2) : card.abilityName && regularMoves.length > 1 ? 1 : regularMoves.length > 1 || card.abilityName ? 2 : 3,
    );

  ctx.save();
  ctx.fillStyle = ink;
  if (fullArt) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;
  }
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 69, 905, 30, fullArt);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 200, 905, 30, fullArt);
  ctx.font = "700 25px PokemonFutura,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText(card.weaknessAmount, 103, 931);
  ctx.fillText(card.weaknessAmount, 103, 931);
  if (card.resistance !== "none") {
    if (fullArt) ctx.strokeText(card.resistanceAmount, 234, 931);
    ctx.fillText(card.resistanceAmount, 234, 931);
  }
  for (let index = 0; index < Math.min(5, card.retreat); index++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 152 + index * 32, 954, 30, fullArt);

  ctx.font = "italic 700 13.4px PokemonFuturaOblique,Arial,sans-serif";
  const illustrator = `Illus. ${card.illustrator}`;
  if (fullArt) ctx.strokeText(illustrator, 421, 1001, 155);
  ctx.fillText(illustrator, 421, 1001, 155);
  await drawSetSlot(ctx, card, 671, 971, 28, 28, ink, fullArt);
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  ctx.textAlign = "right";
  const numerals = `${card.cardNumber}/${card.setTotal}`;
  if (fullArt) ctx.strokeText(numerals, 650, 1000);
  ctx.fillText(numerals, 650, 1000);
  ctx.textAlign = "left";
  if (card.rarity !== "none") drawRarityIcon(ctx, await image(rarityPath(card.rarity)), 548, 984, 19, fullArt ? ink : "#fff", fullArt);
  ctx.restore();
}

async function drawLegacyMove(
  ctx: CanvasRenderingContext2D,
  card: PokemonCard,
  name: string,
  description: string,
  damage: string,
  energy: PokemonCard["move1Energy"],
  y: number,
  ink: string,
  descriptionLines: number,
) {
  if (!name) return;
  const iconSize = 39;
  await drawAttackEnergy(ctx, energy, card.era, 214, y - 32, iconSize);
  ctx.fillStyle = ink;
  ctx.font = "700 39px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
  ctx.fillText(name, 214, y);
  ctx.textAlign = "right";
  ctx.font = "700 34px PokemonFuturaStdHeavy,PokemonFutura,Arial,sans-serif";
  ctx.fillText(damage, 680, y);
  ctx.textAlign = "left";
  ctx.font = "400 27px PokemonGill,Arial,sans-serif";
  wrap(ctx, description, 110, y + 36, 536, 29, descriptionLines);
}

async function renderLegacyPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const ink = "#111",
    nameInk = card.nameColor || ink;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = nameInk;
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(49, Math.max(27, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 390) break;
    nameSize--;
  }
  ctx.fillText(name, 58, 88);
  const titleEnd = 58 + ctx.measureText(name).width + 6;
  if (isLegacyExStage(card.stage)) {
    const symbol = await image("/pokemon-card-creator/icons/ex-legacy.webp"),
      height = 37,
      width = (symbol.naturalWidth / symbol.naturalHeight) * height;
    ctx.drawImage(symbol, titleEnd, 54, width, height);
  } else if (card.era === "ex" && card.exEraVariation === "goldStar") {
    const symbol = await image("/pokemon-card-creator/icons/star-legacy.webp"),
      height = 34,
      width = (symbol.naturalWidth / symbol.naturalHeight) * height;
    ctx.drawImage(symbol, titleEnd, 54, width, height);
  } else if (card.era === "ex" && card.exEraVariation === "deltaGoldStar") {
    const symbol = await image("/pokemon-card-creator/icons/delta-gold-star-legacy.webp"),
      height = 35,
      width = (symbol.naturalWidth / symbol.naturalHeight) * height;
    ctx.drawImage(symbol, titleEnd, 53, width, height);
  }

  ctx.fillStyle = card.type === "dark" || card.exSecondaryType === "dark" ? "#fff" : ink;
  ctx.textAlign = "right";
  ctx.font = "700 43px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.hp || "—", 636, 87);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 18px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.fillText("HP", 631 - hpWidth, 87);
  ctx.textAlign = "left";

  ctx.fillStyle = "#111";
  if (isEvolvedStage(card.stage) && card.evolvesFrom) {
    ctx.font = "italic 700 16px PokemonFrutigerItalic,PokemonGill,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 146, 539, 225);
  }
  ctx.fillStyle = ink;

  const moves = [
    [card.move1Name, card.move1Text, card.move1Damage, card.move1Energy] as const,
    [card.move2Name, card.move2Text, card.move2Damage, card.move2Energy] as const,
  ].filter(([moveName]) => Boolean(moveName));
  let firstY = moves.length > 1 ? 645 : 720;
  if (card.abilityName) {
    const badge = await image("/pokemon-card-creator/icons/poke-power-legacy.webp"),
      badgeHeight = 34,
      badgeWidth = (badge.naturalWidth / badge.naturalHeight) * badgeHeight;
    ctx.drawImage(badge, 64, 560, badgeWidth, badgeHeight);
    ctx.fillStyle = "#c40024";
    ctx.font = "700 30px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    ctx.fillText(card.abilityName, 64 + badgeWidth + 10, 589);
    ctx.fillStyle = ink;
    ctx.font = "400 24px PokemonGill,Arial,sans-serif";
    wrap(ctx, card.abilityText, 98, 624, 548, 27, 2);
    firstY = moves.length > 1 ? 706 : 755;
  }
  const gap = card.abilityName ? 96 : 137;
  for (const [index, move] of moves.entries())
    await drawLegacyMove(ctx, card, move[0], move[1], move[2], move[3], firstY + index * gap, ink, moves.length > 1 || card.abilityName ? 2 : 3);

  const eCard = card.era === "exECard",
    legacyDarkness = card.type === "dark" || card.exSecondaryType === "dark",
    footerInk = legacyDarkness ? "#fff" : "#111",
    matchupIconY = eCard ? 911 : 944,
    matchupValueY = eCard ? 935 : 968;
  ctx.fillStyle = footerInk;
  ctx.font = "700 14px PokemonGill,Arial,sans-serif";
  if (card.resistance !== "none") ctx.fillText("resistance", 300, eCard ? 906 : 938);
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 116, matchupIconY, 29);
  ctx.font = "700 23px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 149, matchupValueY);
  if (card.resistance !== "none") {
    drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 305, matchupIconY, 29);
    ctx.fillText(card.resistanceAmount, 338, matchupValueY);
  }
  for (let index = 0; index < Math.min(5, card.retreat); index++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 533 + index * 31, matchupIconY, 29);

  ctx.fillStyle = "#111";
  ctx.font = "italic 700 13px PokemonFuturaOblique,Arial,sans-serif";
  ctx.fillText(`Illus. ${card.illustrator}`, 505, 503, 170);
  const collectorY = eCard ? 940 : 982,
    collectorBaseline = eCard ? 964 : 1003,
    rarityY = eCard ? 945 : 987;
  await drawSetSlot(ctx, card, 535, collectorY, 24, 55, footerInk);
  ctx.fillStyle = footerInk;
  ctx.font = "italic 700 16px PokemonFrutigerItalic,Arial,sans-serif";
  ctx.fillText(`${card.cardNumber}/${card.setTotal}`, 598, collectorBaseline);
  if (card.rarity !== "none") drawRarityIcon(ctx, await image(rarityPath(card.rarity)), 680, rarityY, 18, footerInk);
}

async function renderSunMoonPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const bodyInk = card.type === "dark" ? "#fff" : "#111";
  const barInk = "#111";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = defaultNameInk(card, bodyInk);
  let titleX = 134;
  if (card.subname) {
    ctx.font = "700 29px PokemonGill,Arial,sans-serif";
    ctx.fillText(card.subname, titleX, 80);
    titleX += ctx.measureText(card.subname).width + 8;
  }
  const nameWeight = card.nameBold ? "700" : "400";
  const nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(58, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 410 - (titleX - 134)) break;
    nameSize--;
  }
  ctx.fillText(name, titleX, 80);
  titleX += ctx.measureText(name).width + 8;
  if (card.suffix) {
    ctx.font = "700 29px PokemonGill,Arial,sans-serif";
    ctx.fillText(card.suffix, titleX, 80);
  }

  ctx.fillStyle = bodyInk;
  ctx.textAlign = "right";
  ctx.font = "700 45px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.hp || "—", 647, 83);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 21px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.fillText("HP", 641 - hpWidth, 84);
  ctx.textAlign = "left";

  if (card.stage !== "basic" && card.evolvesFrom) {
    ctx.font = "italic 700 15px PokemonFrutigerItalic,PokemonGill,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 130, 114);
  }
  if (card.abilityName) {
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-sun-and-moon.webp"), 53, 556, 165, 38);
    ctx.fillStyle = "#a30000";
    ctx.font = "700 27px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    ctx.fillText(card.abilityName, 240, 586);
    ctx.fillStyle = bodyInk;
    ctx.font = "400 18px PokemonGill,Arial,sans-serif";
    wrap(ctx, card.abilityText, 59, 617, 625, 21, 2);
  }

  const moveY = card.abilityName ? 704 : card.move2Name ? 650 : 730;
  await drawMove(ctx, card.move1Name, card.move1Text, card.move1Damage, card.move1Energy, moveY, bodyInk, false, card.era);
  if (card.move2Name) await drawMove(ctx, card.move2Name, card.move2Text, card.move2Damage, card.move2Energy, moveY + 137, bodyInk, false, card.era);

  ctx.fillStyle = barInk;
  ctx.font = "400 14.5px PokemonFrutiger,Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(dexStatsText(card), 373, 514);
  ctx.textAlign = "left";
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 119, 897, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 326, 897, 27);
  ctx.font = "700 20px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 149, 919);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 356, 919);
  for (let i = 0; i < Math.min(5, card.retreat); i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 556 + i * 30, 898, 26);
  await drawSunMoonCollector(ctx, card, bodyInk);
  ctx.fillStyle = bodyInk;
  drawCenteredFlavor(ctx, card.flavorText, 337, 933, 370, 78, 17, 22, "left");
}

async function drawSunMoonGxMove(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  if (!card.gxMoveName) return;
  const y = 780,
    rawName = card.gxMoveName.trim(),
    baseName = rawName.replace(/\s*(?:[-–—]\s*)?GX\s*$/i, "").trim() || rawName,
    titleX = 220,
    titleMaxWidth = 365,
    symbolGap = 9;
  ctx.drawImage(await image("/pokemon-card-creator/icons/gx-move-sun-and-moon.png"), 29, y, 698, 59);
  await drawAttackEnergy(ctx, card.gxMoveEnergy, card.era, titleX, y + 9);
  ctx.save();
  ctx.fillStyle = "#fff";
  let titleSize = 38;
  const symbolSize = 43.5;
  while (titleSize > 27) {
    ctx.font = `700 ${titleSize}px PokemonGillCondensed,PokemonGill,Arial,sans-serif`;
    const nameWidth = ctx.measureText(baseName).width;
    ctx.font = `400 ${symbolSize}px PokemonSymbols,sans-serif`;
    if (nameWidth + symbolGap + ctx.measureText("X").width <= titleMaxWidth) break;
    titleSize--;
  }
  ctx.font = `700 ${titleSize}px PokemonGillCondensed,PokemonGill,Arial,sans-serif`;
  ctx.fillText(baseName, titleX, y + 43);
  const nameWidth = ctx.measureText(baseName).width;
  ctx.font = `400 ${symbolSize}px PokemonSymbols,sans-serif`;
  ctx.fillText("X", titleX + nameWidth + symbolGap, y + 42);
  ctx.textAlign = "right";
  ctx.font = "700 32px PokemonFuturaStdHeavy,PokemonFutura,Arial,sans-serif";
  ctx.fillText(card.gxMoveDamage, 680, y + 43);
  ctx.textAlign = "left";
  ctx.fillStyle = "#0065b5";
  ctx.strokeStyle = "#fff";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3.5;
  ctx.font = "400 22px PokemonGill,Arial,sans-serif";
  const descriptionLines = lineWrap(ctx, card.gxMoveText, 578, 2);
  for (const [index, line] of descriptionLines.entries()) {
    const lineY = y + 78 + index * 25;
    ctx.strokeText(line, 84, lineY);
    ctx.fillText(line, 84, lineY);
  }
  ctx.restore();
}

async function renderSunMoonGxPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const fullArt = card.gxStyle === "fullArt",
    darkness = card.type === "dark",
    ink = fullArt ? "#111" : darkness ? "#fff" : "#111",
    outlineRegularAttackText = fullArt || !darkness;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.fillStyle = fullArt ? "#111" : darkness ? "#fff" : card.nameColor || ink;
  const gx = await image("/pokemon-card-creator/icons/gx-sun-and-moon.webp");
  const gxHeight = 46;
  const gxWidth = (gx.naturalWidth / gx.naturalHeight) * gxHeight;
  let titleX = 141;
  if (card.subname) {
    ctx.font = "700 29px PokemonGill,Arial,sans-serif";
    if (fullArt) ctx.strokeText(card.subname, titleX, 81);
    ctx.fillText(card.subname, titleX, 81);
    titleX += ctx.measureText(card.subname).width + 8;
  }
  const nameWeight = card.nameBold ? "700" : "400";
  const nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(52, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 410 - gxWidth - 4 - (titleX - 141)) break;
    nameSize--;
  }
  if (fullArt) ctx.strokeText(name, titleX, 81);
  ctx.fillText(name, titleX, 81);
  titleX += ctx.measureText(name).width + 4;
  ctx.drawImage(gx, titleX, 39, gxWidth, gxHeight);

  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 58px PokemonFutura,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText(card.hp || "—", 649, 84);
  ctx.fillText(card.hp || "—", 649, 84);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 22px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText("HP", 643 - hpWidth, 84);
  ctx.fillText("HP", 643 - hpWidth, 84);
  ctx.textAlign = "left";

  if (isEvolvedStage(card.stage) && card.evolvesFrom) {
    ctx.font = "italic 700 15px PokemonFrutigerItalic,PokemonGill,Arial,sans-serif";
    if (fullArt) ctx.strokeText(`Evolves from ${card.evolvesFrom}`, 130, 114);
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 130, 114);
  }
  if (card.abilityName) {
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-sun-and-moon.webp"), 53, 538, 165, 38);
    ctx.save();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.fillStyle = "#a30000";
    ctx.font = "700 27px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    if (outlineRegularAttackText) ctx.strokeText(card.abilityName, 240, 568);
    ctx.fillText(card.abilityName, 240, 568);
    ctx.fillStyle = ink;
    ctx.font = "400 18px PokemonGill,Arial,sans-serif";
    for (const [index, line] of lineWrap(ctx, card.abilityText, 625, 2).entries()) {
      const y = 600 + index * 21;
      if (outlineRegularAttackText) ctx.strokeText(line, 59, y);
      ctx.fillText(line, 59, y);
    }
    ctx.restore();
  }

  const regularMoves = [
    [card.move1Name, card.move1Text, card.move1Damage, card.move1Energy] as const,
    [card.move2Name, card.move2Text, card.move2Damage, card.move2Energy] as const,
  ].filter(([moveName]) => Boolean(moveName));
  const firstY = card.abilityName ? 645 : regularMoves.length > 1 ? 610 : 665;
  const gap = card.abilityName && regularMoves.length > 1 ? 80 : 90;
  for (const [index, move] of regularMoves.entries())
    await drawMove(
      ctx,
      move[0],
      move[1],
      move[2],
      move[3],
      firstY + index * gap,
      ink,
      outlineRegularAttackText,
      card.era,
      regularMoves.length > 1 || card.abilityName ? 1 : 2,
      outlineRegularAttackText,
      true,
    );
  await drawSunMoonGxMove(ctx, card);

  ctx.fillStyle = "#111";
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 119, 897, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 326, 897, 27);
  ctx.font = "700 20px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 149, 919);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 356, 919);
  for (let index = 0; index < Math.min(5, card.retreat); index++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 556 + index * 30, 898, 26);
  const collectorInk = darkness && !fullArt ? "#fff" : "#111";
  await drawSunMoonCollector(ctx, card, collectorInk, fullArt, collectorInk);
}

async function renderSwordShieldVstar(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const fullArt = card.vstarStyle === "fullArt",
    ink = card.type === "dark" && !fullArt ? "#fff" : "#111";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.fillStyle = defaultNameInk(card, ink);
  if (fullArt) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
  }
  let titleX = 145;
  if (card.subname) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
    if (fullArt) ctx.strokeText(card.subname, titleX, 82);
    ctx.fillText(card.subname, titleX, 82);
    titleX += ctx.measureText(card.subname).width + 8;
  }
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(52, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 385 - (titleX - 145)) break;
    nameSize--;
  }
  if (fullArt) ctx.strokeText(name, titleX, 82);
  ctx.fillText(name, titleX, 82);

  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 48px PokemonFutura,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText(card.hp || "—", 647, 84);
  ctx.fillText(card.hp || "—", 647, 84);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 18px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText("HP", 641 - hpWidth, 86);
  ctx.fillText("HP", 641 - hpWidth, 86);
  ctx.textAlign = "left";
  if (card.evolvesFrom) {
    ctx.font = "700 15px PokemonGill,Arial,sans-serif";
    if (fullArt) ctx.strokeText(`Evolves from ${card.evolvesFrom}`, 145, 57);
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 145, 57);
  }

  const regularMoves = [
    [card.move1Name, card.move1Text, card.move1Damage, card.move1Energy] as const,
    [card.move2Name, card.move2Text, card.move2Damage, card.move2Energy] as const,
  ].filter(([moveName]) => Boolean(moveName));
  const firstY = regularMoves.length > 1 ? 485 : 545,
    gap = 92;
  for (const [index, move] of regularMoves.entries())
    await drawMove(ctx, move[0], move[1], move[2], move[3], firstY + index * gap, "#111", true, card.era, regularMoves.length > 1 ? 1 : 2, true);

  if (card.vstarPowerName) {
    if (card.vstarPowerType === "attack") {
      await drawMove(ctx, card.vstarPowerName, card.vstarPowerText, card.vstarPowerDamage, card.vstarPowerEnergy, 725, "#111", true, card.era, 3, true);
    } else {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 5;
      ctx.fillStyle = "#a30000";
      ctx.font = "700 38px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
      ctx.strokeText(card.vstarPowerName, 88, 727);
      ctx.fillText(card.vstarPowerName, 88, 727);
      ctx.fillStyle = "#111";
      ctx.font = "400 25px PokemonGill,Arial,sans-serif";
      ctx.lineWidth = 3.5;
      for (const [index, line] of lineWrap(ctx, card.vstarPowerText, 620, 3).entries()) {
        const y = 768 + index * 28;
        ctx.strokeText(line, 62, y);
        ctx.fillText(line, 62, y);
      }
      ctx.restore();
    }
  }

  ctx.fillStyle = "#111";
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 119, 895, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 313, 895, 27);
  ctx.font = "700 20px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 149, 916);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 343, 916);
  for (let index = 0; index < Math.min(5, card.retreat); index++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 540 + index * 28, 895, 25);
  await drawSwordShieldCollector(ctx, card, "#111", fullArt, 962);
}
export async function renderPokemon(canvas: HTMLCanvasElement, card: PokemonCard, art: ImageBitmap | null, evolutionArt: ImageBitmap | null = null) {
  await Promise.all([preloadFonts(), preload(card)]);
  const size = frameSourceSize(card),
    width = size.width,
    height = size.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.clearRect(0, 0, width, height);
  const fullArt =
    (card.supertype === "pokemon" && (card.stage === "v" || card.stage === "vmax" || (card.stage === "vstar" && card.vstarStyle === "fullArt") || isExStage(card.stage) || (supportsFullArt(card) && card.illustrationStyle === "fullArt") || (isGxStage(card.stage) && card.gxStyle === "fullArt"))) ||
    (card.supertype === "trainer" && card.trainerType === "supporter" && card.supporterStyle === "fullArt");
  let artRegion: [number, number, number, number] =
    card.supertype === "pokemon" && card.era === "scarletAndViolet"
      ? isExStage(card.stage) || card.illustrationStyle === "fullArt"
        ? [0, 0, width, height]
        : [58, 101, 631, 397]
      : card.supertype === "pokemon" && card.era === "sunAndMoon"
        ? isGxStage(card.stage)
          ? card.gxStyle === "fullArt"
            ? [0, 0, width, height]
            : [39, 119, 674, 775]
          : [56, 94, 633, 401]
      : card.supertype === "pokemon" && card.era === "xAndYBlackAndWhite"
        ? (isXyBlackWhiteExStage(card.stage) || isXyBlackWhiteMegaStage(card.stage)) && card.illustrationStyle === "fullArt"
          ? [0, 0, width, height]
          : isXyBlackWhiteMegaStage(card.stage)
            ? [69, 109, 608, 457]
             : [69, 109, 608, 405]
      : card.supertype === "pokemon" && (card.era === "ex" || card.era === "exECard")
        ? [65, 109, 626, 378]
      : card.supertype === "pokemon" && card.stage === "vstar"
        ? card.vstarStyle === "fullArt"
          ? [0, 0, width, height]
          : [29, 101, 687, 520]
      : fullArt
        ? [0, 0, width, height]
        : [62, 99, 626, 392];
  if (card.supertype === "trainer") artRegion = fullArt ? [0, 0, width, height] : [62, 146, 626, 392];
  if (card.supertype === "energy") artRegion = card.energyCardType === "base" ? [33, 72, 681, 891] : [35, 141, 677, 80];
  const [artX, artY, artW, artH] = artRegion;
  const clipFullCard = card.supertype === "pokemon" && artX === 0 && artY === 0 && artW === width && artH === height;
  ctx.save();
  ctx.beginPath();
  if (clipFullCard) ctx.roundRect(1, 1, width - 2, height - 2, 35);
  else ctx.rect(artX, artY, artW, artH);
  ctx.clip();
  if (art) {
    cover(ctx, art, artX, artY, artW, artH, card.artX, card.artY, card.artZoom);
  } else {
    ctx.fillStyle = "#496e53";
    ctx.fillRect(artX, artY, artW, artH);
  }
  ctx.restore();
  if (card.supertype === "pokemon" && card.era === "scarletAndViolet" && isExStage(card.stage) && card.illustrationStyle !== "fullArt") {
    const texture = await image(exTexturePath(card));
    ctx.drawImage(texture, 31, 513, 685, 376, 31, 513, 685, 376);
  }
  ctx.drawImage(await image(framePath(card)), 0, 0, width, height);
  drawCopyright(ctx, card);
  if (card.supertype === "pokemon" && isEvolvedStage(card.stage) && evolutionArt) drawEvolutionArt(ctx, card, evolutionArt);
  if (card.supertype !== "pokemon") {
    await renderNonPokemon(ctx, card);
    return;
  }
  if (card.era === "scarletAndViolet") {
    if (isExStage(card.stage)) await renderScarletExPokemon(ctx, card);
    else if (card.illustrationStyle === "fullArt") await renderScarletFullArtPokemon(ctx, card);
    else await renderScarletPokemon(ctx, card);
    return;
  }
  if (card.era === "sunAndMoon") {
    if (isGxStage(card.stage)) await renderSunMoonGxPokemon(ctx, card);
    else await renderSunMoonPokemon(ctx, card);
    return;
  }
  if (card.era === "xAndYBlackAndWhite") {
    if (isXyBlackWhiteExStage(card.stage) || isXyBlackWhiteMegaStage(card.stage)) await renderXyBlackWhiteExPokemon(ctx, card);
    else await renderXyBlackWhitePokemon(ctx, card);
    return;
  }
  if (card.era === "ex" || card.era === "exECard") {
    await renderLegacyPokemon(ctx, card);
    return;
  }
  if (card.stage === "vstar") {
    await renderSwordShieldVstar(ctx, card);
    return;
  }
  const ink = card.type === "dark" && !fullArt ? "#fff" : "#111",
    vmax = card.stage === "vmax",
    titleInk = card.stage === "v" || vmax ? "#fff" : ink,
    nameBaseline = 81;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = card.stage === "v" ? titleInk : defaultNameInk(card, ink);
  if (vmax) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
  }
  let titleX = 142;
  if (card.subname) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
    if (vmax) ctx.strokeText(card.subname, titleX, nameBaseline);
    ctx.fillText(card.subname, titleX, nameBaseline);
    titleX += ctx.measureText(card.subname).width + 10;
  }
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(58, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 390 - (titleX - 142)) break;
    nameSize--;
  }
  if (vmax) ctx.strokeText(name, titleX, nameBaseline);
  ctx.fillText(name, titleX, nameBaseline);
  titleX += ctx.measureText(name).width + 10;
  if (card.suffix) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
    if (vmax) ctx.strokeText(card.suffix, titleX, nameBaseline);
    ctx.fillText(card.suffix, titleX, nameBaseline);
    titleX += ctx.measureText(card.suffix).width + 8;
  }
  if (card.stage === "v") ctx.drawImage(await image("/pokemon-card-creator/icons/v.png"), titleX, 49, 35, 27);
  if (card.stage === "vmax") ctx.drawImage(await image("/pokemon-card-creator/icons/vmax.png"), titleX, 49, 62, 27);
  ctx.fillStyle = titleInk;
  ctx.textAlign = "right";
  ctx.font = "700 45px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.hp || "—", 648, 83);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 17px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.fillText("HP", 642 - hpWidth, 87);
  ctx.textAlign = "left";
  if ((card.stage === "stage1" || card.stage === "stage2") && card.evolvesFrom) {
    ctx.font = "700 15px PokemonGill,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 145, 119, 280);
  }
  if (card.abilityName) {
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-sword-and-shield.webp"), 54, 536, 183, 39);
    ctx.save();
    if (fullArt) {
      ctx.strokeStyle = "#fff";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
    }
    ctx.fillStyle = "#a30000";
    ctx.font = "700 37px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    if (fullArt) ctx.strokeText(card.abilityName, 245, 568);
    ctx.fillText(card.abilityName, 245, 568);
    ctx.fillStyle = ink;
    ctx.font = "400 28px PokemonGill,Arial,sans-serif";
    for (const [index, line] of lineWrap(ctx, card.abilityText, 630, 2).entries()) {
      const y = 596 + index * 30;
      if (fullArt) ctx.strokeText(line, 58, y);
      ctx.fillText(line, 58, y);
    }
    ctx.restore();
  }
  ctx.fillStyle = ink;
  const moveY = fullArt
    ? card.abilityName
      ? card.move2Name
        ? 690
        : 735
      : card.move2Name
        ? 650
        : 790
    : card.abilityName
      ? 690
      : card.move2Name
        ? 635
        : 713;
  await drawMove(ctx, card.move1Name, card.move1Text, card.move1Damage, card.move1Energy, moveY, ink, fullArt, card.era, 3, fullArt);
  if (card.move2Name) await drawMove(ctx, card.move2Name, card.move2Text, card.move2Damage, card.move2Energy, moveY + 145, ink, fullArt, card.era, 3, fullArt);
  if (!fullArt) {
    ctx.fillStyle = ink;
    ctx.font = "400 15px PokemonFrutiger,Arial,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dexStatsText(card), 374, 512);
    ctx.textAlign = "left";
  }
  const outlinedVFooter = card.stage === "v" || card.stage === "vmax",
    footerInk = outlinedVFooter ? "#111" : fullArt ? "#fff" : ink;
  ctx.fillStyle = footerInk;
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 119, 894, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 313, 894, 27);
  ctx.font = "700 20px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 149, 915);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 343, 915);
  for (let i = 0; i < card.retreat; i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 540 + i * 28, 894, 25);
  await drawSwordShieldCollector(ctx, card, footerInk, fullArt || outlinedVFooter);
  if (card.stage !== "v" && card.stage !== "vmax") {
    ctx.fillStyle = ink;
    drawCenteredFlavor(ctx, card.flavorText, 337, 933, 370, 78, 17, 22, "left");
  }
}
async function drawScarletAbilityAndMoves(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, outline: boolean) {
  const hasAbility = Boolean(card.abilityName),
    hasSecond = Boolean(card.move2Name);
  if (hasAbility) {
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-scarlet-violet.webp"), 54, 553, 183, 39);
    ctx.save();
    if (outline) {
      ctx.strokeStyle = "#fff";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
    }
    ctx.fillStyle = "#a30000";
    ctx.font = "700 37px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    if (outline) ctx.strokeText(card.abilityName, 245, 585);
    ctx.fillText(card.abilityName, 245, 585);
    ctx.fillStyle = ink;
    ctx.font = "400 28px PokemonGill,Arial,sans-serif";
    for (const [index, line] of lineWrap(ctx, card.abilityText, 628, 2).entries()) {
      const y = 624 + index * 30;
      if (outline) ctx.strokeText(line, 59, y);
      ctx.fillText(line, 59, y);
    }
    ctx.restore();
  }
  const moveY = hasAbility ? (hasSecond ? 690 : 735) : hasSecond ? 650 : 710,
    lines = hasSecond ? 2 : 3;
  await drawMove(ctx, card.move1Name, card.move1Text, card.move1Damage, card.move1Energy, moveY, ink, outline, card.era, lines, outline);
  if (hasSecond) {
    const secondY = hasAbility ? 815 : 795,
      dividerY = Math.round((moveY + secondY) / 2) - 4;
    ctx.save();
    ctx.strokeStyle = outline ? "rgba(255,255,255,.9)" : "rgba(20,20,20,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(52, dividerY);
    ctx.lineTo(690, dividerY);
    ctx.stroke();
    ctx.restore();
    await drawMove(ctx, card.move2Name, card.move2Text, card.move2Damage, card.move2Energy, secondY, ink, outline, card.era, lines, outline);
  }
}
async function renderScarletFullArtPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const ink = "#111";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.fillStyle = card.nameColor || ink;
  let titleX = 134;
  if (card.subname) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
    ctx.strokeText(card.subname, titleX, 81);
    ctx.fillText(card.subname, titleX, 81);
    titleX += ctx.measureText(card.subname).width + 8;
  }
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(51, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 340 - (titleX - 134)) break;
    nameSize--;
  }
  ctx.strokeText(name, titleX, 81);
  ctx.fillText(name, titleX, 81);
  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 56px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.strokeText(card.hp || "—", 646, 82);
  ctx.fillText(card.hp || "—", 646, 82);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 21px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.strokeText("HP", 641 - hpWidth, 82);
  ctx.fillText("HP", 641 - hpWidth, 82);
  ctx.textAlign = "left";
  if (isEvolvedStage(card.stage) && card.evolvesFrom) {
    ctx.font = "italic 700 18px PokemonFrutigerItalic,Arial,sans-serif";
    ctx.strokeText(`Evolves from ${card.evolvesFrom}`, 144, 113);
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 144, 113);
  }
  await drawScarletAbilityAndMoves(ctx, card, ink, true);
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 117, 895, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 312, 895, 27);
  ctx.save();
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 4;
  ctx.fillStyle = ink;
  ctx.font = "700 25px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 148, 918);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 343, 918);
  for (let i = 0; i < Math.min(5, card.retreat); i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 537 + i * 29, 895, 27);
  ctx.restore();
  await drawScarletCollector(ctx, card, ink, false, true);
}
async function renderScarletExPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const ink = "#111",
    mega = isMegaExStage(card.stage),
    fullArt = card.illustrationStyle === "fullArt";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = mega ? "#ebe70f" : fullArt ? card.nameColor || ink : defaultNameInk(card, ink);
  ctx.strokeStyle = mega ? "#111" : "#fff";
  ctx.lineWidth = mega ? 6 : fullArt ? 5 : 0;
  ctx.lineJoin = "round";
  let titleX = 135;
  if (card.subname) {
    ctx.font = "700 23px PokemonGill,Arial,sans-serif";
    if (mega || fullArt) ctx.strokeText(card.subname, titleX, 81);
    ctx.fillText(card.subname, titleX, 81);
    titleX += ctx.measureText(card.subname).width + 8;
  }
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(51, Math.max(28, card.nameSize));
  const rawName = card.name || "Untitled",
    name = mega ? `Mega ${rawName}` : rawName;
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= (mega ? 260 : 325)) break;
    nameSize--;
  }
  if (mega || fullArt) ctx.strokeText(name, titleX, 81);
  ctx.fillText(name, titleX, 81);
  titleX += ctx.measureText(name).width + 3;
  ctx.drawImage(
    await image(mega ? "/pokemon-card-creator/icons/ex-sv-mega.webp" : fullArt ? "/pokemon-card-creator/icons/ex-sv-outlined.webp" : "/pokemon-card-creator/icons/ex-sv.webp"),
    titleX,
    mega ? 39 : 43,
    mega ? 82 : 76,
    mega ? 45 : 41,
  );
  if (mega) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "italic 700 13px PokemonGill,Arial,sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#4c95dc";
    const tag = `The Mega-Evolved form of ${rawName}`;
    ctx.strokeText(tag, 589, 125, 228);
    ctx.fillStyle = "#fff";
    ctx.fillText(tag, 589, 125, 228);
    ctx.restore();
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 56px PokemonFutura,PokemonGill,Arial,sans-serif";
  if (fullArt) {
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.strokeText(card.hp || "—", 646, 82);
    ctx.restore();
  }
  ctx.fillText(card.hp || "—", 646, 82);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 21px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  if (fullArt) {
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeText("HP", 640 - hpWidth, 82);
    ctx.restore();
  }
  ctx.fillText("HP", 640 - hpWidth, 82);
  ctx.textAlign = "left";
  if (isEvolvedStage(card.stage) && card.evolvesFrom) {
    ctx.font = "italic 700 18px PokemonFrutigerItalic,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 144, 113);
  }
  await drawScarletAbilityAndMoves(ctx, card, ink, fullArt);
  ctx.save();
  if (fullArt) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;
  }
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 117, 895, 27, fullArt);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 312, 895, 27, fullArt);
  ctx.font = "700 25px PokemonFutura,PokemonGill,Arial,sans-serif";
  if (fullArt) ctx.strokeText(card.weaknessAmount, 148, 918);
  ctx.fillText(card.weaknessAmount, 148, 918);
  if (card.resistance !== "none") {
    if (fullArt) ctx.strokeText(card.resistanceAmount, 343, 918);
    ctx.fillText(card.resistanceAmount, 343, 918);
  }
  for (let i = 0; i < Math.min(5, card.retreat); i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 537 + i * 29, 895, 27, fullArt);
  ctx.restore();
  const footerInk = card.type === "dark" && !fullArt ? "#fff" : ink;
  await drawScarletCollector(ctx, card, footerInk, true, fullArt);
}
async function renderScarletPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const ink = card.type === "dark" ? "#fff" : "#111";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = defaultNameInk(card, ink);
  let titleX = 134;
  if (card.subname) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
    ctx.fillText(card.subname, titleX, 81);
    titleX += ctx.measureText(card.subname).width + 8;
  }
  const nameWeight = card.nameBold ? "700" : "400",
    nameStyle = card.nameItalic ? "italic " : "";
  let nameSize = Math.min(51, Math.max(28, card.nameSize));
  const name = card.name || "Untitled";
  while (nameSize > 20) {
    ctx.font = `${nameStyle}${nameWeight} ${nameSize}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(name).width <= 340 - (titleX - 134)) break;
    nameSize--;
  }
  ctx.fillText(name, titleX, 81);
  titleX += ctx.measureText(name).width + 8;
  if (card.suffix) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
    ctx.fillText(card.suffix, titleX, 81);
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "right";
  ctx.font = "700 56px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.hp || "—", 646, 82);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 21px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.fillText("HP", 641 - hpWidth, 82);
  ctx.textAlign = "left";
  if (card.stage !== "basic" && card.evolvesFrom) {
    ctx.font = "italic 700 18px PokemonFrutigerItalic,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 144, 113);
  }
  ctx.font = "400 15px PokemonFrutiger,Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(dexStatsText(card), 373, 516);
  ctx.textAlign = "left";
  await drawScarletAbilityAndMoves(ctx, card, ink, false);
  ctx.fillStyle = ink;
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 117, 897, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 312, 897, 27);
  ctx.font = "700 25px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 148, 920);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 343, 920);
  for (let i = 0; i < Math.min(5, card.retreat); i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 537 + i * 29, 897, 27);
  await drawScarletCollector(ctx, card, ink);
  ctx.fillStyle = ink;
  drawCenteredFlavor(ctx, card.flavorText, 260, 935, 438, 75, 18, 23.4, "right");
}
async function renderNonPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  ctx.fillStyle = "#111";
  ctx.textBaseline = "alphabetic";
  if (card.supertype === "trainer") {
    ctx.fillStyle = card.nameColor || "#111";
    ctx.font = `${card.nameItalic ? "italic " : ""}${card.nameBold ? "700" : "400"} ${Math.min(58, Math.max(28, card.nameSize))}px PokemonGill,Arial,sans-serif`;
    ctx.fillText(card.name || "Untitled Trainer", 48, 122);
    ctx.font = "400 27px PokemonGill,Arial,sans-serif";
    ctx.save();
    if (card.trainerType === "supporter" && card.supporterStyle === "fullArt") {
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 4;
    }
    wrap(ctx, card.description, 89, 594, 575, 44, 7);
    ctx.restore();
    await drawCollector(ctx, card, card.trainerType === "supporter" && card.supporterStyle === "fullArt");
    return;
  }
  if (card.energyCardType === "special") {
    ctx.fillStyle = card.nameColor || "#111";
    ctx.font = `${card.nameItalic ? "italic " : ""}${card.nameBold ? "700" : "400"} ${Math.min(52, Math.max(28, card.nameSize))}px PokemonGill,Arial,sans-serif`;
    ctx.fillText(card.name || "Custom Energy", 48, 121);
    ctx.font = "400 27px PokemonGill,Arial,sans-serif";
    wrap(ctx, card.description, 67, 704, 620, 38, 6);
  }
  const symbol = await image(typeIconPath(card.energySymbol));
  const amount = card.energyCardType === "base" ? 1 : Math.max(1, Math.min(4, card.energySymbolAmount));
  for (let index = 0; index < amount; index++)
    drawIcon(ctx, symbol, card.energyCardType === "base" ? 651 : 520 + index * 48, card.energyCardType === "base" ? 25 : 26, card.energyCardType === "base" ? 66 : 43);
  if (card.energyCardType === "special") await drawCollector(ctx, card);
}
async function drawCollector(ctx: CanvasRenderingContext2D, card: PokemonCard, outlined = false) {
  await drawSwordShieldCollector(ctx, card, "#111", outlined, card.supertype === "energy" ? 990 : 962);
}
async function drawMove(
  ctx: CanvasRenderingContext2D,
  name: string,
  description: string,
  damage: string,
  energy: PokemonCard["move1Energy"],
  y: number,
  ink: string,
  outline = false,
  era: CardEra = "swordAndShield",
  descriptionLines = 3,
  strokeOutline = false,
  outlineEnergy = strokeOutline,
) {
  if (!name) return;
  const scarlet = era === "scarletAndViolet",
    iconSize = 39,
    iconGap = 41,
    nameX = scarlet ? 240 : 220;
  await drawAttackEnergy(ctx, energy, era, nameX, y - iconSize + 7, iconSize, iconGap, outlineEnergy);
  ctx.save();
  if (outline && !strokeOutline) {
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 3;
  }
  if (strokeOutline) {
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5.5;
  }
  ctx.fillStyle = ink;
  ctx.font = "700 42px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
  if (strokeOutline) ctx.strokeText(name, nameX, y);
  ctx.fillText(name, nameX, y);
  ctx.textAlign = "right";
  ctx.font = "700 34px PokemonFuturaStdHeavy,PokemonFutura,Arial,sans-serif";
  if (strokeOutline) ctx.strokeText(damage, 680, y);
  ctx.fillText(damage, 680, y);
  ctx.textAlign = "left";
  ctx.font = "400 27px PokemonGill,Arial,sans-serif";
  if (strokeOutline) {
    ctx.lineWidth = 3.5;
    for (const [index, line] of lineWrap(ctx, description, 578, descriptionLines).entries()) {
      const lineY = y + 38 + index * 29;
      ctx.strokeText(line, 84, lineY);
      ctx.fillText(line, 84, lineY);
    }
  } else wrap(ctx, description, 84, y + 38, 578, 29, descriptionLines);
  ctx.restore();
}

function drawBorderBleed(ctx: CanvasRenderingContext2D, trim: HTMLCanvasElement, g: ReturnType<typeof pokemonPrintGeometry>) {
  const edge = Math.max(2, Math.round(g.trimWidth * 0.003)),
    corner = Math.round(g.trimWidth * 0.055),
    right = g.width - g.left - g.trimWidth,
    bottom = g.height - g.top - g.trimHeight,
    midY = Math.floor(g.trimHeight / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(trim, edge, midY, 1, 1, 0, 0, g.left + corner, g.top + corner);
  ctx.drawImage(trim, g.trimWidth - edge - 1, midY, 1, 1, g.left + g.trimWidth - corner, 0, right + corner, g.top + corner);
  ctx.drawImage(trim, edge, midY, 1, 1, 0, g.top + g.trimHeight - corner, g.left + corner, bottom + corner);
  ctx.drawImage(trim, g.trimWidth - edge - 1, midY, 1, 1, g.left + g.trimWidth - corner, g.top + g.trimHeight - corner, right + corner, bottom + corner);
  ctx.drawImage(trim, corner, edge, g.trimWidth - corner * 2, 1, g.left, 0, g.trimWidth, g.top + corner);
  ctx.drawImage(trim, corner, g.trimHeight - edge - 1, g.trimWidth - corner * 2, 1, g.left, g.top + g.trimHeight - corner, g.trimWidth, bottom + corner);
  ctx.drawImage(trim, edge, corner, 1, g.trimHeight - corner * 2, 0, g.top, g.left + corner, g.trimHeight);
  ctx.drawImage(trim, g.trimWidth - edge - 1, corner, 1, g.trimHeight - corner * 2, g.left + g.trimWidth - corner, g.top, right + corner, g.trimHeight);
}

function normalizeBleedEdgeColors(trim: HTMLCanvasElement) {
  const ctx = trim.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  const imageData = ctx.getImageData(0, 0, trim.width, trim.height),
    original = new Uint8ClampedArray(imageData.data),
    index = (x: number, y: number) => (y * trim.width + x) * 4;
  for (let y = 0; y < trim.height; y++) {
    for (let x = 0; x < trim.width; x++) {
      const pixel = index(x, y),
        alpha = original[pixel + 3]!;
      if (alpha === 0 || alpha === 255) continue;
      let match = -1;
      for (let radius = 1; radius <= 8 && match < 0; radius++) {
        for (let offsetY = -radius; offsetY <= radius && match < 0; offsetY++) {
          for (let offsetX = -radius; offsetX <= radius; offsetX++) {
            if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) continue;
            const sampleX = x + offsetX,
              sampleY = y + offsetY;
            if (sampleX < 0 || sampleY < 0 || sampleX >= trim.width || sampleY >= trim.height) continue;
            const sample = index(sampleX, sampleY);
            if (original[sample + 3] === 255) {
              match = sample;
              break;
            }
          }
        }
      }
      if (match < 0) continue;
      imageData.data[pixel] = original[match]!;
      imageData.data[pixel + 1] = original[match + 1]!;
      imageData.data[pixel + 2] = original[match + 2]!;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export async function exportPokemon(card: PokemonCard, art: ImageBitmap | null, bleed: PokemonBleed, evolutionArt: ImageBitmap | null = null) {
  const source = document.createElement("canvas");
  await renderPokemon(source, card, art, evolutionArt);
  const g = pokemonPrintGeometry(bleed),
    trim = document.createElement("canvas"),
    canvas = document.createElement("canvas");
  trim.width = g.trimWidth;
  trim.height = g.trimHeight;
  const trimCtx = trim.getContext("2d");
  if (!trimCtx) throw new Error("Canvas unavailable.");
  trimCtx.imageSmoothingQuality = "high";
  trimCtx.drawImage(source, 0, 0, g.trimWidth, g.trimHeight);
  canvas.width = g.width;
  canvas.height = g.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  if (bleed) {
    normalizeBleedEdgeColors(trim);
    const bleedSource = document.createElement("canvas"),
      cleanTrim = document.createElement("canvas");
    await renderPokemon(bleedSource, { ...card, copyrightText: "" }, art, evolutionArt);
    cleanTrim.width = g.trimWidth;
    cleanTrim.height = g.trimHeight;
    const cleanCtx = cleanTrim.getContext("2d");
    if (!cleanCtx) throw new Error("Canvas unavailable.");
    cleanCtx.imageSmoothingQuality = "high";
    cleanCtx.drawImage(bleedSource, 0, 0, g.trimWidth, g.trimHeight);
    drawBorderBleed(ctx, cleanTrim, g);
  }
  ctx.drawImage(trim, g.left, g.top);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG encoding failed."))), "image/png"));
  const png = pngWithPrintDensity(new Uint8Array(await blob.arrayBuffer()));
  const bytes = new ArrayBuffer(png.byteLength);
  new Uint8Array(bytes).set(png);
  return new Blob([bytes], { type: "image/png" });
}
