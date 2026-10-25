// Regression coverage for readable selection, game-specific teaching and actual keyboard behavior.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let checks=0;function check(ok,message){checks++;assert.ok(ok,message);}
try{
 for(const lang of ['zh','ja'])for(const viewport of [{width:375,height:812},{width:430,height:932},{width:768,height:1024},{width:1440,height:900},{width:844,height:390}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.url().startsWith(origin+'/')&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+`/arcade/${lang}/index.html`,{waitUntil:'networkidle'});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' lobby overflow '+viewport.width);
  check(await page.locator('.card-help').count()===6,'all game cards expose a guide');
  await page.locator('[data-guide="g05"]').click();check(await page.locator('#guide-content kbd').count()===3,'volley guide is structured');await page.keyboard.press('Escape');
  check(await page.locator('#game-help').isHidden(),'Escape closes lobby help');
  const modes=[['g01',null],['g02',null],['g03',null],['g04',null],['g05','volley'],['g05','pong'],['g06',null]];
  for(const [id,mode]of modes){
   await page.locator(`[data-launch="${id}"]`).click();if(mode)await page.locator(`[data-mode="${mode}"]`).click();
   check(await page.locator('#setup-guide-content kbd').count()>=2,id+' has actual key mappings');
   check((await page.locator('#setup-desc').textContent()).length>15,id+' has a clear goal');
   const card=await page.locator('.hero-chip').first().boundingBox();check(card.width>=93,id+' readable hero card at '+viewport.width);
   check(await page.evaluate(()=>{const el=document.querySelector('.setup-dialog');return el.scrollWidth<=el.clientWidth+1;}),id+' setup horizontal overflow');
   await page.locator('[data-hero="5"]').click();await page.locator('#setup-play').click();
   if(id==='g02'){await page.frameLocator('#g02-frame').locator('.arcade-playing').waitFor();}
   else{
    await page.waitForFunction(()=>window.BioGuardianArt.inspect().atlases.some(x=>x.key==='veggie-kid'&&x.ready));
    const visible=await page.locator('[data-touch]:not([hidden])').evaluateAll(es=>es.map(e=>e.dataset.touch));
    const expected=await page.evaluate(({id,mode})=>Object.keys(BioArcadeGuide.get(id,mode||'volley').buttons),{id,mode});
    check(JSON.stringify([...visible].sort())===JSON.stringify(expected.sort()),id+' only applicable touch buttons');
   }
   const helpButton=await page.locator('#stage-help').boundingBox();check(helpButton.x>=0&&helpButton.x+helpButton.width<=viewport.width,id+' help remains reachable');
   await page.locator('#stage-help').click();check(await page.locator('#game-help').isVisible(),id+' in-game guide opens');
   if(id!=='g02')check((await page.evaluate(()=>BioSuiteHub.debugState)).paused,id+' help automatically pauses');
   const content=await page.locator('#guide-content').textContent();check(content.includes(id==='g02'?'Shift':id==='g06'?'Space':id==='g01'?'U':'Space'),id+' correct game keys');
   await page.locator('#guide-close').click();
   if(id==='g02'){await page.frameLocator('#g02-frame').locator('#arcade-overlay[hidden]').waitFor({state:'attached'});check(true,'G02 help restores its running child');}
   if(id!=='g02'){
    check(!(await page.evaluate(()=>BioSuiteHub.debugState)).paused,id+' help resumes prior running state');
    check(await page.evaluate(()=>document.activeElement.id==='stage'),id+' restores keyboard focus');
   }
   if(viewport.width===1440){
    if(id==='g03'){
     await page.waitForFunction(()=>BioSuiteHub.inspectGame().player.ground);await page.keyboard.down('Space');await page.waitForFunction(()=>BioSuiteHub.inspectGame().player.vy<0);await page.keyboard.up('Space');check(true,'G03 Space actually jumps');
    }else if(id==='g04'){
     await page.waitForFunction(()=>BioSuiteHub.inspectGame().transition<=0);const shots=await page.evaluate(()=>BioSuiteHub.inspectGame().shots);await page.keyboard.press('Space');await page.waitForFunction(s=>BioSuiteHub.inspectGame().shots===s-1,shots);check(true,'G04 Space actually fires');
    }else if(id==='g05'&&mode==='volley'){
     await page.keyboard.down('Space');await page.waitForFunction(()=>!BioSuiteHub.inspectGame().player.ground);await page.keyboard.up('Space');check(true,'G05 Space actually jumps');
    }else if(id==='g06'){
     await page.keyboard.down('Space');await page.waitForFunction(()=>BioSuiteHub.inspectGame().car.speed>0);await page.keyboard.up('Space');check(true,'G06 boost accepts Space');
    }
   }
   await page.locator('#stage-back').click();
   check(!(await page.locator('.hub-main').getAttribute('inert'))&&await page.evaluate(()=>!document.querySelector('.hub-main').inert),'lobby released after '+id);
  }
  check(!errors.length,lang+' '+viewport.width+' errors: '+errors.join(';'));await page.close();
 }
 console.log(`VISUAL / GUIDE BROWSER PASS ${checks} checks: 10 locale/viewport combinations, 7 playable modes, real key behavior, focus and responsive cards.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
