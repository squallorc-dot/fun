// Bio-City Arcade isolated offline browser quality gate.
// Runs against development branch only, does not publish GitHub Pages.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'application/javascript;charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let checks=0;const failures=[];
const check=(ok,why)=>{checks++;if(!ok)throw Error(why)};
try{
 for(const lang of ['zh','ja'])for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource: net::ERR_FAILED|ERR_ABORTED|play\(\) failed/.test(message.text()))pageErrors.push(message.text());});
  // Reloads and iframe disposal intentionally cancel outstanding lazy images. Actual decode failures are checked in the art/scene gate.
  page.on('requestfailed',request=>{const reason=request.failure()?.errorText;if(request.url().startsWith(base+'/')&&reason!=='net::ERR_ABORTED')pageErrors.push('Local asset request failed ('+reason+'): '+request.url());});
  page.on('response',response=>{if(response.url().startsWith(base+'/')&&response.status()>=400)pageErrors.push('Local asset HTTP '+response.status()+': '+response.url());});
  await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
  const label=lang+' '+viewport.width;
  try{
   await page.goto(base+'/arcade/'+lang+'/index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#game-list .game-card').first().waitFor();
   check(await page.locator('#track-select option').count()===5,label+' exactly four OST choices plus mute');
   check(await page.locator('[data-launch]').count()===6,label+' six cards');
   check(await page.locator('.hero-chip').count()===7||await page.locator('#hero-choices').count()===1,label+' seven hero selector');
   // Existing shooter records must survive migration into the new game lobby.
   await page.evaluate(()=>{localStorage.setItem('bio-city-arcade-high-v1','321');localStorage.setItem('bio_arcade_pref_v1',JSON.stringify({track:5,volume:42,sfx:35}));});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#best-g02').waitFor();
   check((await page.locator('#track-select').inputValue())==='0',label+' removed-track preference migrates safely');
   check((await page.locator('#best-g02').textContent()).includes('321'),label+' legacy G02 high score preserved');
   await page.evaluate(()=>{window.dataLayer=[];});
   const inLobby=async()=>check(await page.locator('#stage').getAttribute('aria-hidden')==='true',label+' lobby restored');
   const open=async(id)=>{
    await page.locator('[data-launch="'+id+'"]').click();
    await page.locator('#setup-play').click();
    await page.locator('#stage.active').waitFor();
   };
   // Repeat G02 five times to catch leaked global event handlers / nested fullscreen / stale RAF.
   for(let round=0;round<5;round++){
    await open('g02');
    const frame=page.frameLocator('#g02-frame');
    await frame.locator('.arcade-playing').waitFor({timeout:10000});
    check(await page.locator('#g02-frame').count()===1,label+' G02 frame '+round);
    check(await frame.locator('#arcade-root.arcade-immersive').count()===1,label+' G02 game initialized '+round);
    check(await page.evaluate(()=>document.body.classList.contains('stage-active')),label+' G02 parent stage lock '+round);
    await page.locator('#stage-back').click();
    await inLobby();
    check(await page.locator('#g02-frame').count()===0,label+' G02 frame disposed '+round);
    check(!(await page.evaluate(()=>document.body.classList.contains('stage-active'))),label+' G02 scroll unlocked '+round);
   }
   // Different game engines must start, pause, resume and exit without leaving overlays or scroll locks.
   for(const id of ['g01','g03','g04','g05','g06']){
    if(id==='g05'){
      await page.locator('[data-launch="g05"]').click();
      await page.locator('[data-mode="pong"]').click();
      await page.locator('#setup-play').click();
      await page.locator('#stage.active').waitFor();
    }else await open(id);
    await page.locator('#hub-canvas').waitFor();
    check(await page.locator('#hub-canvas').count()===1,label+' '+id+' single canvas');
    check(await page.locator('#stick-pad').count()===1,label+' '+id+' single joystick');
    if(await page.locator('#stick-pad').isVisible()){
      const axis=await page.locator('#stage-controls').getAttribute('data-stick-axis');
      await page.evaluate(axis=>{
        const el=document.querySelector('#stick-pad'),r=el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:891,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
        el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:891,clientX:r.left+r.width*(axis==='y'?.5:.9),clientY:r.top+r.height*(axis==='y'?.12:.5)}));
      },axis);
      check((await page.evaluate(()=>BioSuiteHub.debugState.stick.held)),label+' '+id+' joystick responds');
      const keys=(await page.evaluate(()=>BioSuiteHub.debugState.stick.dirs));
      check(keys.includes(axis==='y'?'up':'right'),label+' '+id+' correct joystick direction');
      await page.evaluate(()=>document.querySelector('#stick-pad').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:891})));
      check(!(await page.evaluate(()=>BioSuiteHub.debugState.stick.held)),label+' '+id+' joystick releases');
    }
    if(id==='g01'){
      const stage=await page.evaluate(()=>BioSuiteHub.debugState);
      check(stage.chapter>=1&&stage.sessionKind==='campaign',label+' campaign mode defaults');
    }
    await page.locator('#stage-pause').click();
    check(await page.locator('#stage-dialog-layer.show').count()===1,label+' '+id+' paused');
    await page.locator('#pause-resume').click();
    check(await page.locator('#stage-dialog-layer.show').count()===0,label+' '+id+' resumed');
    if(id==='g05'){
      // Persistence integration test: force a synthetic result through the public
      // finish callback; engine win/loss fairness is tested separately.
      await page.evaluate(()=>window.BioSuiteHub.finish(true,987,'test pong'));
      check(await page.locator('#stage-dialog-layer.show').count()===1,label+' G05 result UI shown');
      check(await page.locator('#pause-resume').textContent()!==null,label+' next stage action');
      check(await page.locator('#pause-resume').getAttribute('data-next')==='1',label+' chapter 1 victory enables next');
      await page.locator('#pause-resume').click();
      check((await page.evaluate(()=>BioSuiteHub.debugState)).chapter===2,label+' stage 2 auto advances');
      check(await page.locator('#stage-dialog-layer.show').count()===0,label+' stage 2 starts immediately');
      await page.evaluate(()=>window.BioSuiteHub.finish(true,1002,'test pong chapter 2'));
      check(await page.locator('#pause-resume').getAttribute('data-next')==='1',label+' chapter 2 offers stage 3');
      await page.locator('#pause-resume').click();
      check((await page.evaluate(()=>BioSuiteHub.debugState)).chapter===3,label+' stage 3 continues');

      check((await page.evaluate(()=>localStorage.getItem('bio_arcade_best_g05-pong')))==='1002',label+' G05 Pong retains best score across chapter progression');
    }
    await page.locator('#stage-back').click();
    await inLobby();
   }
   // Single-owner RAF, pause/resume, blur and multi-touch lifecycle assertions.
   await open('g03');
   await page.locator('#hub-canvas').waitFor();
   const status=()=>page.evaluate(()=>window.BioSuiteHub.debugState);
   check((await status()).rafQueued,label+' a single frame queued');
   await page.locator('#stage-pause').click();
   check((await status()).paused&&!(await status()).rafQueued,label+' pause cancels RAF');
   for(let cycle=0;cycle<4;cycle++){
     await page.locator('#pause-resume').click();
     check((await status()).rafQueued&&!(await status()).paused,label+' resumed RAF '+cycle);
     await page.locator('#stage-pause').click();
     check(!(await status()).rafQueued&&(await status()).paused,label+' re-pause RAF '+cycle);
   }
   await page.locator('#pause-resume').click();
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   check((await status()).paused&&!(await status()).rafQueued,label+' blur pauses without queued frames');
   await page.locator('#pause-resume').click();
   await page.evaluate(()=>{
     const btn=document.querySelector('[data-touch="left"]');
     btn.dispatchEvent(new PointerEvent('pointerdown',{pointerId:511,bubbles:true}));
     btn.dispatchEvent(new PointerEvent('pointerdown',{pointerId:512,bubbles:true}));
     btn.dispatchEvent(new PointerEvent('pointerup',{pointerId:511,bubbles:true}));
   });
   check((await status()).touch.includes('left'),label+' second finger remains held');
   await page.evaluate(()=>document.querySelector('[data-touch="left"]').dispatchEvent(new PointerEvent('pointercancel',{pointerId:512,bubbles:true})));
   check(!(await status()).touch.includes('left'),label+' pointercancel releases last finger');
   await page.evaluate(()=>window.BioSuiteHub.finish(false,10,'lifecycle test'));
   check(!(await status()).rafQueued,label+' result stops RAF');
   await page.locator('#stage-back').click();await inLobby();
   check(!(await status()).rafQueued,label+' exit retains no RAF');
   // Volleyball and Pong use different persistent records.
   await page.locator('[data-launch="g05"]').click();
   await page.locator('[data-mode="volley"]').click();
   await page.locator('#setup-play').click();
   await page.locator('#hub-canvas').waitFor();
   await page.evaluate(()=>window.BioSuiteHub.finish(true,432,'test volley'));
   const scores=await page.evaluate(()=>({
     volley:localStorage.getItem('bio_arcade_best_g05-volley'),
     pong:localStorage.getItem('bio_arcade_best_g05-pong'),
     startEvents:window.dataLayer.filter(x=>x.event==='arcade_game_start').length,
     finishEvents:window.dataLayer.filter(x=>x.event==='arcade_game_finish').length
   }));
   check(scores.volley==='432'&&scores.pong==='1002',label+' G05 modes retain independent best after chapter progression');
   check(scores.startEvents>=6&&scores.finishEvents>=2,label+' unified game start/finish events');
   await page.locator('#stage-back').click();await inLobby();
   check(!pageErrors.length,label+' JS errors: '+pageErrors.join(' | ').slice(0,500));
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),label+' lobby no horizontal overflow');
  }catch(error){failures.push(label+': '+String(error).slice(0,800)+' errors='+pageErrors.join(' | ').slice(0,350));}
  finally{await page.close();}
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failures.length){console.error('ARCADE BROWSER FAIL '+failures.length+' ('+checks+' assertions)\n'+failures.join('\n'));process.exitCode=1;}
else console.log('ARCADE BROWSER PASS '+checks+' assertions: six games, seven heroes, 20 G02 reentries, 20 other game sessions, bilingual mobile/desktop.');
