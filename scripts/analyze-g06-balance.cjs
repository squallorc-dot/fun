// Real unmodified races, seeded once per race. No state/finish setters.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const {control}=require('./lib/race-strategies.cjs');
const root=path.resolve(process.env.RACE_ROOT||path.join(__dirname,'..')),label=process.env.RACE_LABEL||'after',count=Number(process.env.RACE_SEEDS||50),out=process.env.RACE_REPORT||path.join(__dirname,'../arcade/docs/v1.5/batch5c-balance-'+label+'-20261028.json');
const original=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8'),source=original.includes('roadPreview:')?original:original.replace('cornerAhead:cornerAt(progress,car.speed),',"cornerAhead:cornerAt(progress,car.speed),roadPreview:Array.from({length:9},(_,i)=>({distance:i*12,bend:trackAt(progress+i*12).bend})),"),instantiate=Function('window','Math',source),samples=[],strategies=process.env.RACE_STRATEGY?[process.env.RACE_STRATEGY]:['idle','basic','held','safe','skilled'];
for(const strategy of strategies){
 for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert'])for(let seed=1;seed<=count;seed++){
  let n=seed>>>0,result;const math=Object.create(Math);math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  const scope={window:{},Math:math};if(process.env.RACE_VM==='1')vm.runInNewContext(source,scope);else instantiate(scope.window,math);
  const g=scope.window.BioSuiteGames.g06({chapter,difficulty,hero:0,sfx(){},finish:(...r)=>{result=r;}});g.w=960;g.h=540;g.start();
  let input={},firstLead=null,step=0,previousEnergy=100,boostSeconds=0;const speeds={},telemetry=[];
  for(;step<120*180&&!result;step++){
   if(step%6===0){const s=g.inspectRace();input=control(s,strategy);if(s.phase!=='countdown'&&s.rank===1&&firstLead===null)firstLead=s.elapsed;
    if(step%120===0){for(const car of [s.car,...s.traffic.filter(c=>c.type==='car')]){const p=speeds[car.id]||(speeds[car.id]={sum:0,count:0,brake:0});p.sum+=car.speed;p.count++;p.brake+=car.braking?1:0;}if(seed===7)telemetry.push({time:s.elapsed,rank:s.rank,z:s.progress,speed:s.car.speed,lane:s.car.lane,nitro:s.nitro,corner:s.cornerAhead});}
    if(s.nitro<previousEnergy)boostSeconds+=.05;previousEnergy=s.nitro;
   }
   g.update(1/120,input);
  }
  if(!result)throw Error('Race never settled: '+[label,strategy,chapter,difficulty,seed]);
  const s=g.inspectRace(),r=g.raceResult(),afterLead=s.events.filter(e=>firstLead!==null&&e.time>firstLead),caught=afterLead.filter(e=>e.against==='player'),recaptured=afterLead.filter(e=>e.by==='player'&&caught.some(c=>c.by===e.against&&c.time<e.time));
  samples.push({strategy,chapter,difficulty,seed,win:!!result[0],rank:r.rank,status:r.status,time:r.totalTime,bestLap:r.bestLap,lapTimes:r.lapTimes,collisions:s.collisions,passes:r.passes,firstLead,caughtAfterLead:caught.length,recaptures:recaptured.length,aiPasses:s.events.filter(e=>e.by!=='player'&&e.against!=='player').length,boostSeconds,standings:r.standings,speeds,telemetry});
 }
 console.log('BALANCE '+label+' '+strategy+' '+15*count+' races complete');
}
const groups=[];for(const strategy of strategies)for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert']){
 const rows=samples.filter(s=>s.strategy===strategy&&s.chapter===chapter&&s.difficulty===difficulty),mean=k=>rows.reduce((n,r)=>n+(r[k]||0),0)/rows.length,finish=rows.filter(r=>r.time!==null);
 groups.push({strategy,chapter,difficulty,races:rows.length,podiumRate:mean('win'),meanRank:mean('rank'),finishRate:finish.length/rows.length,meanFinish:finish.length?finish.reduce((n,r)=>n+r.time,0)/finish.length:null,meanPasses:mean('passes'),meanCollisions:mean('collisions'),meanCaught:mean('caughtAfterLead'),meanRecaptures:mean('recaptures'),meanAiPasses:mean('aiPasses'),meanBoostSeconds:mean('boostSeconds')});
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.samples.json.gz',zlib.gzipSync(JSON.stringify(samples)));fs.writeFileSync(out,JSON.stringify({label,baseline:root,seedCount:count,physicsHz:120,controllerHz:20,completionPaths:samples.length,rawSamples:path.basename(out)+'.samples.json.gz',groups},null,2)+'\n');console.log('BALANCE REPORT '+out+' '+samples.length+' races');
