// Real same-origin parent/iframe integration; no RTC or game state setters.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin+'/arcade/qa/friends-v16/index.html');
 await page.evaluate(()=>{window.__netFrames=[];const f=document.createElement('iframe');f.id='test-shooter';f.src='../../zh/shooter.html';f.style.cssText='width:800px;height:800px';document.body.appendChild(f);window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===f.contentWindow&&e.data?.source==='bio-city-shooter')window.__netFrames.push(e.data);});});
 await page.waitForFunction(()=>window.__netFrames.some(x=>x.type==='ready'),null,{timeout:30000});
 await page.evaluate(()=>document.querySelector('#test-shooter').contentWindow.postMessage({source:'bio-city-hub',command:'coop-net-init',version:1,epoch:1,hero:0,remoteHero:3,chapter:1,difficulty:'normal'},location.origin));
 await page.waitForFunction(()=>window.__netFrames.some(x=>x.type==='coop-net-phase'&&x.phase==='started'),null,{timeout:60000});
 const atlas=await page.evaluate(()=>document.querySelector('#test-shooter').contentWindow.BioGuardianArt.inspect());for(const key of ['burner-sister','ye-bao-ex','enemy-grunt','enemy-brute','enemy-ranged','enemy-boss'])assert(atlas.atlases.some(x=>x.key===key&&x.ready),'real decoded atlas '+key);
 await page.evaluate(()=>{const f=document.querySelector('#test-shooter').contentWindow;for(let seq=0;seq<240;seq++)f.postMessage({source:'bio-city-hub',command:'coop-net-step',version:1,epoch:1,seq,local:{moveX:-.5,fire:true},remote:{moveX:.5,fire:true},snapshot:seq===0||seq===239},location.origin);});
 await page.waitForFunction(()=>window.__netFrames.some(x=>x.type==='coop-net-frame'&&x.seq===239),null,{timeout:30000});
 const frames=await page.evaluate(()=>window.__netFrames.filter(x=>x.type==='coop-net-frame'));assert.equal(frames.length,2);const a=frames[0].state.game,b=frames[1].state.game;
 assert.equal(frames[1].state.world.width,600);assert(Math.abs(b.t-2)<1e-8);assert(b.p.x<a.p.x&&b.p2.x>a.p2.x);assert(b.projectiles.some(p=>p.owner===0)&&b.projectiles.some(p=>p.owner===1));assert.deepEqual(errors,[]);
 console.log('G02 HOST IFRAME PASS: 240 parent-driven fixed steps; two players move and fire; no RTC');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
