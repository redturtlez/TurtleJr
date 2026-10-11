import data from './normal.json';
import effect from './effect.json';
import fusion from './fusion.json';
import ritual from './ritual.json';
import synchro from './synchro.json';
import xyz from './xyz.json';
import link from './link.json';
import spell from './spell.json';
import trap from './trap.json';

export type TemplateId = 'normal' | 'effect' | 'fusion' | 'ritual' | 'synchro' | 'xyz' | 'link' | 'spell' | 'trap';
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
} as const;
export function cardTemplate(card: Card) { return Object.hasOwn(templates,card.templateId) ? templates[card.templateId] : templates.normal; }
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
export type EditionPosition = 'bottom' | 'set-line';
export const titleColors = { Black: '#14100b', White: '#ffffff', Silver: '#c0c0c0', Gold: '#d4af37', Red: '#b51e23', Blue: '#2059b5', Green: '#237345', Purple: '#743b9d' } as const;
export const editions = ['', '1st Edition', 'Limited Edition', 'Duel Terminal'] as const;
export type Card = Record<FieldId, string> & { templateId: TemplateId; summon_materials:string; linkArrows:LinkArrowKey[]; spellTrapType:SpellTrapType; attribute: string; level: number; sticker: boolean; stickerColor: 'silver' | 'gold'; editionPosition: EditionPosition; titleColor: string; artX: number; artY: number; artZoom: number };
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
export const assets: Record<string, Asset> = {...data.catalog,[effect.frameId]:effect.asset,[fusion.frameId]:fusion.asset,[ritual.frameId]:ritual.asset,[synchro.frameId]:synchro.asset,[xyz.frameId]:xyz.asset,...xyz.extraAssets,[link.frameId]:link.asset,...link.extraAssets,[spell.frameId]:spell.asset,...spell.extraAssets,[trap.frameId]:trap.asset,...trap.extraAssets};
export const attributes: Record<string, string> = data.attributes;
export const defaults: Card = { templateId:'normal', name: 'Custom Normal Monster', monster_type: 'WARRIOR', lore: '', summon_materials:'', linkArrows:['down-left','down-right'], spellTrapType:'normal', attack: '0', defense: '0',
  set_id: '', serial: '', edition: '', credit: '', attribute: 'Dark', level: 4, sticker: false, stickerColor: 'silver', editionPosition: 'bottom', titleColor: titleColors.Black, artX:0.5, artY:0.5, artZoom:1 };
export type Issues = Partial<Record<FieldId | 'summon_materials' | 'linkArrows' | 'spellTrapType' | 'attribute' | 'level' | 'editionPosition' | 'titleColor' | 'artwork' | 'templateId', string>>;
export function layoutFields(card: Card): Field[] {
  // Alternate placement is an editor layout choice, not recovered PSD geometry.
  const set = fields.find(field => field.id === 'set_id')!;
  const selected=cardTemplate(card),cardType=selected.cardTypes?.find(option=>option.key===card.spellTrapType);
  return fields.filter(field=>!selected.category||!['attack','defense'].includes(field.id)).map(field => field.id==='monster_type'&&selected.category
    ? {...field,bounds:cardType?.icon ? selected.iconTypeRegion! : selected.normalTypeRegion!,align:'right'}
    : field.id === 'edition' && card.editionPosition === 'set-line'
    ? { ...field, bounds: rect([85, set.bounds[1], 400, set.bounds[3]]) }
    : field.id === 'credit' && !card.sticker ? { ...field, bounds: rect([field.bounds[0],field.bounds[1],785,field.bounds[3]]) } : field);
}
export function fieldText(id: FieldId, raw: string): string {
  if (id === 'monster_type') return raw ? `[${raw.toUpperCase()}]` : '';
  if (id !== 'credit') return raw;
  const credit = raw.replace(/^(?:\s*©)+\s*/, '').trim();
  return credit ? `© ${credit.toUpperCase()}` : '';
}
export function validateCard(card: Card): Issues {
  const errors: Issues = {};
  const selected=cardTemplate(card);
  if (!Object.hasOwn(templates,card.templateId)) errors.templateId='Choose a supported template.';
  for (const field of fields) {
    if((field.id==='defense' && selected.hideLevels)||(selected.category&&['attack','defense','monster_type'].includes(field.id)))continue;
    const text = card[field.id];
    if (text.length > field.maxLength) errors[field.id] = `Use at most ${field.maxLength} characters.`;
    else if (field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(text)) errors[field.id] = field.id === 'serial'
      ? 'Use up to eight digits, or leave this blank.' : 'Use 0–9999 or ?.';
  }
  if(card.summon_materials.length>200)errors.summon_materials='Use at most 200 characters.';
  if (!selected.category&&!Object.hasOwn(attributes, card.attribute)) errors.attribute = 'Choose a supported attribute.';
  if (!selected.hideLevels && (!Number.isInteger(card.level) || card.level < 1 || card.level > 12)) errors.level = 'Choose a level from 1 to 12.';
  if(selected.arrows){
    const valid=new Set(selected.arrows.map(arrow=>arrow.key));
    if(card.linkArrows.length<1||card.linkArrows.length>8||new Set(card.linkArrows).size!==card.linkArrows.length||card.linkArrows.some(key=>!valid.has(key)))errors.linkArrows='Choose between one and eight unique Link Arrows.';
  }
  if(selected.cardTypes&&!selected.cardTypes.some(option=>option.key===card.spellTrapType))errors.spellTrapType=`Choose a supported ${selected.category} type.`;
  if (!['bottom','set-line'].includes(card.editionPosition)) errors.editionPosition = 'Choose an edition position.';
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
