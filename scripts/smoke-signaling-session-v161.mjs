// One local signaling room, two independent Chromium processes and the real v1.6 lobby/session.
// Never logs, stores, or attaches SDP, ICE or room credentials.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {start,complete} from './lib/friends-browser.mjs';
const root=path.resolve('.'),origin='http://127.0.0.1:8790',endpoint='http://127.0.0.1:8787';
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,origin).pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(8790,'127.0.0.1',r));const browsers=[];
try{
 const response=await fetch(endpoint+'/rooms',{method:'POST',headers:{Origin:origin}});assert.equal(response.status,201);const room=await response.json();
 for(let i=0;i<2;i++)browsers.push(await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})}));
 const pages=await Promise.all(browsers.map(b=>b.newPage()));
 await Promise.all(pages.map(async(p,i)=>{await p.route('**/*',route=>route.request().url().startsWith(origin+'/')||route.request().url().startsWith(endpoint+'/')?route.continue():route.abort());await p.goto(origin+'/arcade/qa/friends-v16/index.html?lang='+(i?'ja':'zh'));await p.addScriptTag({url:origin+'/arcade/assets/friend-signaling.js'});await p.waitForFunction(()=>!!window.BioFriendsApp);}));
 await Promise.all(pages.map((p,i)=>p.evaluate(({endpoint,room,i})=>{const session=BioFriendsApp.session,role=i?'guest':'host';session.prepareAuto(role,'V161',i?3:0);window.autoPair=BioFriendSignaling.connect({endpoint,room:room.room,role,token:i?room.guest:room.host,link:session.link});window.pairOutcome='pending';autoPair.result.then(()=>window.pairOutcome='connected',e=>window.pairOutcome=e.message);},{endpoint,room,i})));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>pairOutcome!=='pending',null,{timeout:50000})));
 const status=await Promise.all(pages.map(p=>p.evaluate(()=>pairOutcome)));assert.deepEqual(status,['connected','connected'],'real automatic RTC pairing');
 await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
 await start(pages[0],pages[1],'pong');const match=await complete(pages[0],pages[1],'pong');assert(match.peers.every(x=>x.driver.contacts>0),'both players actually return the ball');
 console.log('PASS automatic local signaling + true RTC + existing G05 full game: two players move, return balls and agree on result');
 await pages[0].evaluate(()=>autoPair.close());await pages[1].waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');
}finally{for(const b of browsers)await b.close();await new Promise(r=>server.close(r));}
