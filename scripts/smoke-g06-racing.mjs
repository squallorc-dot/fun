// Real browser races and result integration. Placement is test-only; the complete
// unmodified races and all finish times are covered by test-g06-racing.cjs.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),qa=path.join(root,'arcade/qa/g06-racing-v15');fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;const samples=[];
const check=(ok,label)=>{assert(ok,label);checks++;};
try{
 for(const locale of ['zh','ja'])for(let chapter=1;chapter<=5;chapter++){
  const [width,height,profile]=[[1440,900,'desktop'],[320,740,'two'],[844,390,'left'],[430,932,'right'],[768,1024,'two']][chapter-1];
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100,isMobile:width<1100,deviceScaleFactor:2});
  await context.addInitScript(profile=>{
   localStorage.setItem('bio_arcade_controls_v1',JSON.stringify({profile}));
   localStorage.setItem('bio_arcade_pref_v1',JSON.stringify({audioRevision:2,playMode:'manual',track:2,volume:31,sfx:23,auto:false,loop:false}));
   localStorage.setItem('bio_arcade_campaign_v11_g06_normal',JSON.stringify({unlocked:5,best:777,wins:1}));
   localStorage.setItem('bio_arcade_campaign_v11_g02_normal','{"unlocked":3,"best":456,"wins":2}');
  },profile);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.route('**/hub.js*',route=>{
   let s=fs.readFileSync(path.join(root,'arcade/assets/hub.js'),'utf8');
   assert(s.includes('game=gameCode({hero:')&&s.includes('inspectGame:()=>'));
   s=s.replace('game=gameCode({hero:','game=gameCode({testMode:true,hero:').replace('inspectGame:()=>','placeRace:state=>game.testRaceState(state),inspectGame:()=>');
   return route.fulfill({status:200,contentType:'text/javascript',body:s});
  });
  await page.goto(origin+'/arcade/'+locale+'/index.html');await page.locator('[data-launch="g06"]').click();await page.locator('#campaign-chapter').selectOption(String(chapter));await page.locator('#setup-play').click();
  await page.waitForFunction(()=>!BioSuiteHub.debugState.loading&&BioSuiteHub.inspectGame()?.phase==='countdown');
  const grid=await page.evaluate(()=>BioSuiteHub.inspectGame());check(grid.progress===0&&grid.elapsed===0&&grid.traffic.filter(r=>r.type==='car').every(r=>r.speed===0),'grid held before GO');
  if(chapter===2){
   await page.locator('#stage-pause').click();const paused=await page.evaluate(()=>BioSuiteHub.inspectGame());await page.waitForTimeout(200);
   check(await page.evaluate(lights=>BioSuiteHub.inspectGame().lights===lights,paused.lights),'pause freezes formal starting lights');
   await page.locator('#pause-resume').click();check(await page.evaluate(()=>BioSuiteHub.debugState.countdown),'resume keeps shared protected countdown');
  }
  await page.waitForFunction(()=>!BioSuiteHub.debugState.paused&&BioSuiteHub.inspectGame().phase==='racing');
  const before=await page.evaluate(()=>BioSuiteHub.inspectGame());
  await page.locator('#hub-canvas').focus();await page.keyboard.down('Space');await page.waitForTimeout(1200);await page.keyboard.up('Space');
  const after=await page.evaluate(()=>BioSuiteHub.inspectGame());
  check(after.car.speed>before.car.speed&&after.nitro<100,'real acceleration and nitro');
  check(after.mapPositions.length===6&&after.traffic.filter(r=>r.type==='car').every(r=>r.z>grid.traffic.find(o=>o.id===r.id).z),'five moving rivals and six actual minimap positions');
  check(new Set(after.traffic.filter(r=>r.type==='car').map(r=>r.speed.toFixed(2))).size>1,'AI driving characteristics differ');
  check(after.chapter===chapter&&after.checkpointTotal===(chapter===1?9:6),'five original circuits and lap rules');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no viewport overflow');
  if(chapter<=3)await page.screenshot({path:path.join(qa,locale+'-'+chapter+'-race.png')});
  await page.evaluate(()=>{
   const r=BioSuiteHub.inspectGame(),goal=r.checkpointTotal*400,laps=r.checkpointTotal/3;
   const times=laps===3?[18,17]:[25],last=times.reduce((a,b)=>a+b,0);
   BioSuiteHub.placeRace({time:50,player:{z:goal-1,lane:0,speed:74,lapTimes:times,lastLapAt:last},rivals:r.traffic.filter(x=>x.type==='car').map((x,i)=>({id:x.id,z:goal-12-i*2,lane:i%2?.6:-.6,speed:65,lapTimes:times,lastLapAt:last}))});
  });
  await page.locator('#race-results tbody tr').nth(5).waitFor();
  check(await page.locator('#race-results tbody tr').count()===6,'official six-driver classification');
  check(await page.locator('#race-results').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'classification fits the narrow viewport');
  const placing=await page.locator('#race-results tbody tr').first().evaluate(el=>{const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};};return {row:rect(el),dialog:rect(el.closest('.stage-dialog')),actions:rect(document.querySelector('#stage-dialog-layer .stage-dialog-actions'))};});
  check(placing.row.top>=placing.dialog.top&&placing.row.bottom<=Math.min(placing.dialog.bottom,placing.actions.top)+1,locale+'/'+chapter+' first official placing is readable without scrolling '+JSON.stringify(placing));
  check(await page.locator('#race-results tbody tr[data-player=true] td').first().textContent()==='1','player finish order is shown');
  check((await page.locator('#race-results').textContent()).includes(locale==='ja'?'ベストラップ':'最佳單圈'),'localized total time and best lap');
  check(await page.locator('#race-results tbody').evaluate(el=>!el.textContent.includes('DNF')&&!el.textContent.includes('競賽中')&&!el.textContent.includes('走行中')),'classification waits for actual finishes');
  check(await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('bio_arcade_pref_v1'));return p.volume===31&&p.sfx===23&&p.track===2&&p.playMode==='manual'&&JSON.parse(localStorage.getItem('bio_arcade_controls_v1')).profile!==undefined&&localStorage.getItem('bio_arcade_campaign_v11_g02_normal')==='{"unlocked":3,"best":456,"wins":2}';}),'OST, controls and G02 progress preserved');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bio_arcade_campaign_v11_g06_normal')));check(saved.wins===2&&saved.unlocked===5,'podium completion uses existing campaign storage');
  if(chapter<=3)await page.screenshot({path:path.join(qa,locale+'-'+chapter+'-result.png')});
  samples.push({locale,chapter,width,height,profile,rank:1});
  await page.locator('#stage-back').click();await page.locator('[data-launch="g05"]').click();await page.locator('#setup-play').click();await page.locator('#hub-canvas').waitFor();check(await page.locator('#race-results').count()===0,'race result does not leak into another game');
  check(errors.length===0,errors.join(';'));await context.close();
 }
 fs.writeFileSync(path.join(qa,'results.json'),JSON.stringify({checks,browser:browser.version(),samples,physicalDevices:'pending'},null,2)+'\n');
 console.log(`G06 RACING BROWSER PASS ${checks} checks; two languages, all five circuits, desktop/portrait/landscape, four input profiles, lights/pause/boost/result/storage.`);
}catch(error){for(const ctx of browser.contexts())for(const page of ctx.pages())await page.screenshot({path:path.join(qa,'failure.png')}).catch(()=>{});throw error;}finally{await browser.close();await new Promise(done=>server.close(done));}
