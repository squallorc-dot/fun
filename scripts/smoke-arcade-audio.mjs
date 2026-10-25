// Real media playback after the launch gesture, including the persistent OST iframe.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;
try{
 for(const locale of ['zh','ja'])for(const embedded of [false,true]){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+(embedded?`/listen.html?page=arcade/${locale}/index.html`:`/arcade/${locale}/index.html`));
  const hub=embedded?page.frameLocator('#bio-website'):page;
  let previous='';
  for(const id of ['g01','g02','g06']){
   await hub.locator(`[data-launch="${id}"]`).click();await hub.locator('#setup-play').click();
   await hub.locator('#music-status[data-state="playing"]').waitFor();
   const audio=hub.locator('#arcade-bgm');
   await audio.evaluate(el=>new Promise((resolve,reject)=>{if(el.currentTime>.05&&!el.paused)return resolve();const deadline=setTimeout(()=>reject(Error('audio clock did not advance')),5000);const tick=()=>{if(el.currentTime>.05&&!el.paused){clearTimeout(deadline);el.removeEventListener('timeupdate',tick);resolve();}};el.addEventListener('timeupdate',tick);}));
   const src=await audio.getAttribute('src');assert(src&&src!==previous,'successive stage launches use different real OST files');previous=src;checks++;
   if(embedded)assert(await page.locator('#persistent-audio').evaluate(el=>el.paused),'continuous OST yields to game audio');
   await hub.locator('#stage-back').click();assert(await audio.evaluate(el=>el.paused),'leaving stops game soundtrack');checks++;
  }
  await context.close();
 }
 for(const fixture of [
  {prefs:{playMode:'scene',track:2},mode:'shuffle',playing:true},
  {prefs:{playMode:'manual',track:2,volume:35},mode:'manual',playing:true,track:'mj-robot-kizamu-japanese-v1.mp3'},
  {prefs:{playMode:'off',track:1,volume:40},mode:'off',playing:false},
  {prefs:{playMode:'shuffle',volume:0},mode:'shuffle',playing:false},
  {prefs:{playMode:'shuffle',auto:false},mode:'shuffle',playing:false}
 ]){
  const context=await browser.newContext();await context.addInitScript(prefs=>localStorage.setItem('bio_arcade_pref_v1',JSON.stringify(prefs)),fixture.prefs);
  const page=await context.newPage();await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+'/arcade/zh/index.html?game=g06');assert.equal(await page.locator('#music-mode').inputValue(),fixture.mode);
  await page.locator('#setup-play').click();
  if(fixture.playing){await page.locator('#music-status[data-state="playing"]').waitFor({state:'attached'});if(fixture.track)assert((await page.locator('#arcade-bgm').getAttribute('src')).endsWith(fixture.track));}
  else assert(await page.locator('#arcade-bgm').evaluate(el=>el.paused),'explicit silence/autoplay setting is preserved');
  checks++;await context.close();
 }
 for(const width of [320,375,390,430,580,844])for(const locale of ['zh','ja']){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+`/arcade/${locale}/index.html?game=g06`);
  const geometry=await page.locator('.campaign-settings').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,labels:[...el.querySelectorAll('label')].map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};})}));
  assert(geometry.scroll<=geometry.width+1,'campaign settings fit their container');
  if(width<=580)assert(geometry.labels[1].y>geometry.labels[0].y+40,'mobile selectors each occupy a full row');
  assert(!((await page.locator('#campaign-kind').textContent()).includes('五章')),'chapter count is outside the mode option');
  await page.locator('#campaign-kind').selectOption('quick');assert.equal(await page.locator('#campaign-chapter').inputValue(),'1');assert(await page.locator('#campaign-chapter').isDisabled());checks++;
  await page.close();
 }
 console.log(`ARCADE AUDIO / MOBILE PASS ${checks}: real playback, changing OST, nested focus, clean exit and 12 responsive locale cases.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
