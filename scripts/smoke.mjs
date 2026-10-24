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
   }catch(e){errors.push(file+' @'+width+' '+e.message)}
  }
  await page.close();
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
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  try{
   await page.goto(origin+'/'+lang+'/play.html',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>{window.dataLayer=[]});
   await page.locator('#quiz-start button').click();
   await page.locator('#quiz-options button').first().click();
   await page.locator('#quiz-options button').nth(1).click();
   await page.locator('#quiz-result').waitFor({state:'visible',timeout:4500});
   let result=await page.evaluate(()=>({hero:document.getElementById('quiz-res-title').textContent,event:window.dataLayer.filter(x=>x.event==='quiz_completed').length}));
   verify(result.event===1,lang+' quiz event');
   verify(result.hero.includes(lang==='zh'?'葉寶':'葉宝'),lang+' tie-break result');
   await page.locator('#quiz-result button').click();
   verify(await page.locator('#quiz-start').isVisible(),lang+' reset quiz');
   await page.locator('.hero-btn').first().click();
   verify(await page.locator('#game-header').isVisible(),lang+' game start');
   await page.keyboard.press('ArrowLeft');await page.keyboard.press('Escape');
   verify(await page.locator('#game-ui-select').isVisible(),lang+' game keyboard reset');
  }catch(e){errors.push(lang+' interaction '+e.message)}finally{await page.close()}
 }
}finally{await browser.close();await new Promise(done=>server.close(done))}
if(errors.length){console.error('FAIL '+errors.length+' / '+checks+'\n'+errors.join('\n'));process.exitCode=1}
else console.log('PASS '+checks+' DOM/layout/interactive assertions across 14 pages, five viewports and two languages.');
