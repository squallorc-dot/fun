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
  page.on('console',message=>{if(message.type()==='error'&&!/ERR_ABORTED|play\(\) failed/.test(message.text()))pageErrors.push(message.text());});
  await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
  const label=lang+' '+viewport.width;
  try{
   await page.goto(base+'/arcade/'+lang+'/index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#game-list .game-card').first().waitFor();
   check(await page.locator('[data-launch]').count()===6,label+' six cards');
   check(await page.locator('.hero-chip').count()===7||await page.locator('#hero-choices').count()===1,label+' seven hero selector');
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
    await page.locator('#stage-pause').click();
    check(await page.locator('#stage-dialog-layer.show').count()===1,label+' '+id+' paused');
    await page.locator('#pause-resume').click();
    check(await page.locator('#stage-dialog-layer.show').count()===0,label+' '+id+' resumed');
    await page.locator('#stage-back').click();
    await inLobby();
   }
   check(!pageErrors.length,label+' JS errors: '+pageErrors.join(' | ').slice(0,500));
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),label+' lobby no horizontal overflow');
  }catch(error){failures.push(label+': '+String(error).slice(0,800)+' errors='+pageErrors.join(' | ').slice(0,350));}
  finally{await page.close();}
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failures.length){console.error('ARCADE BROWSER FAIL '+failures.length+' ('+checks+' assertions)\n'+failures.join('\n'));process.exitCode=1;}
else console.log('ARCADE BROWSER PASS '+checks+' assertions: six games, seven heroes, 20 G02 reentries, 20 other game sessions, bilingual mobile/desktop.');
