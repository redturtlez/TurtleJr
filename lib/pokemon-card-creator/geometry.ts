export type PokemonBleed=0|1|2;

/**
 * How a rendered card (its frame assets are 745 x 1040 or 747 x 1038 px) maps onto the exact trim size (744 x 1039 px,
 * 62.99 x 87.97 mm at 300 PPI) with no resampling: an axis that is larger is cropped evenly (the extra 1 to 3 px are the
 * outermost frame edge), an axis that is smaller is centered and the one missing row or column is repeated from the
 * nearest edge. Copying whole pixels keeps text and outlines exactly as sharp as they were drawn.
 */
export function trimFit(sourceWidth:number,sourceHeight:number,targetWidth:number,targetHeight:number){
  for(const value of [sourceWidth,sourceHeight,targetWidth,targetHeight])if(!Number.isInteger(value)||value<1)throw new Error('Invalid image size.');
  const axis=(source:number,target:number)=>source>=target?{sourceStart:Math.floor((source-target)/2),destStart:0,length:target}:{sourceStart:0,destStart:Math.floor((target-source)/2),length:source};
  const x=axis(sourceWidth,targetWidth),y=axis(sourceHeight,targetHeight);
  return{sx:x.sourceStart,sy:y.sourceStart,dx:x.destStart,dy:y.destStart,width:x.length,height:y.length};
}

/** Physical card sizes that can be exported: the regular card and the jumbo card (measured on a real card). */
export type PokemonSize='standard'|'jumbo';
export const POKEMON_SIZES:Record<PokemonSize,{label:string;widthMm:number;heightMm:number}>={
  standard:{label:'Standard',widthMm:63,heightMm:88},
  jumbo:{label:'Jumbo',widthMm:133.4,heightMm:187},
};

export function pokemonPrintGeometry(bleed:PokemonBleed,size:PokemonSize='standard'){
  if(![0,1,2].includes(bleed))throw new Error('Unsupported bleed size.');
  const card=POKEMON_SIZES[size];
  if(!card)throw new Error('Unsupported card size.');
  const px=(mm:number)=>Math.round(mm*300/25.4);
  const round3=(value:number)=>Math.round(value*1000)/1000;
  const widthMm=round3(card.widthMm+2*bleed),heightMm=round3(card.heightMm+2*bleed);
  const trimWidth=px(card.widthMm),trimHeight=px(card.heightMm);
  const width=px(widthMm),height=px(heightMm);
  return{trimWidth,trimHeight,width,height,left:Math.floor((width-trimWidth)/2),top:Math.floor((height-trimHeight)/2),widthMm,heightMm};
}
