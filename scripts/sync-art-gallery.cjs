const { readFileSync, readdirSync, renameSync, statSync, writeFileSync } = require("node:fs");
const { basename, extname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const catalogPath = join(root, "app", "art", "artwork-catalog.json");
const publicArtRoot = join(root, "public", "art");
const allowedFilename = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp)$/i;
const maximumImageBytes = 50 * 1024 * 1024;

function humanize(filename) {
  const stem = basename(filename, extname(filename));
  return stem
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function jpegDimensions(buffer, filePath) {
  let offset = 2;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (startOfFrameMarkers.has(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  throw new Error(`Could not read JPEG dimensions: ${filePath}`);
}

function webpDimensions(buffer, filePath) {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buffer.length) break;
    if (chunk === "VP8X" && chunkSize >= 10) {
      return { width: readUInt24LE(buffer, dataOffset + 4) + 1, height: readUInt24LE(buffer, dataOffset + 7) + 1 };
    }
    if (chunk === "VP8 " && chunkSize >= 10 && buffer[dataOffset + 3] === 0x9d && buffer[dataOffset + 4] === 0x01 && buffer[dataOffset + 5] === 0x2a) {
      return { width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff, height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff };
    }
    if (chunk === "VP8L" && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
      const first = buffer[dataOffset + 1];
      const second = buffer[dataOffset + 2];
      const third = buffer[dataOffset + 3];
      const fourth = buffer[dataOffset + 4];
      return {
        width: 1 + first + ((second & 0x3f) << 8),
        height: 1 + (second >> 6) + (third << 2) + ((fourth & 0x0f) << 10),
      };
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  throw new Error(`Could not read WebP dimensions: ${filePath}`);
}

function imageDimensions(filePath) {
  const size = statSync(filePath).size;
  if (size <= 0 || size > maximumImageBytes) throw new Error(`${filePath} must be between 1 byte and 50 MiB.`);
  const buffer = readFileSync(filePath);
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return jpegDimensions(buffer, filePath);
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return webpDimensions(buffer, filePath);
  throw new Error(`Unsupported image payload: ${filePath}`);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const categorySlugs = new Set(catalog.categories.map(({ slug }) => slug));
const entriesBySource = new Map(catalog.artworks.map((artwork) => [artwork.src, artwork]));
const ids = new Set(catalog.artworks.map((artwork) => artwork.id).filter(Boolean));
const nextOrder = new Map();

for (const artwork of catalog.artworks) {
  const order = Number.isInteger(artwork.order) && artwork.order > 0 ? artwork.order : 0;
  nextOrder.set(artwork.category, Math.max(nextOrder.get(artwork.category) ?? 0, order));
}

let additions = 0;
let dimensionUpdates = 0;
for (const category of catalog.categories) {
  const folder = join(publicArtRoot, category.slug);
  const filenames = readdirSync(folder).filter((filename) => /\.(?:jpe?g|png|webp)$/i.test(filename)).sort((left, right) => left.localeCompare(right));
  for (const filename of filenames) {
    if (!allowedFilename.test(filename)) throw new Error(`${filename} needs a safe filename using only letters, numbers, dots, underscores, or hyphens.`);
    const src = `/art/${category.slug}/${filename}`;
    const dimensions = imageDimensions(join(folder, filename));
    const existing = entriesBySource.get(src);
    if (existing) {
      if (existing.width !== dimensions.width || existing.height !== dimensions.height) {
        existing.width = dimensions.width;
        existing.height = dimensions.height;
        dimensionUpdates += 1;
      }
      continue;
    }

    const label = humanize(filename);
    let id = `${category.slug}-${slugify(basename(filename, extname(filename)))}`;
    let suffix = 2;
    while (ids.has(id)) id = `${category.slug}-${slugify(basename(filename, extname(filename)))}-${suffix++}`;
    ids.add(id);
    const order = (nextOrder.get(category.slug) ?? 0) + 1;
    nextOrder.set(category.slug, order);
    const artwork = {
      id,
      category: category.slug,
      src,
      title: label,
      alt: label,
      width: dimensions.width,
      height: dimensions.height,
      order,
    };
    catalog.artworks.push(artwork);
    entriesBySource.set(src, artwork);
    additions += 1;
  }
}

for (const artwork of catalog.artworks) {
  if (!categorySlugs.has(artwork.category)) throw new Error(`Unknown category in catalog: ${artwork.category}`);
}

if (additions === 0 && dimensionUpdates === 0) {
  console.log(`Art catalog is already synchronized (${catalog.artworks.length} artworks).`);
} else {
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, catalogPath);
  console.log(`Synchronized art catalog: ${additions} added, ${dimensionUpdates} dimension updates, ${catalog.artworks.length} total.`);
}
