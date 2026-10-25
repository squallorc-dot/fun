// Structural gate for the shared shell and the cross-page game entry routes.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {route,pageKeys,navigation} from './site-shell.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const c=JSON.parse(read('content/site.json'));let checks=0;const failures=[];
function check(ok,message){checks++;if(!ok)failures.push(message);}
for(const lang of ['zh','ja']){
 for(const [file,key,arcade] of [...pageKeys.map(k=>[route(lang,k),k,false]),[`arcade/${lang}/index.html`,'play',true]]){
  const html=read(file),shell=navigation(lang,key,c,{prefix:arcade?'../../':key==='home'?'':'../',arcade});
  check(html.includes(shell),file+' does not use the canonical shared shell');
  check((html.match(/<h1\b/g)||[]).length===1,file+' expected one h1');
  check((html.match(/id="primary-menu"/g)||[]).length===1,file+' one desktop nav');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  check(new Set(ids).size===ids.length,file+' duplicate id');
  check(html.includes('assets/navigation.css?v='+c.version)&&html.includes('assets/navigation.js?v='+c.version),file+' shell cache version mismatch');
  check(html.includes('aria-haspopup="dialog"')&&html.includes('<dialog id="mobile-explore-panel"'),file+' native accessible explore dialog missing');
 }
 const play=read('content/'+lang+'/play.html'),heroes=read('content/'+lang+'/heroes.html');
 check((play.match(/class="experience-game"/g)||[]).length===6,lang+' overview must have six game entries');
 check((heroes.match(/class="hero-game-link"/g)||[]).length===7,lang+' encyclopedia must have seven hero entries');
 for(let i=1;i<=6;i++)check(play.includes(`index.html?game=g0${i}`),lang+' game deep link '+i);
 for(let i=0;i<7;i++)check(heroes.includes(`index.html?hero=${i}#game-list`),lang+' hero deep link '+i);
 check(play.includes('class="legacy-game-panel"')&&play.includes('id="arcade-root"')&&play.includes('id="protocol-quiz-root"'),lang+' retained shooter/quiz missing');
 check((read('content/'+lang+'/music.html').match(/<audio preload="none"/g)||[]).length===4,lang+' OST must remain four lazy tracks');
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('PASS '+checks+' shell, locale, accessibility structure and game-entry contracts across 16 pages.');
