// Real RTCDataChannel in two independent Chromium processes; ordinary key events only.
import assert from 'node:assert/strict';import fs from 'node:fs';import {setup,pair,start,safeFailure} from './lib/friends-browser.mjs';
const app=await setup();const [host,guest]=app.pages;
async function pilot(page,side){await page.evaluate(side=>{
 let held=new Set(),previous=null;window.__defenseDriver={side,samples:0,moved:0,shots:0,hurt:0,skills:0,boss:false,maxWave:0};
 const timer=setInterval(()=>{const v=BioFriendsApp.inspect(),g=v.match;if(!g||v.session.phase!=='playing')return;const p=side?g.p2:g.p,d=window.__defenseDriver,n=Math.floor(g.t/3)%4,dirs=[['d'],['w'],['a'],['s']],other=[['a'],['s'],['d'],['w']];
  const next=new Set(['j',...(side?other[n]:dirs[n])]);if(g.t%3<.18)next.add('e');
  for(const k of held)if(!next.has(k))document.body.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));for(const k of next)if(!held.has(k))document.body.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));held=next;
  d.samples++;if(previous&&Math.hypot(p.x-previous.x,p.y-previous.y)>.3)d.moved++;if(previous&&p.hp<previous.hp)d.hurt++;if(p.skillAnim>0)d.skills++;if(g.projectiles.some(q=>q.owner===side))d.shots++;d.boss||=!!g.boss;d.maxWave=Math.max(d.maxWave,g.wave);previous={x:p.x,y:p.y,hp:p.hp};
 },25);window.__stopDefenseDriver=()=>{clearInterval(timer);for(const k of held)document.body.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));};
 },side);}
try{
 await pair(host,guest);await start(host,guest,'defense');await Promise.all([pilot(host,0),pilot(guest,1)]);
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='finished',null,{timeout:180000})));
 const results=await Promise.all([host,guest].map(p=>p.evaluate(()=>({view:BioFriendsApp.inspect(),driver:window.__defenseDriver}))));await Promise.all([host,guest].map(p=>p.evaluate(()=>window.__stopDefenseDriver())));
 assert.deepEqual(results[0].view.session.result,results[1].view.session.result,'both peers have the same authoritative result');assert(results[0].view.session.result.win,'real boss battle ends in victory');assert(results.every(x=>x.view.session.resultCount===1&&x.driver.moved>10&&x.driver.shots>5&&x.driver.boss&&x.driver.maxWave===3),'both players move, fire, and observe the real boss');assert.deepEqual(app.errors,[]);
 const evidence={result:results[0].view.session.result,drivers:results.map(x=>x.driver),metrics:results.map(x=>x.view.session.metrics)};fs.mkdirSync('arcade/qa/friends-v16/results',{recursive:true});fs.writeFileSync('arcade/qa/friends-v16/results/g02-rtc.json',JSON.stringify(evidence,null,2));
 await host.locator('#return').click();await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));await host.locator('#mode').selectOption('pong');await Promise.all([host,guest].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.config?.mode==='pong'&&BioFriendsApp.inspect().session.configAck)));
 console.log('G02 TRUE RTC COOP PASS '+JSON.stringify(evidence));console.log('::notice::G02_RTC_EVIDENCE '+JSON.stringify(evidence));
}catch(error){await safeFailure(app.pages,'arcade/qa/friends-v16/results/g02-failure');throw error;}finally{await app.close();}
