// FUNAI CARE quality gate: node scripts/verify.mjs (Node 20+, no dependencies).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
const keys=['home','world','heroes','story','music','play','strategy'];
const route=(lang,key)=>key==='home'?(lang==='zh'?'FUNAI-CARE.html':'FUNAI-CARE_jp.html'):lang+'/'+key+'.html';
const errors=[];let checked=0,internalCount=0;
const fail=(p,msg)=>errors.push(p+': '+msg);
const exists=p=>fs.existsSync(path.join(root,p));
function local(file,ref){
 const value=ref.split(/[?#]/)[0];
 if(!value||/^(?:data:|mailto:|tel:|javascript:)/i.test(value))return null;
 let u;try{u=new URL(value,new URL(file,config.base))}catch{return null}
 if(u.origin!==new URL(config.base).origin)return null;
 const prefix=new URL(config.base).pathname;
 if(!u.pathname.startsWith(prefix))return null;
 return decodeURIComponent(u.pathname.slice(prefix.length));
}
for(const lang of ['zh','ja'])for(const key of keys){
 const file=route(lang,key),input='content/'+lang+'/'+key+'.html';
 if(!exists(file)||!exists(input)){fail(file,'missing page or source');continue}
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const source=fs.readFileSync(path.join(root,input),'utf8');
 if(!html.includes(source))fail(file,'generated content differs from the editable source');
 if(!html.includes('<html lang="'+config.locales[lang].htmlLang+'">'))fail(file,'wrong language');
 if(!html.includes('<body data-page="'+key+'">'))fail(file,'wrong page key');
 if((html.match(/<h1\b/g)||[]).length!==1)fail(file,'expected exactly one h1');
 for(const m of ['<main id="main-content"','<title>','name="description"','property="og:title"','property="og:image"','property="og:url"','rel="canonical"','name="twitter:card"'])
  if(!html.includes(m))fail(file,'missing '+m);
 if(html.includes('280518889'))fail(file,'BV SHOP resource must not be embedded');
 const abs=config.base+file;
 if(!html.includes('<link rel="canonical" href="'+abs+'">'))fail(file,'canonical mismatch');
 for(const l of ['zh','ja']){
  const code=l==='zh'?'zh-TW':'ja',url=config.base+route(l,key);
  if(!html.includes('hreflang="'+code+'" href="'+url+'"'))fail(file,'missing alternate '+code);
 }
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]),seen=new Set();
 for(const id of ids){if(seen.has(id))fail(file,'duplicate HTML id '+id);seen.add(id)}
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const ref=match[1];
  if(ref.startsWith('#')){if(ref.length>1&&!seen.has(ref.slice(1)))fail(file,'dead anchor '+ref);continue}
  const candidate=local(file,ref);
  if(candidate!==null){internalCount++;if(!exists(candidate))fail(file,'missing target '+candidate)}
 }
 for(const m of html.matchAll(/<img\b[^>]*>/g))if(!/\balt=/.test(m[0]))fail(file,'image missing alt');
 for(const m of html.matchAll(/<iframe\b[^>]*>/g))if(!/googletagmanager\.com\/ns\.html/.test(m[0])&&!/\btitle=/.test(m[0]))fail(file,'iframe missing title');
 if(!html.includes('assets/site.css?v='+config.version))fail(file,'outdated CSS version');
 if(!html.includes('assets/site.js?v='+config.version))fail(file,'outdated JS version');
 if(/ui-refine-20261024\.css/.test(html))fail(file,'unused legacy stylesheet linked');
 if(key==='heroes'&&(html.match(/onclick="playHeroAudio/g)||[]).length!==7)fail(file,'expected 7 hero players');
 if(key==='music'&&(html.match(/<audio\b/g)||[]).length!==4)fail(file,'expected 4 OST tracks');
 checked++;
}
for(const f of ['assets/site.js','assets/zh-play.js','assets/ja-play.js','scripts/build.mjs','scripts/verify.mjs']){
 try{execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'})}
 catch(e){fail(f,'JavaScript syntax '+(e.stderr?.toString()||e.message))}
}
try{execFileSync(process.execPath,[path.join(root,'scripts/build.mjs'),'--check'],{stdio:'pipe'})}
catch(e){fail('build','14 pages out of sync: '+(e.stderr?.toString()||e.message))}
const scripts=['assets/site.js','assets/zh-play.js','assets/ja-play.js'].map(x=>fs.readFileSync(path.join(root,x),'utf8')).join('\n');
for(const name of ['play_hero_audio','play_ost_audio','quiz_completed','game_completed','product_link_click'])
 if(!scripts.includes(name))fail('tracking','missing '+name);
if(errors.length){console.error('FAIL '+errors.length+'\n'+errors.join('\n'));process.exitCode=1}
else console.log('PASS '+checked+' pages, '+internalCount+' links/assets, build synchronization, syntax, metadata, locale and event contracts.');
