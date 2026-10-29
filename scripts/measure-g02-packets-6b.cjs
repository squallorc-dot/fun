/* Sample real G02 states without setting gameplay state. This is not an upper bound. */
'use strict';
const fs=require('node:fs');
const {shooter}=require('./lib/arcade-engine-probe.cjs');
const LIMIT=32768;
(async()=>{
 const rows=[];
 for(const difficulty of ['normal','hard','expert'])for(let chapter=1;chapter<=5;chapter++){
  const g=await shooter({hero:1,coopHero:3,chapter,difficulty,seed:7});
  let max=0,over=0,samples=0,maxAt=null,frame=0;
  for(;frame<3600;frame++){
   g.setKeys([' ',...([['d'],['s'],['a'],['w']][Math.floor(frame/90)%4])]);
   g.setRemoteInput({moveX:.4,moveY:.4,fire:true,skill:frame%90===0,dodge:frame%120===0});
   g.loop((frame+1)/30*1000);
   if(frame%2===0){
    const state=g.coopSnapshot();
    // This models a frame envelope, not a network exchange; exact size depends on the eventual adapter.
    const bytes=JSON.stringify({v:1,sid:'a'.repeat(32),seq:100000,type:'frame',data:{epoch:1,tick:frame*4,phase:'playing',countdown:0,ack:frame,state}}).length;
    samples++;if(bytes>LIMIT)over++;if(bytes>max){max=bytes;maxAt={frame,phase:state.phase,enemies:state.game.enemies.length,fx:state.game.fx.length};}
   }
   if(['victory','defeat'].includes(g.state().phase))break;
  }
  rows.push({chapter,difficulty,seed:7,frames:frame+1,samples,maxCodeUnits:max,overLimit:over,maxAt,phase:g.state().phase});
 }
 const result={method:'Seeded real 120 Hz G02 physics, two scripted players, 30 FPS rendering, sample every second render, max 120 seconds; JSON length in UTF-16 code units as enforced by peer-link; synthetic envelope, no RTC; not a worst-case bound',limit:LIMIT,rows};
 fs.mkdirSync('arcade/qa/friends-v16/results',{recursive:true});
 fs.writeFileSync('arcade/qa/friends-v16/results/g02-packet-samples.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
