// Genuine independent browser processes. Never logs/persists SDP or ICE.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {chromium}from'playwright';
export const root=path.resolve(import.meta.dirname,'../..');
export async function setup({viewport={width:1440,height:1000},locales=['zh','ja'],profile='two'}={}){
 const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,browsers=[],pages=[],errors=[];
 try{for(const [index,locale]of locales.entries()){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});browsers.push(browser);const context=await browser.newContext({viewport,hasTouch:viewport.width<1000,deviceScaleFactor:1});
  await context.addInitScript(profile=>{localStorage.setItem('bio_arcade_pref_v1',JSON.stringify({audioRevision:2,track:2,volume:0,sfx:0,auto:false,playMode:'manual',loop:false}));localStorage.setItem('bio_arcade_controls_v1',JSON.stringify({profile}));},profile);
  const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push({side:index,message:String(e).slice(0,200)}));await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());await page.goto(origin+'/arcade/qa/friends-v16/index.html?lang='+locale);await page.waitForFunction(()=>!!window.BioFriendsApp);
 }}catch(error){for(const b of browsers)await b.close();await new Promise(r=>server.close(r));throw error;}
 return {pages,errors,async close(){for(const b of browsers)await b.close();await new Promise(r=>server.close(r));}};
}
export async function pair(a,b){
 await a.locator('#room').fill('6A · 同一好友大廳');await a.locator('#host').click();await a.waitForFunction(()=>document.querySelector('#local').value.length>100);
 const offer=await a.locator('#local').inputValue();await b.locator('#hero').selectOption('3');await b.locator('#remote').fill(offer);await b.locator('#guest').click();await b.waitForFunction(()=>document.querySelector('#local').value.length>100);
 const answer=await b.locator('#local').inputValue();await a.locator('#remote').fill(answer);await a.locator('#accept').click();
 await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.configAck&&BioFriendsApp.inspect().session.phase==='lobby')));
 assert(await a.locator('#local').inputValue()===''&&await b.locator('#remote').inputValue()==='','pairing fields cleared after establishment');
}
export async function start(a,b,mode){await a.locator('#mode').selectOption(mode);await Promise.all([a,b].map(p=>p.waitForFunction(mode=>BioFriendsApp.inspect().session.config?.mode===mode&&BioFriendsApp.inspect().session.configAck,mode)));await a.locator('#ready').click();await b.locator('#ready').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>['countdown','playing'].includes(BioFriendsApp.inspect().session.phase))));}
// Ordinary keyboard events drive both human input paths. No entity/result setter.
export async function driver(page,side,{missAfter=12}={}){
 await page.evaluate(({side,missAfter})=>{
  let held=new Set();window.__friendDriver={samples:0,actions:0,axes:0,side};
  const timer=setInterval(()=>{const view=BioFriendsApp.inspect(),s=view.match;if(!s||view.session.phase!=='playing')return;const keys=new Set(),p=side?s.ai:s.player,b=s.ball,miss=s.t>missAfter&&side===1;window.__friendDriver.samples++;
   if(s.mode==='pong'){
    const target=miss?125:b?.y??250,dy=target-p.y;if(dy>7)keys.add('s');if(dy<-7)keys.add('w');
    if(!miss&&b&&b.lastHitter!==side&&Math.abs(b.x-p.x)<135&&Math.floor(s.t*12)%4<2)keys.add('j');
   }else{
    const target=miss?355:b?.x??(side?500:140),dx=target-p.x;if(dx>8)keys.add('d');if(dx<-8)keys.add('a');
    if(!miss&&b&&Math.abs(b.x-p.x)<95&&b.y<330&&b.vy>0)keys.add('k');if(!miss&&Math.floor(s.t*10)%4<2)keys.add('j');
   }
   for(const key of held)if(!keys.has(key))document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));
   for(const key of keys)if(!held.has(key)){document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));if(['j','k'].includes(key))window.__friendDriver.actions++;else window.__friendDriver.axes++;}held=keys;
  },25);window.__stopFriendDriver=()=>{clearInterval(timer);for(const key of held)document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));};
 },{side,missAfter});
}
export async function complete(a,b,mode){
 await Promise.all([driver(a,0),driver(b,1)]);await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='finished',null,{timeout:150000})));
 const views=await Promise.all([a,b].map(p=>p.evaluate(()=>({view:BioFriendsApp.inspect(),driver:window.__friendDriver}))));await Promise.all([a,b].map(p=>p.evaluate(()=>window.__stopFriendDriver?.())));
 assert.deepEqual(views[0].view.session.result,views[1].view.session.result,'same authoritative winner and score');assert(views.every(v=>v.view.session.resultCount===1),'settles exactly once');assert(views.every(v=>v.driver.axes>0&&v.driver.actions>0),'both browsers actually move and swing/jump via keyboard');
 const points=views[0].view.session.result.points;assert(Math.max(...points)===(mode==='pong'?7:5));return {mode,result:views[0].view.session.result,peers:views.map(v=>({metrics:v.view.session.metrics,driver:v.driver}))};
}
export async function safeFailure(pages,out){fs.mkdirSync(out,{recursive:true});const safe=[];for(const [i,p]of pages.entries()){safe.push(await p.evaluate(()=>{const x=BioFriendsApp.inspect();return {phase:x.session.phase,role:x.session.role,epoch:x.session.epoch,tick:x.session.tick,ready:x.session.ready,configAck:x.session.configAck,result:x.session.result,metrics:x.session.metrics,controls:x.controls,match:x.match,iceState:BioFriendsApp.session.link.pc?.iceConnectionState,candidates:(BioFriendsApp.session.link.pc?.localDescription?.sdp.match(/^a=candidate/gm)||[]).length};}));await p.evaluate(()=>{document.querySelector('#local').value='';document.querySelector('#remote').value='';});await p.screenshot({path:path.join(out,'failure-'+i+'.png')});}fs.writeFileSync(path.join(out,'failure-safe.json'),JSON.stringify(safe,null,2));console.error('FRIENDS SAFE FAILURE '+JSON.stringify(safe.map(s=>({phase:s.phase,role:s.role,ice:s.iceState,candidates:s.candidates,metrics:s.metrics}))));}
