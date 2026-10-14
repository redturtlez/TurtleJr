// Deterministic checks for the browser-only Pokémon creator. No network or secrets.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const names = ["lib/pokemon-card-creator/model", "lib/pokemon-card-creator/geometry"];
const compiled = Object.fromEntries(
  names.map((name) => [
    name,
    ts.transpileModule(fs.readFileSync(path.join(root, name + ".ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  ]),
);
const cache = {};
function load(name) {
  if (cache[name]) return cache[name].exports;
  const loadedModule = { exports: {} };
  cache[name] = loadedModule;
  const req = (relative) => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), relative));
    if (!compiled[target]) throw new Error("Unexpected test dependency: " + target);
    return load(target);
  };
  const code = compiled[name];
  if (!code) throw new Error("Unexpected test module: " + name);
  new Function("require", "module", "exports", code)(req, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const model = load("lib/pokemon-card-creator/model");
const { pokemonPrintGeometry } = load("lib/pokemon-card-creator/geometry");
function publicFile(url) {
  return path.join(root, "public", ...url.split("/").filter(Boolean));
}
/** @returns {[number,number]} */
function imageSize(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = bytes.subarray(12, 16).toString("ascii");
    if (kind === "VP8X") return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
    if (kind === "VP8L") {
      const value = bytes.readUInt32LE(21);
      return [1 + (value & 0x3fff), 1 + ((value >>> 14) & 0x3fff)];
    }
    if (kind === "VP8 ") {
      const marker = bytes.indexOf(Buffer.from([157, 1, 42]), 20);
      if (marker > 0) return [bytes.readUInt16LE(marker + 3) & 0x3fff, bytes.readUInt16LE(marker + 5) & 0x3fff];
    }
  }
  throw new Error("Unsupported image encoding: " + file);
}
test("Pokémon print geometry preserves trim size at every bleed setting", () => {
  for (const [bleed, width, height] of [
    [0, 750, 1050],
    [1, 774, 1074],
    [2, 797, 1097],
  ]) {
    const g = pokemonPrintGeometry(bleed);
    assert.equal(g.width, width);
    assert.equal(g.height, height);
    assert.equal(g.trimWidth, 750);
    assert.equal(g.trimHeight, 1050);
    assert.ok(Math.abs(g.width - g.trimWidth - g.left * 2) <= 1);
    assert.ok(Math.abs(g.height - g.trimHeight - g.top * 2) <= 1);
  }
  assert.throws(() => pokemonPrintGeometry(3));
});
test("every supported frame mapping exists at its era source size", () => {
  const cards = [];
  for (const stage of ["basic", "stage1", "stage2"])
    for (const type of model.pokemonTypes) {
      cards.push({ ...model.defaults, supertype: "pokemon", stage, type });
      cards.push({ ...model.defaults, era: "scarletAndViolet", supertype: "pokemon", stage, type });
      cards.push({ ...model.defaults, era: "sunAndMoon", supertype: "pokemon", stage, type });
      cards.push({ ...model.defaults, era: "xAndYBlackAndWhite", supertype: "pokemon", stage, type });
    }
  for (const stage of ["gxBasic", "gxStage1", "gxStage2", "gxTagTeam"])
    for (const type of model.pokemonTypes)
      for (const gxStyle of ["standard", "fullArt"]) cards.push({ ...model.defaults, era: "sunAndMoon", supertype: "pokemon", stage, type, gxStyle });
  for (const type of model.pokemonTypes)
    for (const illustrationStyle of ["standard", "fullArt"])
      cards.push({ ...model.defaults, era: "xAndYBlackAndWhite", supertype: "pokemon", stage: "exXyBw", type, illustrationStyle });
  for (const type of model.teamPlasmaTypes)
    for (const illustrationStyle of ["standard", "fullArt"])
      cards.push({ ...model.defaults, era: "xAndYBlackAndWhite", supertype: "pokemon", stage: "exXyBw", type, illustrationStyle, xyBlackWhiteVariation: "teamPlasma" });
  for (const type of model.pokemonTypes)
    for (const illustrationStyle of ["standard", "fullArt"])
      cards.push({ ...model.defaults, era: "xAndYBlackAndWhite", supertype: "pokemon", stage: "megaXyBw", type, illustrationStyle });
  for (const era of ["ex", "exECard"])
    for (const stage of model.exEraStages)
      for (const type of model.legacyTypes) cards.push({ ...model.defaults, era, supertype: "pokemon", stage, type, exEraVariation: "standard" });
  for (const stage of model.exEraStages)
    for (const type of model.legacyTypes) cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage, type, exEraVariation: "deltaSpecies" });
  for (const exEraVariation of ["goldStar", "deltaGoldStar"])
    for (const type of model.legacyTypes) cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage: "basic", type, exEraVariation });
  for (const exEraVariation of ["holonEnergy", "holonRainbow", "teamAqua", "teamMagma"])
    for (const stage of ["basic", "stage1", "stage2"])
      for (const type of model.legacyTypes) cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage, type, exEraVariation });
  for (const stage of ["basic", "stage1", "stage2", "legacyExBasic"])
    cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage, type: "dark", exEraVariation: "teamRocket" });
  for (const type of model.legacyTypes.filter((value) => value !== "dark")) {
    for (const stage of ["basic", "stage1", "stage2"])
      for (const exEraVariation of ["standard", "teamAqua", "teamMagma"])
        cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage, type, exEraVariation, exSecondaryType: "dark" });
    for (const stage of ["stage1", "stage2"])
      cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage, type, exEraVariation: "teamRocket", exSecondaryType: "dark" });
  }
  for (const type of model.legacyTypes.filter((value) => value !== "metal"))
    for (const stage of ["basic", "stage1", "stage2"])
      for (const exEraVariation of ["standard", "deltaSpecies"])
        cards.push({ ...model.defaults, era: "ex", supertype: "pokemon", stage, type, exEraVariation, exSecondaryType: "metal" });
  for (const stage of ["exBasic", "exStage1", "exStage2"])
    for (const type of model.pokemonTypes)
      for (const exVariation of ["standard", "tera"]) cards.push({ ...model.defaults, era: "scarletAndViolet", supertype: "pokemon", stage, type, exVariation });
  for (const stage of ["exMegaBasic", "exMegaStage1", "exMegaStage2"])
    for (const type of model.pokemonTypes) cards.push({ ...model.defaults, era: "scarletAndViolet", supertype: "pokemon", stage, type });
  for (const stage of ["basic", "stage1", "stage2", "exBasic", "exStage1", "exStage2", "exMegaBasic", "exMegaStage1", "exMegaStage2"])
    for (const type of model.pokemonTypes) cards.push({ ...model.defaults, era: "scarletAndViolet", supertype: "pokemon", stage, type, illustrationStyle: "fullArt" });
  for (const stage of ["basic", "exBasic"])
    for (const type of model.pokemonTypes)
      for (const scarletVariation of ["ancient", "future"])
        for (const illustrationStyle of ["standard", "fullArt"])
          cards.push({ ...model.defaults, era: "scarletAndViolet", supertype: "pokemon", stage, type, scarletVariation, illustrationStyle });
  for (const stage of ["exBasic", "exStage1", "exStage2"])
    for (const type of model.stellarTeraTypes)
      for (const illustrationStyle of ["standard", "fullArt"])
        cards.push({ ...model.defaults, era: "scarletAndViolet", supertype: "pokemon", stage, type, scarletVariation: "stellarTera", illustrationStyle });
  for (const vStyle of ["fullArt", "goldenFullArt"]) for (const type of model.vTypes) cards.push({ ...model.defaults, supertype: "pokemon", stage: "v", type, vStyle });
  for (const vmaxVariation of ["dynamax", "gigantamax"])
    for (const type of model.pokemonTypes) cards.push({ ...model.defaults, supertype: "pokemon", stage: "vmax", type, vmaxVariation });
  for (const vstarStyle of ["standard", "fullArt"])
    for (const type of model.vstarTypes) cards.push({ ...model.defaults, supertype: "pokemon", stage: "vstar", type, vstarStyle });
  for (const trainerType of ["item", "tool", "supporter", "stadium"]) cards.push({ ...model.defaults, supertype: "trainer", trainerType, supporterStyle: "standard" });
  cards.push({ ...model.defaults, supertype: "trainer", trainerType: "supporter", supporterStyle: "fullArt" });
  for (const energyCardType of ["base", "special"]) cards.push({ ...model.defaults, supertype: "energy", energyCardType });
  const urls = new Set(cards.map(model.framePath));
  assert.equal(cards.length, 1125);
  assert.equal(urls.size, 1125);
  for (const card of cards) {
    const url = model.framePath(card),
      file = publicFile(url);
    assert.ok(fs.existsSync(file), url);
    assert.deepEqual(
      imageSize(file),
      card.supertype === "pokemon" && (["scarletAndViolet", "sunAndMoon", "xAndYBlackAndWhite", "ex", "exECard"].includes(card.era) || card.stage === "vstar") ? [745, 1040] : url.endsWith("/supporter-full-art.png") ? [748, 1038] : [747, 1038],
      url,
    );
    assert.deepEqual(model.frameSourceSize(card), card.supertype === "pokemon" && (["scarletAndViolet", "sunAndMoon", "xAndYBlackAndWhite", "ex", "exECard"].includes(card.era) || card.stage === "vstar") ? { width: 745, height: 1040 } : { width: 747, height: 1038 });
  }
});
test("all selectable energy and rarity icons are local valid images", () => {
  const exSymbol = publicFile("/pokemon-card-creator/icons/ex-sv.webp");
  assert.ok(fs.existsSync(exSymbol));
  assert.deepEqual(imageSize(exSymbol), [76, 41]);
  const megaSymbol = publicFile("/pokemon-card-creator/icons/ex-sv-mega.webp");
  assert.ok(fs.existsSync(megaSymbol));
  assert.deepEqual(imageSize(megaSymbol), [82, 45]);
  const outlinedEx = publicFile("/pokemon-card-creator/icons/ex-sv-outlined.webp");
  assert.ok(fs.existsSync(outlinedEx));
  assert.deepEqual(imageSize(outlinedEx), [80, 45]);
  const abilitySymbol = publicFile("/pokemon-card-creator/icons/ability-scarlet-violet.webp");
  assert.ok(fs.existsSync(abilitySymbol));
  assert.deepEqual(imageSize(abilitySymbol), [183, 39]);
  const sunMoonAbilitySymbol = publicFile("/pokemon-card-creator/icons/ability-sun-and-moon.webp");
  assert.ok(fs.existsSync(sunMoonAbilitySymbol));
  assert.deepEqual(imageSize(sunMoonAbilitySymbol), [161, 34]);
  const gxNameSymbol = publicFile("/pokemon-card-creator/icons/gx-sun-and-moon.webp");
  assert.ok(fs.existsSync(gxNameSymbol));
  assert.ok(imageSize(gxNameSymbol)[0] > 0);
  const gxMoveBackground = publicFile("/pokemon-card-creator/icons/gx-move-sun-and-moon.png");
  assert.ok(fs.existsSync(gxMoveBackground));
  assert.deepEqual(imageSize(gxMoveBackground), [698, 59]);
  for (const era of ["swordAndShield", "scarletAndViolet", "sunAndMoon", "xAndYBlackAndWhite", "ex", "exECard"])
    for (const type of era === "ex" || era === "exECard" ? model.legacyTypes : model.pokemonTypes) {
      const url = model.typeIconPath(type, era),
        file = publicFile(url);
      assert.ok(fs.existsSync(file), url);
      const [width, height] = imageSize(file);
      assert.ok(width > 0 && height > 0, url);
    }
  for (const rarity of ["common", "uncommon", "rare"]) {
    const url = model.rarityPath(rarity),
      file = publicFile(url);
    assert.ok(fs.existsSync(file), url);
    const [width, height] = imageSize(file);
    assert.ok(width > 0 && height > 0, url);
  }
});
test("modern set marks follow the selected card era", () => {
  for (const [card, size] of [
    [{ ...model.defaults }, [40, 40]],
    [{ ...model.defaults, era: "scarletAndViolet" }, [40, 23]],
    [{ ...model.defaults, era: "sunAndMoon" }, [500, 500]],
    [{ ...model.defaults, supertype: "trainer", era: "scarletAndViolet" }, [40, 40]],
  ]) {
    const url = model.setMarkPath(card),
      file = publicFile(url);
    assert.ok(fs.existsSync(file), url);
    assert.deepEqual(imageSize(file), size, url);
  }
  assert.equal(model.defaults.setMark, "none");
  assert.equal(model.defaults.copyrightText, "©2026 Pokémon / Nintendo / Creatures / GAME FREAK");
  assert.equal(model.copyrightDefaults.sunAndMoon, "©2017 Pokémon");
  assert.equal(model.rarityPath("none"), "/pokemon-card-creator/icons/rarities/none.png");
});
test("type availability matches supplied V assets", () => {
  assert.deepEqual(model.availableTypes("v"), model.vTypes);
  assert.equal(model.availableTypes("v").includes("dragon"), false);
  assert.equal(model.availableTypes("v").includes("fairy"), false);
  assert.equal(model.availableTypes("vstar").includes("dragon"), true);
  assert.equal(model.availableTypes("vstar").includes("fairy"), false);
  assert.deepEqual(model.availableTypes("exBasic", "stellarTera"), model.stellarTeraTypes);
  assert.equal(model.availableTypes("exBasic", "stellarTera").includes("fairy"), false);
  assert.deepEqual(model.availableTypes("exXyBw", "standard", "teamPlasma"), model.teamPlasmaTypes);
  assert.equal(model.availableTypes("exXyBw", "standard", "teamPlasma").includes("fairy"), false);
  assert.deepEqual(model.availableTypes("basic", "standard", "standard", "ex"), model.legacyTypes);
  assert.equal(model.availableTypes("basic", "standard", "standard", "ex").includes("fairy"), false);
  assert.deepEqual(model.availableTypes("basic", "standard", "standard", "ex", "teamRocket"), ["dark"]);
  assert.equal(model.availableTypes("basic", "standard", "standard", "ex", "standard", "dark").includes("dark"), false);
  assert.equal(model.availableTypes("basic", "standard", "standard", "ex", "standard", "metal").includes("metal"), false);
  for (const stage of ["basic", "stage1", "stage2", "gxBasic", "gxStage1", "gxStage2", "gxTagTeam", "vmax", "exBasic", "exStage1", "exStage2", "exMegaBasic", "exMegaStage1", "exMegaStage2"])
    assert.deepEqual(model.availableTypes(stage), model.pokemonTypes);
});
test("era availability exposes only implemented stages", () => {
  assert.deepEqual(model.availableStages("scarletAndViolet"), ["basic", "stage1", "stage2", "exBasic", "exStage1", "exStage2", "exMegaBasic", "exMegaStage1", "exMegaStage2"]);
  assert.deepEqual(model.availableStages("swordAndShield"), ["basic", "stage1", "stage2", "v", "vmax", "vstar"]);
  assert.deepEqual(model.availableStages("sunAndMoon"), ["basic", "stage1", "stage2", "gxBasic", "gxStage1", "gxStage2", "gxTagTeam"]);
  assert.deepEqual(model.availableStages("xAndYBlackAndWhite"), ["basic", "stage1", "stage2", "exXyBw", "megaXyBw"]);
  assert.deepEqual(model.availableStages("ex"), model.exEraStages);
  assert.deepEqual(model.availableStages("exECard"), model.exEraStages);
  assert.deepEqual(model.exEraVariationsForStage("legacyExStage2"), ["standard", "deltaSpecies"]);
  assert.ok(model.exEraVariationsForStage("basic").includes("goldStar"));
  assert.equal(model.exEraVariationsForStage("stage1").includes("goldStar"), false);
  assert.deepEqual(model.exEraVariationsForStage("basic", "dark"), ["standard", "teamAqua", "teamMagma"]);
  assert.deepEqual(model.exEraVariationsForStage("stage1", "dark"), ["standard", "teamAqua", "teamMagma", "teamRocket"]);
  assert.deepEqual(model.exEraVariationsForStage("basic", "metal"), ["standard", "deltaSpecies"]);
});
test("evolution portraits have centered crop defaults and evolved-stage eligibility", () => {
  assert.deepEqual([model.defaults.evolutionArtX, model.defaults.evolutionArtY, model.defaults.evolutionArtZoom], [0.5, 0.5, 1]);
  for (const stage of ["stage1", "stage2", "legacyExStage1", "legacyExStage2", "gxStage1", "gxStage2", "vstar", "exStage1", "exStage2", "exMegaStage1", "exMegaStage2"]) assert.equal(model.isEvolvedStage(stage), true, stage);
  for (const stage of ["basic", "legacyExBasic", "gxBasic", "gxTagTeam", "v", "vmax", "exBasic", "exMegaBasic"]) assert.equal(model.isEvolvedStage(stage), false, stage);
  for (const stage of ["gxBasic", "gxStage1", "gxStage2", "gxTagTeam"]) assert.equal(model.isGxStage(stage), true, stage);
  assert.equal(model.isXyBlackWhiteExStage("exXyBw"), true);
  assert.equal(model.isEvolvedStage("exXyBw"), false);
  assert.equal(model.isXyBlackWhiteMegaStage("megaXyBw"), true);
  assert.equal(model.isEvolvedStage("megaXyBw"), true);
});
test("download filenames are family-aware and filesystem-safe", () => {
  assert.equal(model.pokemonDownloadFilename({ ...model.defaults, name: "Flabébé / Test" }, 0), "pokemon-flabebe-test-300ppi-0mm-bleed.png");
  assert.equal(
    model.pokemonDownloadFilename({ ...model.defaults, supertype: "trainer", trainerType: "supporter", name: "Forest Guide" }, 2),
    "pokemon-trainer-supporter-forest-guide-300ppi-2mm-bleed.png",
  );
  assert.equal(
    model.pokemonDownloadFilename({ ...model.defaults, supertype: "energy", energyCardType: "base", energySymbol: "lightning" }, 1),
    "pokemon-energy-base-lightning-300ppi-1mm-bleed.png",
  );
});
