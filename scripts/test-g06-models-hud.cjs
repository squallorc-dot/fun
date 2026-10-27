'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),{setup}=require('./lib/race-probe.cjs');let checks=0;const shapes=[],names=[];
for(let hero=0;hero<7;hero++){
 const {g}=setup({hero}),commands=[],target={createLinearGradient:()=>({addColorStop(){}})};
 const ctx=new Proxy(target,{get:(o,k)=>k in o?o[k]:(...a)=>{if(['moveTo','lineTo','arc','ellipse','rect','fillRect','quadraticCurveTo','bezierCurveTo'].includes(k))commands.push([k,...a]);}});
 g.testPlace({distance:100,speed:82,keepTraffic:true});g.draw(ctx);const info=g.inspectVehicle();assert(info.collisionWidth===1.75&&info.zh&&info.ja,'localized original car has the common footprint');names.push(info.kind);shapes.push(crypto.createHash('sha256').update(JSON.stringify(commands)).digest('hex'));checks++;
}
assert(new Set(shapes).size===7&&new Set(names).size===7,'seven silhouettes differ even when all paint colors and text are ignored');checks++;
{
 const {g}=setup(),ids=g.inspectRace().traffic.filter(r=>r.type==='car').map(r=>r.id);g.testRaceState({player:{z:500,speed:70,sectorTimes:[5]},rivals:ids.map((id,i)=>({id,z:i===0?520:i===1?490:100-i*10,speed:80,lane:i===1?-.5:.5,sectorTimes:[i===0?4.5:5.5]}))});const watch=g.inspectAwareness();assert(watch.ahead.metres===20&&watch.behind.metres===10,'HUD gaps use actual total track progress');assert(watch.ahead.checkpointSeconds===.5&&watch.behind.checkpointSeconds===.5,'HUD seconds use actual common gate crossing timestamps');assert(watch.threats.some(r=>r.id===ids[1]&&r.side==='left'),'rear warning uses a real closing rival and its side');checks+=3;
}
for(const [w,h]of [[960,540],[640,800]]){const {g}=setup({chapter:5});g.w=w;g.h=h;let before;
 for(let tick=0;tick<500;tick++){g.testPlace({distance:960+tick*.2,speed:74,keepTraffic:true});g.testRaceState({player:{steer:Math.sin(tick*.01)*.75}});const p=g.testRenderGeometry().tyre;assert(Math.abs(p.y-h*.82)<1e-6,'steering camera keeps tyre contact at the real road surface');if(before)assert(Math.abs(p.x-before.x)<w*.01,'camera lateral movement remains continuous');before=p;checks++;}
}
console.log('G06 MODELS / HUD PASS '+checks+' shape, equal-footprint, real-gap and continuous-camera checks');
