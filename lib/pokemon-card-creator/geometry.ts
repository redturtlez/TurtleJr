export type PokemonBleed=0|1|2;

export function pokemonPrintGeometry(bleed:PokemonBleed){
  if(![0,1,2].includes(bleed))throw new Error('Unsupported bleed size.');
  const px=(mm:number)=>Math.round(mm*300/25.4);
  const trimWidth=px(63),trimHeight=px(88);
  const width=px(63+2*bleed),height=px(88+2*bleed);
  return{trimWidth,trimHeight,width,height,left:Math.floor((width-trimWidth)/2),top:Math.floor((height-trimHeight)/2),widthMm:63+2*bleed,heightMm:88+2*bleed};
}
