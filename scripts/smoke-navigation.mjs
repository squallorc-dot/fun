// CI browser regression: seven menus, native mobile dialog, deep links and retained experiences.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
import {route,pageKeys} from './site-shell.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;const failures=[];
const check=(ok,msg)=>{checks++;if(!ok)throw Error(msg);};
const files=['zh','ja'].flatMap(lang=>[...pageKeys.map(key=>route(lang,key)),`arcade/${lang}/index.html`]);
const screenshots=path.join(root,'arcade/qa/site-ui-v7');fs.mkdirSync(screenshots,{recursive:true});
async function pageFor(width){const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());return page;}
try{
 for(const width of [360,390,768,1024,1100,1101,1440]){
  const page=await pageFor(width);
  for(const file of files){try{
   await page.goto(origin+'/'+file,{waitUntil:'domcontentloaded'});
   await page.locator('.site-header').waitFor();
   const state=await page.evaluate(()=>{
    const visible=e=>e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    const header=document.querySelector('.site-header').getBoundingClientRect();
    const nav=document.querySelector('.main-nav');
    return {width:document.documentElement.scrollWidth,inner:innerWidth,height:header.height,desktop:visible(nav),links:nav.querySelectorAll('a').length,current:nav.querySelectorAll('[aria-current=page]').length,buttons:[...document.querySelectorAll('.site-bottom-nav>a,.site-bottom-nav>button')].filter(visible).map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),headerExplore:document.querySelector('.site-header .mobile-explore-toggle')!==null};
   });
   check(state.width<=state.inner+2,file+' '+width+' overflow '+JSON.stringify(state));
   check(state.links===7&&state.current===1,file+' desktop route/current');
   check(width<=1100?!state.desktop&&state.buttons.length===4&&state.height<=72:state.desktop&&state.buttons.length===0,file+' breakpoint '+JSON.stringify(state));
   check(!state.headerExplore&&state.buttons.every(b=>b.w>=44&&b.h>=44),file+' repeated header action or small target');
   if(width===390||width===1440){await page.screenshot({path:path.join(screenshots,file.replaceAll('/','-').replace('.html','')+'-'+width+'.png'),animations:'disabled'});}
  }catch(e){failures.push(file+' @'+width+': '+e.message);}}
  await page.close();
 }
 for(const lang of ['zh','ja']){
  const page=await pageFor(390);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/'+lang+'/strategy.html',{waitUntil:'domcontentloaded'});
   const toggle=page.locator('.mobile-explore-toggle'),panel=page.locator('#mobile-explore-panel');
   await toggle.click();check(await panel.isVisible(),lang+' open explore');
   check(await panel.locator('a').count()===4,lang+' four secondary pages');
   check(await page.evaluate(()=>new Set([...document.querySelectorAll('.site-bottom-nav>a,.site-explore a')].map(a=>a.href)).size)===7,lang+' seven unique destinations');
   check(await page.evaluate(()=>document.querySelector('#mobile-explore-panel').contains(document.activeElement)),lang+' dialog focus');
   await page.screenshot({path:path.join(screenshots,lang+'-mobile-explore.png')});
   await page.keyboard.press('Escape');check(!await panel.isVisible(),lang+' Escape closes');
   check(await toggle.evaluate(e=>e===document.activeElement),lang+' native focus return');
   await page.locator('.mobile-language summary').click();check(await page.locator('.mobile-language-options').isVisible(),lang+' language dropdown');
   await toggle.click();check(!await page.locator('.mobile-language-options').isVisible(),lang+' explore closes language');await page.keyboard.press('Escape');
   await page.goto(origin+'/arcade/'+lang+'/index.html?hero=3',{waitUntil:'domcontentloaded'});
   await page.locator('[data-launch="g01"]').click();check(await page.locator('[data-hero="3"]').getAttribute('aria-pressed')==='true',lang+' hero carried from encyclopedia');
   await page.locator('#setup-cancel').click();
   await page.locator('#settings-label').click();check(await page.locator('#audio-drawer').getAttribute('aria-hidden')==='false',lang+' audio dialog aria');
   await page.keyboard.press('Escape');check(await page.locator('#audio-drawer').getAttribute('aria-hidden')==='true',lang+' audio Escape');
   check(await page.locator('#settings-label').evaluate(e=>e===document.activeElement),lang+' audio focus return');
   for(const id of ['g01','g02','g03','g04','g05','g06']){
    await page.goto(origin+'/'+lang+'/play.html',{waitUntil:'domcontentloaded'});
    await page.locator('a.experience-game[href$="game='+id+'"]').click();
    await page.locator('#setup.show').waitFor();
    check(await page.locator('#setup-play').getAttribute('data-game')===id,lang+' overview opens '+id+' ready room');
    await page.locator('#setup-play').click();await page.locator('#stage.active').waitFor();
    check(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).visibility==='hidden'),lang+' '+id+' game hides site header');
    check(await page.locator('.site-bottom-nav').evaluate(e=>getComputedStyle(e).visibility==='hidden'),lang+' '+id+' game hides bottom nav');
    await page.locator('#stage-back').click();check(await page.locator('.site-bottom-nav').isVisible(),lang+' '+id+' lobby restores navigation');
   }
   await page.goto(origin+'/arcade/'+lang+'/index.html?game=unknown&hero=99',{waitUntil:'domcontentloaded'});
   check(!await page.locator('#setup').isVisible(),lang+' invalid deep link stays in lobby');
   check(errors.length===0,lang+' runtime errors '+errors.join(';'));
  }catch(e){failures.push(lang+' navigation flow: '+e.message);}finally{await page.close();}
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
if(failures.length){console.error('FAIL '+failures.length+' / '+checks+'\n'+failures.join('\n'));process.exitCode=1;}else console.log('PASS '+checks+' navigation/layout assertions: 16 pages, 7 widths, 2 languages, hero/game deep links and modal focus.');
