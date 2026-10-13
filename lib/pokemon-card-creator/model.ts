export const pokemonTypes = ["colorless", "dark", "dragon", "fairy", "fighting", "fire", "grass", "lightning", "metal", "psychic", "water"] as const;
export const stages = ["basic", "stage1", "stage2", "v", "vmax", "exBasic", "exStage1", "exStage2", "exMegaBasic", "exMegaStage1", "exMegaStage2"] as const;
export type PokemonType = (typeof pokemonTypes)[number];
export type Stage = (typeof stages)[number];
export type EnergyCost = PokemonType[];
export type DexMode = "imperial" | "metric" | "custom";
export type CardSupertype = "pokemon" | "trainer" | "energy";
export type TrainerType = "item" | "tool" | "supporter" | "stadium";
export type EnergyCardType = "base" | "special";
export type CardEra = "swordAndShield" | "scarletAndViolet";

export interface PokemonCard {
  era: CardEra;
  supertype: CardSupertype;
  trainerType: TrainerType;
  supporterStyle: "standard" | "fullArt";
  energyCardType: EnergyCardType;
  description: string;
  energySymbol: PokemonType;
  energySymbolAmount: number;
  name: string;
  subname: string;
  suffix: string;
  nameColor: string;
  nameSize: number;
  nameBold: boolean;
  nameItalic: boolean;
  hp: string;
  type: PokemonType;
  stage: Stage;
  illustrationStyle: "standard" | "fullArt";
  exVariation: "standard" | "tera";
  vStyle: "fullArt" | "goldenFullArt";
  vmaxVariation: "dynamax" | "gigantamax";
  evolvesFrom: string;
  abilityName: string;
  abilityText: string;
  move1Name: string;
  move1Text: string;
  move1Damage: string;
  move1Energy: EnergyCost;
  move2Name: string;
  move2Text: string;
  move2Damage: string;
  move2Energy: EnergyCost;
  weakness: PokemonType;
  weaknessAmount: string;
  resistance: PokemonType | "none";
  resistanceAmount: string;
  retreat: number;
  retreatType: PokemonType;
  dexMode: DexMode;
  dexNumber: string;
  dexCategory: string;
  dexHeight: string;
  dexWeight: string;
  dexStats: string;
  flavorText: string;
  illustrator: string;
  setCode: string;
  cardNumber: string;
  setTotal: string;
  regulationLetter: string;
  showRegulation: boolean;
  setMark: "none" | "era";
  rarity: "none" | "common" | "uncommon" | "rare";
  copyrightText: string;
  artX: number;
  artY: number;
  artZoom: number;
  evolutionArtX: number;
  evolutionArtY: number;
  evolutionArtZoom: number;
}

export const defaults: PokemonCard = {
  era: "swordAndShield",
  supertype: "pokemon",
  trainerType: "item",
  supporterStyle: "standard",
  energyCardType: "base",
  description: "Draw 2 cards.",
  energySymbol: "grass",
  energySymbolAmount: 1,
  name: "Leafling",
  subname: "",
  suffix: "",
  nameColor: "#111111",
  nameSize: 50,
  nameBold: true,
  nameItalic: false,
  hp: "80",
  type: "grass",
  stage: "basic",
  illustrationStyle: "standard",
  exVariation: "standard",
  vStyle: "fullArt",
  vmaxVariation: "dynamax",
  evolvesFrom: "",
  abilityName: "",
  abilityText: "",
  move1Name: "Vine Tap",
  move1Text: "A quick strike from the undergrowth.",
  move1Damage: "20",
  move1Energy: ["grass"],
  move2Name: "",
  move2Text: "",
  move2Damage: "",
  move2Energy: [],
  weakness: "fire",
  weaknessAmount: "×2",
  resistance: "water",
  resistanceAmount: "-30",
  retreat: 1,
  retreatType: "colorless",
  dexMode: "imperial",
  dexNumber: "001",
  dexCategory: "Seed Pokémon",
  dexHeight: "2′ 04″",
  dexWeight: "15.2 lbs.",
  dexStats: "NO. 001 Seed Pokémon  HT: 2′ 04″  WT: 15.2 lbs.",
  flavorText: "It gathers sunlight in the leaves on its back.",
  illustrator: "Your Name",
  setCode: "CUSTOM",
  cardNumber: "001",
  setTotal: "100",
  regulationLetter: "D",
  showRegulation: true,
  setMark: "none",
  rarity: "common",
  copyrightText: "©2026 Pokémon / Nintendo / Creatures / GAME FREAK",
  artX: 0.5,
  artY: 0.5,
  artZoom: 1,
  evolutionArtX: 0.5,
  evolutionArtY: 0.5,
  evolutionArtZoom: 1,
};

export function dexStatsText(card: PokemonCard) {
  if (card.dexMode === "custom") return card.dexStats;
  return `NO. ${card.dexNumber} ${card.dexCategory}  HT: ${card.dexHeight}  WT: ${card.dexWeight}`.trim();
}

export const labels: Record<PokemonType, string> = {
  colorless: "Colorless",
  dark: "Darkness",
  dragon: "Dragon",
  fairy: "Fairy",
  fighting: "Fighting",
  fire: "Fire",
  grass: "Grass",
  lightning: "Lightning",
  metal: "Metal",
  psychic: "Psychic",
  water: "Water",
};
export const stageLabels: Record<Stage, string> = {
  basic: "Basic",
  stage1: "Stage 1",
  stage2: "Stage 2",
  v: "Pokémon V",
  vmax: "Pokémon VMAX",
  exBasic: "Pokémon ex",
  exStage1: "Stage 1 ex",
  exStage2: "Stage 2 ex",
  exMegaBasic: "Mega ex",
  exMegaStage1: "Stage 1 Mega ex",
  exMegaStage2: "Stage 2 Mega ex",
};
export const supertypeLabels: Record<CardSupertype, string> = { pokemon: "Pokémon", trainer: "Trainer", energy: "Energy" };
export const trainerTypeLabels: Record<TrainerType, string> = { item: "Item", tool: "Pokémon Tool", supporter: "Supporter", stadium: "Stadium" };
export const energyCardTypeLabels: Record<EnergyCardType, string> = { base: "Basic Energy", special: "Special Energy" };
export const eraLabels: Record<CardEra, string> = { swordAndShield: "Sword & Shield", scarletAndViolet: "Scarlet & Violet" };
export const vTypes: readonly PokemonType[] = ["colorless", "dark", "fighting", "fire", "grass", "lightning", "metal", "psychic", "water"];
export const availableTypes = (stage: Stage) => (stage === "v" ? vTypes : pokemonTypes);
export const scarletAndVioletStages: readonly Stage[] = ["basic", "stage1", "stage2", "exBasic", "exStage1", "exStage2", "exMegaBasic", "exMegaStage1", "exMegaStage2"];
export const swordAndShieldStages: readonly Stage[] = ["basic", "stage1", "stage2", "v", "vmax"];
export const availableStages = (era: CardEra): readonly Stage[] => (era === "scarletAndViolet" ? scarletAndVioletStages : swordAndShieldStages);
export const isStandardExStage = (stage: Stage) => stage === "exBasic" || stage === "exStage1" || stage === "exStage2";
export const isMegaExStage = (stage: Stage) => stage === "exMegaBasic" || stage === "exMegaStage1" || stage === "exMegaStage2";
export const isExStage = (stage: Stage) => isStandardExStage(stage) || isMegaExStage(stage);
export const isEvolvedStage = (stage: Stage) =>
  stage === "stage1" || stage === "stage2" || stage === "exStage1" || stage === "exStage2" || stage === "exMegaStage1" || stage === "exMegaStage2";
export const supportsFullArt = (card: PokemonCard) =>
  card.supertype === "pokemon" && card.era === "scarletAndViolet" && !(isStandardExStage(card.stage) && card.exVariation === "tera");
export const framePath = (card: PokemonCard) =>
  card.supertype === "trainer"
    ? `/pokemon-card-creator/frames/trainer/${card.trainerType === "supporter" && card.supporterStyle === "fullArt" ? "supporter-full-art" : card.trainerType}.png`
    : card.supertype === "energy"
      ? `/pokemon-card-creator/frames/energy/${card.energyCardType}.png`
      : card.era === "scarletAndViolet"
        ? `/pokemon-card-creator/frames/scarlet-violet/${card.type}-${card.stage}${supportsFullArt(card) && card.illustrationStyle === "fullArt" ? "-fullArt" : isStandardExStage(card.stage) && card.exVariation === "tera" ? "-tera" : ""}.png`
        : card.stage === "v"
          ? `/pokemon-card-creator/frames/${card.type}-v${card.vStyle === "goldenFullArt" ? "-golden" : ""}.png`
          : card.stage === "vmax"
            ? `/pokemon-card-creator/frames/${card.type}-vmax-${card.vmaxVariation}.png`
            : `/pokemon-card-creator/frames/${card.type}-${card.stage}.png`;
export const typeIconPath = (type: PokemonType, era: CardEra = "swordAndShield") =>
  era === "scarletAndViolet" ? `/pokemon-card-creator/icons/types/scarlet-violet/${type}.webp` : `/pokemon-card-creator/icons/types/${type}.png`;
export const frameSourceSize = (card: PokemonCard) =>
  card.supertype === "pokemon" && card.era === "scarletAndViolet" ? { width: 745, height: 1040 } : { width: 747, height: 1038 };
export const rarityPath = (rarity: PokemonCard["rarity"]) => `/pokemon-card-creator/icons/rarities/${rarity}.png`;
export const setMarkPath = (card: PokemonCard) =>
  `/pokemon-card-creator/icons/sets/${card.supertype === "pokemon" && card.era === "scarletAndViolet" ? "scarlet-and-violet" : "sword-and-shield"}.png`;
export function pokemonDownloadFilename(card: PokemonCard, bleed: 0 | 1 | 2) {
  const safe = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "custom";
  const family = card.supertype === "pokemon" ? "pokemon" : card.supertype === "trainer" ? `pokemon-trainer-${card.trainerType}` : `pokemon-energy-${card.energyCardType}`;
  const subject = card.supertype === "energy" && card.energyCardType === "base" ? card.energySymbol : card.name;
  return `${family}-${safe(subject)}-300ppi-${bleed}mm-bleed.png`;
}
