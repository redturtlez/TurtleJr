// Explicit semantic variants over the reviewed standard monster layout.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
for(const [kind,recipeFile] of [['effect','effect-monster'],['fusion','fusion-monster'],['ritual','ritual-monster'],['synchro','synchro-monster'],['xyz','xyz-monster'],['link','link-monster'],['spell','spell-card'],['trap','trap-card']]){
  const recipe=JSON.parse(fs.readFileSync(path.resolve(root,`../psd-extractor/recipes/${recipeFile}.json`),'utf8'));
  const raw=path.resolve(root,`../psd-extractor/output/${recipe.sourceSha256}-extract-1.24.0-v2`);
  const inventory=JSON.parse(fs.readFileSync(path.join(raw,'manifest.json'),'utf8'));
  const layer=inventory.layers.find(l=>l.id===recipe.frame.id);
  const sourceText=inventory.layers.find(l=>JSON.stringify(l.index_path)===JSON.stringify(recipe.description.sourcePath));
  if(!layer || layer.name!==recipe.frame.name || JSON.stringify(layer.index_path)!==JSON.stringify(recipe.frame.path)
    || !sourceText || sourceText.name!==recipe.description.name || !sourceText.fonts.includes(recipe.description.font))throw Error(`${kind} source evidence mismatch`);
  const bytes=fs.readFileSync(path.join(raw,'assets',`${layer.id}.png`));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==recipe.frame.sha256)throw Error(`${kind} checksum mismatch`);
  const asset={url:`/card-creator/normal/${layer.id}.png`,bounds:layer.bounds,z:layer.traversal_index,opacity:layer.opacity/255,sha256:recipe.frame.sha256};
  const dest=path.join(root,'public',asset.url);
  if(fs.existsSync(dest)){if(!fs.readFileSync(dest).equals(bytes))throw Error('Refusing changed asset overwrite');}
  else fs.writeFileSync(dest,bytes,{flag:'wx'});
  const extraAssets={};
  if(recipe.rank){
    if(recipe.rank.layerIds.length!==12)throw Error('xyz rank inventory mismatch');
    for(const [index,id] of recipe.rank.layerIds.entries()){
      const rankLayer=inventory.layers.find(l=>l.id===id);
      if(!rankLayer || JSON.stringify(rankLayer.index_path)!==JSON.stringify([...recipe.rank.groupPath,index]))throw Error('xyz rank path mismatch');
      const rankBytes=fs.readFileSync(path.join(raw,'assets',`${id}.png`));
      if(crypto.createHash('sha256').update(rankBytes).digest('hex')!==recipe.rank.assetSha256)throw Error('xyz rank checksum mismatch');
      const rankAsset={url:`/card-creator/normal/${id}.png`,bounds:rankLayer.bounds,z:rankLayer.traversal_index,opacity:rankLayer.opacity/255,sha256:recipe.rank.assetSha256};
      const rankDest=path.join(root,'public',rankAsset.url);
      if(fs.existsSync(rankDest)){if(!fs.readFileSync(rankDest).equals(rankBytes))throw Error('Refusing changed rank overwrite');}
      else fs.writeFileSync(rankDest,rankBytes,{flag:'wx'});
      extraAssets[id]=rankAsset;
    }
  }
  if(recipe.link){
    for(const item of [recipe.link.label,...recipe.link.arrows]){
      const sourceLayer=inventory.layers.find(l=>l.id===item.id);
      if(!sourceLayer||JSON.stringify(sourceLayer.index_path)!==JSON.stringify(item.path))throw Error('link asset path mismatch');
      const itemBytes=fs.readFileSync(path.join(raw,'assets',`${item.id}.png`));
      if(crypto.createHash('sha256').update(itemBytes).digest('hex')!==item.sha256)throw Error('link asset checksum mismatch');
      const linked={url:`/card-creator/normal/${item.id}.png`,bounds:sourceLayer.bounds,z:sourceLayer.traversal_index,opacity:sourceLayer.opacity/255,sha256:item.sha256};
      const linkedDest=path.join(root,'public',linked.url);
      if(fs.existsSync(linkedDest)){if(!fs.readFileSync(linkedDest).equals(itemBytes))throw Error('Refusing changed link asset overwrite');}
      else fs.writeFileSync(linkedDest,itemBytes,{flag:'wx'});
      extraAssets[item.id]=linked;
    }
  }
  if(recipe.cardType){
    for(const option of recipe.cardType.options.filter(option=>option.icon)){
      const item=option.icon,sourceLayer=inventory.layers.find(l=>l.id===item.id);
      if(!sourceLayer||JSON.stringify(sourceLayer.index_path)!==JSON.stringify(item.path))throw Error(`${kind} icon path mismatch`);
      const itemBytes=fs.readFileSync(path.join(raw,'assets',`${item.id}.png`));
      if(crypto.createHash('sha256').update(itemBytes).digest('hex')!==item.sha256)throw Error(`${kind} icon checksum mismatch`);
      const icon={url:`/card-creator/normal/${item.id}.png`,bounds:sourceLayer.bounds,z:sourceLayer.traversal_index,opacity:sourceLayer.opacity/255,sha256:item.sha256};
      const iconDest=path.join(root,'public',icon.url);
      if(fs.existsSync(iconDest)){if(!fs.readFileSync(iconDest).equals(itemBytes))throw Error('Refusing changed icon overwrite');}
      else fs.writeFileSync(iconDest,itemBytes,{flag:'wx'});
      extraAssets[item.id]=icon;
    }
  }
  if(recipe.attribute){
    const item=recipe.attribute,sourceLayer=inventory.layers.find(l=>l.id===item.id);
    if(!sourceLayer||sourceLayer.name!==item.name||JSON.stringify(sourceLayer.index_path)!==JSON.stringify(item.path))throw Error(`${kind} attribute path mismatch`);
    const itemBytes=fs.readFileSync(path.join(raw,'assets',`${item.id}.png`));
    if(crypto.createHash('sha256').update(itemBytes).digest('hex')!==item.sha256)throw Error(`${kind} attribute checksum mismatch`);
    const attribute={url:`/card-creator/normal/${item.id}.png`,bounds:sourceLayer.bounds,z:sourceLayer.traversal_index,opacity:sourceLayer.opacity/255,sha256:item.sha256};
    const attributeDest=path.join(root,'public',attribute.url);
    if(fs.existsSync(attributeDest)){if(!fs.readFileSync(attributeDest).equals(itemBytes))throw Error('Refusing changed attribute overwrite');}
    else fs.writeFileSync(attributeDest,itemBytes,{flag:'wx'});
    extraAssets[item.id]=attribute;
  }
  const output={id:recipe.id,label:recipe.label,frameId:layer.id,description:recipe.description,asset,
    ...(recipe.rank?{rankIds:recipe.rank.layerIds,extraAssets}:{}),
    ...(recipe.link?{linkLabelId:recipe.link.label.id,arrows:recipe.link.arrows.map(({key,label,id})=>({key,label,id})),extraAssets}:{}),
    ...(recipe.cardType?{cardType:recipe.cardType,attributeId:recipe.attribute?.id,extraAssets}:{})};
  const target=path.join(root,`lib/card-creator/${kind}.json`);
  if(fs.existsSync(target)){if(!require('node:util').isDeepStrictEqual(JSON.parse(fs.readFileSync(target,'utf8')),output))throw Error(`${kind} manifest differs; review before replacement`);}
  else fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
  console.log(`Verified ${recipe.label} frame and typography evidence.`);
}
