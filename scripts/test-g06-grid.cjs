'use strict';
const assert=require('node:assert/strict'),{setup}=require('./lib/race-probe.cjs');let checks=0;
for(let chapter=1;chapter<=5;chapter++)for(let slot=1;slot<=6;slot++){
 const grid=['ai-0','ai-1','ai-2','ai-3','ai-4'];grid.splice(slot-1,0,'player');const {g}=setup({chapter,grid}),s=g.inspectRace(),cars=[s.car,...s.traffic.filter(r=>r.type==='car')];
 assert(s.rank===slot&&s.gridPosition===slot,'ranking matches the real starting slot');
 assert(cars.every(r=>r.z===[24,20,16,12,8,0][grid.indexOf(r.id)]&&r.lane===(grid.indexOf(r.id)%2?.6:-.6)),'all six cars occupy their physical grid positions');
 assert(new Set(cars.map(r=>r.z)).size===6,'no display-only or overlapping longitudinal slots');
 assert(s.passes===0&&s.events.length===0&&cars.every(r=>r.overtakes===0),'grid placement is never counted as passing');
 for(let tick=0;tick<359;tick++)g.update(1/120,{});assert(g.inspectRace().progress===s.progress,'every slot obeys the full starting countdown');checks+=5;
}
const a=setup({grid:['player','player']}).g.inspectRace(),b=setup().g.inspectRace();assert(JSON.stringify(a)===JSON.stringify(b),'invalid or legacy grid data uses the safe sixth-place default');checks++;
console.log('G06 GRID PASS '+checks+' actual-coordinate / countdown / zero-phantom-pass checks');
