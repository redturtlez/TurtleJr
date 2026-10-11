import { assets, template, type Card, type Issues } from './model';
import { renderCard, type Images } from './render';
import type { CardFonts } from './fonts';
export type Bleed = 0 | 1 | 2;
export function printGeometry(bleed: Bleed) {
  if (![0,1,2].includes(bleed)) throw new Error('Unsupported bleed size.');
  const pixels = (mm: number) => Math.round(mm*300/25.4);
  const width=pixels(59+2*bleed),height=pixels(86+2*bleed),trimWidth=pixels(59),trimHeight=pixels(86);
  return {width,height,trimWidth,trimHeight,left:Math.floor((width-trimWidth)/2),top:Math.floor((height-trimHeight)/2),widthMm:59+2*bleed,heightMm:86+2*bleed};
}
/** Extend only the background; never scale the card to create bleed. */
export function composePrint(target: HTMLCanvasElement, trim: HTMLCanvasElement, border: HTMLCanvasElement, bleed: Bleed): void {
  const g=printGeometry(bleed);
  target.width=g.width; target.height=g.height;
  const ctx=target.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.');
  const right=g.width-g.trimWidth-g.left,bottom=g.height-g.trimHeight-g.top;
  ctx.imageSmoothingEnabled=false;
  const w=border.width,h=border.height;
  if(bleed) {
    ctx.drawImage(border,0,0,w,1,g.left,0,g.trimWidth,g.top);
    ctx.drawImage(border,0,h-1,w,1,g.left,g.top+g.trimHeight,g.trimWidth,bottom);
    ctx.drawImage(border,0,0,1,h,0,g.top,g.left,g.trimHeight);
    ctx.drawImage(border,w-1,0,1,h,g.left+g.trimWidth,g.top,right,g.trimHeight);
    for(const [sx,sy,dx,dy,dw,dh] of [[0,0,0,0,g.left,g.top],[w-1,0,g.left+g.trimWidth,0,right,g.top],
      [0,h-1,0,g.top+g.trimHeight,g.left,bottom],[w-1,h-1,g.left+g.trimWidth,g.top+g.trimHeight,right,bottom]]) {
      if(sx!==undefined&&sy!==undefined&&dx!==undefined&&dy!==undefined&&dw!==undefined&&dh!==undefined) ctx.drawImage(border,sx,sy,1,1,dx,dy,dw,dh);
    }
  }
  ctx.drawImage(trim,g.left,g.top);
}
export function renderPrint(target: HTMLCanvasElement, card: Card, images: Images, artwork: ImageBitmap|null, bleed: Bleed, guides: boolean, fonts: CardFonts): Issues {
  const source=document.createElement('canvas');
  const issues=renderCard(source,card,images,artwork,guides,fonts);
  const g=printGeometry(bleed),trim=document.createElement('canvas'),border=document.createElement('canvas');
  trim.width=border.width=g.trimWidth; trim.height=border.height=g.trimHeight;
  const ctx=trim.getContext('2d'),bg=border.getContext('2d');
  if(!ctx||!bg) throw new Error('Canvas unavailable.');
  ctx.imageSmoothingQuality='high';bg.imageSmoothingQuality='high';
  ctx.drawImage(source,0,0,g.trimWidth,g.trimHeight);
  const borderId=template.fixed.find(item=>item.role==='border')?.layer_id;
  const asset=borderId ? assets[borderId] : undefined;
  const image=asset ? images[asset.url] : undefined;
  if(!image)throw new Error('Border graphic unavailable.');
  bg.drawImage(image,0,0,g.trimWidth,g.trimHeight);
  composePrint(target,trim,border,bleed);
  return issues;
}
function crc32(bytes: Uint8Array): number {
  let crc=0xffffffff;
  for(let index=0;index<bytes.length;index++) {crc^=bytes[index]!;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
/** Explicit PNG pHYs chunk: 11811 pixels/metre, approximately 300 PPI. */
export function pngWithPrintDensity(bytes: Uint8Array): Uint8Array {
  if(bytes.length<33||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('Invalid PNG.');
  const chunk=new Uint8Array(21),view=new DataView(chunk.buffer);
  view.setUint32(0,9);chunk.set([112,72,89,115],4);view.setUint32(8,11811);view.setUint32(12,11811);chunk[16]=1;
  view.setUint32(17,crc32(chunk.subarray(4,17)));
  const parts:Uint8Array[]=[bytes.subarray(0,8)];let offset=8,inserted=false,ended=false;
  while(offset+12<=bytes.length) {
    const length=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0);
    if(offset+12+length>bytes.length)throw new Error('Truncated PNG.');
    const type=String.fromCharCode(bytes[offset+4]!,bytes[offset+5]!,bytes[offset+6]!,bytes[offset+7]!);
    if(!inserted&&type!=='IHDR') {parts.push(chunk);inserted=true;}
    if(type!=='pHYs')parts.push(bytes.subarray(offset,offset+12+length));
    offset+=12+length;
    if(type==='IEND'){ended=true;break;}
  }
  if(!inserted||!ended)throw new Error('Incomplete PNG.');
  const output=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let position=0;
  for(const p of parts){output.set(p,position);position+=p.length;}return output;
}
export async function exportPng(card: Card, images: Images, artwork: ImageBitmap|null, bleed: Bleed, fonts: CardFonts): Promise<Blob> {
  await document.fonts.ready;
  const canvas=document.createElement('canvas');
  const issues=renderPrint(canvas,card,images,artwork,bleed,false,fonts);
  if(Object.keys(issues).length)throw new Error('Correct the highlighted fields before downloading.');
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed.')),'image/png'));
  return new Blob([pngWithPrintDensity(new Uint8Array(await blob.arrayBuffer()))],{type:'image/png'});
}
