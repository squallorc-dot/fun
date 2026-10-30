// Real RTC: one pairing and the same peer connection throughout every supported live game.
import assert from 'node:assert/strict';import {setup,pair,start,safeFailure} from './lib/friends-browser.mjs';
const app=await setup(),[host,guest]=app.pages;
try{
 await pair(host,guest);await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__originalPeer=BioFriendsApp.session.link.pc)));
 for(const mode of ['pong','volley','coop','defense','race']){
  await start(host,guest,mode);await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing',null,{timeout:60000})));
  await Promise.all([host,guest].map((p,side)=>p.evaluate(side=>{for(const key of ['j',side?'d':'a',...(BioFriendsApp.inspect().session.config.game==='g06'?['w']:[])])document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));},side)));
  await host.waitForFunction(()=>BioFriendsApp.inspect().session.tick>480,null,{timeout:20000});
  const views=await Promise.all([host,guest].map(p=>p.evaluate(()=>({session:BioFriendsApp.inspect().session,same:window.__originalPeer===BioFriendsApp.session.link.pc}))));assert(views.every(v=>v.same&&v.session.phase==='playing'&&v.session.config.mode===mode),mode+' remains on the original peer connection');
  await Promise.all([host,guest].map(p=>p.evaluate(()=>{for(const key of ['j','a','d','w'])document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));})));
  await host.locator('#return').click();await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
 }
 assert.deepEqual(app.errors,[]);await guest.locator('#leave').click();await host.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');console.log('FRIENDS INTEGRATION RTC PASS: pong, volley, G01, G02 and G06 start and return on one peer connection; short rounds, no claim of complete games');
}catch(error){await safeFailure(app.pages,'arcade/qa/friends-v16/results/integration-failure');throw error;}finally{await app.close();}
