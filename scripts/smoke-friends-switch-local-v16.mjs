// Diagnostic relay only; real RTC is tested separately in smoke-friends-switch-v16.mjs.
import assert from 'node:assert/strict';import {setup,start} from './lib/friends-browser.mjs';
const app=await setup(),[host,guest]=app.pages;
try{
 await host.exposeFunction('__diagnosticRelay',async(type,data,fast)=>guest.evaluate(x=>BioFriendsApp.session.receive(x.type,x.data,x.fast?'input':'control'),{type,data,fast}));
 await guest.exposeFunction('__diagnosticRelay',async(type,data,fast)=>host.evaluate(x=>BioFriendsApp.session.receive(x.type,x.data,x.fast?'input':'control'),{type,data,fast}));
 await Promise.all([host,guest].map((p,i)=>p.evaluate(i=>{const s=BioFriendsApp.session;s.role=i?'guest':'host';s.hero=i?3:0;s.room='diagnostic';s.link.state='connected';s.link.send=(type,data,fast=false)=>{window.__diagnosticRelay(type,data,fast).catch(()=>{});return true;};s.peerHello={hero:i?0:3,games:s.capabilities};s.phase='lobby';},i)));
 assert(await host.evaluate(()=>BioFriendsApp.session.configure('pong','g05')));await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.configAck)));
 for(const mode of ['pong','volley','coop','defense','race']){
  await start(host,guest,mode);await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing',null,{timeout:60000})));
  await Promise.all([host,guest].map((p,side)=>p.evaluate(side=>{for(const key of ['j',side?'d':'a',...(BioFriendsApp.inspect().session.config.game==='g06'?['w']:[])])document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));},side)));
  await host.waitForFunction(()=>BioFriendsApp.inspect().session.tick>480,null,{timeout:20000});
  const views=await Promise.all([host,guest].map(p=>p.evaluate(()=>BioFriendsApp.inspect())));assert(views.every(v=>v.session.phase==='playing'&&v.session.config.mode===mode&&v.match),mode+' runs via merged adapter');
  await Promise.all([host,guest].map(p=>p.evaluate(()=>{for(const key of ['j','a','d','w'])document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));})));
  await host.locator('#return').click();await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
 }
 assert.deepEqual(app.errors,[]);await Promise.all([host,guest].map(p=>p.evaluate(()=>BioFriendsApp.session.leave())));console.log('FRIENDS LOCAL SWITCH PASS: five modes via synthetic relay; no RTC');
}finally{await app.close();}
