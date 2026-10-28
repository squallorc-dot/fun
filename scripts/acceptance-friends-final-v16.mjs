// Real independent Chromium processes and native RTC; no score, physics, or result setters.
// CDP samples are aggregate page counters after GC, not a proof of absence of leaks.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {setup,pair,start,complete,safeFailure,root} from './lib/friends-browser.mjs';
const out=path.join(root,'arcade/qa/friends-v16/results');fs.mkdirSync(out,{recursive:true});
const report={method:'native RTC, ordinary keyboard events; simulated latency before send half per direction, loss only unreliable input/snapshot; intentional missed returns after 12s to complete game; CDP forced GC at idle, heap and aggregate DOM counters; application link counters only',cases:[],resources:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'final-acceptance.json'),JSON.stringify(report,null,2));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const notice=v=>console.log('::notice file=scripts/acceptance-friends-final-v16.mjs::'+JSON.stringify(v).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));
async function observe(page){await page.evaluate(()=>{const adapter=BioFriendsApp.session.adapter,step=adapter.step.bind(adapter);let previous=null;window.__finalContacts={hits:[0,0],exchanges:0};adapter.step=(dt,local,remote)=>{const before=adapter.game.inspectMatch();step(dt,local,remote);const after=adapter.game.inspectMatch();if(after.rally>before.rally&&after.ball){const who=after.ball.lastHitter;window.__finalContacts.hits[who]++;if(previous!==null&&previous!==who)window.__finalContacts.exchanges++;previous=who;}if(after.rally<before.rally||after.points.join()!==before.points.join())previous=null;};});}
async function objects(cdp,expr,kind){
 const group='resource-count';let prototype,objects;
 try{prototype=await cdp.send('Runtime.evaluate',{expression:expr,objectGroup:group});if(!prototype.result.objectId)return null;objects=await cdp.send('Runtime.queryObjects',{prototypeObjectId:prototype.result.objectId,objectGroup:group});const count=await cdp.send('Runtime.callFunctionOn',{objectId:objects.objects.objectId,functionDeclaration:kind==='rtc'?'function(){return this.reduce((a,x)=>(a.total++,a[x.connectionState]=(a[x.connectionState]||0)+1,a),{total:0})}':kind==='dc'?'function(){return this.reduce((a,x)=>(a.total++,a[x.readyState]=(a[x.readyState]||0)+1,a),{total:0})}':'function(){return this.length}',returnByValue:true});return count.result.value;}finally{await cdp.send('Runtime.releaseObjectGroup',{objectGroup:group});}
}
async function sample(page,cdp,label){
 await cdp.send('HeapProfiler.collectGarbage');await wait(150);await cdp.send('HeapProfiler.collectGarbage');
 const heap=await cdp.send('Runtime.getHeapUsage'),dom=await cdp.send('Memory.getDOMCounters');
 const native={pc:await objects(cdp,'RTCPeerConnection.prototype','rtc'),dataChannel:await objects(cdp,'RTCDataChannel.prototype','dc'),audioContexts:await objects(cdp,'AudioContext.prototype','count')};
 const app=await page.evaluate(()=>{const s=BioFriendsApp.session,l=s.link;return {phase:s.phase,adapter:!!s.adapter,remoteKeys:Object.keys(s.remote).length,pulses:Object.keys(s.pulses).length,pendingInputs:s.sentInputs.size,linkTimers:l.timers.size,gathers:l.gatherCancel.size,pcPresent:!!l.pc,channels:Object.keys(l.channels).length,mediaElements:document.querySelectorAll('audio').length};});
 return {label,heap,dom,native,app};
}
async function resources(pages,cdps,label){const values=[];for(let i=0;i<2;i++)values.push(await sample(pages[i],cdps[i],label));report.resources.push(values);save();return values;}
const v=await setup(),[a,b]=v.pages,cdps=[];
try{
 for(const p of v.pages){const c=await p.context().newCDPSession(p);cdps.push(c);await c.send('HeapProfiler.enable');}
 await resources(v.pages,cdps,'initial-disconnected');
 for(const rtt of [100,150,200])for(const loss of [0,.03]){
  await pair(a,b);if(rtt===100&&loss===0)await resources(v.pages,cdps,'paired-lobby');
  for(const mode of ['pong','volley']){
   const row={targetRttMs:rtt,loss,mode};report.cases.push(row);
   await Promise.all([a,b].map(p=>p.evaluate(({rtt,loss})=>BioFriendsApp.session.link.simulate({delay:rtt/2,loss,jitter:0}),{rtt,loss})));await wait(500);
   await Promise.all([a,b].map(p=>p.evaluate(()=>{const s=BioFriendsApp.session;s.link.stats.rtts.length=0;s.link.stats.dropped=0;s.inputLatency.length=0;})));
   await start(a,b,mode);await observe(a);if(rtt===100&&loss===0)await resources(v.pages,cdps,mode+'-active');row.game=await complete(a,b,mode);row.contacts=await a.evaluate(()=>window.__finalContacts);
   row.connected=row.game.peers.every(p=>p.metrics.state==='connected');row.resultConsistent=true;row.bothEffective=row.contacts.hits.every(n=>n>0);row.exchange=row.contacts.exchanges>0;
   // Report separately: no inference that a working connection is playable at a given latency.
   row.experience=row.bothEffective&&row.exchange?'automated-returns-observed':'automated-returns-not-demonstrated';save();
   await b.locator(mode==='volley'?'#rematch':'#return').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
   if(rtt===100&&loss===0)await resources(v.pages,cdps,mode+'-returned-lobby');
  }
  await a.locator('#leave').click();await b.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');await wait(500);
  const idle=await resources(v.pages,cdps,`${rtt}ms-${loss*100}%-disconnected`);
  assert(idle.every(x=>x.app.adapter===false&&!x.app.pcPresent&&x.app.channels===0&&x.app.linkTimers===0&&x.app.pendingInputs===0&&x.app.remoteKeys===0),'round and link cleared after disconnect');
 }
 assert.equal(report.cases.length,12);assert.equal(v.errors.length,0,JSON.stringify(v.errors));report.pageErrors=v.errors;save();console.log('FINAL 6A: twelve complete input-driven games, six reconnect cycles, CDP resource snapshots');
}catch(e){report.errors.push(String(e).slice(0,400));save();await safeFailure(v.pages,out);throw e;}finally{
 save();for(const r of report.cases)notice({case:{rtt:r.targetRttMs,loss:r.loss,mode:r.mode,connected:r.connected,resultConsistent:r.resultConsistent,result:r.game?.result,contacts:r.contacts,experience:r.experience,peers:r.game?.peers}});
 for(const s of report.resources)notice({resources:s});if(report.errors.length)notice({errors:report.errors});
 for(const c of cdps)await c.detach();await v.close();
}
