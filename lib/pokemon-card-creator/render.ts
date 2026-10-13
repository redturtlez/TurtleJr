import {
  dexStatsText,
  framePath,
  frameSourceSize,
  isEvolvedStage,
  isExStage,
  isMegaExStage,
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
  if (card.supertype === "pokemon" && isExStage(card.stage)) paths.push(exTexturePath(card));
  if (card.supertype === "energy") paths.push(typeIconPath(card.energySymbol));
  if (card.supertype !== "pokemon") {
    await Promise.all([...new Set(paths)].map(image));
    return;
  }
  paths.push(typeIconPath(card.weakness, card.era), typeIconPath(card.retreatType, card.era));
  if (card.era === "scarletAndViolet" && card.abilityName) paths.push("/pokemon-card-creator/icons/ability-scarlet-violet.webp");
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
  for (const energy of [...card.move1Energy, ...card.move2Energy]) paths.push(typeIconPath(energy, card.era));
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

type CopyrightRecipe = { x: number; y: number; width: number; height: number; baseline: number; fontSize: number };
function copyrightRecipe(card: PokemonCard): CopyrightRecipe {
  return card.supertype === "pokemon" && card.era === "scarletAndViolet"
    ? { x: 180, y: 1012, width: 390, height: 21, baseline: 1028, fontSize: 13 }
    : { x: 180, y: 1012, width: 388, height: 15, baseline: 1024, fontSize: 12 };
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
function drawCopyright(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const recipe = copyrightRecipe(card);
  repairCopyrightBand(ctx, recipe);
  const text = card.copyrightText.trim();
  if (!text) return;
  ctx.save();
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let size = recipe.fontSize;
  do {
    ctx.font = `700 ${size}px PokemonGill,Arial,sans-serif`;
    if (ctx.measureText(text).width <= 610) break;
    size--;
  } while (size > 9);
  ctx.fillText(text, card.supertype === "pokemon" && card.era === "scarletAndViolet" ? 372.5 : 373.5, recipe.baseline, 610);
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

async function drawSetSlot(ctx: CanvasRenderingContext2D, card: PokemonCard, x: number, y: number, height: number, maxWidth: number, ink: string) {
  if (card.setMark === "era") {
    const mark = await image(setMarkPath(card));
    const width = Math.min(maxWidth, (mark.naturalWidth / mark.naturalHeight) * height);
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
  ctx.fillText(text, x, y + height - 3);
  return Math.min(maxWidth, ctx.measureText(text).width);
}

async function drawSwordShieldCollector(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, outlined = false, illustratorY = 962) {
  ctx.save();
  if (outlined) {
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 4;
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "italic 700 14px PokemonFuturaOblique,Arial,sans-serif";
  ctx.fillText(`Illus. ${card.illustrator}`, 51, illustratorY);

  await drawSetSlot(ctx, card, 50, 969, 26, 46, ink);
  drawRegulationMark(ctx, card, 100, 969, "octagon", ink);
  let x = 124;
  ctx.fillStyle = ink;
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  const numerals = `${card.cardNumber}/${card.setTotal}`;
  ctx.fillText(numerals, x, 990);
  x += ctx.measureText(numerals).width + 9.5;
  if (card.rarity !== "none") ctx.drawImage(await image(rarityPath(card.rarity)), x, 973, 18, 18);
  ctx.restore();
}

async function drawScarletCollector(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, exLayout = false, outlined = false) {
  ctx.save();
  if (outlined) {
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 4;
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "italic 700 14px PokemonFuturaOblique,Arial,sans-serif";
  ctx.fillText(`Illus. ${card.illustrator}`, exLayout ? 50 : 45, 970);

  let x: number;
  if (exLayout) {
    const setWidth = await drawSetSlot(ctx, card, 46, 974, 31.2, 55, ink);
    const regulationX = 46 + (setWidth || 46) + 15;
    const regulationWidth = drawRegulationMark(ctx, card, regulationX, 978, "rectangle", ink);
    x = Math.max(124, regulationX + (regulationWidth ? regulationWidth + 7 : 0));
  } else {
    const regulationWidth = drawRegulationMark(ctx, card, 47, 976, "rectangle", ink);
    const setX = 47 + (regulationWidth ? regulationWidth + 8 : 0);
    await drawSetSlot(ctx, card, setX, 976, 26, 46, ink);
    x = 124;
  }
  ctx.fillStyle = ink;
  ctx.font = "italic 700 17.8px PokemonFrutigerItalic,Arial,sans-serif";
  const numerals = `${card.cardNumber}/${card.setTotal}`;
  ctx.fillText(numerals, x, exLayout ? 1004 : 1002);
  x += ctx.measureText(numerals).width + (exLayout ? 5 : 7);
  if (card.rarity !== "none") ctx.drawImage(await image(rarityPath(card.rarity)), x, exLayout ? 981 : 979, 24, 24);
  ctx.restore();
}
function drawIcon(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size = 38) {
  ctx.drawImage(img, x, y, size, size);
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
    x = scarlet ? 27 : 36,
    y = scarlet ? 74 : 84,
    w = scarlet ? 94 : 80,
    h = scarlet ? 90 : 80;
  ctx.save();
  ctx.beginPath();
  if (scarlet) ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else ctx.roundRect(x, y, w, h, 12);
  ctx.clip();
  cover(ctx, art, x, y, w, h, card.evolutionArtX, card.evolutionArtY, card.evolutionArtZoom);
  ctx.restore();
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
    (card.supertype === "pokemon" && (card.stage === "v" || card.stage === "vmax" || isExStage(card.stage) || (supportsFullArt(card) && card.illustrationStyle === "fullArt"))) ||
    (card.supertype === "trainer" && card.trainerType === "supporter" && card.supporterStyle === "fullArt");
  let artRegion: [number, number, number, number] =
    card.supertype === "pokemon" && card.era === "scarletAndViolet"
      ? isExStage(card.stage) || card.illustrationStyle === "fullArt"
        ? [0, 0, width, height]
        : [58, 101, 631, 397]
      : fullArt
        ? [0, 0, width, height]
        : [62, 99, 626, 392];
  if (card.supertype === "trainer") artRegion = fullArt ? [0, 0, width, height] : [62, 146, 626, 392];
  if (card.supertype === "energy") artRegion = card.energyCardType === "base" ? [33, 72, 681, 891] : [35, 141, 677, 80];
  const [artX, artY, artW, artH] = artRegion;
  const clipScarletFullCard = card.supertype === "pokemon" && card.era === "scarletAndViolet" && artX === 0 && artY === 0 && artW === width && artH === height;
  ctx.save();
  ctx.beginPath();
  if (clipScarletFullCard) ctx.roundRect(1, 1, width - 2, height - 2, 35);
  else ctx.rect(artX, artY, artW, artH);
  ctx.clip();
  if (art) {
    cover(ctx, art, artX, artY, artW, artH, card.artX, card.artY, card.artZoom);
  } else {
    ctx.fillStyle = "#496e53";
    ctx.fillRect(artX, artY, artW, artH);
  }
  ctx.restore();
  if (card.supertype === "pokemon" && isExStage(card.stage) && card.illustrationStyle !== "fullArt") {
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
  const ink = card.type === "dark" && !fullArt ? "#fff" : "#111",
    titleInk = card.stage === "v" ? "#fff" : ink,
    nameBaseline = 81;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = card.stage === "v" ? titleInk : card.nameColor || ink;
  let titleX = 142;
  if (card.subname) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
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
  ctx.fillText(name, titleX, nameBaseline);
  titleX += ctx.measureText(name).width + 10;
  if (card.suffix) {
    ctx.font = "700 25px PokemonGill,Arial,sans-serif";
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
  if (card.stage !== "basic" && card.evolvesFrom) {
    ctx.font = "700 15px PokemonGill,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 145, 57);
  }
  if (card.abilityName) {
    ctx.fillStyle = "#a30000";
    ctx.font = "700 27px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    ctx.fillText(card.abilityName, 90, 568);
    ctx.fillStyle = ink;
    ctx.font = "400 18px PokemonGill,Arial,sans-serif";
    wrap(ctx, card.abilityText, 58, 596, 630, 20, 2);
  }
  ctx.fillStyle = ink;
  const moveY = fullArt ? (card.move2Name ? 650 : 790) : card.abilityName ? 690 : card.move2Name ? 635 : 713;
  await drawMove(ctx, card.move1Name, card.move1Text, card.move1Damage, card.move1Energy, moveY, ink, fullArt, card.era);
  if (card.move2Name) await drawMove(ctx, card.move2Name, card.move2Text, card.move2Damage, card.move2Energy, moveY + 145, ink, fullArt, card.era);
  if (!fullArt) {
    ctx.fillStyle = ink;
    ctx.font = "400 15px PokemonFrutiger,Arial,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dexStatsText(card), 374, 512);
    ctx.textAlign = "left";
  }
  const footerInk = fullArt ? "#fff" : ink;
  ctx.fillStyle = footerInk;
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 119, 894, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 313, 894, 27);
  ctx.font = "700 20px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 149, 915);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 343, 915);
  for (let i = 0; i < card.retreat; i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 540 + i * 28, 894, 25);
  await drawSwordShieldCollector(ctx, card, footerInk, fullArt);
  ctx.fillStyle = ink;
  drawCenteredFlavor(ctx, card.flavorText, 337, 933, 370, 78, 17, 22, "left");
}
async function drawScarletAbilityAndMoves(ctx: CanvasRenderingContext2D, card: PokemonCard, ink: string, outline: boolean) {
  const hasAbility = Boolean(card.abilityName),
    hasSecond = Boolean(card.move2Name);
  if (hasAbility) {
    ctx.drawImage(await image("/pokemon-card-creator/icons/ability-scarlet-violet.webp"), 54, 553, 183, 39);
    ctx.save();
    if (outline) {
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 4;
    }
    ctx.fillStyle = "#a30000";
    ctx.font = "700 37px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
    ctx.fillText(card.abilityName, 245, 585);
    ctx.fillStyle = ink;
    ctx.font = "400 28px PokemonGill,Arial,sans-serif";
    wrap(ctx, card.abilityText, 59, 624, 628, 30, 2);
    ctx.restore();
  }
  const moveY = hasAbility ? (hasSecond ? 690 : 735) : hasSecond ? 650 : 710,
    lines = hasSecond ? 2 : 3;
  await drawMove(ctx, card.move1Name, card.move1Text, card.move1Damage, card.move1Energy, moveY, ink, outline, card.era, lines);
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
    await drawMove(ctx, card.move2Name, card.move2Text, card.move2Damage, card.move2Energy, secondY, ink, outline, card.era, lines);
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
  ctx.fillStyle = mega ? "#ebe70f" : card.nameColor || ink;
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
  ctx.fillText(card.hp || "—", 646, 82);
  const hpWidth = ctx.measureText(card.hp || "—").width;
  ctx.font = "700 21px PokemonGillExtraBold,PokemonGill,Arial,sans-serif";
  ctx.fillText("HP", 640 - hpWidth, 82);
  ctx.textAlign = "left";
  if (isEvolvedStage(card.stage) && card.evolvesFrom) {
    ctx.font = "italic 700 18px PokemonFrutigerItalic,Arial,sans-serif";
    ctx.fillText(`Evolves from ${card.evolvesFrom}`, 144, 113);
  }
  await drawScarletAbilityAndMoves(ctx, card, ink, fullArt);
  drawIcon(ctx, await image(typeIconPath(card.weakness, card.era)), 117, 895, 27);
  if (card.resistance !== "none") drawIcon(ctx, await image(typeIconPath(card.resistance, card.era)), 312, 895, 27);
  ctx.font = "700 25px PokemonFutura,PokemonGill,Arial,sans-serif";
  ctx.fillText(card.weaknessAmount, 148, 918);
  if (card.resistance !== "none") ctx.fillText(card.resistanceAmount, 343, 918);
  for (let i = 0; i < Math.min(5, card.retreat); i++) drawIcon(ctx, await image(typeIconPath(card.retreatType, card.era)), 537 + i * 29, 895, 27);
  await drawScarletCollector(ctx, card, ink, true, fullArt);
}
async function renderScarletPokemon(ctx: CanvasRenderingContext2D, card: PokemonCard) {
  const ink = card.type === "dark" ? "#fff" : "#111";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = card.nameColor || ink;
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
) {
  if (!name) return;
  const scarlet = era === "scarletAndViolet",
    iconSize = scarlet ? 39 : 42,
    iconX = scarlet ? 55 : 58,
    iconGap = scarlet ? 44 : 43,
    nameX = scarlet ? 240 : 220;
  for (const [index, type] of energy.entries()) drawIcon(ctx, await image(typeIconPath(type, era)), iconX + index * iconGap, y - iconSize + 7, iconSize);
  ctx.save();
  if (outline) {
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 3;
  }
  ctx.fillStyle = ink;
  ctx.font = "700 42px PokemonGillCondensed,PokemonGill,Arial,sans-serif";
  ctx.fillText(name, nameX, y);
  ctx.textAlign = "right";
  ctx.font = "700 34px PokemonFuturaStdHeavy,PokemonFutura,Arial,sans-serif";
  ctx.fillText(damage, 680, y);
  ctx.textAlign = "left";
  ctx.font = "400 27px PokemonGill,Arial,sans-serif";
  wrap(ctx, description, 84, y + 38, 578, 29, descriptionLines);
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
  return new Blob([pngWithPrintDensity(new Uint8Array(await blob.arrayBuffer()))], { type: "image/png" });
}
