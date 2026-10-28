// Native WebRTC between independent Chromium processes; only ordinary input drives games.
// Impairment is injected before DataChannel.send (one half RTT per direction);
// packet loss is applied to the unordered input/snapshot channel, not reliable control.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {setup,pair,start,complete,driver,safeFailure,root} from './lib/friends-browser.mjs';
const out=path.join(root,'arcade/qa/friends-v16/results');fs.mkdirSync(out,{recursive:true});
const report={method:'two independent Chromium processes; native RTCDataChannel; application send delay per direction; loss only unordered input/snapshot channel; no score or ball setters',matrix:[],stress:[],contacts:{pong:[0,0],volley:[0,0]},exchanges:{pong:0,volley:0},errors:[]};
const save=()=>fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function observe(host,mode){await host.evaluate(mode=>{
 const adapter=BioFriendsApp.session.adapter,step=adapter.step.bind(adapter),tally={mode,hits:[0,0],exchanges:0,last:null};window.__contacts=tally;
 adapter.step=(dt,local,remote)=>{const before=adapter.game.inspectMatch();step(dt,local,remote);const after=adapter.game.inspectMatch();if(after.rally>before.rally&&after.ball){const hitter=after.ball.lastHitter;tally.hits[hitter]++;if(tally.last!==null&&tally.last!==hitter)tally.exchanges++;tally.last=hitter;}if(after.rally<before.rally||after.points.join()!==before.points.join())tally.last=null;};
 },mode);}
async function collect(host,mode){const t=await host.evaluate(()=>window.__contacts);for(let i=0;i<2;i++)report.contacts[mode][i]+=t.hits[i];report.exchanges[mode]+=t.exchanges;return t;}
async function lobby(a,b,rematch=false){await b.locator(rematch?'#rematch':'#return').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));}
async function health(p){return p.evaluate(()=>{const s=BioFriendsApp.session,v=s.inspect();return {phase:v.phase,epoch:v.epoch,tick:v.tick,result:v.result,resultCount:v.resultCount,totalResults:v.totalResults,metrics:v.metrics,timers:s.link.timers.size,pendingPings:s.link.pendingPings.size,pendingInputs:s.sentInputs.size,heap:performance.memory?.usedJSHeapSize??null};});}
const v=await setup(),[a,b]=v.pages;
try{
 await pair(a,b);const generations=await Promise.all([a,b].map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation)));
 for(const rtt of [0,50,100,150,200])for(const loss of [0,.01,.03,.05]){
  const mode=(report.matrix.length%2?'volley':'pong');const row={targetRttMs:rtt,loss,mode};report.matrix.push(row);
  try{
   await Promise.all([a,b].map(p=>p.evaluate(({rtt,loss})=>BioFriendsApp.session.link.simulate({delay:rtt/2,loss,jitter:0}),{rtt,loss})));
   await start(a,b,mode);await observe(a,mode);await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing')));
   await Promise.all([driver(a,0,{missAfter:999}),driver(b,1,{missAfter:999})]);await wait(8000);
   await Promise.all([a,b].map(p=>p.evaluate(()=>window.__stopFriendDriver?.())));row.peers=await Promise.all([a,b].map(health));row.contacts=await collect(a,mode);
   row.pass=row.peers.every(x=>['playing','finished'].includes(x.phase)&&x.metrics.state==='connected')&&row.peers[0].resultCount<=1&&row.peers[1].resultCount<=1;
   if(!row.pass)report.errors.push(`matrix ${rtt}/${loss}: unexpected phase or duplicate result`);
   await lobby(a,b);
  }catch(e){row.pass=false;report.errors.push(`matrix ${rtt}/${loss}: ${String(e).slice(0,250)}`);save();throw e;}
  save();console.log(`MATRIX rtt=${rtt} loss=${loss} ${row.pass?'PASS':'FAIL'}`);
 }
 await Promise.all([a,b].map(p=>p.evaluate(()=>BioFriendsApp.session.link.simulate({delay:0,loss:0,jitter:0}))));
 const began=Date.now();let n=0;
 while(Date.now()-began<605000){
  const mode=n++%2?'volley':'pong';await start(a,b,mode);await observe(a,mode);
  if(n===1){await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing')));await b.evaluate(()=>window.dispatchEvent(new Event('blur')));await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='paused')));report.simulatedFocusLoss={paused:true,peers:await Promise.all([a,b].map(health))};await a.locator('#pause').click();await b.locator('#pause').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing')));report.simulatedFocusLoss.resumed=true;}
  const game=await complete(a,b,mode),contacts=await collect(a,mode),peers=await Promise.all([a,b].map(health));
  report.stress.push({elapsedMs:Date.now()-began,mode,game,contacts,peers});save();
  await lobby(a,b,n%2===0);assert.deepEqual(await Promise.all([a,b].map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation))),generations,'same peer connection throughout repeated game switches');
  console.log(`STRESS ${Math.round((Date.now()-began)/1000)}s ${mode} score=${game.result.points.join(':')}`);
 }
 report.stressDurationMs=Date.now()-began;
 // Real channel closure and a fresh manual offer/answer on the same two pages.
 await a.locator('#leave').click();await b.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');
 const closed=await Promise.all([a,b].map(health));await pair(a,b);const fresh=await Promise.all([a,b].map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation)));
 report.repair={closed,fresh,pass:fresh.every((x,i)=>x>generations[i])};assert(report.repair.pass,'new connection after disconnect');
 report.pageErrors=v.errors;assert.equal(v.errors.length,0,'no browser exceptions');
 for(const mode of ['pong','volley'])if(!report.contacts[mode].every(n=>n>0)||!report.exchanges[mode])report.errors.push(`${mode}: both-side effective contacts and alternating rally not demonstrated`);
 save();assert.equal(report.errors.length,0,report.errors.join('; '));console.log('FRIENDS ACCEPTANCE PASS: 20 conditions, >=10 min, both-side effective contacts, reconnect');
}catch(error){report.errors.push(String(error).slice(0,500));save();await safeFailure(v.pages,out);throw error;}finally{
 save();
 const evidence={matrix:report.matrix,contacts:report.contacts,exchanges:report.exchanges,stressDurationMs:report.stressDurationMs,stressRounds:report.stress.length,firstStress:report.stress[0]?.peers,lastStress:report.stress.at(-1)?.peers,simulatedFocusLoss:report.simulatedFocusLoss,repair:report.repair,errors:report.errors};
 // Bounded, anonymous metrics in Checks API remain available if artifact downloads are restricted.
 const summary=JSON.stringify(evidence).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
 console.log('::notice file=scripts/acceptance-friends-v16.mjs::'+summary);await v.close();
}

