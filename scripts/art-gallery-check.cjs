const assert = require("node:assert/strict");
const { existsSync, readFileSync, readdirSync, statSync } = require("node:fs");
const { join, resolve, sep } = require("node:path");
const test = require("node:test");

const root = resolve(__dirname, "..");
const publicRoot = join(root, "public");
const catalog = JSON.parse(readFileSync(join(root, "app", "art", "artwork-catalog.json"), "utf8"));
const allowedExtension = /\.(?:jpe?g|png|webp)$/i;

function publicFilePath(src) {
  const resolved = resolve(publicRoot, `.${src.split("/").join(sep)}`);
  assert.ok(resolved.startsWith(`${publicRoot}${sep}`), `${src} must remain inside public`);
  return resolved;
}

function hasSupportedSignature(filePath) {
  const bytes = readFileSync(filePath).subarray(0, 12);
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return isPng || isJpeg || isWebp;
}

test("gallery categories have stable public folders and unique slugs", () => {
  assert.equal(catalog.categories.length, 5);
  const slugs = catalog.categories.map(({ slug }) => slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.includes("custom-cards"));
  assert.ok(!slugs.includes("custom-yugioh-cards"));
  assert.ok(!slugs.includes("custom-pokemon-cards"));
  for (const category of catalog.categories) {
    assert.match(category.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(category.title.trim());
    assert.ok(category.description.trim());
    assert.ok(existsSync(join(publicRoot, "art", category.slug)), `missing folder for ${category.slug}`);
  }
});

test("every artwork has deliberate metadata and a valid local image", () => {
  const categorySlugs = new Set(catalog.categories.map(({ slug }) => slug));
  const ids = new Set();
  const sources = new Set();
  for (const artwork of catalog.artworks) {
    if (artwork.id !== undefined) {
      assert.equal(typeof artwork.id, "string", "artwork id must be a string when supplied");
      assert.ok(artwork.id.trim(), "artwork id cannot be empty");
      assert.ok(!ids.has(artwork.id), `duplicate artwork id: ${artwork.id}`);
      ids.add(artwork.id);
    }
    assert.ok(categorySlugs.has(artwork.category), `unknown category: ${artwork.category}`);
    if (artwork.title !== undefined) assert.ok(typeof artwork.title === "string" && artwork.title.trim(), `${artwork.src} title must be non-empty when supplied`);
    if (artwork.alt !== undefined) assert.ok(typeof artwork.alt === "string" && artwork.alt.trim(), `${artwork.src} alt text must be non-empty when supplied`);
    if (artwork.description !== undefined) assert.ok(typeof artwork.description === "string" && artwork.description.trim(), `${artwork.src} description must be non-empty when supplied`);
    if (artwork.dimensions !== undefined) assert.ok(typeof artwork.dimensions === "string" && artwork.dimensions.trim(), `${artwork.src} dimensions must be non-empty when supplied`);
    assert.equal(artwork.width === undefined, artwork.height === undefined, `${artwork.src} width and height must be supplied together`);
    if (artwork.width !== undefined) assert.ok(Number.isInteger(artwork.width) && artwork.width > 0, `${artwork.src} width must be positive`);
    if (artwork.height !== undefined) assert.ok(Number.isInteger(artwork.height) && artwork.height > 0, `${artwork.src} height must be positive`);
    if (artwork.order !== undefined) assert.ok(Number.isInteger(artwork.order) && artwork.order > 0, `${artwork.src} order must be positive when supplied`);
    assert.ok(artwork.src.startsWith(`/art/${artwork.category}/`), `${artwork.id} is outside its category folder`);
    assert.match(artwork.src, allowedExtension);
    const filePath = publicFilePath(artwork.src);
    assert.ok(existsSync(filePath) && statSync(filePath).isFile(), `missing image: ${artwork.src}`);
    assert.ok(hasSupportedSignature(filePath), `unsupported image payload: ${artwork.src}`);
    assert.ok(!sources.has(artwork.src.toLowerCase()), `duplicate artwork source: ${artwork.src}`);
    sources.add(artwork.src.toLowerCase());
  }

  for (const category of catalog.categories) {
    const folder = join(publicRoot, "art", category.slug);
    for (const filename of readdirSync(folder)) {
      if (!allowedExtension.test(filename)) continue;
      assert.ok(sources.has(`/art/${category.slug}/${filename}`.toLowerCase()), `${filename} needs a catalog entry`);
    }
  }
});

test("art remains a public primary route", () => {
  const navbar = readFileSync(join(root, "app", "navbar.tsx"), "utf8");
  const proxy = readFileSync(join(root, "proxy.ts"), "utf8");
  const categoryPage = readFileSync(join(root, "app", "art", "[category]", "page.tsx"), "utf8");
  assert.match(navbar, /href:\s*["']\/art["'],\s*label:\s*["']Art["']/);
  assert.doesNotMatch(proxy, /\/art\(\.\*\)/);
  assert.match(categoryPage, /"custom-yugioh-cards", "custom-pokemon-cards"/);
  assert.match(categoryPage, /permanentRedirect\("\/art\/custom-cards"\)/);
});
