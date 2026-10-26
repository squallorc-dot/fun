// Actual-browser startup, error recovery and pause lifecycle. Faults are explicit fixtures.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;
const check=(ok,message)=>{assert(ok,message);checks++;};
async function create(locale,viewport,prefs){
 const context=await browser.newContext({viewport});
 if(prefs)await context.addInitScript(value=>localStorage.setItem('bio_arcade_pref_v1',JSON.stringify(value)),prefs);
 const page=await context.newPage();await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 await page.goto(origin+'/arcade/'+locale+'/index.html');
 return {context,page};
}
async function start(page,id){await page.locator('[data-launch="'+id+'"]').click();await page.locator('#setup-play').click();}
async function running(page){await page.locator('#hub-canvas').waitFor();await page.waitForFunction(()=>!BioSuiteHub.debugState.loading&&!BioSuiteHub.debugState.paused);}
const read=page=>page.evaluate(()=>BioSuiteHub.debugState);
const hidden=(page,value)=>page.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},value);
try{
 for(const [locale,viewport]of [['zh',{width:1440,height:900}],['zh',{width:390,height:844}],['ja',{width:1440,height:900}],['ja',{width:844,height:390}]]){
  const {context,page}=await create(locale,viewport);
  let release;const gate=new Promise(r=>{release=r;});
  await page.route('**/worlds/race.webp*',async route=>{await gate;await route.continue();});
  await start(page,'g06');check((await read(page)).loading,'game waits for required art');
  check(await page.locator('#hub-canvas').count()===0,'no empty or fallback gameplay before preload');
  await page.locator('#music-status[data-state="playing"]').waitFor({state:'attached'});
  check(await page.locator('#arcade-bgm').evaluate(el=>!el.paused),'START activates music before the art await');
  await hidden(page,true);release();await page.locator('#hub-canvas').waitFor();
  check((await read(page)).paused,'hiding during preload cannot silently start the game');
  const elapsed=await page.evaluate(()=>BioSuiteHub.inspectGame().elapsed);
  await hidden(page,false);check((await read(page)).paused,'returning remains paused until a deliberate resume');
  await page.locator('#pause-resume').click();check((await read(page)).countdown,'resume enters protected countdown');
  await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);
  check(await page.evaluate(()=>BioSuiteHub.inspectGame().elapsed)===elapsed,'world time is frozen during countdown');
  check(!(await read(page)).rafQueued&&(await read(page)).touch.length===0,'countdown has no gameplay RAF or stale input');
  await hidden(page,true);check(!(await read(page)).countdown,'hiding cancels countdown');
  await hidden(page,false);await page.locator('#pause-resume').click();await running(page);
  check(!(await read(page)).pointerDown,'resume clears pointer state');
  await page.locator('#stage-pause').click();await page.locator('#pause-resume').click();await page.locator('#stage-back').click();
  await page.waitForTimeout(3100);check((await read(page)).active===null&&!(await read(page)).rafQueued,'exit cancels a pending resume');
  await context.close();
 }
 {
  // A real failed image request is retried; no direct engine/state bypass.
  const {context,page}=await create('zh',{width:390,height:844});let fail=true;
  await page.route('**/worlds/street.webp*',route=>fail?route.fulfill({status:404,body:'missing'}):route.continue());
  await start(page,'g01');await page.locator('#stage-load-retry').waitFor();
  check(await page.locator('#hub-canvas').count()===0,'failed art does not start a partial scene');
  fail=false;await page.locator('#stage-load-retry').click();await running(page);
  check(await page.evaluate(()=>BioWorldArt.inspect().some(x=>x.key==='street'&&x.ready)),'retry loads and decodes required scene');
  check(await page.evaluate(()=>BioGuardianArt.inspect().atlases.every(x=>x.ready)),'selected hero and enemies are ready at start');
  await context.close();
 }
 {
  // Leaving while a request is pending cannot bring the old game back.
  const {context,page}=await create('ja',{width:390,height:844});let release;const gate=new Promise(r=>{release=r;});
  await page.route('**/worlds/shaft.webp*',async route=>{await gate;await route.continue();});
  await start(page,'g03');await page.locator('#stage-back').click();release();await page.waitForTimeout(400);
  check((await read(page)).active===null&&await page.locator('#hub-canvas').count()===0,'stale startup completion is discarded');
  await context.close();
 }
 for(const locale of ['zh','ja']){
  const {context,page}=await create(locale,{width:390,height:844});
  await page.evaluate(()=>{
   const original=HTMLMediaElement.prototype.play;let rejectOnce=true;
   HTMLMediaElement.prototype.play=function(){if(this.id==='arcade-bgm'&&rejectOnce){rejectOnce=false;return Promise.reject(new DOMException('fixture: autoplay denied','NotAllowedError'));}return original.call(this);};
  });
  await start(page,'g06');await running(page);await page.locator('#stage-audio-status[data-state="blocked"]').waitFor();
  check(await page.locator('#stage-audio-play').isVisible(),'autoplay denial has a persistent play entry');
  check((await page.locator('#audio-diagnostics').textContent()).includes('NotAllowedError'),'denial is distinguishable from network failure');
  const bar=await page.locator('.stage-audio-strip').boundingBox(),canvas=await page.locator('#hub-canvas').boundingBox();
  check(bar.y+bar.height<=canvas.y+1,'audio entry never covers game content');
  await page.locator('#stage-audio-play').click();await page.locator('#music-status[data-state="playing"]').waitFor({state:'attached'});
  check(await page.locator('#arcade-bgm').evaluate(el=>!el.paused&&el.readyState>=2),'retry uses actual media playback');
  await context.close();
 }
 {
  const {context,page}=await create('zh',{width:1440,height:900},{audioRevision:2,playMode:'manual',track:0,volume:40,sfx:55,auto:true,loop:false});let fail=true;
  await page.route('**/music/bio-city-awakening-theme-v2.mp3',route=>fail?route.fulfill({status:404,body:'missing'}):route.continue());
  await start(page,'g06');await running(page);await page.locator('#stage-audio-status[data-state="error"]').waitFor();
  check((await page.locator('#audio-diagnostics').textContent()).includes('MediaError'),'media load failure has a distinct diagnostic');
  fail=false;await page.locator('#stage-audio-play').click();await page.locator('#music-status[data-state="playing"]').waitFor({state:'attached'});
  check(await page.locator('#arcade-bgm').evaluate(el=>!el.paused&&!el.loop),'failed source reloads while preserving non-loop preference');
  await context.close();
 }
 for(const locale of ['zh','ja']){
  const {context,page}=await create(locale,{width:390,height:844},{audioRevision:2,playMode:'manual',track:1,volume:31,sfx:23,auto:true,loop:true});
  await start(page,'g02');const shooter=page.frameLocator('#g02-frame');
  await shooter.locator('#arcade-canvas').waitFor();const child=()=>shooter.locator('#arcade-root').evaluate(()=>BioArcadeShooter.state);
  check((await child()).sfx===23&&await shooter.locator('#ar-sound-label').textContent()==='ON','G02 inherits saved SFX rather than a separate OFF default');
  await shooter.locator('[data-ar-command="sound"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bio_arcade_pref_v1')).sfx===0);
  check(await page.locator('#sfx-volume').inputValue()==='0','G02 mute updates the shared slider');
  await shooter.locator('[data-ar-command="sound"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bio_arcade_pref_v1')).sfx===23);
  const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('bio_arcade_pref_v1')));
  check(prefs.volume===31&&prefs.playMode==='manual'&&prefs.track===1&&prefs.loop,'SFX toggle preserves BGM choices');
  await shooter.locator('[data-ar-hold="fire"]').evaluate(el=>{for(const pointerId of [31,32])el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId}));});
  check((await child()).fireOwners===2,'G02 tracks both fingers on fire');
  await shooter.locator('[data-ar-hold="fire"]').evaluate(el=>el.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerId:31})));
  check((await child()).fire,'releasing one finger retains the other');
  await shooter.locator('#arcade-stick').evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:33,clientX:r.right-3,clientY:r.y+r.height/2}));});
  await shooter.locator('#arcade-root').evaluate(()=>window.dispatchEvent(new Event('blur')));
  check((await child()).phase==='paused'&&!(await child()).fire&&(await child()).stick.id===null,'blur clears every shooter input owner');
  await page.waitForFunction(()=>BioSuiteHub.musicElement.paused);
  const time=(await child()).time;
  await shooter.locator('[data-ar-command="resume"]').click();check((await child()).countdown,'G02 resume countdown is active');
  await page.waitForTimeout(350);check((await child()).time===time,'G02 is invulnerable because the world is frozen in countdown');
  await shooter.locator('#arcade-overlay[hidden]').waitFor({state:'attached'});
  check((await child()).keys.length===0&&!(await child()).pointer.shooting,'G02 resumes without held inputs');
  await page.locator('#stage-back').click();check(await page.locator('#g02-frame').count()===0,'G02 exit disposes the child session');
  await context.close();
 }
 {
  const context=await browser.newContext(),page=await context.newPage();
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+'/listen.html?page=arcade/zh/index.html');
  await page.locator('#persistent-expand').click();await page.locator('#persistent-toggle').click();
  await page.waitForFunction(()=>!document.querySelector('#persistent-audio').paused);
  await hidden(page,true);check(await page.locator('#persistent-audio').evaluate(el=>el.paused),'continuous OST suspends in a background tab');
  await hidden(page,false);await page.waitForFunction(()=>!document.querySelector('#persistent-audio').paused);
  const hub=page.frameLocator('#bio-website');await hub.locator('[data-launch="g06"]').click();await hub.locator('#setup-play').click();
  await hub.locator('#music-status[data-state="playing"]').waitFor({state:'attached'});
  check(await page.locator('#persistent-audio').evaluate(el=>el.paused),'game and continuous OST never play together');
  await hub.locator('#stage-back').click();await page.waitForFunction(()=>!document.querySelector('#persistent-audio').paused);
  check(await hub.locator('#arcade-bgm').evaluate(el=>el.paused),'exit returns audio ownership to continuous OST');
  await context.close();
 }
 console.log('ARCADE SESSION BROWSER PASS '+checks+': bilingual startup/decode gate, real media retries, preserved prefs, protected resume, cancellation and multi-pointer G02.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
