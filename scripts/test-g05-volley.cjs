// Real trajectory regressions: both servers must clear the net at every tested aspect ratio.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
const idle={left:false,right:false,up:false,down:false,fire:false,jump:false,pointer:{down:false}};
function create(w,h,difficulty){const ctx={window:{},Math};vm.runInNewContext(code,ctx);const g=ctx.window.BioSuiteGames.g05({hero:0,mode:'volley',difficulty,testMode:true,sfx(){},finish(){}});g.w=w;g.h=h;g.start();return g;}
let serves=0,returns=0;
for(const [w,h]of [[375,460],[430,570],[768,810],[960,540],[1440,740],[844,286]])for(const difficulty of ['normal','hard','expert'])for(const fps of [120,60,30,20])for(const server of [0,1]){
 const g=create(w,h,difficulty);g.testVolleyServe(server);
 const before=g.inspectMatch().serveCrossings[server];let crossed=false;
 for(let t=0;t<3;t+=1/fps){g.update(1/fps,idle);const s=g.inspectMatch();if(s.serveCrossings[server]>before){crossed=true;assert.ok(s.ball.y+s.field.r<s.field.netTop,'serve must pass over the actual collision geometry');break;}assert.deepEqual(Array.from(s.points),[0,0],'serve may not fault before reaching the net');}
 assert.ok(crossed,`${w}x${h} ${difficulty} ${fps}fps server ${server} failed to cross`);serves++;
 // Reproduce a falling ball at the player's standing reach: a simple J return must also clear.
 if(server===0){g.testVolleyServe(1);const s=g.inspectMatch();g.testVolleyBall({x:s.player.x,y:s.player.y-s.field.body*.7,vy:h*.1,vx:0,lastHitter:1,servedBy:1,serveCrossed:true});
  let returned=false,cleared=false;for(let t=0;t<3;t+=1/fps){g.update(1/fps,{...idle,fire:t<.12});const m=g.inspectMatch();if(m.ball.lastHitter===0)returned=true;if(returned&&m.ball.x>w*.5&&m.ball.y+m.field.r<m.field.netTop){cleared=true;break;}if(m.points[0]||m.points[1])break;}
  assert.ok(cleared,`${w}x${h} ${difficulty} ${fps}fps ground return cannot clear net`);returns++;
 }
}
// A low ball must rebound once and move away from the net, never alternate forever inside it.
// Regression: taller net must be physically solid, not a cosmetic drawing.
for(const [w,h] of [[375,460],[430,570],[768,810],[960,540],[1440,740],[844,286]]){
 const f=create(w,h,'normal').inspectMatch().field;
 const expected=Math.min(160,h*.30);
 assert.ok(Math.abs((f.floor-f.netTop)-expected)<.01,'raised net must be 30% of viewport height with 160px cap');
 assert.ok(f.netTop>h*.38,'net must leave a playable overhead corridor');
}
const g=create(640,510,'normal'),f=g.inspectMatch().field;
g.testVolleyBall({x:640*.5-f.r-5,y:f.netTop+40,vx:220,vy:0,serveCrossed:true});
g.update(1/60,idle);assert.ok(g.inspectMatch().ball.vx<0,'left net face reverses incoming ball');
const contacts=g.inspectMatch().netContacts;for(let i=0;i<10;i++)g.update(1/120,idle);
assert.equal(g.inspectMatch().netContacts,contacts,'ball must leave net face without repeated flips');
console.log(`G05 volley PASS: ${serves} both-side serves + ${returns} standing J returns, 6 viewports, 3 difficulties, 4 frame rates; net rebound exits cleanly.`);
