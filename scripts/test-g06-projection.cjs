'use strict';
const assert=require('node:assert/strict'),{setup}=require('./lib/race-probe.cjs');
const g=setup({chapter:5,sourceRoot:process.env.RACE_ROOT}).g;g.testPlace({distance:1012.25,keepTraffic:true});
assert(g.testRenderGeometry().strips.some(s=>s.world===1008&&s.visible),'partially visible near-plane road cannot disappear when its center is behind the camera');
let checks=1;
for(let chapter=1;chapter<=5;chapter++)for(const [w,h]of [[960,540],[640,800]]){
 const v=setup({chapter,sourceRoot:process.env.RACE_ROOT}).g;v.w=w;v.h=h;
 let prior;
 for(let n=0;n<1000;n++){
  const distance=n*1.2;v.testPlace({distance,keepTraffic:true});const p=v.testRenderGeometry();
  assert(p.polygons.flat().every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.scale>0),'all clipped vertices remain finite');
  assert(Math.abs(p.tyre.y-h*.82)<1e-7,'tyres stay on the original road anchor through every crest');
  assert(p.strips.every(s=>Number.isFinite(s.clip)&&s.clip>=0&&s.clip<=h),'bounded crest depth mask');
  if(prior)assert(Math.abs(p.tyre.x-prior.x)<w*.02&&Math.abs(p.tyre.y-prior.y)<.001,'continuous grounded camera, no sudden jump');
  prior=p.tyre;checks+=4;
 }
}
console.log('G06 PROJECTION PASS '+checks+' checks / 10000 five-track portrait/landscape poses');
