// Tests and a credential-free browser harness for the real editor component.
// Uses existing local TypeScript/React packages; no installation or network calls.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const names = ['lib/card-creator/model','lib/card-creator/layout','lib/card-creator/artwork','lib/card-creator/render','lib/card-creator/anime',
  'lib/card-creator/fonts','lib/card-creator/print','lib/card-sheet/shadow-canvas','lib/card-sheet/shadow','lib/card-sheet/geometry',
  'app/card-creator/yugioh/CardEditor'];
function source(name) {
  const extension = name.endsWith('CardEditor') ? '.tsx' : '.ts';
  return ts.transpileModule(fs.readFileSync(path.join(root,name+extension),'utf8'), {
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}
  }).outputText;
}
const json = fs.readFileSync(path.join(root,'lib/card-creator/normal.json'),'utf8');
const effectJson = fs.readFileSync(path.join(root,'lib/card-creator/effect.json'),'utf8');
const fusionJson = fs.readFileSync(path.join(root,'lib/card-creator/fusion.json'),'utf8');
const ritualJson = fs.readFileSync(path.join(root,'lib/card-creator/ritual.json'),'utf8');
const synchroJson = fs.readFileSync(path.join(root,'lib/card-creator/synchro.json'),'utf8');
const xyzJson = fs.readFileSync(path.join(root,'lib/card-creator/xyz.json'),'utf8');
const linkJson = fs.readFileSync(path.join(root,'lib/card-creator/link.json'),'utf8');
const spellJson = fs.readFileSync(path.join(root,'lib/card-creator/spell.json'),'utf8');
const trapJson = fs.readFileSync(path.join(root,'lib/card-creator/trap.json'),'utf8');
const css = fs.readFileSync(path.join(root,'app/card-creator/shared/editor-shared.module.css'),'utf8');
const classes = Object.fromEntries(Array.from(css.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g),match=>[match[1],match[1]]));
const compiled = Object.fromEntries(names.map(name=>[name,source(name)]));
function localModule(name) {
  const loadedModule = {exports:{}};
  const req = relative => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(name),relative));
    if (target.endsWith('normal.json')) return JSON.parse(json);
    if (target.endsWith('effect.json')) return JSON.parse(effectJson);
    if (target.endsWith('fusion.json')) return JSON.parse(fusionJson);
    if (target.endsWith('ritual.json')) return JSON.parse(ritualJson);
    if (target.endsWith('synchro.json')) return JSON.parse(synchroJson);
    if (target.endsWith('xyz.json')) return JSON.parse(xyzJson);
    if (target.endsWith('link.json')) return JSON.parse(linkJson);
    if (target.endsWith('spell.json')) return JSON.parse(spellJson);
    if (target.endsWith('trap.json')) return JSON.parse(trapJson);
    if (/lib\/card-creator\/(token|obelisk|slifer|ra|rarity|anime)\.json$/.test(target)) return JSON.parse(fs.readFileSync(path.join(root,target),'utf8'));
    if (!compiled[target]) throw new Error('Unexpected test dependency: '+target);
    return localModule(target);
  };
  const code=compiled[name];
  if(!code)throw new Error('Unexpected test module: '+name);
  new Function('require','module','exports',code)(req,loadedModule,loadedModule.exports);
  return loadedModule.exports;
}
if (process.argv.includes('--serve')) {
  const http = require('node:http');
  let bundle = 'const modules={};\n';
  for (const [name,code] of Object.entries(compiled)) bundle += `modules[${JSON.stringify(name)}]=(require,module,exports)=>{${code}\n};\n`;
  bundle += `const cache={};function load(name){if(cache[name])return cache[name].exports;const m={exports:{}};cache[name]=m;
    function req(p){if(p==='react')return window.React;const a=name.split('/');a.pop();for(const v of p.split('/')){if(v==='..')a.pop();else if(v!=='.')a.push(v);}const key=a.join('/');
    if(key.endsWith('normal.json'))return ${json};if(key.endsWith('effect.json'))return ${effectJson};if(key.endsWith('fusion.json'))return ${fusionJson};if(key.endsWith('ritual.json'))return ${ritualJson};if(key.endsWith('synchro.json'))return ${synchroJson};if(key.endsWith('xyz.json'))return ${xyzJson};if(key.endsWith('link.json'))return ${linkJson};if(key.endsWith('spell.json'))return ${spellJson};if(key.endsWith('trap.json'))return ${trapJson};${['token','obelisk','slifer','ra','rarity','anime'].map(n=>`if(key.endsWith('/${n}.json'))return ${fs.readFileSync(path.join(root,`lib/card-creator/${n}.json`),'utf8')};`).join('')}if(key.endsWith('editor-shared.module.css'))return {__esModule:true,default:${JSON.stringify(classes)}};return load(key);}
    modules[name](req,m,m.exports);return m.exports;}
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(load('app/card-creator/yugioh/CardEditor').default));`;
  const server = http.createServer((req,res)=>{
    const url = new URL(req.url ?? '/','http://127.0.0.1');
    if (url.pathname==='/') {
      res.setHeader('Content-Type','text/html');
      res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Card creator local verification</title><link rel="stylesheet" href="/styles.css"><style>*{box-sizing:border-box}body{margin:0;background:#191c1d;font-family:system-ui}#root{height:100dvh;display:flex}button,input,select,textarea{font:inherit}button{background:transparent;color:inherit}</style><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/bundle.js"></script>');
    } else if (url.pathname==='/bundle.js') { res.setHeader('Content-Type','text/javascript');res.end(bundle); }
    else if(url.pathname==='/styles.css') {res.setHeader('Content-Type','text/css');res.end(css);}
    else if(['/react.js','/react-dom.js'].includes(url.pathname)) {
      const file = url.pathname==='/react.js' ? 'react/umd/react.development.js' : 'react-dom/umd/react-dom.development.js';
      res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'node_modules',file)));
    } else if(/^\/card-creator\/normal\/layer-[a-f0-9]{24}\.png$/.test(url.pathname)) {
      const file=path.join(root,'public',url.pathname);
      if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(file));
    } else if(/^\/card-creator\/fonts\/[a-z-]+\.ttf$/.test(url.pathname)) {
      const file=path.join(root,'public',url.pathname);
      if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type','font/ttf');res.end(fs.readFileSync(file));
    } else {res.writeHead(404);res.end();}
  });
  server.listen(4173,'127.0.0.1',()=>console.log('Credential-free editor preview: http://127.0.0.1:4173'));
} else {
  const {test} = require('node:test');
  const assert = require('node:assert/strict');
  const {defaults,validateCard,graphics,assets,fields,layoutFields,fieldText,typeText,formattedTypeText,templates,template,attributeNames,NO_ATTRIBUTE,isTemplateId,rarities,rarityFoils,animeSupported,isAnime,animeParts} = localModule('lib/card-creator/model');
  const plain={...defaults,sticker:false,stickerColor:'silver',editionPosition:'bottom'}; // defaults now ship with a gold sticker and set-line edition
  const {fontStyle} = localModule('lib/card-creator/fonts');
  test('Effect swaps only the frame, uses upright text and adds one type suffix',()=>{
    const effect={...defaults,templateId:'effect'};
    const normalAssets=graphics(defaults),effectAssets=graphics(effect);
    assert.equal(normalAssets.length,effectAssets.length);
    assert.equal(normalAssets.filter(a=>!effectAssets.some(b=>a.url===b.url)).length,1);
    assert.ok(effectAssets.includes(assets[templates.effect.frameId]));
    assert.ok(!effectAssets.includes(assets[templates.normal.frameId]));
    assert.equal(typeText(effect),'WARRIOR / EFFECT');
    assert.equal(typeText({...effect,monster_type:'WARRIOR / EFFECT'}),'WARRIOR / EFFECT');
    assert.equal(typeText(defaults),'WARRIOR');
    assert.equal(formattedTypeText(defaults),'[WARRIOR]');
    assert.deepEqual(fontStyle('lore',{effect:'MatrixBook'},'effect'),{family:'"MatrixBook"',prefix:''});
    assert.deepEqual(layoutFields(effect),layoutFields(defaults));
    assert.ok(validateCard({...defaults,templateId:'unknown'}).templateId);
  });
  test('Fusion has a distinct frame, materials region and complete type suffix',()=>{
    const fusion={...defaults,templateId:'fusion',summon_materials:'1 Dragon monster + 1 Spellcaster monster'};
    const selected=graphics(fusion);
    assert.ok(selected.includes(assets[templates.fusion.frameId]));
    assert.ok(!selected.includes(assets[templates.normal.frameId]));
    assert.equal(typeText(fusion),'WARRIOR / FUSION / EFFECT');
    assert.deepEqual(templates.fusion.materialsRegion,[65,924,748,955]);
    assert.deepEqual(templates.fusion.effectRegion,[65,956,748,1075]);
    assert.ok(validateCard({...fusion,summon_materials:'x'.repeat(201)}).summon_materials);
    assert.ok(!validateCard(fusion).summon_materials);
  });
  test('Ritual uses its blue frame and Matrix effect typography',()=>{
    const ritual={...defaults,templateId:'ritual'};
    const selected=graphics(ritual);
    assert.ok(selected.includes(assets[templates.ritual.frameId]));
    assert.ok(!selected.includes(assets[templates.normal.frameId]));
    assert.equal(typeText(ritual),'WARRIOR / RITUAL / EFFECT');
    assert.equal(templates.ritual.description,'effect');
    assert.equal(templates.ritual.maxSize,25);
    assert.equal(templates.ritual.materialsRegion,undefined);
  });
  test('Token, Obelisk, Slifer and Ra use their own frames over the standard monster layout',()=>{
    const frames=new Set();
    for(const {id,suffix} of [{id:'token',suffix:'TOKEN'},{id:'obelisk',suffix:'EFFECT'},{id:'slifer',suffix:'EFFECT'},{id:'ra',suffix:'EFFECT'}]){
      const card={...defaults,templateId:id};
      const selected=graphics(card);
      assert.ok(selected.includes(assets[templates[id].frameId]),id);
      assert.ok(!selected.includes(assets[templates.normal.frameId]),id);
      assert.equal(templates[id].description,'effect');
      assert.equal(templates[id].typeSuffix,suffix);
      assert.equal(typeText(card),`WARRIOR / ${suffix}`);
      assert.deepEqual(validateCard(card),{});
      assert.ok(fs.existsSync(path.join(root,'public',assets[templates[id].frameId].url)),id);
      frames.add(templates[id].frameId);
    }
    assert.equal(frames.size,4);
    assert.ok(isTemplateId('token')&&isTemplateId('ra')&&!isTemplateId('constructor'));
  });
  test('Attribute None is offered last, is not the default, and draws no attribute symbol in either style',()=>{
    assert.equal(NO_ATTRIBUTE,'None');
    assert.equal(attributeNames[attributeNames.length-1],'None');
    assert.ok(['Fire','Water','Earth','Wind','Dark','Divine','Light'].every(name=>attributeNames.includes(name)));
    assert.notEqual(defaults.attribute,'None');
    for(const style of ['tcg','anime']){
      for(const templateId of ['normal','effect','xyz','link']){
        const card={...defaults,style,templateId,attribute:'None'};
        assert.ok(!validateCard(card).attribute,`${style} ${templateId}`);
        const withAttr=style==='anime'?animeParts({...card,attribute:'Dark'}).symbol:graphics({...card,attribute:'Dark'}).find(a=>a.url===assets[JSON.parse(JSON.stringify(localModule('lib/card-creator/model').template)).attributes.Dark].url);
        assert.ok(withAttr,`${style} ${templateId} has an attribute symbol when one is chosen`);
        if(style==='anime')assert.equal(animeParts(card).symbol,undefined,`${templateId} anime None`);
        else assert.ok(!graphics(card).some(a=>a===withAttr),`${templateId} tcg None`);
      }
    }
    assert.ok(validateCard({...defaults,attribute:'Plasma'}).attribute);
  });
  test('Rarity offers None, Secret, Mosaic and Shatterfoil with the right foil layers',()=>{
    assert.deepEqual(rarities.map(option=>option.key),['none','secret','mosaic','shatter']);
    assert.equal(defaults.rarity,'none');
    const foils=key=>rarityFoils({...defaults,rarity:key});
    assert.deepEqual(foils('none'),{picture:undefined,card:undefined});
    assert.ok(foils('secret').picture&&!foils('secret').card);
    assert.ok(foils('mosaic').picture&&foils('mosaic').card);
    assert.ok(!foils('shatter').picture&&foils('shatter').card);
    assert.equal(foils('mosaic').picture,foils('secret').picture);
    assert.notEqual(foils('mosaic').card,foils('shatter').card);
    assert.ok(!validateCard({...defaults,rarity:'mosaic'}).rarity);
    assert.ok(validateCard({...defaults,rarity:'ultra'}).rarity);
    // Foils are drawn by the renderer, never added to the template graphics.
    const base=graphics(defaults).map(a=>a.url);
    assert.deepEqual(graphics({...defaults,rarity:'mosaic'}).map(a=>a.url),base);
  });
  test('Anime style applies only where a frame exists and draws only artwork, attribute, level and stats',()=>{
    const {animeStarPositions}=localModule('lib/card-creator/anime');
    const {requiredGraphicUrls}=localModule('lib/card-creator/render');
    for(const id of ['normal','effect','ritual','fusion','synchro','xyz','token','link','spell','trap'])assert.ok(animeSupported(id),id);
    for(const id of ['obelisk','slifer','ra'])assert.ok(!animeSupported(id),id);
    assert.ok(!isAnime({...defaults,style:'tcg'}));
    assert.ok(isAnime({...defaults,style:'anime',templateId:'effect'}));
    assert.ok(!isAnime({...defaults,style:'anime',templateId:'ra'}));
    assert.equal(animeParts({...defaults,style:'tcg'}),null);
    const effect=animeParts({...defaults,style:'anime',templateId:'effect',level:7,sticker:false});
    // The anime frame is the whole card: no separate border, and no corner sticker even when one is selected.
    assert.ok(effect.frame&&effect.symbol&&effect.star&&effect.markers.length===0);
    assert.equal(effect.border,undefined);
    assert.equal(effect.sticker,undefined);
    assert.equal(animeParts({...defaults,style:'anime',templateId:'effect',sticker:true,stickerColor:'gold'}).sticker,undefined);
    const link=animeParts({...defaults,style:'anime',templateId:'link',linkArrows:['up','down-left','right']});
    assert.deepEqual(link.markers.map(m=>m.key).sort(),['down-left','right','up']);
    assert.equal(link.star,undefined);
    const spell=animeParts({...defaults,style:'anime',templateId:'spell'});
    assert.ok(spell.symbol&&!spell.star);
    // Hidden text must not block a download.
    const longName='x'.repeat(500);
    assert.ok(validateCard({...defaults,name:longName}).name);
    assert.ok(!validateCard({...defaults,name:longName,style:'anime',templateId:'effect'}).name);
    assert.ok(validateCard({...defaults,attack:'abc',style:'anime',templateId:'effect'}).attack);
    assert.ok(validateCard({...defaults,style:'cartoon'}).style);
    // Only anime frames load for an anime card, never the TCG frame.
    const urls=requiredGraphicUrls({...defaults,style:'anime',templateId:'effect'});
    assert.ok(urls.includes(effect.frame.url)&&!urls.includes(assets[templates.effect.frameId].url));
    // No TCG border or sticker image is requested for anime, but a TCG card still needs them.
    const borderUrl=assets[template.fixed.find(item=>item.role==='border').layer_id].url;
    assert.ok(!urls.includes(borderUrl));
    assert.ok(!requiredGraphicUrls({...defaults,style:'anime',templateId:'effect',sticker:true}).some(url=>/b10ffa23|goldsticker/i.test(url)));
    assert.ok(requiredGraphicUrls({...defaults,style:'tcg'}).includes(borderUrl));
    // Stars run right to left, stay inside the frame and never exceed 12.
    for(const level of [1,4,10,11,12]){
      const xs=animeStarPositions(level);
      assert.equal(xs.length,level);
      assert.deepEqual(xs,[...xs].sort((a,b)=>b-a));
      assert.ok(Math.min(...xs)>=0&&Math.max(...xs)+28<=421,String(level));
    }
    assert.equal(animeStarPositions(0).length,0);
    assert.equal(animeStarPositions(99).length,12);
  });
  test('Synchro uses its white frame and shared materials contract',()=>{
    const synchro={...defaults,templateId:'synchro',summon_materials:'1 Tuner + 1+ non-Tuner monsters'};
    const selected=graphics(synchro);
    assert.ok(selected.includes(assets[templates.synchro.frameId]));
    assert.ok(!selected.includes(assets[templates.normal.frameId]));
    assert.equal(typeText(synchro),'WARRIOR / SYNCHRO / EFFECT');
    assert.deepEqual(templates.synchro.materialsRegion,[65,924,748,955]);
    assert.deepEqual(templates.synchro.effectRegion,[65,956,748,1075]);
    assert.equal(templates.synchro.maxSize,21);
  });
  test('Xyz replaces right-aligned Levels with left-aligned Ranks',()=>{
    const xyz={...defaults,templateId:'xyz',level:4,summon_materials:'2 Level 4 monsters'};
    const selected=graphics(xyz),rankIds=templates.xyz.rankIds;
    assert.equal(rankIds.length,12);
    assert.ok(selected.includes(assets[templates.xyz.frameId]));
    assert.equal(typeText(xyz),'WARRIOR / XYZ / EFFECT');
    assert.deepEqual(selected.filter(asset=>rankIds.some(id=>assets[id]===asset)).map(asset=>asset.bounds[0]),[83,137,191,245]);
    assert.ok(!selected.includes(assets[templates.normal.frameId]));
    assert.deepEqual(templates.xyz.materialsRegion,[65,924,748,955]);
  });
  test('Link derives its rating from selected arrows and omits level graphics',()=>{
    const link={...defaults,templateId:'link',linkArrows:['up','left','right']};
    const selected=graphics(link),spec=templates.link;
    assert.ok(selected.includes(assets[spec.frameId]));
    assert.ok(selected.includes(assets[spec.linkLabelId]));
    assert.equal(typeText(link),'WARRIOR / LINK / EFFECT');
    assert.equal(selected.filter(asset=>spec.arrows.some(arrow=>assets[arrow.id]===asset)).length,3);
    assert.ok(spec.arrows.filter(arrow=>link.linkArrows.includes(arrow.key)).every(arrow=>selected.includes(assets[arrow.id])));
    assert.equal(spec.hideLevels,true);
    assert.ok(validateCard({...link,linkArrows:[]}).linkArrows);
    assert.ok(validateCard({...link,linkArrows:['up','up']}).linkArrows);
    assert.ok(!validateCard({...link,level:0,defense:'invalid'}).level);
    assert.ok(!validateCard({...link,level:0,defense:'invalid'}).defense);
  });
  test('Spell and Trap use their own frames, type labels and valid subtype icons',()=>{
    const spell={...plain,templateId:'spell',spellTrapType:'quick-play',level:0,attack:'invalid',defense:'invalid'};
    const trap={...plain,templateId:'trap',spellTrapType:'counter'};
    for(const [card,label] of [[spell,'SPELL CARD'],[trap,'TRAP CARD']]){
      const spec=templates[card.templateId],selected=graphics(card);
      assert.ok(selected.includes(assets[spec.frameId]));
      assert.equal(typeText(card).trimEnd(),label);
      assert.equal(formattedTypeText({...card,spellTrapType:'normal'}),`[${label}]`);
      assert.equal(formattedTypeText(card).startsWith(`[${label}`),true);
      assert.equal(formattedTypeText(card).endsWith(']'),true);
      assert.ok(selected.includes(assets[spec.attributeId]));
      assert.equal(selected.filter(asset=>spec.cardTypes.some(option=>option.icon&&assets[option.icon.id]===asset)).length,1);
      assert.ok(!validateCard(card).level);assert.ok(!validateCard(card).attack);assert.ok(!validateCard(card).defense);
      assert.deepEqual(layoutFields(card).filter(field=>['attack','defense'].includes(field.id)),[]);
    }
    assert.deepEqual(templates.spell.cardTypes.map(option=>option.key),['normal','continuous','equip','field','quick-play','ritual']);
    assert.deepEqual(templates.trap.cardTypes.map(option=>option.key),['normal','continuous','counter']);
    assert.ok(validateCard({...spell,spellTrapType:'counter'}).spellTrapType);
    assert.ok(validateCard({...trap,spellTrapType:'equip'}).spellTrapType);
    assert.equal(graphics({...spell,spellTrapType:'normal'}).length,3);
    assert.equal(templates.spell.maxSize,29.46431);assert.equal(templates.spell.typeMaxSize,40);
  });
  test('stats and footer use distinct font families; copyright appears once',()=>{
    const fonts={name:'Matrix',footer:'Stone'};
    for(const id of ['attack','defense'])assert.deepEqual(fontStyle(id,fonts),{family:'"Matrix"',prefix:'700 '});
    for(const id of ['serial','set_id','credit'])assert.deepEqual(fontStyle(id,fonts),{family:'"Times New Roman", serif',prefix:'400 '});
    assert.deepEqual(fontStyle('edition',fonts),{family:'"Stone"',prefix:'600 '});
    for(const [value,expected] of [['Creator','©CREATOR'],[' Creator','© CREATOR'],['© Creator','© CREATOR'],[' © © Creator ','© CREATOR'],['©Creator','©CREATOR'],['  ','']])assert.equal(fieldText('credit',value),expected);
    assert.equal(fieldText('monster_type','beast-warrior'),'[BEAST-WARRIOR]');
    assert.deepEqual(fontStyle('lore',{lore:'StoneItalic'}),{family:'"StoneItalic"',prefix:'italic '});
    assert.equal(fieldText('credit',' '),'');
  });
  test('licensed bundled card fonts are present and checksum pinned',()=>{
    const expected={
      'matrix-book.ttf':'56e0b4c323c0c0d343f53bb46e9d2aaefd21410cd7d6565e635359b7e50ea0a9',
      'matrix-regular-small-caps.ttf':'e342f533d0fdd6a52946819d1a07a0c8eb98ba3e41732ff574d7afcde95ffe7c',
      'stone-serif-italic.ttf':'432d2e9d936f3a77ac18cff25521f1de81077a1c3510218821bafcb81802411c',
      'stone-serif-semibold.ttf':'16d9d7b1318689c2a4a07e84190656c63cad7789f1738d9ed6bd213a6a6436f5',
      'stone-serif-small-caps-bold.ttf':'bfeba9dacb92f6e2caf1203ddccb4e3cf7cdd3aaf2f8787c6f2e532e2dee8fd3',
    };
    for(const [name,hash] of Object.entries(expected)){
      const bytes=fs.readFileSync(path.join(root,'public/card-creator/fonts',name));
      assert.equal(bytes.readUInt32BE(0),0x00010000);assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),hash);
    }
  });
  test('edition can share set line without changing other fields or source layout',()=>{
    const upper=layoutFields({...plain,editionPosition:'set-line'});
    const edition=upper.find(f=>f.id==='edition'),set=upper.find(f=>f.id==='set_id');
    assert.equal(edition.bounds[1],set.bounds[1]);assert.equal(edition.bounds[3],set.bounds[3]);
    assert.ok(edition.bounds[2]<set.bounds[0]);
    assert.deepEqual(upper.filter(f=>!['edition','credit'].includes(f.id)),fields.filter(f=>!['edition','credit'].includes(f.id)));
    const stickered=layoutFields({...plain,sticker:true});
    assert.deepEqual(stickered.filter(f=>f.id!=='credit'),fields.filter(f=>f.id!=='credit'));
    // Credit starts after the edition field (ends at 365) for extra width; the sticker keeps the original right edge.
    const edField=fields.find(f=>f.id==='edition');
    assert.deepEqual(stickered.find(f=>f.id==='credit').bounds,[380,fields.find(f=>f.id==='credit').bounds[1],fields.find(f=>f.id==='credit').bounds[2],fields.find(f=>f.id==='credit').bounds[3]]);
    assert.ok(stickered.find(f=>f.id==='credit').bounds[0]>edField.bounds[2]);
    assert.equal(layoutFields(plain).find(f=>f.id==='credit').bounds[0],380);
    assert.equal(layoutFields(plain).find(f=>f.id==='credit').bounds[2],785);
    const gold=graphics({...plain,sticker:true,stickerColor:'gold'}),silver=graphics({...plain,sticker:true});
    assert.equal(gold.length,silver.length);assert.notDeepEqual(gold,silver);
    assert.ok(validateCard({...plain,editionPosition:'invalid'}).editionPosition);
    assert.ok(validateCard({...plain,titleColor:'red; invalid'}).titleColor);
    assert.ok(!validateCard({...defaults,titleColor:'#aAbB09'}).titleColor);
  });
  const {wrapText,coverCrop} = localModule('lib/card-creator/layout');
  const {inspectImage,checkDimensions} = localModule('lib/card-creator/artwork');
  const {DIGITAL_CORNER_RADIUS_MM,digitalCornerRadiusPixels,printGeometry,pngWithPrintDensity} = localModule('lib/card-creator/print');
  test('print dimensions derive from millimetres; trim size is constant',()=>{
    for(const [bleed,width,height] of [[0,697,1016],[1,720,1039],[2,744,1063]]) {
      const g=printGeometry(bleed);assert.equal(g.width,width);assert.equal(g.height,height);
      assert.equal(g.trimWidth,697);assert.equal(g.trimHeight,1016);
      assert.ok(Math.abs((g.width-g.trimWidth)-g.left*2)<=1);
    }
    assert.throws(()=>printGeometry(3));
    assert.equal(DIGITAL_CORNER_RADIUS_MM,1);assert.equal(digitalCornerRadiusPixels(),12);
  });
  test('PNG gets one explicit 300 PPI physical-density chunk',()=>{
    const asset=Object.values(assets)[0];
    const bytes=fs.readFileSync(path.join(root,'public',asset.url));
    const output=pngWithPrintDensity(pngWithPrintDensity(bytes));
    let offset=8,count=0;
    while(offset+12<=output.length){const b=Buffer.from(output);const len=b.readUInt32BE(offset),kind=b.toString('ascii',offset+4,offset+8);
      if(kind==='pHYs'){count++;assert.equal(b.readUInt32BE(offset+8),11811);assert.equal(b.readUInt32BE(offset+12),11811);assert.equal(b[offset+16],1);}
      offset+=len+12;
    }
    assert.equal(count,1);assert.deepEqual(inspectImage(output),inspectImage(bytes));
    assert.throws(()=>pngWithPrintDensity(bytes.subarray(0,40)));
  });
  test('public route has no login guard; existing protected routes preserved',()=>{
    const page=fs.readFileSync(path.join(root,'app/card-creator/page.tsx'),'utf8');
    assert.doesNotMatch(page,/auth\(|auth\.protect|redirect\(|SignedIn/);
    const yugioh=fs.readFileSync(path.join(root,'app/card-creator/yugioh/page.tsx'),'utf8');
    const pokemon=fs.readFileSync(path.join(root,'app/card-creator/pokemon/page.tsx'),'utf8');
    assert.doesNotMatch(yugioh+pokemon,/auth\(|auth\.protect|redirect\(|SignedIn/);
    const proxy=fs.readFileSync(path.join(root,'proxy.ts'),'utf8');
    assert.match(proxy,/"\/todo\(\.\*\)"/);
    assert.match(proxy,/"\/budget\(\.\*\)"/);
    assert.match(proxy,/"\/health\(\.\*\)"/);
    assert.doesNotMatch(proxy,/"\/card-creator/);
  });
  test('card values and extreme levels are validated',()=>{
    assert.deepEqual(validateCard(defaults),{});
    for(const level of [0,13,1.5])assert.ok(validateCard({...defaults,level}).level);
    assert.ok(validateCard({...defaults,attack:'-1'}).attack);
    assert.ok(validateCard({...defaults,serial:'abcdefgh'}).serial);
    assert.ok(validateCard({...defaults,name:'x'.repeat(81)}).name);
    assert.ok(validateCard({...defaults,attribute:'Spell'}).attribute);
    assert.ok(!validateCard({...defaults,attack:'?'}).attack);
  });
  test('graphics are ordered and exclude private dynamic text/artwork',()=>{
    assert.equal(Object.keys(assets).length,88);
    const selected=graphics({...defaults,level:12,sticker:true});
    assert.equal(selected.length,19);
    assert.deepEqual(selected.map(a=>a.z),selected.map(a=>a.z).sort((a,b)=>a-b));
    assert.equal(fields.length,9);
    for(const asset of Object.values(assets)) {
      const bytes=fs.readFileSync(path.join(root,'public',asset.url));
      assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),asset.sha256);
      assert.deepEqual(inspectImage(bytes),{type:'image/png',width:asset.bounds[2]-asset.bounds[0],height:asset.bounds[3]-asset.bounds[1]});
    }
  });
  test('cover crop preserves shape and centers wide and tall artwork',()=>{
    assert.deepEqual(coverCrop(400,200,100,100),[100,0,200,200]);
    assert.deepEqual(coverCrop(200,400,100,100),[0,100,200,200]);
    assert.deepEqual(coverCrop(400,200,100,100,1,0,2),[300,0,100,100]);
    assert.deepEqual(coverCrop(400,200,100,100,0,1,2),[0,100,100,100]);
    for(const [x,y,z] of [[NaN,0,1],[0,-1,1],[0,0,0],[0,0,5]])assert.throws(()=>coverCrop(400,200,100,100,x,y,z));
    assert.ok(validateCard({...defaults,artZoom:5}).artwork);
  });
  test('wrapping retains long tokens and explicit paragraph breaks',()=>{
    assert.deepEqual(wrapText('one two\n\nabcdefgh',4,s=>s.length),['one','two','','abcd','efgh']);
    assert.equal(wrapText('🙂🙂🙂',2,s=>Array.from(s).length).join(''),'🙂🙂🙂');
    assert.throws(()=>wrapText('X',1,()=>2));
  });
  test('upload headers reject active content, truncated files and huge dimensions',()=>{
    for(const content of ['<svg></svg>','not an image'])assert.throws(()=>inspectImage(Buffer.from(content)));
    assert.throws(()=>inspectImage(Buffer.from([255,216,255,192,0,25])));
    assert.throws(()=>checkDimensions(8193,1));assert.throws(()=>checkDimensions(4001,4000));
    const jpeg=Buffer.from([255,216,255,192,0,11,8,0,10,0,20,1,1,0x11,0]);
    assert.deepEqual(inspectImage(jpeg),{type:'image/jpeg',width:20,height:10});
    jpeg[7]=255;jpeg[8]=255;assert.throws(()=>inspectImage(jpeg));
  });
  test('WebP headers report type and size for lossy, lossless and extended files',()=>{
    const riff=(chunk,body)=>Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.from(chunk),Buffer.alloc(4),body]);
    const lossy=riff('VP8 ',Buffer.from([0,0,0,0x9d,0x01,0x2a,20,0,10,0,0,0]));
    assert.deepEqual(inspectImage(lossy),{type:'image/webp',width:20,height:10});
    const bits=(20-1)|((10-1)<<14);
    const lossless=riff('VP8L',Buffer.from([0x2f,bits&255,(bits>>8)&255,(bits>>16)&255,(bits>>>24)&255,0,0,0,0,0,0,0]));
    assert.deepEqual(inspectImage(lossless),{type:'image/webp',width:20,height:10});
    const extended=riff('VP8X',Buffer.from([0,0,0,0,19,0,0,9,0,0,0,0]));
    assert.deepEqual(inspectImage(extended),{type:'image/webp',width:20,height:10});
    const huge=riff('VP8X',Buffer.from([0,0,0,0,0xff,0x3f,0,0xff,0x3f,0,0,0]));
    assert.throws(()=>inspectImage(huge));
    const badStart=Buffer.from(lossy);badStart[23]=0;assert.throws(()=>inspectImage(badStart));
    assert.throws(()=>inspectImage(riff('ABCD',Buffer.alloc(12))));
    assert.throws(()=>inspectImage(lossy.subarray(0,20)));
  });
}
