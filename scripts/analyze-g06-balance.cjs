// Real unmodified races, seeded once per race. No state/finish setters.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {control}=require('./lib/race-strategies.cjs');
const strategySource=fs.readFileSync(path.join(__dirname,'lib/race-strategies.cjs'));
const root=path.resolve(process.env.RACE_ROOT||path.join(__dirname,'..')),label=process.env.RACE_LABEL||'after',count=Number(process.env.RACE_SEEDS||50),out=process.env.RACE_REPORT||path.join(__dirname,'../arcade/docs/v1.5/batch5c-balance-'+label+'-20261028.json');
const original=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8'),source=original.includes('roadPreview:')?original:original.replace('cornerAhead:cornerAt(progress,car.speed),',"cornerAhead:cornerAt(progress,car.speed),roadPreview:Array.from({length:9},(_,i)=>({distance:i*12,bend:trackAt(progress+i*12).bend})),"),diagnosticSource=source.replace('inspectRace(){return','inspectTrack:trackAt,inspectRace(){return'),instantiate=Function('window','Math',diagnosticSource),samples=[],strategies=process.env.RACE_STRATEGY?[process.env.RACE_STRATEGY]:['idle','basic','held','safe','skilled'];
for(const strategy of strategies){
 for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert'])for(let seed=1;seed<=count;seed++){
  let n=seed>>>0,result;const math=Object.create(Math);math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  const scope={window:{},Math:math};if(process.env.RACE_VM==='1')vm.runInNewContext(diagnosticSource,scope);else instantiate(scope.window,math);
  const g=scope.window.BioSuiteGames.g06({chapter,difficulty,hero:0,sfx(){},finish:(...r)=>{result=r;}});g.w=960;g.h=540;g.start();
  let input={},firstLead=null,step=0,previousEnergy=100,boostSeconds=0;const speeds={},telemetry=[],corners={};
  for(;step<120*180&&!result;step++){
   if(step%6===0){const s=g.inspectRace();input=control(s,strategy);if(s.phase!=='countdown'&&s.rank===1&&firstLead===null)firstLead=s.elapsed;
    if(step%120===0){for(const car of [s.car,...s.traffic.filter(c=>c.type==='car')]){const p=speeds[car.id]||(speeds[car.id]={sum:0,count:0,brake:0});p.sum+=car.speed;p.count++;p.brake+=car.braking?1:0;if(process.env.RACE_DETAILS==='1'){const bend=Math.abs(g.inspectTrack(car.z).bend),turn=bend>.7,entry=turn&&!corners[car.id],exit=!turn&&corners[car.id];p.cornerSum=(p.cornerSum||0)+(turn?car.speed:0);p.cornerCount=(p.cornerCount||0)+(turn?1:0);p.straightSum=(p.straightSum||0)+(bend<.35?car.speed:0);p.straightCount=(p.straightCount||0)+(bend<.35?1:0);p.entrySum=(p.entrySum||0)+(entry?car.speed:0);p.entryCount=(p.entryCount||0)+(entry?1:0);p.exitSum=(p.exitSum||0)+(exit?car.speed:0);p.exitCount=(p.exitCount||0)+(exit?1:0);corners[car.id]=turn;}}if(seed===7)telemetry.push({time:s.elapsed,rank:s.rank,z:s.progress,speed:s.car.speed,lane:s.car.lane,nitro:s.nitro,corner:s.cornerAhead,cars:process.env.RACE_DETAILS==='1'?[s.car,...s.traffic.filter(c=>c.type==='car')].map(c=>({id:c.id,z:c.z,lane:c.lane,speed:c.speed,braking:c.braking,boost:c.boost,nitro:c.nitro,bend:g.inspectTrack(c.z).bend})):undefined});}
    if(s.nitro<previousEnergy)boostSeconds+=.05;previousEnergy=s.nitro;
   }
   g.update(1/120,input);
  }
  if(!result)throw Error('Race never settled: '+[label,strategy,chapter,difficulty,seed]);
  const s=g.inspectRace(),r=g.raceResult(),afterLead=s.events.filter(e=>firstLead!==null&&e.time>firstLead),caught=afterLead.filter(e=>e.against==='player'),recaptured=afterLead.filter(e=>e.by==='player'&&caught.some(c=>c.by===e.against&&c.time<e.time));
  samples.push({strategy,chapter,difficulty,seed,win:!!result[0],rank:r.rank,status:r.status,time:r.totalTime,bestLap:r.bestLap,lapTimes:r.lapTimes,collisions:s.collisions,passes:r.passes,firstLead,caughtAfterLead:caught.length,recaptures:recaptured.length,aiPasses:s.events.filter(e=>e.by!=='player'&&e.against!=='player').length,boostSeconds,standings:r.standings,rivals:process.env.RACE_DETAILS==='1'?s.traffic.filter(c=>c.type==='car').map(c=>({id:c.id,lapTimes:c.lapTimes,health:c.health,nitro:c.nitro})):undefined,speeds,telemetry});
 }
 console.log('BALANCE '+label+' '+strategy+' '+15*count+' races complete');
}
const groups=[];for(const strategy of strategies)for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert']){
 const rows=samples.filter(s=>s.strategy===strategy&&s.chapter===chapter&&s.difficulty===difficulty),mean=k=>rows.reduce((n,r)=>n+(r[k]||0),0)/rows.length,finish=rows.filter(r=>r.time!==null);
 groups.push({strategy,chapter,difficulty,races:rows.length,podiumRate:mean('win'),firstPlaceRate:rows.filter(r=>r.rank===1&&r.status==='finished').length/rows.length,meanRank:mean('rank'),finishRate:finish.length/rows.length,meanFinish:finish.length?finish.reduce((n,r)=>n+r.time,0)/finish.length:null,meanPasses:mean('passes'),meanCollisions:mean('collisions'),meanCaught:mean('caughtAfterLead'),meanRecaptures:mean('recaptures'),meanAiPasses:mean('aiPasses'),meanBoostSeconds:mean('boostSeconds')});
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
if(hash(strategySource)!==hash(fs.readFileSync(path.join(__dirname,'lib/race-strategies.cjs')))||original!==fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8'))throw Error('Engine or controller changed during the balance run');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.samples.json.gz',zlib.gzipSync(JSON.stringify(samples)));fs.writeFileSync(out,JSON.stringify({label,baseline:root,sourceHash:hash(original),strategyHash:hash(strategySource),seedCount:count,physicsHz:120,controllerHz:20,completionPaths:samples.length,rawSamples:path.basename(out)+'.samples.json.gz',groups},null,2)+'\n');console.log('BALANCE REPORT '+out+' '+samples.length+' races');
