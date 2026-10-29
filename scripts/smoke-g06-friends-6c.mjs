// Independent Chromium processes and actual RTCDataChannels; ordinary keyboard input only.
import assert from 'node:assert/strict';import fs from 'node:fs';import {setup,pair,start,safeFailure} from './lib/friends-browser.mjs';
const app=await setup();const [host,guest]=app.pages;
async function pilot(page,side){await page.evaluate(side=>{
 let held=new Set(),previous=null;window.__raceDriver={samples:0,moved:0,steers:0,boosts:0,gates:0,side};
 const timer=setInterval(()=>{const view=BioFriendsApp.inspect(),s=view.match;if(!s||view.session.phase!=='playing')return;
  const c=s.car,wrap=d=>((d+600)%1200+1200)%1200-600,look=105,ob=s.traffic.filter(o=>!['finished','dnf'].includes(o.status)&&!o.hit&&wrap(o.z-s.progress)>-7&&wrap(o.z-s.progress)<look);
  const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,x));let choices=[0,-.65,.65,-.4,.4];if(s.nextGate-s.progress<85)choices=choices.map(x=>clamp(x,-.45,.45));
  const cost=lane=>Math.abs(lane)*1.5+Math.abs(lane-c.lane)*2+ob.reduce((n,o)=>n+((Math.abs(o.lane-lane)<.38||Math.abs(o.lane+(o.lateralVelocity||0)*.65-lane)<.38)?Math.max(0,look-wrap(o.z-s.progress)):0),0);
  const target=choices.sort((a,b)=>cost(a)-cost(b))[0],excess=Math.max(0,c.speed-104/(1+.25*Math.abs(s.roadBend))),grip=Math.max(.4,1-excess*.022),turn=clamp((target-c.lane)*3+s.roadBend*Math.pow(c.speed/80,2)*s.lateralForce*(1+excess*.06)/(.9*(.65+c.speed/100)*grip));
  const limit=Math.min(104,...s.roadPreview.map(p=>Math.sqrt((104/(1+.25*Math.abs(p.bend))+6)**2+72*p.distance))),brake=c.speed>limit+1;
  const next=new Set(['w']);if(turn>.18)next.add('d');if(turn<-.18)next.add('a');if(brake)next.add('s');else if(c.speed>80&&limit>94&&s.nitro>15)next.add('j');
  for(const key of held)if(!next.has(key))document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));for(const key of next)if(!held.has(key)){document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));if(key==='a'||key==='d')window.__raceDriver.steers++;if(key==='j')window.__raceDriver.boosts++;}held=next;
  const d=window.__raceDriver;d.samples++;if(previous!==null&&s.progress>previous+.01)d.moved++;previous=s.progress;d.gates=Math.max(d.gates,s.checkpointIndex);
 },25);window.__stopRaceDriver=()=>{clearInterval(timer);for(const key of held)document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));};
 },side);}
try{
 await pair(host,guest);await start(host,guest,'race');await Promise.all([pilot(host,0),pilot(guest,1)]);
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='finished',null,{timeout:180000})));
 const result=await Promise.all([host,guest].map(p=>p.evaluate(()=>({view:BioFriendsApp.inspect(),driver:window.__raceDriver}))));await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__stopRaceDriver())));
 assert.deepEqual(result[0].view.session.result,result[1].view.session.result,'both peers receive identical official results');assert(result.every(x=>x.view.session.resultCount===1&&x.driver.moved>10&&x.driver.steers>0&&x.driver.gates>=8),'both racers move, steer and settle once');assert.equal(result[0].view.session.result.standings.length,6);assert(result[0].view.session.result.players.every(p=>p.status==='finished'&&p.checkpoints===9&&Number.isFinite(p.time)&&Number.isFinite(p.bestLap)),'both human racers finish all nine gates and three legal laps');assert(result[0].view.session.result.players.some(p=>p.collisions>0),'at least one human has a real recorded collision');assert.deepEqual(app.errors,[]);
 const evidence={result:result[0].view.session.result,drivers:result.map(x=>x.driver),metrics:result.map(x=>x.view.session.metrics)};fs.mkdirSync('arcade/qa/friends-v16/results',{recursive:true});fs.writeFileSync('arcade/qa/friends-v16/results/g06-race.json',JSON.stringify(evidence,null,2));await Promise.all([host,guest].map((p,i)=>p.locator('#game-canvas').screenshot({path:`arcade/qa/friends-v16/results/g06-${i}.png`})));
 await host.locator('#return').click();await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));await host.locator('#mode').selectOption('pong');await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.config?.mode==='pong'&&BioFriendsApp.inspect().session.configAck)));
 // Return to G06 on the same connection and exercise a short impaired rematch.
 await Promise.all([host,guest].map(p=>p.evaluate(()=>BioFriendsApp.session.link.simulate({delay:25,loss:.01}))));await start(host,guest,'race');await Promise.all([pilot(host,0),pilot(guest,1)]);await host.waitForFunction(()=>BioFriendsApp.inspect().match?.elapsed>8,null,{timeout:40000});
 await guest.evaluate(()=>window.__stopRaceDriver());await host.waitForFunction(()=>{const g=BioFriendsApp.inspect().match?.traffic.find(r=>r.id==='guest');return g&&g.speed<.01;},null,{timeout:15000});
 await host.locator('#pause').click();await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='paused')));const paused=await Promise.all([host,guest].map(p=>p.evaluate(()=>BioFriendsApp.session.adapter.game.inspectRace().standings.map(({name,...r})=>r))));assert.deepEqual(paused[0],paused[1],'reliable pause synchronizes six-car standings under 50 ms injected RTT and 1% loss');
 await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__stopRaceDriver())));await guest.locator('#leave').click();await host.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');
 evidence.impaired={oneWayDelayMs:25,loss:.01,scenario:'rematch, neutral input, pause and disconnect',standings:paused[0]};fs.writeFileSync('arcade/qa/friends-v16/results/g06-race.json',JSON.stringify(evidence,null,2));
 console.log('G06 TRUE RTC RACE PASS '+JSON.stringify(evidence));console.log('::notice::G06_RTC_EVIDENCE '+JSON.stringify({players:evidence.result.players,drivers:evidence.drivers,impaired:evidence.impaired.scenario}));
}catch(error){await safeFailure(app.pages,'arcade/qa/friends-v16/results/g06-failure');throw error;}finally{await app.close();}
