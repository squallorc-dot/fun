// Isolate the reported failure before and after physics, then after new grids.
// Each variant starts normally; no placement, damage or result setter is used.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),samples=[];
for(const [label,ref]of [['main-baseline','8314ab5'],['physics-with-original-grid','958a67b'],['integrated',null]]){
 const source=ref?execFileSync('git',['show',ref+':arcade/assets/games-core.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8');let seed=7,result,ticks=0;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const window={};Function('window','Math',source)(window,math);const g=window.BioSuiteGames.g06({hero:0,chapter:5,difficulty:'expert',sfx(){},finish:(...r)=>{result=r;}});g.w=960;g.h=540;g.start();const initial=g.inspectRace();for(;ticks<120*180&&!result;ticks++)g.update(1/120,{});const s=g.inspectRace();if(!result)throw Error('unsettled '+label);
 samples.push({label,ref,sourceHash:crypto.createHash('sha256').update(source).digest('hex'),hero:0,seed:7,chapter:5,difficulty:'expert',input:{},physicsHz:120,initial:{progress:initial.progress,lane:initial.car.lane,rank:initial.rank},win:result[0],rank:s.rank,status:s.car.status,health:s.car.health,progress:s.progress,checkpoints:s.checkpointIndex,elapsed:s.elapsed,totalTime:g.raceResult().totalTime,ticks});
}
if(!samples[0].win||samples[1].win||samples[2].win)throw Error('reported failure or independent physics fix did not reproduce');
fs.writeFileSync(path.join(root,'arcade/docs/v1.5/batch5c-seed7-idle-20261028.json'),JSON.stringify(samples,null,2)+'\n');console.log('SEED7 CAUSAL PROBE PASS: original-grid physics fixes the zero-input podium before grid inheritance is added');
