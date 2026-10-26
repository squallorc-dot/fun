// Real image decoding, every atlas border, animation inputs and G02 integration on ten locale/viewport combinations.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'arcade/assets/guardians/manifest.json'),'utf8'));
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.png':'image/png','.css':'text/css;charset=utf-8','.json':'application/json'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;
const check=(ok,why)=>{checks++;if(!ok)throw Error(why)};
try{
 const inspect=await browser.newPage();await inspect.goto(base+'/arcade/qa/animation-lab.html');
 const borders=await inspect.evaluate(async manifest=>{const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1440;const ctx=canvas.getContext('2d',{willReadFrequently:true}),fail=[];let checked=0;for(const item of manifest.atlases){const image=new Image();image.src='../assets/guardians/'+item.file;await image.decode();ctx.clearRect(0,0,1280,1440);ctx.drawImage(image,0,0);const p=ctx.getImageData(0,0,1280,1440).data;for(let f=0;f<71;f++){const sx=f%8*160,sy=Math.floor(f/8)*160;let visible=false;for(let y=0;y<160;y++)for(let x=0;x<160;x++){const alpha=p[((sy+y)*1280+sx+x)*4+3];if(alpha>0){visible=true;if(x<2||x>=158||y<2||y>=158)fail.push(item.key+' frame '+f+' clipped at '+x+','+y)}}if(!visible)fail.push(item.key+' frame '+f+' empty');checked++}}return {fail,checked}},manifest);
 check(borders.checked===781,'all 781 PNG frames decoded');check(borders.fail.length===0,borders.fail.slice(0,5).join('; '));await inspect.close();
 const recovery=await browser.newPage();let missingHero=true;
 await recovery.route('**/*',r=>missingHero&&r.request().url().includes('/guardians/burner-sister.png')||!r.request().url().startsWith(base+'/')?r.abort():r.continue());
 await recovery.goto(base+'/arcade/zh/index.html');await recovery.locator('[data-launch="g01"]').click();await recovery.locator('#setup-play').click();
 await recovery.locator('#stage-load-retry').waitFor();
 check(await recovery.evaluate(()=>BioSuiteHub.inspectGame()===null&&!BioSuiteHub.debugState.rafQueued),'missing required hero art shows a retry without starting combat');
 missingHero=false;await recovery.locator('#stage-load-retry').click();await recovery.locator('#hub-canvas').waitFor();
 await recovery.keyboard.down('d');await recovery.waitForFunction(()=>BioSuiteHub.inspectGame().player.clip==='walk');check(true,'movement works after the required hero atlas is restored');await recovery.close();
 for(const lang of ['zh','ja'])for(const viewport of [{width:375,height:812},{width:430,height:932},{width:768,height:1024},{width:1440,height:900},{width:844,height:390}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.url().startsWith(base+'/')&&r.status()>=400)errors.push(r.url()+' '+r.status())});await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await page.goto(base+'/arcade/'+lang+'/index.html',{waitUntil:'domcontentloaded'});const label=lang+' '+viewport.width;
  // All seven heroes at phone and desktop sizes; all remaining viewports exercise the complete flow with Burner.
  const heroes=[375,1440].includes(viewport.width)?[0,1,2,3,4,5,6]:[0];
  for(const hero of heroes){
   await page.locator('[data-launch="g01"]').click();await page.locator('[data-hero="'+hero+'"]').click();await page.locator('#setup-play').click();
   await page.locator('#hub-canvas').waitFor();
   await page.waitForFunction(()=>window.BioGuardianArt.inspect().atlases.length===5&&window.BioGuardianArt.inspect().atlases.every(x=>x.ready));
   check((await page.evaluate(()=>BioSuiteHub.inspectGame().player.hero))===hero,label+' selected G01 hero '+hero);
   check((await page.evaluate(()=>BioSuiteHub.inspectGame().player.clip))==='idle',label+' idle pose '+hero);
   await page.keyboard.down('d');await page.waitForFunction(()=>BioSuiteHub.inspectGame().player.clip==='walk');await page.keyboard.up('d');
   await page.keyboard.down('j');await page.waitForFunction(()=>BioSuiteHub.inspectGame().player.clip.startsWith('attack'));await page.keyboard.up('j');
   await page.waitForFunction(()=>!BioSuiteHub.inspectGame().player.action);await page.keyboard.down('k');await page.waitForFunction(()=>BioSuiteHub.inspectGame().player.clip==='jump');await page.keyboard.up('k');
   check(await page.evaluate(()=>BioGuardianArt.inspect().cached<=5),label+' atlas memory bounded '+hero);
   await page.locator('#stage-back').click();check((await page.locator('#stage').getAttribute('aria-hidden'))==='true',label+' G01 returns to lobby '+hero);
   await page.locator('[data-launch="g02"]').click();await page.locator('[data-hero="'+hero+'"]').click();await page.locator('#setup-play').click();
   const frame=page.frameLocator('#g02-frame');await frame.locator('.arcade-playing').waitFor();const child=page.frames().find(f=>f.url().includes('/shooter.html'));
   await child.waitForFunction(()=>window.BioGuardianArt?.inspect().atlases.some(x=>x.ready));
   await child.waitForFunction(key=>BioGuardianArt.inspect().atlases.some(x=>x.key===key&&x.ready),manifest.atlases[hero].key);
   check(await child.evaluate(key=>BioGuardianArt.inspect().atlases.some(x=>x.key===key&&x.ready),manifest.atlases[hero].key),label+' G02 selected hero sprite '+hero);
   await page.locator('#stage-back').click();check(await page.locator('#g02-frame').count()===0,label+' G02 releases its atlas context '+hero);
  }
  check(errors.length===0,label+' no page errors or local 404: '+errors.join(';'));await page.close();
 }
 console.log(`GUARDIAN ART BROWSER PASS ${checks} assertions: 781 nonempty/unclipped frames, seven G01/G02 heroes, 10 locale/viewport combinations.`);
}finally{await browser.close();await new Promise(r=>server.close(r))}
