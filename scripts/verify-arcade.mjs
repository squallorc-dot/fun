/** Release gate for all six Bio-City Arcade routes / track references / module contracts. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');let fails=[];
const assert=(x,m)=>{if(!x)fails.push(m)};
const hub=read('arcade/assets/hub.js'),games=read('arcade/assets/games-core.js'),css=read('arcade/assets/arcade-hub.css');
for(const id of ['g01','g02','g03','g04','g05','g06'])assert(hub.includes(`'${id}'`),id+' missing from lobby');
for(const id of ['g01','g03','g04','g05','g06']){assert(games.includes(`R.${id}=`),id+' lacks playable engine');}
assert(hub.includes('shooter.html'),'G02 hub must load isolated shooter');
assert(read('arcade/zh/shooter.html').includes('arcade-engine.js')&&read('arcade/ja/shooter.html').includes('arcade-engine.js'),'G02 iframe must reuse existing shooter engine');
assert(hub.includes('shooter.html'),'G02 iframe adapter path missing');
assert(!hub.includes("script.src='../../assets/arcade-engine.js"),'G02 must not dynamically reinject global engine');
assert(hub.includes("msg.type==='ready'"),'G02 parent must wait for child readiness');
for(const lang of ['zh','ja']){
 const shooter=read(`arcade/${lang}/shooter.html`),bridge=read('arcade/assets/shooter-bridge.js');
 assert(shooter.includes('shooter-bridge.js'),'G02 shared bridge missing for '+lang);
 assert(shooter.includes('session-runtime.js')&&shooter.includes('audio-policy.js'),'G02 lifecycle/audio policy missing for '+lang);
 assert(shooter.includes('arcade-engine.js'),'G02 isolated shooter engine missing for '+lang);
 assert(bridge.includes('bio-city-shooter'),'G02 parent event relay missing for '+lang);
 assert(bridge.includes("type:'ready'"),'G02 readiness handshake missing for '+lang);
 assert(bridge.includes("dispatchEvent(new Event('change'"),'G02 selected difficulty not applied for '+lang);
 const page=read(`arcade/${lang}/index.html`);
 assert(page.includes(`../qa/friends-v16/index.html?lang=${lang}`),`${lang} public arcade lacks the friends entrance`);
 for(const id of ['game-list','stage','track-select','audio-drawer','stage-controls','hero-choices','stage-audio-status','stage-audio-play'])assert(page.includes(`id="${id}"`),`${lang} missing ${id}`);
 assert(page.includes('GTM-5M4KVKNX'),lang+' GTM missing');
 assert(page.includes('session-runtime.js')&&page.indexOf('session-runtime.js')<page.indexOf('hub.js'),lang+' shared session runtime order');
 assert(page.includes('../assets/hub.js'),lang+' hub script missing');
 assert(page.includes('../assets/guardian-art.js')&&page.indexOf('guardian-art.js')<page.indexOf('games-core.js'),lang+' sprite module must load before combat engine');
 assert(shooter.includes('../arcade/assets/guardian-art.js'),lang+' isolated shooter sprite module missing');
 assert(read(`${lang}/play.html`).includes(`../arcade/${lang}/index.html`),`${lang} primary website lacks Arcade entrance`);
 assert(read(`content/${lang}/play.html`).includes(`../arcade/${lang}/index.html`),`${lang} canonical content lacks Arcade entrance`);
}
const friends=read('arcade/qa/friends-v16/index.html'),challenge=read('arcade/qa/challenge-v16/index.html');
for(const file of ['g01-network.js','g02-network-state.js','g02-network.js','g05-network.js','g06-network.js','friend-session.js'])assert(friends.includes(file),'friends lobby missing '+file);
assert(friends.includes('challenge-v16/index.html')&&challenge.includes('challenge-ui.js'),'friend challenge route missing');
assert(!friends.includes('googletagmanager.com')&&!challenge.includes('googletagmanager.com'),'manual pairing and challenge pages must not load production analytics');
const tracks=['bio-city-awakening-theme-v2.mp3','burner-sister-summoning-theme.mp3','mj-robot-kizamu-japanese-v1.mp3','mj-robot-kizamu-japanese-v2.mp3'];
for(const tr of tracks)assert(fs.existsSync(path.join(root,'music',tr)),`OST missing: ${tr}`);
const playlist=hub.match(/const srcTrack=\[([^\]]+)\]/)?.[1].match(/'([^']+)'/g)?.map(x=>x.slice(1,-1));
assert(JSON.stringify(playlist)===JSON.stringify(tracks),'Arcade playlist must contain exactly the four selected OSTs');
for(const key of ['street','defense','shaft','laboratory','arena','race']){
 const file=path.join(root,'arcade/assets/worlds',key+'.webp');
 const bytes=fs.existsSync(file)?fs.readFileSync(file):Buffer.alloc(0);
 assert(bytes.length>1000&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP',key+' must be a complete WebP scene');
}
for(const lang of ['zh','ja'])for(const page of [`arcade/${lang}/index.html`,`arcade/${lang}/shooter.html`,`${lang}/play.html`])assert(read(page).includes('world-art.js'),page+' scene renderer missing');
for(const id of ['burner-sister','mj-robot','moo-moo','ye-bao-ex','jelly-trio','veggie-kid','oracle-guardian'])assert(fs.existsSync(path.join(root,`images/funai-care-${id}.png`)),`hero asset missing: ${id}`);
assert(css.includes('body.stage-active{overflow:hidden}'),'scroll lock CSS missing');
assert(css.includes('#stage-inner{width:100%'),'viewport-width stage fix missing');
if(fails.length){console.error('ARCADE VERIFY FAILED:\n'+fails.map(x=>' - '+x).join('\n'));process.exitCode=1;}else console.log('Arcade gates passed: 6 games, 2 locales, routes, 7 heroes, OST, fullscreen and analytics');
