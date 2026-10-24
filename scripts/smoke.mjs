// FUNAI CARE offline browser smoke test. Runs on GitHub Actions with Playwright installed.
// Third-party assets are blocked; this checks layout/DOM/interaction, NOT live streaming.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const locales=['zh','ja'],sections=['world','heroes','story','music','play','strategy'];
const files=['FUNAI-CARE.html','FUNAI-CARE_jp.html',...locales.flatMap(l=>sections.map(s=>l+'/'+s+'.html'))];
const mime={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'application/javascript;charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((request,response)=>{
 let url=new URL(request.url,'http://localhost');
 let name=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return}
 response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(response);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const errors=[];let checks=0;
const verify=(truth,message)=>{checks++;if(!truth)errors.push(message)};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [375,430,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  for(const file of files){
   try{
    await page.goto(origin+'/'+file,{waitUntil:'domcontentloaded',timeout:10000});
    const state=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth,h:document.querySelectorAll('h1').length,main:!!document.querySelector('#main-content'),nav:!!document.querySelector('nav')}));
    verify(state.w<=state.v+3,file+' @'+width+' horizontal overflow '+state.w+'/'+state.v);
    verify(state.h===1&&state.main&&state.nav,file+' @'+width+' missing structure');
    if(width>=768){
      await page.evaluate(()=>scrollTo(0,900));
      await page.waitForTimeout(80);
      const arrow=await page.evaluate(()=>{const b=document.querySelector('.backtop'),r=b.getBoundingClientRect();return {right:innerWidth-r.right,left:r.left,visible:getComputedStyle(b).opacity!=='0'}});
      verify(arrow.right>=0&&arrow.right<=30&&arrow.visible,file+' @'+width+' desktop back-to-top pinned right '+JSON.stringify(arrow));
    }

    if(width<=430){
     const state=await page.evaluate(()=>{
      const visible=el=>!!el&&el.getClientRects().length>0&&getComputedStyle(el).display!=='none';
      const bottom=[...document.querySelectorAll('.bottom-nav>a')].filter(visible);
      const header=document.querySelector('.app-header-inner');
      return{bottom:bottom.length,headerHeight:header.getBoundingClientRect().height,
       desktopNavHidden:!visible(document.querySelector('.main-nav')),
       language:visible(document.querySelector('.mobile-language summary')),
       explore:visible(document.querySelector('.mobile-explore-toggle')),
       exploreClosed:!visible(document.querySelector('#mobile-explore-panel')),
       brand:visible(document.querySelector('.logo'))};
     });
     verify(state.bottom===4&&state.headerHeight<=72&&state.desktopNavHidden&&state.language&&state.explore&&state.exploreClosed&&state.brand,file+' @'+width+' compact mobile header '+JSON.stringify(state));
    }
   }catch(e){errors.push(file+' @'+width+' '+e.message)}
  }
  await page.close();
 }
 for(const lang of locales){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  try{
   await page.goto(origin+'/'+lang+'/strategy.html',{waitUntil:'domcontentloaded'});
   const toggle=page.locator('.mobile-explore-toggle'),panel=page.locator('#mobile-explore-panel'),language=page.locator('.mobile-language');
   await toggle.click();
   verify(await panel.isVisible(),lang+' explore opens');
   verify(await panel.locator('a').count()===3,lang+' exactly three secondary links');
   verify((await page.evaluate(()=>{const a=[...document.querySelectorAll('.bottom-nav>a,.mobile-explore-panel>a')];return new Set(a.map(x=>x.href)).size}))===7,lang+' seven unique routes');
   await page.keyboard.press('Escape');
   verify(!(await panel.isVisible()),lang+' Escape closes explore');
   await language.locator('summary').click();
   verify(await language.locator('.mobile-language-options').isVisible(),lang+' languages open');
   await toggle.click();
   verify(!(await language.locator('.mobile-language-options').isVisible()),lang+' explore closes language');
   await page.keyboard.press('Escape');
   verify(!(await panel.isVisible()),lang+' explore closes keyboard');
   await page.evaluate(()=>scrollTo(0,900));
   await page.waitForTimeout(120);
   const placement=await page.evaluate(()=>{const b=document.querySelector('.backtop').getBoundingClientRect(),n=document.querySelector('.bottom-nav').getBoundingClientRect();return{separated:b.bottom<=n.top+1,wide:document.documentElement.scrollWidth<=innerWidth+3,rightGap:innerWidth-b.right,touchTarget:b.width>=44}});
   verify(placement.separated&&placement.wide&&placement.rightGap>=0&&placement.rightGap<=12&&placement.touchTarget,lang+' backtop right-edge position and bottom-nav separation '+JSON.stringify(placement));
  }catch(e){errors.push(lang+' mobile header interactions '+e.message)}finally{await page.close()}
 }
 for(const [home,story] of [['FUNAI-CARE.html','zh/story.html'],['FUNAI-CARE_jp.html','ja/story.html']]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  try{
   await page.goto(origin+'/'+home,{waitUntil:'domcontentloaded'});
   const order=await page.evaluate(()=>[...document.querySelectorAll('main>section')].map(x=>x.classList[0]));
   verify(order[0]==='home-hero'&&order[1]==='main-film'&&order[2]==='home-highlights',home+' section order');
   await page.locator('#main-film .film-activate').click();
   verify(await page.locator('#main-film iframe[src*="youtube-nocookie.com"]').count()===1,home+' video click to load');
   await page.goto(origin+'/'+story,{waitUntil:'domcontentloaded'});
   verify(await page.locator('.story-step').count()===4,story+' original four acts');
   verify(await page.locator('.film-activate').count()===2,story+' main plus supplemental movie');
  }catch(e){errors.push(home+' film flow '+e.message)}finally{await page.close()}
 }
 for(const lang of locales){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  try{
   await page.goto(origin+'/'+lang+'/play.html',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>{window.dataLayer=[]});
   await page.locator('[data-qaction="start"]').click();
   verify(await page.locator('[data-answer]').count()===4,lang+' decision lab options');
   for(let i=0;i<8;i++)await page.locator('[data-answer]').nth(i%4).click();
   verify(await page.locator('.protocol-report-head').count()===1,lang+' decision lab report');
   verify(await page.evaluate(()=>window.dataLayer.filter(x=>x.event==='quiz_completed').length)===1,lang+' quiz completed once');
   await page.locator('[data-qaction="reset"]').click();
   verify(await page.locator('[data-qaction="start"]').count()===1,lang+' quiz restart');
   await page.locator('[data-ar-hero="0"]').click();
   await page.locator('[data-ar-command="start"]').click();
   verify(await page.locator('#arcade-root.arcade-immersive').count()===1,lang+' immersive arcade start');
   await page.keyboard.press('p');
   verify(await page.locator('#arcade-overlay').isVisible(),lang+' pause overlay');
   await page.locator('#arcade-overlay [data-ar-command="menu"]').click();
   verify(await page.locator('.arcade-roster').count()===1,lang+' arcade return to roster');
   verify(!(await page.evaluate(()=>document.body.classList.contains('arcade-scroll-locked'))),lang+' body scroll restored');
  }catch(e){errors.push(lang+' interaction '+e.message)}finally{await page.close()}
 }
}finally{await browser.close();await new Promise(done=>server.close(done))}
if(errors.length){console.error('FAIL '+errors.length+' / '+checks+'\n'+errors.join('\n'));process.exitCode=1}
else console.log('PASS '+checks+' DOM/layout/interactive assertions across 14 pages, five viewports and two languages.');
