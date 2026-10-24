/** Release gate for all six Bio-City Arcade routes / track references / module contracts. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');let fails=[];
const assert=(x,m)=>{if(!x)fails.push(m)};
const hub=read('arcade/assets/hub.js'),games=read('arcade/assets/games-core.js'),css=read('arcade/assets/arcade-hub.css');
for(const id of ['g01','g02','g03','g04','g05','g06'])assert(hub.includes(`'${id}'`),id+' missing from lobby');
for(const id of ['g01','g03','g04','g05','g06']){assert(games.includes(`R.${id}=`),id+' lacks playable engine');}
assert(hub.includes("arcade-engine.js"),'G02 must reuse existing tested Guardian Assault');
assert(hub.includes('shooter.html'),'G02 iframe adapter path missing');
assert(!hub.includes("script.src='../../assets/arcade-engine.js"),'G02 must not dynamically reinject global engine');
assert(hub.includes("msg.type==='ready'"),'G02 parent must wait for child readiness');
for(const lang of ['zh','ja']){
 const shooter=read(`arcade/${lang}/shooter.html`);
 assert(shooter.includes('arcade-engine.js'),'G02 isolated shooter engine missing for '+lang);
 assert(shooter.includes('bio-city-shooter'),'G02 parent event relay missing for '+lang);
 assert(shooter.includes("type:'ready'"),'G02 readiness handshake missing for '+lang);
 assert(shooter.includes("dispatchEvent(new Event('change'"),'G02 selected difficulty not applied for '+lang);
 const page=read(`arcade/${lang}/index.html`);
 for(const id of ['game-list','stage','track-select','audio-drawer','stage-controls','hero-choices'])assert(page.includes(`id="${id}"`),`${lang} missing ${id}`);
 assert(page.includes('GTM-5M4KVKNX'),lang+' GTM missing');
 assert(page.includes('../assets/hub.js'),lang+' hub script missing');
 assert(read(`${lang}/play.html`).includes(`../arcade/${lang}/index.html`),`${lang} primary website lacks Arcade entrance`);
 assert(read(`content/${lang}/play.html`).includes(`../arcade/${lang}/index.html`),`${lang} canonical content lacks Arcade entrance`);
}
for(const tr of ['bio-city-awakening-theme-v2.mp3','burner-sister-summoning-theme.mp3','mj-robot-kizamu-japanese-v1.mp3','mj-robot-kizamu-japanese-v2.mp3','your-body-is-a-city.mp3','your-body-superhero-universe.mp3'])assert(fs.existsSync(path.join(root,'music',tr)),`OST missing: ${tr}`);
for(const id of ['burner-sister','mj-robot','moo-moo','ye-bao-ex','jelly-trio','veggie-kid','oracle-guardian'])assert(fs.existsSync(path.join(root,`images/funai-care-${id}.png`)),`hero asset missing: ${id}`);
assert(css.includes('body.stage-active{overflow:hidden}'),'scroll lock CSS missing');
assert(css.includes('#stage-inner{width:100%'),'viewport-width stage fix missing');
if(fails.length){console.error('ARCADE VERIFY FAILED:\n'+fails.map(x=>' - '+x).join('\n'));process.exitCode=1;}else console.log('Arcade gates passed: 6 games, 2 locales, routes, 7 heroes, OST, fullscreen and analytics');