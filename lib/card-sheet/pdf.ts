import { mmToPt, type Segment } from "./geometry";

/** A JPEG-encoded image placed on the page; positions are millimetres from the top-left of the page. */
export interface PdfImage {
  jpeg: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}
export interface PdfLines {
  segments: Segment[];
  /** 0 = black, 1 = white. */
  gray: 0 | 1;
  widthPt: number;
}
export interface PdfPageSpec {
  widthMm: number;
  heightMm: number;
  images: PdfImage[];
  lines: PdfLines[];
}

const encoder = new TextEncoder();
const num = (value: number) => (Math.round(value * 1000) / 1000).toString();

/**
 * Builds a one-page PDF with no dependencies. Images are embedded as-is (DCTDecode JPEG), guide lines are vector.
 * Output is deterministic: no dates, producer strings or random identifiers.
 */
export function buildPdf(spec: PdfPageSpec): Uint8Array {
  if (!(spec.widthMm > 0 && spec.heightMm > 0)) throw new Error("Invalid page size.");
  const pageHeightPt = mmToPt(spec.heightMm);
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  const imageIds = spec.images.map((_, index) => 5 + index);
  const content: string[] = [];
  spec.images.forEach((image, index) => {
    const x = mmToPt(image.xMm),
      w = mmToPt(image.widthMm),
      h = mmToPt(image.heightMm),
      y = pageHeightPt - mmToPt(image.yMm) - h;
    content.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(y)} cm /Im${index} Do Q`);
  });
  for (const group of spec.lines) {
    if (!group.segments.length) continue;
    content.push(`q ${num(group.widthPt)} w ${group.gray} G`);
    for (const s of group.segments) content.push(`${num(mmToPt(s.x1))} ${num(pageHeightPt - mmToPt(s.y1))} m ${num(mmToPt(s.x2))} ${num(pageHeightPt - mmToPt(s.y2))} l S`);
    content.push("Q");
  }
  const contentBytes = encoder.encode(content.join("\n") + "\n");

  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  beginObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObject(2);
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  beginObject(3);
  const xObjects = imageIds.map((id, index) => `/Im${index} ${id} 0 R`).join(" ");
  push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(mmToPt(spec.widthMm))} ${num(pageHeightPt)}] /Resources << /XObject << ${xObjects} >> >> /Contents 4 0 R >>\nendobj\n`);
  beginObject(4);
  push(`<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  push("\nendstream\nendobj\n");
  spec.images.forEach((image, index) => {
    beginObject(imageIds[index] as number);
    push(`<< /Type /XObject /Subtype /Image /Width ${image.pixelWidth} /Height ${image.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`);
    push(image.jpeg);
    push("\nendstream\nendobj\n");
  });
  const objectCount = 4 + spec.images.length;
  const xrefOffset = length;
  push(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= objectCount; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}
