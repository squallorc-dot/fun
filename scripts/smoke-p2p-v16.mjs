// Standalone transport proof for phase 6A-0. Not a two-player G05 gameplay test.
// Uses two independent Chromium contexts and genuine RTCPeerConnection / RTCDataChannel.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'arcade/qa/p2p-v16/index.html');
const source=fs.readFileSync(file,'utf8');
assert(source.includes('iceServers:[]'),'First phase must not use STUN/TURN');
assert(!/https?:\/\/[^"']+/.test(source),'No external transport service URLs in lab');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname!=='/arcade/qa/p2p-v16/index.html'){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(source);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser,checkCount=0;
function check(v,what){assert(v,what);checkCount++;}
async function value(page){
 await page.waitForFunction(()=>document.querySelector('#local').value.length>100,null,{timeout:20000});
 return page.locator('#local').inputValue();
}
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const aCtx=await browser.newContext(),bCtx=await browser.newContext();
 const a=await aCtx.newPage(),b=await bCtx.newPage();
 const errors=[];a.on('pageerror',e=>errors.push('host '+e));b.on('pageerror',e=>errors.push('guest '+e));
 await Promise.all([a.goto(origin+'/arcade/qa/p2p-v16/index.html'),b.goto(origin+'/arcade/qa/p2p-v16/index.html')]);
 await b.locator('#remote').fill('<script>alert(1)</script>');
 await b.locator('#guest').click();
 check((await b.locator('#status').textContent()).includes('失敗'),'Rejects non-JSON and script input');
 await a.locator('#host').click();
 const offer=await value(a);
 check(JSON.parse(offer).kind==='offer','Real browser creates an offer');
 await b.locator('#remote').fill(offer);
 await b.locator('#guest').click();
 const answer=await value(b);
 check(JSON.parse(answer).kind==='answer','Real browser creates an answer');
 await a.locator('#remote').fill(answer);
 await a.locator('#accept').click();
 await Promise.all([
   a.waitForFunction(()=>document.querySelector('#status').textContent.includes('已連線'),null,{timeout:20000}),
   b.waitForFunction(()=>document.querySelector('#status').textContent.includes('已連線'),null,{timeout:20000})
 ]);
 check(true,'Two independent browser peers establish genuine data channels');
 const up=a.locator('[data-key="up"]');
 await up.hover();await a.mouse.down();
 await b.waitForFunction(()=>document.querySelector('#remoteKeys').textContent.includes('上'),null,{timeout:6000});
 await a.mouse.up();
 check(true,'Guest receives actual host control input');
 await a.waitForFunction(()=>document.querySelector('#rtt50').textContent!=='—',null,{timeout:6000});
 check(true,'Host receives DataChannel ping round-trip samples');
 const keys=await a.evaluate(()=>Object.keys(localStorage));
 check(keys.length===0,'No P2P offer / answer or diagnostics persisted');
 check(!errors.length,errors.join('; '));
 await a.locator('#reset').click();
 await b.waitForFunction(()=>document.querySelector('#status').textContent.includes('中斷')||document.querySelector('#status').textContent.includes('closed'),null,{timeout:10000});
 check(true,'Closing one peer notifies the other');
 await Promise.all([aCtx.close(),bCtx.close()]);
 console.log('P2P LAB BROWSER PASS '+checkCount+' checks — genuine localhost ICE, DataChannel RTT and manual SDP; NOT real LAN or G05 gameplay');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}