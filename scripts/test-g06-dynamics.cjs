'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {setup}=require('./lib/race-probe.cjs'),{control}=require('./lib/race-strategies.cjs');let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
const source=fs.readFileSync(path.join(__dirname,'../arcade/assets/games-core.js'),'utf8'),instantiate=Function('window','Math',source),scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../arcade/assets/session-runtime.js'),'utf8'),scope);
function race({chapter=5,difficulty='expert',hero=0,fps=120,tape=null,strategy='skilled'}={}){
 let seed=7,result;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const window={};instantiate(window,math);const g=window.BioSuiteGames.g06({chapter,difficulty,hero,sfx(){},finish:(...r)=>{result=r;}});g.start();const clock=scope.window.BioArcadeSession.simulation(),inputs=[];let ticks=0,input={};
 for(let frame=0;frame<fps*180&&!result;frame++)clock.advance(1/fps,dt=>{if(ticks%6===0){input=tape?tape[ticks/6]:control(g.inspectRace(),strategy);assert(input,'recorded input exhausted');inputs.push(input);}g.update(dt,input);ticks++;return !result;});
 return {result,state:g.inspectRace(),inputs,ticks};
}
const idle=race({strategy:'idle'});check(idle.result&&!idle.result[0]&&idle.state.rank>3,'chapter five seed seven expert cannot podium with zero inputs');
{
 const {g}=setup();let starts=0,previous=g.inspectRace();for(let tick=0;tick<120*18;tick++){const s=g.inspectRace();g.update(1/120,{...control(s,'held')});const next=g.inspectRace();if(next.car.boost&&!previous.car.boost){check(previous.nitro>=25-.001,'nitro needs a real recharge before a new burst');starts++;}previous=next;}check(starts===1&&!previous.car.boost,'holding an empty tank cannot automatically retrigger nitro');g.update(1/120,{fire:false});g.update(1/120,{fire:true});check(g.inspectRace().car.boost,'release and a new press can deliberately use the recharged tank');
}
{
 const {g}=setup({chapter:5});const ai=g.inspectRace().traffic.filter(r=>r.type==='car');g.testRaceState({player:{z:100,speed:0},rivals:[{id:ai[0].id,z:399.9,lane:1.2,speed:80}]});g.update(1/120,{down:true});const r=g.inspectRace().traffic.find(r=>r.id===ai[0].id);check(r.z<400&&r.checkpointIndex===0,'AI must return inside the road to clear the same gate as the player');
 const near=setup().g,ids=near.inspectRace().traffic.filter(r=>r.type==='car').map(r=>r.id);near.testRaceState({player:{z:100},rivals:[{id:ids[0],z:200,lane:0,speed:80,inv:.5},{id:ids[1],z:202,lane:0,speed:40,inv:.5}]});near.update(1/120,{down:true});const cars=near.inspectRace().traffic.filter(r=>ids.slice(0,2).includes(r.id));check(cars[0].speed<cars[1].speed&&cars.every(r=>r.health===100),'damage protection never disables physical car contact');
}
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');let paths=0;
for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert']){
 const canonical=race({chapter,difficulty});check(canonical.result?.[0]===true,'feasible skilled route '+chapter+'/'+difficulty);
 for(const fps of [10,15,30,60,120,240]){const r=fps===120?canonical:race({chapter,difficulty,fps,tape:canonical.inputs});check(hash({state:r.state,ticks:r.ticks,result:r.result,inputs:r.inputs})===hash({state:canonical.state,ticks:canonical.ticks,result:canonical.result,inputs:canonical.inputs}),'same recorded inputs at '+fps+' FPS '+chapter+'/'+difficulty);paths++;}
}
let heroHash;for(let hero=0;hero<7;hero++){const r=race({chapter:3,difficulty:'hard',hero});const value=hash(r);if(heroHash)check(value===heroHash,'all seven bodies share identical handling and collision physics');heroHash=value;}
console.log('G06 DYNAMICS PASS '+checks+' checks / '+paths+' identical-input cadence races / seven equal vehicles');
