'use client';

import { useEffect, useRef, useState } from 'react';
import { attributes, cardTemplate, defaults, editions, fields, labels, templates, titleColors, type Card, type FieldId, type Issues } from '../../lib/card-creator/model';
import { decodeArtwork } from '../../lib/card-creator/artwork';
import { loadGraphics, type Images } from '../../lib/card-creator/render';
import { exportPng, printGeometry, renderPrint, type Bleed } from '../../lib/card-creator/print';
import { loadBundledCardFonts, type CardFonts } from '../../lib/card-creator/fonts';
import styles from './editor.module.css';

export default function CardEditor() {
  const [card, setCard] = useState<Card>({ ...defaults });
  const [images, setImages] = useState<Images | null>(null);
  const [artwork, setArtwork] = useState<ImageBitmap | null>(null);
  const [artName, setArtName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [failure, setFailure] = useState('');
  const [issues, setIssues] = useState<Issues>({});
  const [overlay, setOverlay] = useState(false);
  const [retry, setRetry] = useState(0);
  const [bleed,setBleed]=useState<Bleed>(0);
  const [fonts,setFonts]=useState<CardFonts>({});
  const [fontStatus,setFontStatus]=useState('Loading bundled card fonts…');
  const [fontBusy,setFontBusy]=useState(true);
  const [exportBusy,setExportBusy]=useState(false);
  const [exportStatus,setExportStatus]=useState('');
  const faces=useRef<FontFace[]>([]);
  const fontGeneration=useRef(0);
  const downloadUrls=useRef<string[]>([]);
  const geometry=printGeometry(bleed);
  const selectedTemplate=cardTemplate(card);
  const canvas = useRef<HTMLCanvasElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const currentBitmap = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFailure('');
    loadGraphics().then(result => { if (!cancelled) setImages(result); })
      .catch((error: unknown) => { if (!cancelled) setFailure(error instanceof Error ? error.message : 'Could not load template.'); });
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => () => { generation.current++; fontGeneration.current++; currentBitmap.current?.close();
    faces.current.forEach(face=>document.fonts.delete(face));downloadUrls.current.forEach(url=>URL.revokeObjectURL(url)); }, []);
  useEffect(()=>{
    let cancelled=false;const token=++fontGeneration.current;
    loadBundledCardFonts(String(token)).then(loaded=>{
      if(cancelled||token!==fontGeneration.current){loaded.faces.forEach(face=>document.fonts.delete(face));return;}
      faces.current=loaded.faces;setFonts(loaded.fonts);setFontStatus('Bundled card fonts loaded automatically.');
    }).catch((error:unknown)=>{if(!cancelled)setFontStatus(error instanceof Error?error.message:'Bundled fonts could not load.');})
      .finally(()=>{if(!cancelled)setFontBusy(false);});
    return()=>{cancelled=true;};
  },[]);
  useEffect(() => {
    if (!images || !canvas.current) return;
    try { setIssues(renderPrint(canvas.current,card,images,artwork,bleed,overlay,fonts)); }
    catch (error: unknown) { setFailure(error instanceof Error ? error.message : 'Preview failed.'); }
  }, [images,card,artwork,overlay,bleed,fonts]);

  async function download() {
    if(!images)return;
    setExportBusy(true);setExportStatus('Preparing PNG…');
    try{
      const blob=await exportPng(card,images,artwork,bleed,fonts);
      const url=URL.createObjectURL(blob);downloadUrls.current.push(url);
      const link=document.createElement('a');link.href=url;link.download=`${card.templateId}-card-300ppi-${bleed}mm-bleed.png`;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>{URL.revokeObjectURL(url);downloadUrls.current=downloadUrls.current.filter(item=>item!==url);},30000);
      setExportStatus('PNG prepared. Check your browser downloads.');
    }catch(error:unknown){setExportStatus(error instanceof Error?error.message:'Download failed.');}
    finally{setExportBusy(false);}
  }

  function change(id: FieldId, value: string) { setCard(previous => ({ ...previous, [id]: id==='monster_type'||id==='credit' ? value.toUpperCase() : value })); }
  function clearArtwork() {
    generation.current++;
    currentBitmap.current?.close(); currentBitmap.current=null;
    setArtwork(null); setArtName(''); setUploadError(''); setUploading(false);
    if (upload.current) upload.current.value='';
  }
  async function chooseArtwork(file: File | undefined) {
    if (!file) return;
    const token = ++generation.current;
    setUploading(true); setUploadError('');
    try {
      const bitmap = await decodeArtwork(file);
      if (token !== generation.current) { bitmap.close(); return; }
      currentBitmap.current?.close(); currentBitmap.current=bitmap;
      setArtwork(bitmap); setArtName(file.name);
      setCard(previous=>({...previous,artX:0.5,artY:0.5,artZoom:1}));
    } catch (error: unknown) {
      if (token === generation.current) setUploadError(error instanceof Error ? error.message : 'Artwork could not load.');
    } finally { if (token === generation.current) setUploading(false); }
  }
  function textControl(id: FieldId) {
    const field = fields.find(item=>item.id===id);
    if (!field) return null;
    const shared = { id: `card-${id}`, value: card[id], maxLength: field.maxLength,
      'aria-invalid': Boolean(issues[id]), 'aria-describedby': issues[id] ? `error-${id}` : undefined };
    return <div className={styles.field} key={id}>
      <label htmlFor={`card-${id}`}>{id==='lore' && selectedTemplate.category ? 'Card text' : id==='lore' && card.templateId!=='normal' ? 'Effect text' : labels[id]}</label>
      {id==='lore' ? <textarea {...shared} rows={5} placeholder={selectedTemplate.category ? 'Describe the card’s effect…' : card.templateId!=='normal' ? 'Describe your monster’s effect…' : 'Tell your monster’s story…'} onChange={event=>change(id,event.target.value)} />
        : <input {...shared} type="text" inputMode={id==='serial' ? 'numeric' : 'text'} onChange={event=>change(id,event.target.value)} />}
      {issues[id] && <span className={styles.error} id={`error-${id}`}>{issues[id]}</span>}
    </div>;
  }
  return <div className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>THE CARD WORKSHOP</p><h1>Make it yours.</h1>
        <p>Build a trading card with your own text and artwork.</p></div>
      <span className={styles.badge}>No sign-in needed</span>
    </header>
    <div className={styles.workspace}>
      <section className={styles.controls} aria-label="Card settings">
        <div className={styles.sectionHeader}><h2>Your card</h2><span>01</span></div>
        <div className={styles.field}><label htmlFor="card-template">Card template</label>
          <select id="card-template" value={card.templateId} onChange={event=>{
            const id=event.target.value;if(id==='normal'||id==='effect'||id==='fusion'||id==='ritual'||id==='synchro'||id==='xyz'||id==='link'||id==='spell'||id==='trap')setCard(previous=>({...previous,templateId:id,
              spellTrapType:templates[id].cardTypes?.some(option=>option.key===previous.spellTrapType)?previous.spellTrapType:'normal',
              titleColor:['xyz','spell','trap'].includes(id)&&previous.titleColor===titleColors.Black?titleColors.White:previous.titleColor}));
          }}>{Object.entries(templates).map(([id,value])=><option key={id} value={id}>{value.label}</option>)}</select></div>
        {textControl('name')}
        <div className={styles.row}>
          <div className={styles.field}><label htmlFor="card-title-preset">Title color</label>
            <select id="card-title-preset" value={Object.values(titleColors).some(color=>color===card.titleColor) ? card.titleColor : 'custom'}
              onChange={event=>{if(event.target.value!=='custom')setCard(previous=>({...previous,titleColor:event.target.value}));}}>
              {Object.entries(titleColors).map(([name,color])=><option key={name} value={color}>{name}</option>)}
              <option value="custom" disabled>Custom (use color picker)</option>
            </select></div>
          <div className={styles.field}><label htmlFor="card-title-color">Custom title color</label>
            <input id="card-title-color" type="color" value={card.titleColor}
              onChange={event=>setCard(previous=>({...previous,titleColor:event.target.value}))} /></div>
        </div>
        {!selectedTemplate.category&&<div className={styles.row}>
          <div className={styles.field}><label htmlFor="card-attribute">Attribute</label><select id="card-attribute" value={card.attribute}
            onChange={event=>setCard(previous=>({...previous,attribute:event.target.value}))}>
            {Object.keys(attributes).map(attribute=><option key={attribute}>{attribute}</option>)}</select></div>
          {card.templateId==='link' ? <div className={styles.field}><label htmlFor="card-link-rating">Link Rating</label>
            <input id="card-link-rating" type="text" readOnly value={card.linkArrows.length} /></div>
            : <div className={styles.field}><label htmlFor="card-level">{card.templateId==='xyz'?'Rank':'Level'}</label><select id="card-level" value={card.level}
              onChange={event=>setCard(previous=>({...previous,level:Number(event.target.value)}))}>
              {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></div>}
        </div>}
        <div className={styles.sectionHeader}><h2>Artwork</h2><span>02</span></div>
        <div className={styles.upload}>
          <label htmlFor="card-artwork">Choose your artwork</label>
          <input ref={upload} id="card-artwork" type="file" accept="image/png,image/jpeg" aria-describedby="artwork-help artwork-status"
            onChange={event=>{ void chooseArtwork(event.target.files?.[0]); event.target.value=''; }} />
          <p id="artwork-help">PNG or JPEG · up to 10 MB and 16 megapixels. Adjust the crop after uploading.</p>
          <p id="artwork-status" role="status">{uploading ? 'Reading artwork…' : artName || 'Your artwork stays in this browser. Nothing is uploaded.'}</p>
          {artwork && <button type="button" onClick={clearArtwork}>Remove artwork</button>}
          {artwork && <fieldset><legend>Artwork position</legend>
            <p className={styles.note}>Choose which part of the image is visible. Zoom in to make room to move in both directions.</p>
            {([{id:'artX',label:'Horizontal crop',min:0,max:1,step:0.01},
              {id:'artY',label:'Vertical crop',min:0,max:1,step:0.01},
              {id:'artZoom',label:'Artwork zoom',min:1,max:4,step:0.01}] as const).map(control=><div className={styles.field} key={control.id}>
                <label htmlFor={control.id}>{control.label}: {Math.round(card[control.id]*100)}%</label>
                <input id={control.id} type="range" min={control.min} max={control.max} step={control.step} value={card[control.id]}
                  onChange={event=>setCard(previous=>({...previous,[control.id]:Number(event.target.value)}))} />
              </div>)}
            <button type="button" onClick={()=>setCard(previous=>({...previous,artX:0.5,artY:0.5,artZoom:1}))}>Reset artwork position</button>
          </fieldset>}
          {uploadError && <p className={styles.error} role="alert">{uploadError}</p>}
        </div>
        <div className={styles.sectionHeader}><h2>The details</h2><span>03</span></div>
        {selectedTemplate.cardTypes ? <div className={styles.field}><label htmlFor="card-spell-trap-type">{selectedTemplate.label} type</label>
          <select id="card-spell-trap-type" value={card.spellTrapType} onChange={event=>{
            const option=selectedTemplate.cardTypes?.find(item=>item.key===event.target.value);
            if(option)setCard(previous=>({...previous,spellTrapType:option.key}));
          }}>{selectedTemplate.cardTypes.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}</select>
          {issues.spellTrapType&&<span className={styles.error}>{issues.spellTrapType}</span>}
        </div> : textControl('monster_type')}
        {card.templateId!=='normal' && !selectedTemplate.category && <p className={styles.note}>The type line adds / {selectedTemplate.typeSuffix} automatically.</p>}
        {selectedTemplate.materialsRegion && <div className={styles.field}>
          <label htmlFor="card-summon-materials">{card.templateId==='fusion' ? 'Fusion materials' : card.templateId==='synchro' ? 'Synchro materials' : card.templateId==='link' ? 'Link materials' : 'Xyz materials'}</label>
          <input id="card-summon-materials" type="text" maxLength={200} value={card.summon_materials}
            aria-invalid={Boolean(issues.summon_materials)} onChange={event=>setCard(previous=>({...previous,summon_materials:event.target.value}))} />
          {issues.summon_materials && <span className={styles.error}>{issues.summon_materials}</span>}
        </div>}
        {selectedTemplate.arrows && <fieldset><legend>Link Arrows</legend>
          <p className={styles.note}>The Link Rating is calculated from the number of selected arrows.</p>
          <div className={styles.row}>{selectedTemplate.arrows.map(arrow=><label className={styles.checkbox} key={arrow.key}>
            <input type="checkbox" checked={card.linkArrows.includes(arrow.key)} onChange={event=>setCard(previous=>{
              const linkArrows=event.target.checked ? [...previous.linkArrows,arrow.key] : previous.linkArrows.filter(key=>key!==arrow.key);
              return {...previous,linkArrows};
            })} />{arrow.label}</label>)}</div>
          {issues.linkArrows && <span className={styles.error}>{issues.linkArrows}</span>}
        </fieldset>}
        {textControl('lore')}
        {!selectedTemplate.category&&<div className={styles.row}>{textControl('attack')}{card.templateId!=='link'&&textControl('defense')}</div>}
        <details className={styles.optional}><summary>Edition & finishing details</summary>
          {(['set_id','serial'] as const).map(textControl)}
          <div className={styles.field}><label htmlFor="card-edition">Edition</label>
            <select id="card-edition" value={card.edition} onChange={event=>change('edition',event.target.value)}>
              {editions.map(edition=><option key={edition} value={edition}>{edition || 'None'}</option>)}
            </select>
            {issues.edition && <span className={styles.error}>{issues.edition}</span>}
          </div>
          {textControl('credit')}
          <p className={styles.note}>Credit includes a copyright symbol automatically.</p>
          <div className={styles.field}><label htmlFor="card-edition-position">Edition position</label>
            <select id="card-edition-position" value={card.editionPosition}
              onChange={event=>{const value=event.target.value;if(value==='bottom'||value==='set-line')setCard(previous=>({...previous,editionPosition:value}));}}>
              <option value="bottom">Bottom (beside serial number)</option>
              <option value="set-line">Below artwork (same line as set ID)</option>
            </select></div>
          <div className={styles.field}><label htmlFor="card-sticker">Corner sticker</label>
            <select id="card-sticker" value={card.sticker ? card.stickerColor : 'none'}
              onChange={event=>{const value=event.target.value;setCard(previous=>({...previous,sticker:value!=='none',stickerColor:value==='gold'?'gold':'silver'}));}}>
              <option value="none">None</option><option value="silver">Silver</option><option value="gold">Gold</option>
            </select></div>
        </details>
        <button className={styles.reset} type="button" onClick={()=>{setCard({...defaults});clearArtwork();setOverlay(false);}}>Reset card</button>
      </section>
      <section className={styles.preview} aria-label="Card preview">
        <div className={styles.previewHeader}><h2>Live preview</h2><span>{selectedTemplate.label}</span></div>
        <div className={styles.stage}>
          <canvas ref={canvas} width={813} height={1185} aria-label={selectedTemplate.category
            ? `${card.name || 'Untitled'} ${selectedTemplate.label} preview. ${card.spellTrapType} type.`
            : `${card.name || 'Untitled'} ${selectedTemplate.label} card preview. ${card.attribute}, ${card.templateId==='link'?`Link Rating ${card.linkArrows.length}`:`${card.templateId==='xyz'?'rank':'level'} ${card.level}`}. ATK ${card.attack}${card.templateId==='link'?'':`, DEF ${card.defense}`}.`}>
            Your browser needs Canvas support to display the card preview.
          </canvas>
          {!images && !failure && <p className={styles.loading} role="status">Loading card graphics…</p>}
        </div>
        {failure && <div role="alert" className={styles.error}><p>{failure}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Retry preview</button></div>}
        <p role="status" className={styles.previewStatus}>{Object.keys(issues).length ? 'Some text does not fit or needs correction. Check the highlighted fields.' : images ? 'Preview is up to date.' : ''}</p>
        <label className={styles.checkbox}><input type="checkbox" checked={overlay} onChange={event=>setOverlay(event.target.checked)} />Show layout guides</label>
        <details className={styles.optional}><summary>Card fonts</summary>
          <p className={styles.note} role="status">{fontBusy?'Loading fonts…':fontStatus}</p>
          {card.templateId!=='normal' && <p className={styles.note}>{fonts.effect ? 'Card text: bundled Matrix Book.' : 'Card text is temporarily using a substitute.'}</p>}
          <p className={styles.note}>Fonts load from this site automatically. Layout remains an approximation where the PSD used unavailable font weights or Photoshop-only rendering.</p>
        </details>
        <div className={styles.field}><label htmlFor="card-bleed">Print bleed</label>
          <select id="card-bleed" value={bleed} onChange={event=>setBleed(Number(event.target.value) as Bleed)}>
            <option value={0}>None — 59 × 86 mm</option><option value={1}>1 mm per edge — 61 × 88 mm</option><option value={2}>2 mm per edge — 63 × 90 mm</option>
          </select></div>
        <p className={styles.note}>{geometry.width} × {geometry.height} pixels · 300 PPI. Trim size: 59 × 86 mm.</p>
        {bleed>0&&<p className={styles.note}>Bleed repeats the outer border’s edge pixels; it is not original extended artwork and may show streaks. Card contents stay the same size.</p>}
        <button type="button" disabled={!images||!!failure||uploading||fontBusy||exportBusy||Object.keys(issues).length>0} onClick={()=>void download()}>{exportBusy?'Preparing PNG…':'Download PNG'}</button>
        <p className={styles.note} role="status">{exportStatus}</p>
        <p className={styles.note}>Print at the stated size without “fit to page.” PNG includes a 300 PPI density hint, but printer software may ignore it. Layout guides are excluded from downloads.</p>
      </section>
    </div>
  </div>;
}
