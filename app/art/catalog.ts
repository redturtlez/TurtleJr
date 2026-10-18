import rawCatalog from "./artwork-catalog.json";

const allowedImagePath = /^\/art\/[a-z0-9-]+\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp)$/i;

export interface ArtCategory {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  number: string;
}

export interface Artwork {
  id: string;
  category: string;
  src: string;
  title: string;
  alt: string;
  description?: string;
  dimensions?: string;
  width: number;
  height: number;
  featured?: boolean;
  order: number;
}

interface ArtworkCatalog {
  categories: ArtCategory[];
  artworks: Artwork[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${context}.${key} must be a non-empty string.`);
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string, context: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new Error(`${context}.${key} must be a non-empty string when supplied.`);
  return value.trim();
}

function readOptionalPositiveInteger(record: Record<string, unknown>, key: string, context: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${context}.${key} must be a positive integer when supplied.`);
  return value as number;
}

function humanizeArtworkPath(src: string): string {
  const filename = src.slice(src.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  const words = filename.replace(/[-_]+/g, " ").replace(/([a-z])([0-9])/gi, "$1 $2").trim();
  return words.replace(/\b\w/g, (character) => character.toUpperCase());
}

function stableArtworkId(category: string, src: string): string {
  const filename = src.slice(src.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "").toLowerCase();
  return `${category}-${filename.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function parseCatalog(value: unknown): ArtworkCatalog {
  if (!isRecord(value) || !Array.isArray(value.categories) || !Array.isArray(value.artworks)) {
    throw new Error("The artwork catalog must contain categories and artworks arrays.");
  }

  const categories = value.categories.map((entry, index): ArtCategory => {
    const context = `categories[${index}]`;
    if (!isRecord(entry)) throw new Error(`${context} must be an object.`);
    return {
      slug: readString(entry, "slug", context),
      title: readString(entry, "title", context),
      shortTitle: readString(entry, "shortTitle", context),
      description: readString(entry, "description", context),
      number: readString(entry, "number", context),
    };
  });

  const categorySlugs = new Set(categories.map(({ slug }) => slug));
  if (categorySlugs.size !== categories.length) throw new Error("Artwork category slugs must be unique.");

  const categoryOrder = new Map<string, number>();
  const artworks = value.artworks.map((entry, index): Artwork => {
    const context = `artworks[${index}]`;
    if (!isRecord(entry)) throw new Error(`${context} must be an object.`);
    const category = readString(entry, "category", context);
    const src = readString(entry, "src", context);
    const title = readOptionalString(entry, "title", context) ?? humanizeArtworkPath(src);
    const description = readOptionalString(entry, "description", context);
    const dimensions = readOptionalString(entry, "dimensions", context);
    const featured = entry.featured;
    if (!categorySlugs.has(category)) throw new Error(`${context}.category does not match a configured category.`);
    if (!allowedImagePath.test(src) || !src.startsWith(`/art/${category}/`)) throw new Error(`${context}.src must point to a JPEG, PNG, or WebP inside its category folder.`);
    if (featured !== undefined && typeof featured !== "boolean") throw new Error(`${context}.featured must be a boolean when supplied.`);
    const width = readOptionalPositiveInteger(entry, "width", context);
    const height = readOptionalPositiveInteger(entry, "height", context);
    if ((width === undefined) !== (height === undefined)) throw new Error(`${context}.width and ${context}.height must be supplied together.`);
    const fallbackOrder = (categoryOrder.get(category) ?? 0) + 1;
    categoryOrder.set(category, fallbackOrder);
    return {
      id: readOptionalString(entry, "id", context) ?? stableArtworkId(category, src),
      category,
      src,
      title,
      alt: readOptionalString(entry, "alt", context) ?? title,
      ...(description ? { description } : {}),
      ...(dimensions ? { dimensions } : {}),
      width: width ?? 4,
      height: height ?? 3,
      ...(featured === true ? { featured: true } : {}),
      order: readOptionalPositiveInteger(entry, "order", context) ?? fallbackOrder,
    };
  });

  const artworkIds = new Set(artworks.map(({ id }) => id));
  if (artworkIds.size !== artworks.length) throw new Error("Artwork IDs must be unique.");

  return { categories, artworks };
}

export const artCatalog = parseCatalog(rawCatalog);

export function getCategory(slug: string): ArtCategory | undefined {
  return artCatalog.categories.find((category) => category.slug === slug);
}

export function getCategoryArtworks(slug: string): Artwork[] {
  return artCatalog.artworks.filter((artwork) => artwork.category === slug).sort((left, right) => left.order - right.order);
}

export function getFeaturedArtwork(): Artwork | undefined {
  return [...artCatalog.artworks].sort((left, right) => left.order - right.order).find((artwork) => artwork.featured);
}
