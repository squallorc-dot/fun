'use strict';
const assert=require('node:assert/strict'),{shooter}=require('./lib/arcade-engine-probe.cjs');
(async()=>{
 const g=await shooter({hero:0,coopHero:3,seed:7,networkHost:true});
 for(let i=0;i<14400;i++){
  const [x,y]=[[.6,0],[0,-.6],[-.6,0],[0,.6]][Math.floor(i/360)%4];
  if(!g.networkStep({moveX:x,moveY:y,fire:true,skill:i%360===0},{moveX:-x,moveY:-y,fire:true,skill:i%360===0}))break;
  if(['victory','defeat'].includes(g.state().phase))break;
 }
 assert.equal(g.state().phase,'victory','real co-op gameplay reaches the result');
 assert(!g.telemetry().some(e=>['game_started','game_completed'].includes(e.event)),'co-op must not emit single-player analytics');
 assert.equal(g.stored('bio-city-arcade-high-v1'),null,'co-op must not update single-player high score');
 console.log('G02 COOP ISOLATION PASS: genuine engine victory does not write solo score or single-player events');
})().catch(e=>{console.error(e);process.exitCode=1;});
