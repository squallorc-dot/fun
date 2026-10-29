// Diagnostic only: two browsers and real iframe engines, relayed by the test process; no RTC.
import assert from 'node:assert/strict';import {setup} from './lib/friends-browser.mjs';
const app=await setup(),[host,guest]=app.pages;
try{
 await Promise.all([host,guest].map((p,i)=>p.evaluate(i=>{document.querySelector('#arena').hidden=false;window.__localAdapterError=null;window.__localAdapter=new BioG02Network.Adapter({mode:'defense',hero:0,remoteHero:3,chapter:1,difficulty:'normal',epoch:1,locale:i?'ja':'zh',host:!i,onFailure:e=>window.__localAdapterError=e});},i)));
 await host.waitForFunction(()=>window.__localAdapter.isReady()||window.__localAdapterError,null,{timeout:30000});await guest.waitForFunction(()=>window.__localAdapter.started||window.__localAdapterError,null,{timeout:30000});
 assert.equal(await host.evaluate(()=>window.__localAdapterError),null);assert.equal(await guest.evaluate(()=>window.__localAdapterError),null);
 const initial=await host.evaluate(()=>window.__localAdapter.capture());assert(await guest.evaluate(v=>window.__localAdapter.receive(0,v,true),initial));
 await host.evaluate(()=>{window.__localTicks=0;window.__localTimer=setInterval(()=>{const a=window.__localAdapter;if(window.__localTicks>=240){clearInterval(window.__localTimer);return;}if(a.canStep()){a.step(1/120,{moveX:-.5,fire:true},{moveX:.5,fire:true});window.__localTicks++;}},8);});
 await host.waitForFunction(()=>window.__localTicks===240||window.__localAdapterError,null,{timeout:30000});assert.equal(await host.evaluate(()=>window.__localAdapterError),null);
 const state=await host.evaluate(()=>window.__localAdapter.capture());assert(await guest.evaluate(v=>window.__localAdapter.receive(240,v,true),state));await guest.waitForFunction(()=>window.__localAdapter.frame.contentWindow.BioArcadeShooter.coopSnapshot()?.game.t>1.8,null,{timeout:10000});
 const visible=await guest.evaluate(()=>window.__localAdapter.frame.contentWindow.BioArcadeShooter.coopSnapshot());assert.equal(visible.game.score,state.state.game.score);assert.equal(visible.game.p2.x,state.state.game.p2.x);assert(visible.game.p2.x>330);assert.deepEqual(app.errors,[]);
 await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__localAdapter.dispose())));console.log('G02 LOCAL ADAPTER PASS: two real browser iframe engines and diagnostic relay; no RTC');
}finally{await app.close();}
