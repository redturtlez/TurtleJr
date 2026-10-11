import { assets, cardTemplate, typeText, formattedTypeText, fieldText, layoutFields, graphics, labels, rect, template, validateCard, type Card, type Field, type Issues } from './model';
import { coverCrop, wrapText } from './layout';
import { fontStyle, type CardFonts } from './fonts';

export type Images = Record<string, HTMLImageElement>;
export async function loadGraphics(): Promise<Images> {
  const pairs = await Promise.all(Object.values(assets).map(async asset => {
    const image = new Image();
    image.src = asset.url;
    try { await image.decode(); } catch { throw new Error('Card graphics could not load. Reload to try again.'); }
    const [l, t, r, b] = rect(asset.bounds);
    if (image.naturalWidth !== r-l || image.naturalHeight !== b-t) throw new Error('Card graphic dimensions do not match the template.');
    return [asset.url, image] as const;
  }));
  return Object.fromEntries(pairs);
}

function drawText(ctx: CanvasRenderingContext2D, field: Field, raw: string, fonts: CardFonts, color: string, selected: ReturnType<typeof cardTemplate>): boolean {
  if (!raw) return true;
  const text = field.id==='monster_type'&&selected.category ? raw : fieldText(field.id, raw);
  if (!text) return true;
  const [left, top, right, bottom] = field.bounds;
  const width = right-left, height = bottom-top;
  const multiline = field.id === 'lore';
  const style = fontStyle(field.id,fonts,selected.description);
  const maxSize = field.id === 'name' ? (fonts.name ? 86 : 54) : multiline ? selected.maxSize : field.id === 'monster_type' ? (selected.typeMaxSize ?? 31)
    : field.id === 'attack' || field.id === 'defense' ? (fonts.name ? 42 : 34) : 26;
  const minSize = field.id === 'name' ? 24 : multiline ? 20 : 16;
  for (let size = maxSize; size >= minSize; size--) {
    ctx.font = `${style.prefix}${size}px ${style.family}`;
    if (field.id === 'monster_type') {
      // PSD 1T: initial 48.54531, remaining capitals 40.96011, brackets 45.51123.
      let initial = true;
      const runs = Array.from(text).map(char => {
        const letter = /[A-Za-z]/.test(char);
        const scale = letter ? (initial ? 1 : 40.96011/48.54531) : /[\[\]]/.test(char) ? 45.51123/48.54531 : 1;
        initial = !letter;
        ctx.font = `${style.prefix}${size*scale}px ${style.family}`;
        return {char, scale, metric:ctx.measureText(char)};
      });
      const advance = runs.reduce((sum,run)=>sum+run.metric.width,0);
      const ascent = Math.max(...runs.map(run=>run.metric.actualBoundingBoxAscent));
      const descent = Math.max(...runs.map(run=>run.metric.actualBoundingBoxDescent));
      if (advance > width || ascent+descent > height) continue;
      let x=field.align==='right' ? right-advance : left;
      const baseline=top+(height-ascent-descent)/2+ascent;
      ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';
      for(const run of runs){ctx.font=`${style.prefix}${size*run.scale}px ${style.family}`;ctx.fillText(run.char,x,baseline+(/[A-Za-z]/.test(run.char)?2:0));x+=run.metric.width;}
      return true;
    }
    if (field.id === 'edition' && /^1st\b/i.test(text)) {
      const parts = ['1', 'st', text.slice(3)];
      const runs = parts.map((part, index) => {
        const runSize = index === 1 ? size * 0.62 : size;
        ctx.font = `${style.prefix}${runSize}px ${style.family}`;
        return { text: part, size: runSize, rise: index === 1 ? size * 0.32 : 0, metric: ctx.measureText(part) };
      });
      const advance = runs.reduce((sum, run) => sum + run.metric.width, 0);
      const ascent = Math.max(...runs.map(run => run.metric.actualBoundingBoxAscent + run.rise));
      const descent = Math.max(...runs.map(run => run.metric.actualBoundingBoxDescent - run.rise));
      if (advance > width || ascent + descent > height) continue;
      let x = left;
      const baseline = top + (height - ascent - descent)/2 + ascent;
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      for (const run of runs) {
        ctx.font = `${style.prefix}${run.size}px ${style.family}`;
        ctx.fillText(run.text, x, baseline - run.rise); x += run.metric.width;
      }
      return true;
    }
    const measure = (s: string) => {
      const metric = ctx.measureText(s);
      return Math.max(metric.width, metric.actualBoundingBoxLeft + metric.actualBoundingBoxRight);
    };
    // Match the PSD's near-98% horizontal scale and justified paragraph setting.
    const textScale = multiline ? selected.horizontalScale : 1;
    const lineWidth = width/textScale;
    let lines: string[];
    const paragraphEnds: number[] = [];
    try {
      if(multiline){lines=[];for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){lines.push(...wrapText(paragraph,lineWidth,measure));paragraphEnds.push(lines.length-1);}}
      else lines=[text.replace(/[\r\n]+/g, ' ')];
    }
    catch { continue; }
    const sample = ctx.measureText(multiline ? 'Mg' : text);
    const ascent = Math.max(sample.actualBoundingBoxAscent, ...lines.map(s => ctx.measureText(s).actualBoundingBoxAscent));
    const descent = Math.max(sample.actualBoundingBoxDescent, ...lines.map(s => ctx.measureText(s).actualBoundingBoxDescent));
    const advance = Math.max(size * (multiline ? selected.lineHeight : 1.15), ascent + descent + 1);
    const used = ascent + descent + (lines.length-1)*advance;
    if (used > height || lines.some(s => measure(s) > lineWidth)) continue;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, index) => {
      const metric = ctx.measureText(line);
      const x = field.align === 'right' ? right - Math.max(metric.width, metric.actualBoundingBoxRight) : left + Math.max(0, metric.actualBoundingBoxLeft);
      const y=top + ascent + (multiline ? 0 : (height-used)/2) + index * advance;
      if(multiline){
        ctx.save();ctx.translate(left,y);ctx.scale(textScale,1);
        const words=line.split(' ');
        if(!paragraphEnds.includes(index) && words.length>1){
          const space=(lineWidth-words.reduce((sum,word)=>sum+ctx.measureText(word).width,0))/(words.length-1);
          let offset=0;for(const word of words){ctx.fillText(word,offset,0);offset+=ctx.measureText(word).width+space;}
        }else ctx.fillText(line,Math.max(0,metric.actualBoundingBoxLeft),0);
        ctx.restore();
      }else ctx.fillText(line,x,y);
    });
    return true;
  }
  return false;
}

/** One source-coordinate draw path for preview and future export. No state or network. */
export function renderCard(canvas: HTMLCanvasElement, card: Card, images: Images, artwork: ImageBitmap | null, overlay: boolean, fonts: CardFonts = {}): Issues {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  canvas.width = template.width;
  canvas.height = template.height;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const errors = validateCard(card);
  const selected = cardTemplate(card);
  // Source order places artwork above the outer border and beneath the frame.
  const [left, top, right, bottom] = rect(template.artwork);
  for (const asset of graphics({ ...card, level: errors.level ? 1 : card.level })) {
    if (asset.url === assets[selected.frameId]?.url) {
      ctx.save();
      ctx.beginPath(); ctx.rect(left,top,right-left,bottom-top); ctx.clip();
      if (artwork) {
        const crop = errors.artwork ? coverCrop(artwork.width,artwork.height,right-left,bottom-top)
          : coverCrop(artwork.width,artwork.height,right-left,bottom-top,card.artX,card.artY,card.artZoom);
        ctx.drawImage(artwork,...crop,left,top,right-left,bottom-top);
      } else {
        ctx.fillStyle = '#e8e1d4'; ctx.fillRect(left,top,right-left,bottom-top);
        ctx.fillStyle = '#70675b'; ctx.font = '26px Georgia, serif'; ctx.textAlign='center';
        ctx.fillText('Your artwork', (left+right)/2, (top+bottom)/2);
      }
      ctx.restore();
    }
    const image = images[asset.url];
    if (!image) throw new Error('A card graphic is missing.');
    const [x,y,r,b] = rect(asset.bounds);
    ctx.globalAlpha=asset.opacity;
    ctx.drawImage(image,x,y,r-x,b-y);
  }
  ctx.globalAlpha=1;
  const fields = layoutFields(card).filter(field=>!(selected.hideLevels&&field.id==='defense')).map(field=>field.id==='lore' && selected.effectRegion ? {...field,bounds:selected.effectRegion} : field);
  if(selected.materialsRegion && card.summon_materials && !errors.summon_materials){
    const materials:Field={...fields.find(field=>field.id==='lore')!,bounds:selected.materialsRegion};
    if(!drawText(ctx,materials,card.summon_materials,fonts,'#14100b',selected))errors.summon_materials='Summoning materials do not fit. Shorten the text.';
  }
  for (const field of fields) {
    const color = field.id === 'name' && !errors.titleColor ? card.titleColor : '#14100b';
    const text=field.id==='monster_type' ? selected.category ? formattedTypeText(card) : typeText(card) : card[field.id];
    if (!errors[field.id] && !drawText(ctx,field,text,fonts,color,selected)) errors[field.id]=`${field.id==='lore' && card.templateId!=='normal' ? selected.category ? 'Card text' : 'Effect text' : labels[field.id]} does not fit. Shorten the text.`;
  }
  if(selected.linkLabelId&&!errors.linkArrows){
    ctx.fillStyle='#14100b';ctx.font='700 29px Arial, sans-serif';ctx.textAlign='right';ctx.textBaseline='alphabetic';
    ctx.fillText(String(card.linkArrows.length),746,1107);
  }
  if (overlay) {
    ctx.strokeStyle='#cf2828'; ctx.lineWidth=2;
    const guides=[template.artwork,...fields.map(f=>f.bounds),...(selected.materialsRegion?[selected.materialsRegion]:[])];
    for (const bounds of guides) {
      const [x,y,r,b]=rect(bounds); ctx.strokeRect(x,y,r-x,b-y);
    }
  }
  return errors;
}
