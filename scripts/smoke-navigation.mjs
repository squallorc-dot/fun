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
const files=['zh','ja'].flatMap(lang=>pageKeys.map(key=>route(lang,key)));
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
   await page.goto(origin+'/'+lang+'/play.html?hero=3',{waitUntil:'domcontentloaded'});
   await page.locator('[data-launch="g01"]').click();check(await page.locator('[data-hero="3"]').getAttribute('aria-pressed')==='true',lang+' hero carried from encyclopedia');
   await page.locator('#setup-cancel').click();
   await page.locator('#settings-label').click();check(await page.locator('#audio-drawer').getAttribute('aria-hidden')==='false',lang+' audio dialog aria');
   await page.keyboard.press('Escape');check(await page.locator('#audio-drawer').getAttribute('aria-hidden')==='true',lang+' audio Escape');
   check(await page.locator('#settings-label').evaluate(e=>e===document.activeElement),lang+' audio focus return');
   for(const id of ['g01','g02','g03','g04','g05','g06']){
    await page.goto(origin+'/'+lang+'/play.html?game='+id,{waitUntil:'domcontentloaded'});
    await page.locator('#setup.show').waitFor();
    check(await page.locator('#setup-play').getAttribute('data-game')===id,lang+' overview opens '+id+' ready room');
    await page.locator('#setup-play').click();await page.locator('#stage.active').waitFor();
    check(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).visibility==='hidden'),lang+' '+id+' game hides site header');
    check(await page.locator('.site-bottom-nav').evaluate(e=>getComputedStyle(e).visibility==='hidden'),lang+' '+id+' game hides bottom nav');
    await page.locator('#stage-back').click();check(await page.locator('.site-bottom-nav').isVisible(),lang+' '+id+' lobby restores navigation');
   }
   await page.goto(origin+'/'+lang+'/play.html?game=unknown&hero=99',{waitUntil:'domcontentloaded'});
   check(!await page.locator('#setup').isVisible(),lang+' invalid deep link stays in lobby');
   check(errors.length===0,lang+' runtime errors '+errors.join(';'));
  }catch(e){failures.push(lang+' navigation flow: '+e.message);}finally{await page.close();}
 }
 // GTM analytics contract: actual clicks must emit once without requiring a live tag manager.
 for(const lang of ['zh','ja']){
  const page=await pageFor(1440);
  try{
   await page.goto(origin+'/'+lang+'/play.html',{waitUntil:'domcontentloaded'});
   await page.locator('[data-launch="g06"][data-feature="g06"]').waitFor();
   // Disable only default link navigation; preserve capture/bubble click listeners and dataLayer.
   await page.evaluate(()=>document.addEventListener('click',event=>{
    if(event.target.closest('a[href]'))event.preventDefault();
   },true));
   const events=()=>page.evaluate(()=>window.dataLayer.filter(item=>item&&typeof item.event==='string'));
   const count=async name=>(await events()).filter(item=>item.event===name).length;
   await page.locator('[data-launch="g06"][data-feature="g06"]').click();
   check(await count('arcade_feature_click')===1,lang+' G06 focus event exactly once');
   check(await count('arcade_game_select')===1,lang+' G06 focus selects once');
   check((await events()).find(x=>x.event==='arcade_game_select')?.entry_point==='feature',lang+' G06 focus attribution');
   check(await count('arcade_game_start')===0,lang+' selecting does not count as playing');
   await page.locator('#setup-cancel').click();
   await page.locator('#game-list [data-launch="g01"]').click();
   const selected=(await events()).filter(x=>x.event==='arcade_game_select');
   check(selected.length===2&&selected[1].game_id==='g01'&&selected[1].entry_point==='catalog',lang+' catalog select distinct from G06 focus');
   await page.locator('#setup-cancel').click();
   await page.locator('.hero-cta').click();
   await page.locator('.play-feature a[href*="#game-list"]').click();
   const catalogs=(await events()).filter(x=>x.event==='arcade_catalog_click');
   check(catalogs.length===2&&catalogs[0].entry_point==='hero'&&catalogs[1].entry_point==='feature',lang+' catalog jump click attribution');
   await page.locator('.hub-more-card a[href*="/arcade/friends/"]').click();
   const friend=(await events()).filter(x=>x.event==='arcade_friends_beta_click');
   check(friend.length===1&&friend[0].language===lang&&friend[0].navigation_target_url.includes('/arcade/friends/'),lang+' beta exits measured on production origin');
   await page.locator('.main-nav a[href*="heroes.html"]').click();
   const nav=(await events()).filter(x=>x.event==='site_navigation_click');
   check(nav.length===1&&nav[0].navigation_target_url.endsWith('/'+lang+'/heroes.html')&&nav[0].navigation_position==='header',lang+' navigation target resolves despite PLAY base');
   await page.locator('.language-links a[lang="'+(lang==='zh'?'ja':'zh-TW')+'"]').click();
   const switches=(await events()).filter(x=>x.event==='site_language_switch');
   check(switches.length===1&&switches[0].language_from===lang&&switches[0].language_to===(lang==='zh'?'ja':'zh'),lang+' language direction tracked');
   check(await count('arcade_game_start')===0,lang+' anchor/navigation never starts a game');
   await page.goto(origin+'/'+lang+'/play.html?game=g03',{waitUntil:'domcontentloaded'});
   await page.locator('#setup.show').waitFor();
   const deeplink=(await events()).filter(x=>x.event==='arcade_game_select');
   check(deeplink.length===1&&deeplink[0].game_id==='g03'&&deeplink[0].entry_point==='deeplink',lang+' game deep link selects exactly once');
   check(await count('arcade_game_start')===0,lang+' ready-room deep link is not game started');
  }catch(error){failures.push(lang+' analytics flow: '+error.message);}finally{await page.close();}
 }
 // Standalone decision lab: real browser interactions and 8-question result in both locales.
 for(const lang of ['zh','ja']){
  for(const width of [390,1440]){
   const page=await pageFor(width);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(origin+'/'+lang+'/play.html',{waitUntil:'domcontentloaded'});
    const link=page.locator('.decision-entry-cta');
    check(await link.count()===1,lang+' decision entry visible on PLAY '+width);
    check(await link.getAttribute('href')==='../../'+lang+'/decision-lab.html',lang+' decision entry destination '+width);
    await link.click();
    await page.waitForURL('**/'+lang+'/decision-lab.html');
    await page.locator('#protocol-quiz-root [data-qaction="start"]').waitFor();
    check(await page.locator('#protocol-game-root').count()===0,lang+' lab does not render old defense game');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),lang+' lab no horizontal overflow '+width);
    const localeLink=page.locator('.language-links a[lang="'+(lang==='zh'?'ja':'zh-TW')+'"]');
    check((await localeLink.getAttribute('href'))?.endsWith('/decision-lab.html'),lang+' language link stays in lab');
    await page.locator('#protocol-quiz-root [data-qaction="start"]').click();
    check(await page.locator('.protocol-question').count()===1,lang+' first question rendered');
    for(let question=1;question<=8;question++){
     check(await page.locator('.protocol-option').count()===4,lang+' Q'+question+' 4 options');
     await page.locator('.protocol-option[data-answer="0"]').click();
    }
    check(await page.locator('.protocol-report-head').count()===1,lang+' report after 8 answers');
    check(await page.locator('.protocol-axis').count()===4,lang+' four scoring dimensions');
    check(await page.locator('.protocol-lead-hero').count()===1&&await page.locator('.protocol-aide-hero').count()===1,lang+' two guardian recommendations');
    const quizEvents=await page.evaluate(()=>window.dataLayer.filter(x=>x&&['quiz_started','quiz_completed'].includes(x.event)));
    check(quizEvents.length===2&&quizEvents[0].event==='quiz_started'&&quizEvents[1].event==='quiz_completed',lang+' event semantics once');
    check(quizEvents[1].language===lang&&quizEvents[1].recommended_hero&&quizEvents[1].quiz_questions===8,lang+' completion payload');
    check(!quizEvents.some(e=>'answers' in e||'question' in e),lang+' raw answers never tracked');
    const toGame=page.locator('.protocol-control-row a[href*="play.html?game=g02"]');
    check(await toGame.count()===1,lang+' quiz result can open G02 single-player');
    await page.locator('[data-qaction="reset"]').click();
    check(await page.locator('[data-qaction="start"]').count()===1,lang+' quiz reset');
    check(errors.length===0,lang+' lab runtime errors '+errors.join(';'));
   }catch(error){failures.push(lang+' decision lab '+width+': '+error.message);}finally{await page.close();}
  }
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
if(failures.length){console.error('FAIL '+failures.length+' / '+checks+'\n'+failures.join('\n'));process.exitCode=1;}else console.log('PASS '+checks+' navigation/layout assertions: 14 pages, 7 widths, 2 languages, hero/game deep links and modal focus.');
