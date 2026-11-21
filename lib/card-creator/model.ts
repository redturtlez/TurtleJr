import data from './normal.json';
import effect from './effect.json';
import fusion from './fusion.json';
import ritual from './ritual.json';
import synchro from './synchro.json';
import xyz from './xyz.json';
import link from './link.json';
import spell from './spell.json';
import trap from './trap.json';
import token from './token.json';
import obelisk from './obelisk.json';
import slifer from './slifer.json';
import ra from './ra.json';
import rarityData from './rarity.json';
import animeData from './anime.json';

export type TemplateId = 'normal' | 'effect' | 'fusion' | 'ritual' | 'synchro' | 'xyz' | 'link' | 'spell' | 'trap' | 'token' | 'obelisk' | 'slifer' | 'ra';
export type LinkArrowKey = typeof link.arrows[number]['key'];
export type SpellTrapType = 'normal' | 'continuous' | 'equip' | 'field' | 'quick-play' | 'ritual' | 'counter';
export interface LinkArrow { key:LinkArrowKey; label:string; id:string }
export interface CardTypeOption { key:SpellTrapType; label:string; icon:{id:string}|null }
export interface TemplateSpec { label:string; frameId:string; description:'lore'|'effect'; maxSize:number; horizontalScale:number; lineHeight:number; typeSuffix:string; materialsRegion?:Rect; effectRegion?:Rect; rankIds?:readonly string[]; linkLabelId?:string; arrows?:readonly LinkArrow[]; hideLevels?:boolean; category?:'spell'|'trap'; cardTypeLabel?:string; cardTypes?:readonly CardTypeOption[]; normalTypeRegion?:Rect; iconTypeRegion?:Rect; attributeId?:string; typeMaxSize?:number }
export const templates: Record<TemplateId,TemplateSpec> = {
  normal: { label:'Normal Monster', frameId:data.fixed.find(item=>item.role==='frame')!.layer_id, description:'lore', maxSize:28, horizontalScale:0.98, lineHeight:1, typeSuffix:'' },
  effect: { label:effect.label, frameId:effect.frameId, description:'effect', maxSize:effect.description.maxSize, horizontalScale:effect.description.horizontalScale, lineHeight:effect.description.lineHeight, typeSuffix:effect.description.typeSuffix },
  fusion: { label:fusion.label, frameId:fusion.frameId, description:'effect', maxSize:fusion.description.maxSize, horizontalScale:fusion.description.horizontalScale, lineHeight:fusion.description.lineHeight, typeSuffix:fusion.description.typeSuffix, materialsRegion:rect(fusion.description.materialsRegion), effectRegion:rect(fusion.description.effectRegion) },
  ritual: { label:ritual.label, frameId:ritual.frameId, description:'effect', maxSize:ritual.description.maxSize, horizontalScale:ritual.description.horizontalScale, lineHeight:ritual.description.lineHeight, typeSuffix:ritual.description.typeSuffix },
  synchro: { label:synchro.label, frameId:synchro.frameId, description:'effect', maxSize:synchro.description.maxSize, horizontalScale:synchro.description.horizontalScale, lineHeight:synchro.description.lineHeight, typeSuffix:synchro.description.typeSuffix, materialsRegion:rect(synchro.description.materialsRegion), effectRegion:rect(synchro.description.effectRegion) },
  xyz: { label:xyz.label, frameId:xyz.frameId, description:'effect', maxSize:xyz.description.maxSize, horizontalScale:xyz.description.horizontalScale, lineHeight:xyz.description.lineHeight, typeSuffix:xyz.description.typeSuffix, materialsRegion:rect(xyz.description.materialsRegion), effectRegion:rect(xyz.description.effectRegion), rankIds:xyz.rankIds },
  link: { label:link.label, frameId:link.frameId, description:'effect', maxSize:link.description.maxSize, horizontalScale:link.description.horizontalScale, lineHeight:link.description.lineHeight, typeSuffix:link.description.typeSuffix, materialsRegion:rect(link.description.materialsRegion), effectRegion:rect(link.description.effectRegion), linkLabelId:link.linkLabelId, arrows:link.arrows as readonly LinkArrow[], hideLevels:true },
  spell: { label:spell.label, frameId:spell.frameId, description:'effect', maxSize:spell.description.maxSize, horizontalScale:spell.description.horizontalScale, lineHeight:spell.description.lineHeight, typeSuffix:'', effectRegion:rect(spell.description.effectRegion), category:'spell', cardTypeLabel:spell.cardType.label, cardTypes:spell.cardType.options as readonly CardTypeOption[], normalTypeRegion:rect(spell.cardType.normalRegion), iconTypeRegion:rect(spell.cardType.iconRegion), attributeId:spell.attributeId, typeMaxSize:40, hideLevels:true },
  trap: { label:trap.label, frameId:trap.frameId, description:'effect', maxSize:trap.description.maxSize, horizontalScale:trap.description.horizontalScale, lineHeight:trap.description.lineHeight, typeSuffix:'', effectRegion:rect(trap.description.effectRegion), category:'trap', cardTypeLabel:trap.cardType.label, cardTypes:trap.cardType.options as readonly CardTypeOption[], normalTypeRegion:rect(trap.cardType.normalRegion), iconTypeRegion:rect(trap.cardType.iconRegion), attributeId:trap.attributeId, typeMaxSize:40, hideLevels:true },
  token: { label:token.label, frameId:token.frameId, description:'effect', maxSize:token.description.maxSize, horizontalScale:token.description.horizontalScale, lineHeight:token.description.lineHeight, typeSuffix:token.description.typeSuffix },
  obelisk: { label:obelisk.label, frameId:obelisk.frameId, description:'effect', maxSize:obelisk.description.maxSize, horizontalScale:obelisk.description.horizontalScale, lineHeight:obelisk.description.lineHeight, typeSuffix:obelisk.description.typeSuffix },
  slifer: { label:slifer.label, frameId:slifer.frameId, description:'effect', maxSize:slifer.description.maxSize, horizontalScale:slifer.description.horizontalScale, lineHeight:slifer.description.lineHeight, typeSuffix:slifer.description.typeSuffix },
  ra: { label:ra.label, frameId:ra.frameId, description:'effect', maxSize:ra.description.maxSize, horizontalScale:ra.description.horizontalScale, lineHeight:ra.description.lineHeight, typeSuffix:ra.description.typeSuffix },
} as const;
export function isTemplateId(id: string): id is TemplateId { return Object.hasOwn(templates, id); }
export function cardTemplate(card: Card) { return Object.hasOwn(templates,card.templateId) ? templates[card.templateId] : templates.normal; }
const animeFrames: Readonly<Record<string, string>> = animeData.frames;
const animeMarkers: Readonly<Record<string, string>> = animeData.markers;
/** True when the template has an anime-style frame (the three god templates do not). */
export function animeSupported(id: TemplateId): boolean { return Object.hasOwn(animeFrames, id); }
/** The anime layout only applies when it is chosen and the template has one. */
export function isAnime(card: Card): boolean { return card.style === 'anime' && animeSupported(card.templateId); }
export interface AnimeParts { frame: Asset; symbol?: Asset; star?: Asset; markers: { key: LinkArrowKey; asset: Asset }[] }
/** Every image an anime-style card draws, or null for a normal card. The anime frame is the whole card: no separate border and no corner sticker. */
export function animeParts(card: Card): AnimeParts | null {
  if (!isAnime(card)) return null;
  const selected = cardTemplate(card);
  const need = (id: string | undefined): Asset => { const asset = id ? assets[id] : undefined; if (!asset) throw new Error('Missing template asset'); return asset; };
  const progression = selected.rankIds ?? template.levels;
  const attribute = attributes[card.attribute];
  return {
    frame: need(animeFrames[card.templateId]),
    symbol: selected.category ? need(selected.attributeId) : attribute ? need(attribute) : undefined,
    star: selected.hideLevels ? undefined : need(progression[0]),
    markers: (selected.arrows ?? []).filter(arrow => card.linkArrows.includes(arrow.key)).map(arrow => ({ key: arrow.key, asset: need(animeMarkers[arrow.key]) })),
  };
}
export function typeText(card: Card): string {
  const selected=cardTemplate(card);
  if(selected.cardTypeLabel){
    const option=selected.cardTypes?.find(item=>item.key===card.spellTrapType);
    return `${selected.cardTypeLabel}${option?.icon?'     ':''}`;
  }
  const suffix=selected.typeSuffix;
  return suffix && !card.monster_type.split('/').some(part=>part.trim().toUpperCase()===suffix)
    ? `${card.monster_type} / ${suffix}` : card.monster_type;
}
export function formattedTypeText(card: Card): string {
  const raw=typeText(card);
  return cardTemplate(card).category ? `[${raw}]` : fieldText('monster_type',raw);
}

export const fieldIds = ['name', 'monster_type', 'lore', 'attack', 'defense', 'set_id', 'serial', 'edition', 'credit'] as const;
export type FieldId = typeof fieldIds[number];
export type RarityId = 'none' | 'secret' | 'mosaic' | 'shatter';
export interface RarityOption { key:RarityId; label:string; pictureFoilId?:string; cardFoilId?:string }
export type CardStyle = 'tcg' | 'anime';
export type EditionPosition = 'bottom' | 'set-line';
export const titleColors = { Black: '#14100b', White: '#ffffff', Silver: '#c0c0c0', Gold: '#d4af37', Red: '#b51e23', Blue: '#2059b5', Green: '#237345', Purple: '#743b9d' } as const;
export const editions = ['', '1st Edition', 'Limited Edition', 'Duel Terminal'] as const;
export type Card = Record<FieldId, string> & { templateId: TemplateId; summon_materials:string; linkArrows:LinkArrowKey[]; spellTrapType:SpellTrapType; attribute: string; level: number; sticker: boolean; stickerColor: 'silver' | 'gold'; editionPosition: EditionPosition; titleColor: string; rarity: RarityId; style: CardStyle; artX: number; artY: number; artZoom: number };
export type Rect = readonly [number, number, number, number];
export interface Asset { url: string; bounds: number[]; z: number; opacity: number; sha256: string }
export interface Field { id: FieldId; bounds: Rect; align: string; maxLength: number; default: string; pattern: string | null }
export const labels: Record<FieldId, string> = { name: 'Card name', monster_type: 'Monster type', lore: 'Lore',
  attack: 'ATK', defense: 'DEF', set_id: 'Set ID', serial: 'Serial number', edition: 'Edition', credit: 'Credit' };
export function rect(values: readonly number[]): Rect {
  if (values.length !== 4 || !values.every(Number.isFinite)) throw new Error('Invalid template rectangle');
  const [left, top, right, bottom] = values;
  if (left === undefined || top === undefined || right === undefined || bottom === undefined || right <= left || bottom <= top) throw new Error('Invalid template geometry');
  return [left, top, right, bottom];
}
export const fields: Field[] = data.fields.map(f => {
  const id = fieldIds.find(key => key === f.id);
  if (!id) throw new Error('Unknown template field');
  return { ...f, id, bounds: rect(f.bounds) };
});
export const template = data;
export const assets: Record<string, Asset> = {...data.catalog,[effect.frameId]:effect.asset,[fusion.frameId]:fusion.asset,[ritual.frameId]:ritual.asset,[synchro.frameId]:synchro.asset,[xyz.frameId]:xyz.asset,...xyz.extraAssets,[link.frameId]:link.asset,...link.extraAssets,[spell.frameId]:spell.asset,...spell.extraAssets,[trap.frameId]:trap.asset,...trap.extraAssets,[token.frameId]:token.asset,[obelisk.frameId]:obelisk.asset,[slifer.frameId]:slifer.asset,[ra.frameId]:ra.asset,...rarityData.assets,...animeData.assets};
export const rarities: readonly RarityOption[] = rarityData.options as RarityOption[];
/** Foil layers for the chosen rarity. They are drawn by the renderer, not by graphics(), because they use their own blend and fit. */
export function rarityFoils(card: Card): { picture?: Asset; card?: Asset } {
  const option = rarities.find(item => item.key === card.rarity);
  return { picture: option?.pictureFoilId ? assets[option.pictureFoilId] : undefined, card: option?.cardFoilId ? assets[option.cardFoilId] : undefined };
}
export const attributes: Record<string, string> = data.attributes;
/** Choosing this draws no attribute symbol (TCG and anime). It is offered last and is never the default. */
export const NO_ATTRIBUTE = 'None';
export const attributeNames: readonly string[] = [...Object.keys(attributes), NO_ATTRIBUTE];
export const defaults: Card = { templateId:'normal', name: 'Custom Normal Monster', monster_type: 'WARRIOR', lore: '', summon_materials:'', linkArrows:['down-left','down-right'], spellTrapType:'normal', attack: '0', defense: '0',
  set_id: 'ABC-123', serial: '00000001', edition: '1st Edition', credit: '1996 KAZUKI TAKAHASHI', attribute: 'Dark', level: 4, sticker: true, stickerColor: 'gold', editionPosition: 'set-line', titleColor: titleColors.Black, rarity:'none', style:'tcg', artX:0.5, artY:0.5, artZoom:1 };
export type Issues = Partial<Record<FieldId | 'summon_materials' | 'linkArrows' | 'spellTrapType' | 'attribute' | 'level' | 'editionPosition' | 'titleColor' | 'rarity' | 'style' | 'artwork' | 'templateId', string>>;
export function layoutFields(card: Card): Field[] {
  // Alternate placement is an editor layout choice, not recovered PSD geometry.
  const set = fields.find(field => field.id === 'set_id')!;
  const selected=cardTemplate(card),cardType=selected.cardTypes?.find(option=>option.key===card.spellTrapType);
  return fields.filter(field=>!selected.category||!['attack','defense'].includes(field.id)).map(field => field.id==='monster_type'&&selected.category
    ? {...field,bounds:cardType?.icon ? selected.iconTypeRegion! : selected.normalTypeRegion!,align:'right'}
    : field.id === 'edition' && card.editionPosition === 'set-line'
    ? { ...field, bounds: rect([85, set.bounds[1], 400, set.bounds[3]]) }
    : field.id === 'credit' ? { ...field, bounds: rect([380,field.bounds[1],card.sticker ? field.bounds[2] : 785,field.bounds[3]]) } : field); // starts after the edition field (ends at 365)
}
export function fieldText(id: FieldId, raw: string): string {
  if (id === 'monster_type') return raw ? `[${raw.toUpperCase()}]` : '';
  if (id !== 'credit') return raw;
  // No automatic space after ©: a leading space the user types is kept. A typed © is not doubled.
  const credit = raw.replace(/^(?:\s*©)+/, '').trimEnd();
  return credit.trim() ? `©${credit.toUpperCase()}` : '';
}
export function validateCard(card: Card): Issues {
  const errors: Issues = {};
  const selected=cardTemplate(card);
  if (!Object.hasOwn(templates,card.templateId)) errors.templateId='Choose a supported template.';
  const anime = isAnime(card);
  for (const field of fields) {
    // Anime cards show only artwork, attribute, level and ATK/DEF, so text that is not drawn is not validated.
    if(anime && field.id!=='attack' && field.id!=='defense')continue;
    if((field.id==='defense' && selected.hideLevels)||(selected.category&&['attack','defense','monster_type'].includes(field.id)))continue;
    const text = card[field.id];
    if (text.length > field.maxLength) errors[field.id] = `Use at most ${field.maxLength} characters.`;
    else if (field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(text)) errors[field.id] = field.id === 'serial'
      ? 'Use up to eight digits, or leave this blank.' : 'Use 0–9999 or ?.';
  }
  if (card.style !== 'tcg' && card.style !== 'anime') errors.style = 'Choose a supported card style.';
  if(!anime && card.summon_materials.length>200)errors.summon_materials='Use at most 200 characters.';
  if (!selected.category&&card.attribute!==NO_ATTRIBUTE&&!Object.hasOwn(attributes, card.attribute)) errors.attribute = 'Choose a supported attribute.';
  if (!selected.hideLevels && (!Number.isInteger(card.level) || card.level < 1 || card.level > 12)) errors.level = 'Choose a level from 1 to 12.';
  if(selected.arrows){
    const valid=new Set(selected.arrows.map(arrow=>arrow.key));
    if(card.linkArrows.length<1||card.linkArrows.length>8||new Set(card.linkArrows).size!==card.linkArrows.length||card.linkArrows.some(key=>!valid.has(key)))errors.linkArrows='Choose between one and eight unique Link Arrows.';
  }
  if(selected.cardTypes&&!selected.cardTypes.some(option=>option.key===card.spellTrapType))errors.spellTrapType=`Choose a supported ${selected.category} type.`;
  if (!['bottom','set-line'].includes(card.editionPosition)) errors.editionPosition = 'Choose an edition position.';
  if (!rarities.some(option => option.key === card.rarity)) errors.rarity = 'Choose a supported rarity.';
  if (!/^#[0-9a-f]{6}$/i.test(card.titleColor)) errors.titleColor = 'Choose a valid title color.';
  if (![card.artX,card.artY,card.artZoom].every(Number.isFinite) || card.artX<0 || card.artX>1 || card.artY<0 || card.artY>1 || card.artZoom<1 || card.artZoom>4) errors.artwork = 'Reset artwork positioning.';
  return errors;
}
export function graphics(card: Card): Asset[] {
  const selected=cardTemplate(card);
  const progression=selected.rankIds ?? (selected.hideLevels ? [] : template.levels);
  const ids = [...template.fixed.filter(item=>!selected.category?!(selected.hideLevels&&item.role==='def_label'):['border','frame'].includes(item.role)).map(item => item.role==='frame' ? selected.frameId : item.layer_id), ...progression.slice(0, card.level)];
  if(selected.linkLabelId)ids.push(selected.linkLabelId);
  if(selected.arrows)ids.push(...selected.arrows.filter(arrow=>card.linkArrows.includes(arrow.key)).map(arrow=>arrow.id));
  const cardType=selected.cardTypes?.find(option=>option.key===card.spellTrapType);
  if(cardType?.icon)ids.push(cardType.icon.id);
  if(selected.attributeId)ids.push(selected.attributeId);
  const attribute = attributes[card.attribute];
  if (attribute&&!selected.category) ids.push(attribute);
  if (card.sticker) ids.push(card.stickerColor === 'gold' ? template.goldSticker : template.sticker);
  return ids.map(id => { const asset = assets[id]; if (!asset) throw new Error('Missing template asset'); return asset; }).sort((a, b) => a.z - b.z);
}
