import {openSync} from 'fontkit';
import {writeFileSync} from 'node:fs';
// Outline the licensed self-hosted font so the portable SVG needs no font fetch.
const font=openSync('node_modules/@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff');
const run=font.layout('folio');let x=0;const paths=[];
for(let i=0;i<run.glyphs.length;i++){
 const pos=run.positions[i];paths.push(`<path d="${run.glyphs[i].path.toSVG()}" transform="translate(${x+pos.xOffset},${pos.yOffset})"/>`);x+=pos.xAdvance;
}
const glyphs=paths.join('');
for(const mono of [false,true])writeFileSync(`public/brand/folio-wordmark${mono?'-mono':''}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 48" role="img" aria-label="Folio"><g transform="translate(0,8)"><rect width="32" height="32" rx="8" fill="${mono?'#111111':'#163300'}"/><path d="M9 7h17l-3 6H15l-1 3h9l-3 6h-8l-1 4H5z" fill="${mono?'#ffffff':'#9FE870'}"/></g><g fill="${mono?'#111111':'#163300'}" transform="translate(41,37) scale(0.021,-0.021)">${glyphs}</g></svg>\n`);
