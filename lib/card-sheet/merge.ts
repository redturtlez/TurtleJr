import { PAPERS, type PaperId } from "./geometry";

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
 * re-encoded and each page keeps its own size (a Letter sheet and an A4 sheet can share one file). Entirely local.
 */
export async function mergePdfs(inputs: MergeInput[]): Promise<MergeResult> {
  if (!inputs.length) throw new Error("Add at least one PDF to combine.");
  if (inputs.length > MERGE_LIMITS.maxFiles) throw new Error(`Combine at most ${MERGE_LIMITS.maxFiles} PDFs at a time.`);
  const { PDFDocument } = await import("pdf-lib");
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
  // Deterministic, minimal metadata: no title, author, producer or timestamps that could vary or identify anyone.
  output.setTitle("");
  output.setProducer("");
  output.setCreator("");
  const epoch = new Date(0);
  output.setCreationDate(epoch);
  output.setModificationDate(epoch);
  const bytes = await output.save({ useObjectStreams: false, updateFieldAppearances: false });
  return { bytes, pageCount: pages.length, pages };
}
