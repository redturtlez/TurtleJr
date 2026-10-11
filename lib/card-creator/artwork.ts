export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export function checkDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 16_000_000) {
    throw new Error('Artwork must be at most 8192 pixels per side and 16 megapixels.');
  }
}
export function inspectImage(bytes: Uint8Array): { type: string; width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 33 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
    if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) throw new Error('Invalid PNG header.');
    const width = view.getUint32(16), height = view.getUint32(20);
    checkDimensions(width, height);
    return { type: 'image/png', width, height };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 8) {
        const height = view.getUint16(offset + 3), width = view.getUint16(offset + 5);
        checkDimensions(width, height);
        return { type: 'image/jpeg', width, height };
      }
      offset += length;
    }
  }
  throw new Error('Choose a valid PNG or JPEG image. SVG and other formats are not supported.');
}
export async function decodeArtwork(file: File): Promise<ImageBitmap> {
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error('Choose an image smaller than 10 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = inspectImage(bytes);
  if (file.type && file.type !== info.type) throw new Error('The file contents do not match its image type.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(new Blob([bytes], { type: info.type }), { imageOrientation: 'from-image' }); }
  catch { throw new Error('This image could not be decoded. Try another PNG or JPEG.'); }
  try { checkDimensions(bitmap.width, bitmap.height); }
  catch (error) { bitmap.close(); throw error; }
  return bitmap;
}
