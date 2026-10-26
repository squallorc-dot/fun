// Real Chromium integration. Only the cadence of gameplay RAFs is throttled;
// the production simulation, input handlers, assets and Canvas drawing run unchanged.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=path.join(root,'arcade/qa/performance-v14');fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let checks=0;const samples=[];
function check(ok,message){assert(ok,message);checks++;}
const modes=[['g01'],['g02'],['g03'],['g04'],['g05','volley'],['g05','pong'],['g06']];
const state=(frame,id)=>frame.evaluate(id=>{
 const s=id==='g02'?BioArcadeShooter.state:BioSuiteHub.debugState;
 return {now:performance.now()/1000,sim:s.simulation,paused:id==='g02'?s.phase!=='playing':s.paused,controls:s.controls};
},id);
async function start(page,id,mode){
 await page.locator('[data-launch="'+id+'"]').click();
 if(mode)await page.locator('[data-mode="'+mode+'"]').click();
 await page.locator('#setup-play').click();let frame=page;
 if(id==='g02'){
  await page.frameLocator('#g02-frame').locator('#arcade-canvas').waitFor();
  frame=page.frames().find(frame=>frame.url().includes('/shooter.html'));
  await frame.waitForFunction(()=>BioArcadeShooter.state.phase==='playing');
 }else await page.waitForFunction(()=>!BioSuiteHub.debugState.loading&&!BioSuiteHub.debugState.paused);
 return frame;
}
async function focus(frame,id){await frame.locator(id==='g02'?'#arcade-canvas':'#stage').focus();}
try{
 for(const [locale,viewport,fps]of [
  ['zh',{width:1440,height:900},10],
  ['ja',{width:390,height:844},15],
  ['zh',{width:844,height:390},10]
 ]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<900,isMobile:viewport.width<900,deviceScaleFactor:2});
  await context.addInitScript(fps=>{
   const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),jobs=new Map();let next=-1;
   window.requestAnimationFrame=callback=>{
    if(!['frame','loop'].includes(callback.name))return raf(callback);
    const token=next--,job={timer:0,frame:0};jobs.set(token,job);
    job.timer=setTimeout(()=>{job.frame=raf(now=>{jobs.delete(token);callback(now);});},1000/fps);
    return token;
   };
   window.cancelAnimationFrame=token=>{const job=jobs.get(token);if(job){clearTimeout(job.timer);cancel(job.frame);jobs.delete(token);}else cancel(token);};
  },fps);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin+'/arcade/'+locale+'/index.html');
  for(const [id,mode]of modes){
   const label=[locale,viewport.width,id,mode||'',fps].join('/'),frame=await start(page,id,mode);
   await frame.waitForFunction(id=>(id==='g02'?BioArcadeShooter.state:BioSuiteHub.debugState).simulation.frames>=2,id);
   const before=await state(frame,id);await page.waitForTimeout(2200);const after=await state(frame,id);
   const wall=after.now-before.now,elapsed=after.sim.time-before.sim.time,discarded=after.sim.discarded-before.sim.discarded;
   const frames=after.sim.frames-before.sim.frames;
   check(!after.paused,label+' remains running during throttled play');
   check(frames>=5&&frames<=Math.ceil(wall*fps)+2,label+' fixture exercises real low FPS');
   check(Math.abs(elapsed+discarded-wall)<.24,label+' keeps elapsed time, without the old 50 ms clamp');
   check(after.sim.debt<1/120+1e-8,label+' no growing physics debt');
   samples.push({locale,width:viewport.width,id,mode:mode||null,fps,wall,elapsed,discarded,frames});

   await focus(frame,id);
   const selector=id==='g02'?'[data-ar-hold="fire"]':'[data-touch="fire"]';
   const fire=frame.locator(selector),key=id==='g02'?'Space':'j';
   await page.keyboard.down(key);
   check(await fire.getAttribute('aria-pressed')==='true',label+' keyboard reflects held action');
   await fire.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:701,pointerType:'touch'})));
   await page.keyboard.up(key);
   check(await fire.getAttribute('aria-pressed')==='true',label+' keyboard release preserves active touch');
   await frame.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:701})));
   check(await fire.getAttribute('aria-pressed')==='false',label+' final release clears visual state');

   if(id==='g02'){
    // Dash must use the current desired direction immediately at pointerdown.
    const dash=frame.locator('[data-ar-command="dash"]');
    await dash.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:702,pointerType:'touch'})));
    check(await frame.evaluate(()=>BioArcadeShooter.state.player.dash>3.2),label+' dash executes on press before the next low-FPS update');
    await frame.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:702})));
    check(await dash.getAttribute('aria-pressed')==='false',label+' cancellation releases immediate action');
   }

   // Preserve the shared countdown and clear the simulation/input while paused.
   if(id==='g02')await frame.locator('[data-ar-command="pause"]').click();
   else await page.locator('#stage-pause').click();
   await frame.waitForFunction(id=>id==='g02'?BioArcadeShooter.state.phase==='paused':BioSuiteHub.debugState.paused,id);
   const paused=await state(frame,id);await page.waitForTimeout(350);const still=await state(frame,id);
   check(still.sim.ticks===paused.sim.ticks&&still.sim.debt===0,label+' pause freezes and clears physics debt');
   check(await fire.getAttribute('aria-pressed')==='false',label+' pause clears action feedback');
   await page.locator('#stage-back').click();
   check(await page.evaluate(()=>BioSuiteHub.active===null&&BioSuiteHub.debugState.simulation.ticks===0),label+' exit resets shared clock');
   check(errors.length===0,label+' browser errors: '+errors.join(';'));
  }

  // Compare actual DPR-2 cached pixels with the original single drawImage path.
  const raster=await page.evaluate(async()=>{
   await BioWorldArt.preload('street');
   const image=new Image();image.src='../assets/worlds/street.webp?v=20261025.5';await image.decode();
   const canvases=[document.createElement('canvas'),document.createElement('canvas')];
   for(const canvas of canvases){canvas.width=1600;canvas.height=1200;canvas.getContext('2d').scale(2,2);}
   const [a,b]=canvases.map(canvas=>canvas.getContext('2d'));
   BioWorldArt.draw(a,'street',800,600);BioWorldArt.draw(a,'street',800,600);
   const scale=Math.max(800/image.width,600/image.height),w=image.width*scale,h=image.height*scale;
   b.drawImage(image,(800-w)/2,(600-h)/2,w,h);
   const first=a.getImageData(0,0,1600,1200).data,second=b.getImageData(0,0,1600,1200).data;
   let changed=0,max=0;for(let i=0;i<first.length;i++){const difference=Math.abs(first[i]-second[i]);max=Math.max(max,difference);if(difference>2)changed++;}
   return {changed,max,channels:first.length,cache:BioWorldArt.inspectRenderCache()};
  });
  check(raster.changed/raster.channels<.001,'DPR-2 cached background preserves original pixels');
  check(raster.cache.hits>0&&raster.cache.bytes<=raster.cache.limit,'browser reuses bounded texture cache');
  await start(page,'g06');await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(qa,[locale,viewport.width,'g06'].join('-')+'.png')});
  await page.locator('#stage-back').click();await context.close();
 }
 const report={checks,samples,environment:'Linux Chromium; real production loops with test-only RAF throttling. Not physical device FPS.'};
 fs.writeFileSync(path.join(qa,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PERFORMANCE BROWSER PASS '+checks+' checks; '+samples.length+' bilingual desktop/portrait/landscape low-FPS scenarios.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
