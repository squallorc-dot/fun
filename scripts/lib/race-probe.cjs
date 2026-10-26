'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8'),runtime=fs.readFileSync(path.join(root,'arcade/assets/session-runtime.js'),'utf8');
function setup({chapter=1,difficulty='normal',seed=7}={}){
 let n=seed>>>0;const math=Object.create(Math);math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const ctx={window:{},Math:math};vm.runInNewContext(runtime,ctx);vm.runInNewContext(source,ctx);let result;
 const g=ctx.window.BioSuiteGames.g06({chapter,difficulty,hero:3,testMode:true,sfx(){},finish:(...args)=>{result=args;}});g.w=960;g.h=540;g.start();
 return {g,clock:ctx.window.BioArcadeSession.simulation(),result:()=>result};
}
function pilot(state,{slow=false}={}){
 const r=state,car=r.car,wrap=d=>((d+600)%1200+1200)%1200-600;
 const obstacles=r.traffic.filter(o=>o.status!=='finished'&&o.status!=='dnf'&&!o.hit&&wrap(o.z-r.progress)>-5&&wrap(o.z-r.progress)<65);
 const cost=lane=>Math.abs(lane)*2+Math.abs(lane-car.lane)*4+obstacles.reduce((sum,o)=>sum+(Math.abs(o.lane-lane)<.38?Math.max(0,65-wrap(o.z-r.progress)):0),0);
 const target=[0,-.65,.65].sort((a,b)=>cost(a)-cost(b))[0];
 const bend=r.roadBend,comp=bend*Math.pow(car.speed/80,2)*(r.chapter===1?.16:.11)/(.9*(.65+car.speed/100));
 return {moveX:Math.max(-1,Math.min(1,(target-car.lane)*3+comp)),down:car.speed>(r.cornerAhead>.9?78:r.cornerAhead>.65?86:98)||slow&&r.elapsed>7&&r.elapsed%3<.9,fire:!slow&&r.cornerAhead<.65&&r.nitro>10,pointer:{down:false}};
}
module.exports={setup,pilot};
