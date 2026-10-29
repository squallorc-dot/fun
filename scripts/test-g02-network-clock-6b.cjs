'use strict';
const assert=require('node:assert/strict'),{shooter}=require('./lib/arcade-engine-probe.cjs');
(async()=>{
 const host=await shooter({hero:0,coopHero:3,networkHost:true});
 assert.equal(host.rafCalls,0,'network-controlled G02 must not schedule its own physics loop');
 const before=host.coopSnapshot().game;
 assert.equal(host.networkStep({moveX:2},{}),false);
 assert.equal(host.coopSnapshot().game.t,before.t,'invalid inputs cannot advance physics');
 assert(host.networkStep({moveX:-.5,dodge:true,fire:true},{moveX:.5,fire:true}));assert(host.coopSnapshot().game.p.dvx<0,'host dash follows network movement');
 for(let i=1;i<240;i++)assert(host.networkStep({moveX:-.5,fire:true},{moveX:.5,fire:true}));
 const after=host.coopSnapshot().game;
 assert(Math.abs(after.t-2)<1e-9,'one command advances exactly one 120 Hz physics step');
 assert(after.p.x<before.p.x&&after.p2.x>before.p2.x,'both players move independently');
 assert(after.projectiles.some(p=>p.owner===0)&&after.projectiles.some(p=>p.owner===1),'both players shoot');
 assert(host.networkPause(true));assert(!host.networkStep({},{}));assert.equal(host.coopSnapshot().game.t,after.t);
 assert(host.networkPause(false));assert(host.networkStep({},{}));assert.equal(host.rafCalls,0,'resuming must not schedule a competing loop');
 const solo=await shooter();assert(solo.rafCalls>0,'single player retains its original RAF loop');
 console.log('G02 NETWORK CLOCK PASS: host-only fixed steps, input validation, pause/resume and solo RAF');
})().catch(e=>{console.error(e);process.exitCode=1;});
