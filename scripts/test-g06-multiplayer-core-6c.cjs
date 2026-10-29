'use strict';
const assert=require('node:assert/strict'),{setup}=require('./lib/race-probe.cjs');
let cases=0;
for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert']){
 const g=setup({chapter,difficulty,multiplayer:true,hero:0,remoteHero:6}).g,initial=g.inspectRace();
 let field=initial.standings;assert.equal(field.length,6);assert.equal(field.filter(x=>x.human).length,2);assert.equal(field.filter(x=>x.id.startsWith('ai-')).length,4);
 assert.equal(new Set(initial.grid).size,6);assert(initial.grid.includes('guest'));
 assert.equal(g.setRemoteInput({moveX:2}),false);assert.equal(g.setRemoteInput({score:1}),false);
 assert(g.setRemoteInput({moveX:.5,up:true,fire:true}));for(let i=0;i<600;i++)g.update(1/120,{down:true});
 const s=g.inspectRace(),guest=s.traffic.find(x=>x.id==='guest');assert(guest&&guest.remote&&guest.model===6);assert(guest.z>initial.standings.find(x=>x.id==='guest').progress+5,'guest accelerates independently');assert.equal(s.car.speed,0,'host braking does not stop guest');assert(guest.nitro<100,'guest boost consumes its own nitro');assert.equal(s.standings.length,6);g.setRemoteInput({});for(let i=0;i<360;i++)g.update(1/120,{down:true});assert.equal(g.inspectRace().traffic.find(x=>x.id==='guest').speed,0,'neutral input cannot leave throttle held');cases++;
}
const solo=setup().g;assert.equal(solo.setRemoteInput({fire:true}),false);assert.equal(solo.inspectRace().standings.filter(x=>x.id.startsWith('ai-')).length,5);
for(const fps of [10,15,30,60,120,240]){
 const g=setup({chapter:2,multiplayer:true}).g;g.setRemoteInput({moveX:0,up:true,fire:true});for(let i=0;i<fps*10;i++)g.update(1/fps,{});const s=g.inspectRace(),r=s.traffic.find(x=>x.id==='guest');
 if(fps===10)global.reference={progress:s.progress,guest:r.z,speed:r.speed,nitro:r.nitro};else for(const [k,v]of Object.entries({progress:s.progress,guest:r.z,speed:r.speed,nitro:r.nitro}))assert(Math.abs(v-global.reference[k])<1e-6,`${fps} fps ${k}`);
}
console.log(`G06 MULTIPLAYER CORE PASS: ${cases} chapter/difficulty cases, two real input paths, four AI, 10–240 FPS`);
