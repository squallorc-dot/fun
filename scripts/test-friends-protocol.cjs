// Pure format/state unit probes. They do not substitute for native RTC browser tests.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');let now=1000,checks=0;const w={},cx={window:w,Math,structuredClone,performance:{now:()=>now},setTimeout,clearTimeout};
for(const name of ['session-runtime.js','games-core.js','peer-link.js','g05-network.js','friend-session.js'])vm.runInNewContext(fs.readFileSync('arcade/assets/'+name,'utf8'),cx);
const check=(v,s)=>{assert(v,s);checks++;};
for(const text of ['x','{}','null','<script>',' '.repeat(120001),JSON.stringify({v:2,kind:'offer',sid:'a'.repeat(32),sdp:'v=0\r\n'})]){assert.throws(()=>w.BioPeer.description(text,'offer'));checks++;}
{
 const link=new w.BioPeer.Link();link.sid='a'.repeat(32);const packet=(seq=0,changes={})=>JSON.stringify({v:1,sid:link.sid,seq,type:'sample',data:{},...changes});
 for(const raw of ['bad','null','x'.repeat(32769),new Uint8Array(2),packet(0,{v:2}),packet(0,{sid:'b'.repeat(32)}),packet(0,{seq:1e9}),packet(0,{extra:true})]){const n=link.stats.rejected;link.receive('input',raw);check(link.stats.rejected===n+1,'malformed wire data rejected');}
 let accepted=0;link.onMessage=()=>{accepted++;return true;};link.receive('input',packet());check(accepted===1,'valid bounded packet');link.receive('input',packet());check(accepted===1,'duplicate sequence');link.receive('input',packet(1));check(accepted===2,'next sequence');link.receive('input',packet(0));check(accepted===2,'late out-of-order sequence');
 for(let i=2;i<300;i++)link.receive('input',packet(i));check(accepted<151,'wire receive frequency bounded');now+=1001;link.receive('input',packet(300));check(link.received.input===300,'rate bucket recovers after abuse');link.close();check(link.timers.size===0&&!link.pc,'close clears lifecycle');
}
for(const mode of ['pong','volley']){
 const s=new w.BioFriends.Session();s.role='host';s.hero=0;s.epoch=1;s.config={game:'g05',mode,heroes:[0,3]};s.createRound();s.phase='playing';s.countdown=0;s.tick=1000;
 const d={epoch:1,seq:0,tick:1000,input:{moveY:1,fire:true},edges:{fire:1,jump:0}};
 check(s.receive('input',d,'input'),'ordinary input accepted');check(!s.receive('input',d,'input'),'duplicate app sequence');
 for(const bad of [{...d,seq:1,epoch:0},{...d,seq:1,tick:1400},{...d,seq:1,tick:500},{...d,seq:1,input:{moveY:2}},{...d,seq:1,input:{points:[7,0]}},{...d,seq:1,edges:{fire:999,jump:0}}])check(!s.receive('input',bad,'input'),'stale/future/invalid/over-fast action rejected');
 check(!s.receive('frame',{epoch:1,tick:1000,state:{points:[7,0]}},'control'),'guest cannot author state');const y=s.adapter.game.inspectMatch().ai.y;now+=400;s.update(1/60);check(s.adapter.game.inspectMatch().ai.y===y,'stale input becomes neutral');now+=400;s.update(1/60);check(s.phase==='paused'&&Object.keys(s.remote).length===0,'input silence pauses safely');
 s.result={points:[7,0]};s.readyFlags=[true,true];s.clearRound();check(s.adapter===null&&s.result===null&&s.readyFlags.every(v=>!v)&&Object.keys(s.remote).length===0,'next game removes prior physics/input/result/readiness');s.leave();
}
// Host adapter physics runs at the original shared 120Hz, independent of render FPS.
for(const mode of ['pong','volley']){let expected;
 for(const fps of [10,15,30,60,120,240]){
  let seed=7,tick=0;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const scope={};Function('window','Math',fs.readFileSync('arcade/assets/games-core.js','utf8'))(scope,math);const game=scope.BioSuiteGames.g05({hero:0,remoteHero:3,mode,multiplayer:true,sfx(){},finish(){}});game.w=640;game.h=480;game.start();const clock=w.BioArcadeSession.simulation();
  for(let frame=0;frame<fps*180&&!game._finished;frame++)clock.advance(1/fps,dt=>{const time=tick/120;game.setRemoteInput({moveX:Math.cos(time),moveY:Math.cos(time),fire:tick%70<12,jump:tick%100<10});game.update(dt,{moveX:Math.sin(time),moveY:Math.sin(time),fire:tick%60<12,jump:tick%120<10});tick++;return !game._finished;});
  check(game._finished,'real match completes at '+fps+' FPS');const hash=crypto.createHash('sha256').update(JSON.stringify({tick,state:game.networkSnapshot()})).digest('hex');if(expected)check(hash===expected,'10–240 FPS share identical host physics');else expected=hash;
 }
}
console.log('FRIENDS PROTOCOL PASS '+checks+' wire/schema/lifecycle/neutral-input/authority and identical-input FPS checks');
