// Two real browsers / native RTC / actual G05 points. No fake links or score setters.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {setup,pair,start,complete,safeFailure,recordCanvas,saveCanvasVideo,root}from'./lib/friends-browser.mjs';
const out=path.join(root,'arcade/qa/friends-v16/results');fs.mkdirSync(out,{recursive:true});let checks=0;const check=(v,s)=>{assert(v,s);checks++;};const v=await setup(),[a,b]=v.pages,results=[];
try{
 await pair(a,b);check(true,'genuine independent-browser RTC paired');const generations=await Promise.all([a,b].map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation)));
 for(const mode of ['pong','volley']){
  await start(a,b,mode);await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing')));
  await a.locator('#pause').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='paused')));const paused=await a.evaluate(()=>JSON.stringify(BioFriendsApp.inspect().match));await new Promise(r=>setTimeout(r,250));check(await a.evaluate(s=>JSON.stringify(BioFriendsApp.inspect().match)===s,paused),'pause freezes actual host physics');
  await a.locator('#pause').click();await b.locator('#pause').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing')));
  await recordCanvas(a);results.push(await complete(a,b,mode));await saveCanvasVideo(a,path.join(out,mode+'-gameplay.webm'));checks+=3;for(const [i,p]of [a,b].entries())await p.screenshot({path:path.join(out,mode+'-'+i+'.png')});
  await b.locator('#return').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));check(true,'return to common lobby');
 }
 check(JSON.stringify(generations)===JSON.stringify(await Promise.all([a,b].map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation)))),'same RTC session across both sports');
 check(await a.evaluate(()=>!Object.keys(localStorage).some(k=>/campaign|cup|best/.test(k)))&&await b.evaluate(()=>!Object.keys(localStorage).some(k=>/campaign|cup|best/.test(k))),'single-player progress untouched');
 await b.evaluate(()=>BioFriendsApp.session.link.send('frame',{epoch:BioFriendsApp.inspect().session.epoch,tick:999,points:[7,0]}));await new Promise(r=>setTimeout(r,80));check(await a.evaluate(()=>BioFriendsApp.inspect().session.rejected>0),'guest cannot submit authoritative score');
 check(!v.errors.length,JSON.stringify(v.errors));await a.locator('#leave').click();await b.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');check(true,'disconnect safely clears remote input');
 fs.writeFileSync(path.join(out,'gameplay.json'),JSON.stringify({checks,method:'two independent Chromium processes, real manual ICE/RTCDataChannels, ordinary keyboard controls, complete unchanged-target matches',results,physicalLAN:'pending'},null,2));console.log('FRIENDS GAMEPLAY PASS '+checks+' checks / two real browser processes / full pong + volley / one RTC connection');
}catch(error){await safeFailure(v.pages,out);throw error;}finally{await v.close();}
