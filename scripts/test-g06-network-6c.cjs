'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{},Math,structuredClone,performance};for(const file of ['arcade/assets/games-core.js','arcade/assets/g06-network.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
const api=context.window.BioG06Network,host=new api.Adapter({mode:'race',hero:0,remoteHero:3,host:true}),guest=new api.Adapter({mode:'race',hero:0,remoteHero:3,host:false});
assert(api.input({moveX:.2,up:true}));assert(!api.input({moveX:2}));assert(!api.input({score:99}));
for(let tick=0;tick<720;tick++){
 host.step(1/120,{down:true},{up:true,fire:true,moveX:.1});
 if(tick%6===0){const state=host.capture();assert(api.snapshot(state,1),`host snapshot ${tick}`);assert(guest.receive(tick,state));}
}
const s=host.capture();assert(guest.receive(720,s,true));assert.deepEqual(JSON.parse(JSON.stringify(guest.game.inspectRace().standings)),JSON.parse(JSON.stringify(host.game.inspectRace().standings)));
const before=JSON.stringify(guest.game.inspectRace());guest.game.update(1,{fire:true});assert.equal(JSON.stringify(guest.game.inspectRace()),before,'guest cannot advance physics');
assert(!guest.receive(719,s));assert(!guest.receive(720,s));const bad=structuredClone(s);bad.car.speed=999;assert(!guest.receive(721,bad));
const forged=structuredClone(s);forged.standings[0].time=42;assert(!guest.receive(721,forged),'standing must match authoritative physical state');
assert.equal(api.snapshot({...s,extra:true},1),false);assert.deepEqual(JSON.parse(JSON.stringify(guest.result(s))),JSON.parse(JSON.stringify(host.result(s))));
for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert']){const h=new api.Adapter({mode:'race',hero:0,remoteHero:3,chapter,difficulty,host:true});for(let i=0;i<180;i++)h.step(1/120,{up:true},{up:true});assert(api.snapshot(h.capture(),chapter),`chapter ${chapter} ${difficulty}`);h.dispose();}
host.dispose();guest.dispose();console.log('G06 NETWORK ADAPTER PASS: validated host snapshots, guest render-only physics, stale and corrupt frames');
// Longer real engine run; no placement or result setters. This is not RTC.
const {control}=require('./lib/race-strategies.cjs');let completions=0;
const endurance=new api.Adapter({mode:'race',hero:0,remoteHero:3,host:true,finish:()=>completions++});
for(let tick=0;tick<120*112&&!endurance.game._finished;tick++){
 const a=control(endurance.game.inspectRace()),b=control(endurance.game.inspectGuestRace());endurance.step(1/120,{...a,up:true},{...b,up:true});
 if(tick%60===0)assert(api.snapshot(endurance.capture(),1),`full-race snapshot tick ${tick}`);
}
assert(endurance.game._finished&&completions===1,'real fixed-step race settles once');assert(api.snapshot(endurance.capture(),1),'final snapshot is valid');
const spectator=new api.Adapter({mode:'race',hero:0,remoteHero:3,host:false}),final=endurance.capture();assert(spectator.receive(20000,final,true));assert.deepEqual(JSON.parse(JSON.stringify(spectator.result(final))),JSON.parse(JSON.stringify(endurance.result(final))));assert.equal(final.standings.length,6);spectator.dispose();endurance.dispose();
console.log('G06 NETWORK ADAPTER RACE PASS: scripted fixed-step race and final state, no RTC');
