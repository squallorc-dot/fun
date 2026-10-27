// Real G02 layouts, controls and rotation; gameplay and rendering run unchanged.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),qa=path.join(root,'arcade/qa/g02-mobile-v14');
fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0,starts=0;const samples=[];
const check=(ok,message)=>{assert(ok,message);checks++;};
const overlap=(a,b)=>a.x<b.x+b.width-.5&&a.x+a.width>b.x+.5&&a.y<b.y+b.height-.5&&a.y+a.height>b.y+.5;
async function geometry(frame,label,minimum=0){
 const g=await frame.evaluate(()=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const canvas=document.querySelector('canvas'),host=canvas.parentElement,style=getComputedStyle(host);
  return {viewport:{width:innerWidth,height:innerHeight},canvas:rect(canvas),pixels:{width:canvas.width,height:canvas.height},host:rect(host),rails:parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),
   hud:rect(document.querySelector('.arcade-topbar')),targets:[...document.querySelectorAll('.bio-action,.bio-stick-zone,.arcade-small')].filter(el=>el.getClientRects().length).map(el=>({id:el.dataset.arCommand||el.dataset.arHold||el.id,...rect(el),color:getComputedStyle(el).color})),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 check(Math.abs(g.canvas.width-g.canvas.height)<.5,label+' square canvas, no stretching/cropping');
 const density=Math.max(2,Math.min(4,Math.ceil(g.canvas.width/600*2*4)/4));
 check(g.pixels.width===600*density&&g.pixels.height===600*density,label+' full 600-square world, enough pixels for actual DPR-2 display');
 check(Math.abs(g.canvas.width-Math.min(g.host.width-g.rails,g.host.height))<1.1,label+' largest available square');
 check(g.canvas.width>=minimum,label+' battlefield minimum '+minimum+' actual '+g.canvas.width);
 check(!g.overflow&&g.canvas.x>=0&&g.canvas.y>=0&&g.canvas.x+g.canvas.width<=g.viewport.width+.5&&g.canvas.y+g.canvas.height<=g.viewport.height+.5,label+' battlefield inside viewport');
 for(const t of g.targets){
  check(t.width>=44&&t.height>=44,label+' usable touch target '+t.id);
  check(t.x>=-.5&&t.y>=-.5&&t.x+t.width<=g.viewport.width+.5&&t.y+t.height<=g.viewport.height+.5,label+' target fully visible '+t.id);
  check(!overlap(g.canvas,t),label+' target does not cover battlefield '+t.id);
  if(t.id==='fire')check(t.color==='rgb(255, 255, 255)',label+' landscape fire keeps authored high-contrast skin');
 }
 for(let a=0;a<g.targets.length;a++)for(let b=a+1;b<g.targets.length;b++)check(!overlap(g.targets[a],g.targets[b]),label+' targets do not overlap');
 for(const selector of ['#ar-hp','#ar-wave','#ar-score','#ar-skill-state','#ar-dash-state'])check(await frame.locator(selector).isVisible(),label+' visible combat information '+selector);
 return g;
}
try{
 for(const locale of ['zh','ja'])for(const [width,height,minimum]of [[320,740,318],[390,844,388],[430,932,428],[568,320,184],[844,390,250],[768,1024,600],[1440,900,700]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100,isMobile:width<1100,deviceScaleFactor:2});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+'/arcade/'+locale+'/index.html');
  for(const profile of ['two','left','right','desktop']){
   await page.evaluate(profile=>BioControlProfiles.set({profile}),profile);
   await page.locator('[data-launch="g02"]').click();await page.locator('#setup-play').click();starts++;
   await page.frameLocator('#g02-frame').locator('#arcade-canvas').waitFor();
   const frame=page.frames().find(f=>f.url().includes('/shooter.html'));
   await frame.waitForFunction(profile=>BioArcadeShooter.state.phase==='playing'&&BioArcadeShooter.state.controls.layout&&BioArcadeShooter.state.controlPrefs.profile===profile,profile);
   const label=[locale,width,height,profile].join('/');
   const sample=await geometry(frame,label,width===1440&&profile!=='two'?500:minimum);samples.push({locale,width,height,profile,canvas:sample.canvas,hud:sample.hud});
   check(!await page.locator('#stage-hud').isVisible()&&!await page.locator('.stage-footer').isVisible(),label+' no redundant outer status/hints');
   check(await page.locator('#stage-back').isVisible()&&await page.locator('#stage-help').isVisible()&&await page.locator('#stage-music').isVisible(),label+' lobby, guide and OST remain accessible');
   if(profile==='two'&&[390,844].includes(width))await page.screenshot({path:path.join(qa,locale+'-'+width+'.png')});
   await page.locator('#stage-back').click();
  }
  if(width===390){
   await page.evaluate(()=>BioControlProfiles.set({profile:'two'}));
   await page.locator('[data-launch="g02"]').click();await page.locator('#setup-play').click();starts++;
   await page.frameLocator('#g02-frame').locator('canvas').waitFor();const frame=page.frames().find(f=>f.url().includes('/shooter.html'));
   await page.setViewportSize({width:844,height:390});
   await frame.waitForFunction(()=>innerWidth===844&&BioArcadeShooter.state.controls.layout?.compact);
   await geometry(frame,locale+' rotated landscape',250);
   await page.setViewportSize({width:390,height:844});
   await frame.waitForFunction(()=>innerWidth===390&&BioArcadeShooter.state.controls.layout&&!BioArcadeShooter.state.controls.layout.compact);
   await geometry(frame,locale+' rotated portrait',388);
   check(await frame.evaluate(()=>BioArcadeShooter.state.phase==='playing'&&!BioArcadeShooter.state.controls.held),locale+' rotation preserves game and clears input');
   await page.locator('#stage-back').click();
  }
  check(errors.length===0,errors.join(';'));await context.close();
 }
 for(const locale of ['zh','ja']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await context.newPage();
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+'/'+locale+'/play.html');await page.locator('.legacy-game-panel>summary').click();await page.locator('[data-ar-command="start"]').click();starts++;
  await page.locator('canvas').waitFor();await geometry(page,locale+' standalone',388);
  check(await page.locator('[data-ar-command="leave"]').isVisible(),locale+' standalone retains exit control');
  await page.locator('[data-ar-command="sound"]').click();check(await page.locator('#ar-sound-label').textContent()==='OFF',locale+' consolidated sound control works');
  await page.locator('[data-ar-command="pause"]').click();check(await page.evaluate(()=>BioArcadeShooter.state.phase==='paused'),locale+' consolidated pause works');
  await context.close();
 }
 fs.writeFileSync(path.join(qa,'results.json'),JSON.stringify({checks,starts,browser:browser.version(),samples,physicalDevices:'pending'},null,2)+'\n');
 console.log(`G02 MOBILE BROWSER PASS ${checks} checks; ${starts} starts, 2 languages, 7 sizes, 4 profiles, rotation and standalone entry.`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
