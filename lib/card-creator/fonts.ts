import type { FieldId } from './model';
export type CardFonts = Partial<Record<'name' | 'lore' | 'effect' | 'type' | 'footer', string>>;
const bundled = [
  { url:'/card-creator/fonts/matrix-regular-small-caps.ttf', role:'name', weight:'400', style:'normal' },
  { url:'/card-creator/fonts/stone-serif-italic.ttf', role:'lore', weight:'400', style:'italic' },
  { url:'/card-creator/fonts/matrix-book.ttf', role:'effect', weight:'400', style:'normal' },
  { url:'/card-creator/fonts/stone-serif-small-caps-bold.ttf', role:'type', weight:'700', style:'normal' },
  { url:'/card-creator/fonts/stone-serif-semibold.ttf', role:'footer', weight:'600', style:'normal' },
] as const;
export async function loadBundledCardFonts(prefix: string): Promise<{fonts:CardFonts;faces:FontFace[]}> {
  const fonts:CardFonts={},faces:FontFace[]=[];
  try {
    for(const item of bundled){
      const family=`CardBundled${prefix}${item.role}`;
      const face=new FontFace(family,`url(${JSON.stringify(item.url)})`,{weight:item.weight,style:item.style});
      await face.load();document.fonts.add(face);faces.push(face);fonts[item.role]=family;
    }
    return {fonts,faces};
  } catch(error) { faces.forEach(face=>document.fonts.delete(face));throw error; }
}
// Archive filenames are mapped to private, in-memory FontFaces, never public URLs.
const choices = [
  { match: 'matrix book', role: 'effect', priority: 1 },
  { match: 'matrix regular small caps 2', role: 'name', priority: 2 },
  { match: 'matrix regular small caps 1', role: 'name', priority: 1 },
  { match: 'stone serif lt italic', role: 'lore', priority: 1 },
  { match: 'stone serif small caps bold', role: 'type', priority: 1 },
  { match: 'stone serif semibold', role: 'footer', priority: 1 },
] as const;
export async function loadCardFonts(files: File[], prefix: string): Promise<{ fonts: CardFonts; faces: FontFace[] }> {
  if (files.length > 6) throw new Error('Select up to six TCG font files.');
  const fonts: CardFonts = {}, faces: FontFace[] = [];
  const ranked = files.map(file => ({ file, choice: choices.find(c => file.name.toLowerCase().includes(c.match)) }))
    .filter(item => item.choice).sort((a,b) => (a.choice?.priority ?? 0) - (b.choice?.priority ?? 0));
  if (!ranked.length) throw new Error('Select the extracted TCG TrueType fonts.');
  try {
    for (const {file,choice} of ranked) {
      if (!choice || !file.name.toLowerCase().endsWith('.ttf') || file.size > 1024*1024) throw new Error('Expected TTF fonts smaller than 1 MB.');
      const data = await file.arrayBuffer();
      if (data.byteLength < 12 || new DataView(data).getUint32(0) !== 0x00010000) throw new Error('Invalid TrueType file.');
      const family = `CardLocal${prefix}${choice.role}${choice.priority}`;
      const face = new FontFace(family,data, { weight: choice.role === 'footer' ? '600' : choice.role === 'type' ? '700' : '400', style: choice.role === 'lore' ? 'italic' : 'normal' });
      await face.load();
      document.fonts.add(face); faces.push(face); fonts[choice.role]=family;
    }
    return {fonts,faces};
  } catch(error) { faces.forEach(face=>document.fonts.delete(face)); throw error; }
}
export function fontStyle(id: FieldId, fonts: CardFonts, description: 'lore' | 'effect' = 'lore'): {family: string; prefix: string} {
  if(id==='lore' && description==='effect')return {family:fonts.effect ? `"${fonts.effect}"` : '"Times New Roman", serif',prefix:''};
  // The supplied archive has no regular Stone or exact bold Matrix face.
  // Use a regular serif for footer text rather than relabelling a semibold file.
  const stats = id==='attack' || id==='defense';
  if (stats) return {family:fonts.name ? `"${fonts.name}"` : '"Times New Roman", serif',prefix:'700 '};
  if (['set_id','serial','credit'].includes(id)) return {family:'"Times New Roman", serif',prefix:'400 '};
  const role = id==='name' ? 'name' : id==='lore' ? 'lore' : id==='monster_type' ? 'type' : 'footer';
  const supplied = fonts[role];
  if (supplied) return {family:`"${supplied}"`,prefix:id==='edition' ? '600 ' : id==='lore' ? 'italic ' : id==='monster_type' ? '700 ' : ''};
  return {family:'Georgia, "Times New Roman", serif',prefix:id==='lore' ? 'italic ' : ['name','monster_type','attack','defense'].includes(id) ? 'bold ' : ''};
}
