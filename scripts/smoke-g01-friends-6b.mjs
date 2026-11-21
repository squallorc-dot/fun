// Real RTC, input-driven co-op; no enemy, health, score, or result setters.
import assert from 'node:assert/strict';import {setup,pair,start,complete,safeFailure,root} from './lib/friends-browser.mjs';import fs from 'node:fs';import path from 'node:path';
const v=await setup(),[a,b]=v.pages,out=path.join(root,'arcade/qa/friends-v16/results');fs.mkdirSync(out,{recursive:true});
async function drive(page,side){
 await page.evaluate(side=>{
  let held=new Set(),prev=null,lowest=Infinity;
  const stats=window.__coopDriver={moves:0,attacks:0,issuedAttacks:0,skills:0,wounds:0,rescues:0,side};
  const timer=setInterval(()=>{
   const x=BioFriendsApp.inspect(),p=x.match?.players?.[side];
   if(x.session.phase!=='playing'||!p||!x.combat)return;
   const desired=new Set(),tick=x.session.tick,other=x.match?.players?.[1-side];
   if(prev&&Math.hypot(prev.x-p.x,prev.y-p.y)>1)stats.moves++;
   if(p.action?.time>0&&(!prev||!prev.action))stats.attacks++;
   if(p.skillFlash>0&&(!prev||!prev.skillFlash))stats.skills++;
   if(p.hp<lowest){if(lowest!==Infinity)stats.wounds++;lowest=p.hp;}
   const target=x.combat.enemies.filter(q=>q.hp>0)
    .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
   // Genuine cooperative revive: a live partner has to approach a fallen
   // teammate with 50 energy. Do not let a test bot ignore its shared lives.
   const rescue=other?.down&&!p.down&&p.energy>=50;
   const focus=rescue?other:target;
   if(focus&&!p.down){
    const dx=focus.x-p.x,dy=focus.y-p.y;
    if(dx>40)desired.add('d');else if(dx< -40)desired.add('a');
    if(dy>14)desired.add('s');else if(dy< -14)desired.add('w');
    if(rescue){
     if(Math.hypot(dx,dy)<70){desired.add('e');stats.rescues++;}
    }else{
     // Do not constantly jump: airborne z>40 causes all melee slashes to
     // miss. The real G01 victory contract must remain required.
     if(Math.floor(tick/14)%2===0)desired.add('j');
     if(p.energy>=100&&Math.floor(tick/20)%2===0)desired.add('e');
     if(target.tele>0&&Math.hypot(dx,dy)<115&&p.dodge<=0)desired.add('l');
     else if(p.hp<45&&target.tele>0&&p.dodge>0)desired.add('k');
    }
   }
   for(const k of held)if(!desired.has(k))document.body.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));
   for(const k of desired)if(!held.has(k)){
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
    if(k==='j')stats.issuedAttacks++;
   }
   held=desired;
   prev={x:p.x,y:p.y,action:!!p.action,skillFlash:p.skillFlash>0};
  },25);
  window.__stopCoop=()=>{clearInterval(timer);for(const k of held)
   document.body.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));};
 },side);
}

try{await pair(a,b);const gen=await Promise.all(v.pages.map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation)));await start(a,b,'coop');await Promise.all(v.pages.map((p,i)=>drive(p,i)));await Promise.all(v.pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='finished',null,{timeout:240000})));const views=await Promise.all(v.pages.map(p=>p.evaluate(()=>({session:BioFriendsApp.inspect().session,driver:window.__coopDriver}))));await Promise.all(v.pages.map(p=>p.evaluate(()=>window.__stopCoop())));assert.deepEqual(views[0].session.result,views[1].session.result);console.log('G01 COOP REAL INPUT VERDICT',JSON.stringify(views.map(x=>({resultCount:x.session.resultCount,won:x.session.result?.win,kills:x.session.result?.kills,driver:x.driver}))));
assert(views.every(x=>x.session.resultCount===1&&x.driver.moves>0&&x.driver.issuedAttacks>0),'both drivers must actually move, issue attack inputs and receive one final result');assert(views[0].session.result.win,'real chapter boss victory');
 await b.locator('#return').click();await Promise.all(v.pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));await start(a,b,'pong');const pong=await complete(a,b,'pong');assert.deepEqual(await Promise.all(v.pages.map(p=>p.evaluate(()=>BioFriendsApp.session.link.generation))),gen,'same peer connection across G01/G05');assert.deepEqual(v.errors,[]);fs.writeFileSync(path.join(out,'g01-coop.json'),JSON.stringify({views,pong},null,2));console.log('::notice file=scripts/smoke-g01-friends-6b.mjs::'+JSON.stringify({result:views[0].session.result,players:views.map(x=>x.driver)}));console.log('G01 FRIENDS PASS: actual co-op chapter, equal result, both movement/attacks and G05 switch');
}catch(e){await safeFailure(v.pages,out);throw e;}finally{await v.close();}
