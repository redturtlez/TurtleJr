import { PAPERS, type PaperId } from "./geometry";
import { isShadowLevel, type ShadowLevel } from "./shadow";

/** Limits that keep a malformed or oversized file from exhausting the browser. */
export const MERGE_LIMITS = { maxFiles: 20, maxFileBytes: 25 * 1024 * 1024, maxTotalPages: 60 } as const;

const POINTS_PER_MM = 72 / 25.4;
const SIZE_TOLERANCE_MM = 1;

export interface PdfPageInfo {
  widthMm: number;
  heightMm: number;
  /** "Letter", "A4" or a size in millimetres such as "150 × 200 mm". Either orientation matches. */
  label: string;
}
export interface InspectedPdf {
  pageCount: number;
  pages: PdfPageInfo[];
}
export interface MergeInput {
  name: string;
  bytes: Uint8Array;
}
export interface MergeResult {
  bytes: Uint8Array;
  pageCount: number;
  pages: PdfPageInfo[];
  /** Images re-encoded with the shadow lift, and images left as they were because they are not RGB JPEGs. */
  liftedImages: number;
  skippedImages: number;
}
export interface MergeOptions {
  /** Clear sticker shadow lift level; 0 or omitted leaves every image untouched. */
  shadowLevel?: ShadowLevel;
  /** Re-encodes one JPEG with the lift applied. Supplied by the browser; required when shadowLevel is above 0. */
  liftJpeg?: (jpeg: Uint8Array, level: ShadowLevel) => Promise<Uint8Array>;
}

/** Names a page size from its dimensions; this is read from the PDF itself, so nothing needs selecting. */
export function describePageSize(widthMm: number, heightMm: number): string {
  const close = (a: number, b: number) => Math.abs(a - b) <= SIZE_TOLERANCE_MM;
  for (const id of Object.keys(PAPERS) as PaperId[]) {
    const paper = PAPERS[id];
    if ((close(widthMm, paper.widthMm) && close(heightMm, paper.heightMm)) || (close(widthMm, paper.heightMm) && close(heightMm, paper.widthMm))) return id === "letter" ? "Letter" : "A4";
  }
  return `${Math.round(widthMm)} × ${Math.round(heightMm)} mm`;
}

function startsWithPdfHeader(bytes: Uint8Array) {
  // "%PDF-" must appear within the first 1024 bytes, as PDF readers allow.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}
function checkBytes(name: string, bytes: Uint8Array) {
  if (bytes.byteLength === 0) throw new Error(`${name} is empty.`);
  if (bytes.byteLength > MERGE_LIMITS.maxFileBytes) throw new Error(`${name} is larger than ${MERGE_LIMITS.maxFileBytes / 1024 / 1024} MB.`);
  if (!startsWithPdfHeader(bytes)) throw new Error(`${name} is not a PDF file.`);
  // A complete PDF ends with %%EOF within its last 1024 bytes; anything else is a cut-off or corrupted download.
  if (!new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.byteLength - 1024))).includes("%%EOF")) throw new Error(`${name} looks incomplete or damaged.`);
}
async function loadDocument(name: string, bytes: Uint8Array) {
  checkBytes(name, bytes);
  const { PDFDocument } = await import("pdf-lib");
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new Error(/encrypt/i.test(message) ? `${name} is password-protected, which is not supported.` : `${name} could not be read as a PDF.`);
  }
}
function pageInfo(width: number, height: number): PdfPageInfo {
  const widthMm = Math.round((width / POINTS_PER_MM) * 10) / 10,
    heightMm = Math.round((height / POINTS_PER_MM) * 10) / 10;
  return { widthMm, heightMm, label: describePageSize(widthMm, heightMm) };
}

/** Reads the page count and each page's size without modifying anything. */
export async function inspectPdf(name: string, bytes: Uint8Array): Promise<InspectedPdf> {
  const document = await loadDocument(name, bytes);
  const pages = document.getPages().map((page) => {
    const { width, height } = page.getSize();
    return pageInfo(width, height);
  });
  if (!pages.length) throw new Error(`${name} has no pages.`);
  return { pageCount: pages.length, pages };
}

/**
 * Combines PDFs, in the order given, into one file. Pages are copied as they are, so embedded images are not
 * re-encoded (unless a shadow lift level is chosen, which re-encodes the RGB JPEGs) and each page keeps its own size (a Letter sheet and an A4 sheet can share one file). Entirely local.
 */
export async function mergePdfs(inputs: MergeInput[], options: MergeOptions = {}): Promise<MergeResult> {
  const level = options.shadowLevel ?? 0;
  if (!isShadowLevel(level)) throw new Error("Unsupported shadow lift level.");
  if (level > 0 && !options.liftJpeg) throw new Error("Shadow lift is unavailable here.");
  if (!inputs.length) throw new Error("Add at least one PDF to combine.");
  if (inputs.length > MERGE_LIMITS.maxFiles) throw new Error(`Combine at most ${MERGE_LIMITS.maxFiles} PDFs at a time.`);
  const { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFArray } = await import("pdf-lib");
  const output = await PDFDocument.create();
  const pages: PdfPageInfo[] = [];
  for (const input of inputs) {
    const source = await loadDocument(input.name, input.bytes);
    if (pages.length + source.getPageCount() > MERGE_LIMITS.maxTotalPages) throw new Error(`The combined file would have more than ${MERGE_LIMITS.maxTotalPages} pages.`);
    const copied = await output.copyPages(source, source.getPageIndices());
    for (const page of copied) {
      output.addPage(page);
      const { width, height } = page.getSize();
      pages.push(pageInfo(width, height));
    }
  }
  if (!pages.length) throw new Error("The selected PDFs have no pages.");
  let liftedImages = 0,
    skippedImages = 0;
  if (level > 0 && options.liftJpeg) {
    // Every image XObject in the combined file, once each even when several pages share it. Only RGB JPEGs are
    // re-encoded (that is what the sheet maker writes); any other image is left exactly as it was and counted.
    const nameOf = (value: unknown) => (value instanceof PDFName ? value.decodeText() : undefined);
    for (const [ref, object] of output.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFRawStream) || nameOf(object.dict.get(PDFName.of("Subtype"))) !== "Image") continue;
      const filter = object.dict.get(PDFName.of("Filter"));
      const filterName = filter instanceof PDFArray && filter.size() === 1 ? nameOf(filter.get(0)) : nameOf(filter);
      const colorSpace = nameOf(object.dict.get(PDFName.of("ColorSpace")));
      if (filterName !== "DCTDecode" || colorSpace !== "DeviceRGB" || object.dict.has(PDFName.of("SMask")) || object.dict.has(PDFName.of("Mask"))) {
        skippedImages++;
        continue;
      }
      const lifted = await options.liftJpeg(object.getContents(), level);
      object.dict.set(PDFName.of("Length"), PDFNumber.of(lifted.length));
      output.context.assign(ref, PDFRawStream.of(object.dict, lifted));
      liftedImages++;
    }
  }
  // Deterministic, minimal metadata: no title, author, producer or timestamps that could vary or identify anyone.
  output.setTitle("");
  output.setProducer("");
  output.setCreator("");
  const epoch = new Date(0);
  output.setCreationDate(epoch);
  output.setModificationDate(epoch);
  const bytes = await output.save({ useObjectStreams: false, updateFieldAppearances: false });
  return { bytes, pageCount: pages.length, pages, liftedImages, skippedImages };
}
