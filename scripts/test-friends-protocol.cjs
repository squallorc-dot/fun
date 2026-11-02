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
 check(s.receive('input',d,'input'),'ordinary input accepted');check(!s.receive('input',d,'input'),'duplicate app sequence');check(s.receive('input',{...d,seq:1,tick:1400},'input'),'legitimate guest may advance while host rendering is throttled');
 for(const bad of [{...d,seq:2,epoch:0},{...d,seq:2,tick:2401},{...d,seq:2,tick:500},{...d,seq:2,input:{moveY:2}},{...d,seq:2,input:{points:[7,0]}},{...d,seq:2,edges:{fire:999,jump:0}}])check(!s.receive('input',bad,'input'),'stale/future/invalid/over-fast action rejected');
 check(!s.receive('frame',{epoch:1,tick:1000,state:{points:[7,0]}},'control'),'guest cannot author state');const y=s.adapter.game.inspectMatch().ai.y;now+=400;s.update(1/60);check(s.adapter.game.inspectMatch().ai.y===y,'stale input becomes neutral');now+=2200;s.update(1/60);check(s.phase==='paused'&&Object.keys(s.remote).length===0,'prolonged input silence still pauses safely');
 s.result={points:[7,0]};s.readyFlags=[true,true];s.clearRound();check(s.adapter===null&&s.result===null&&s.readyFlags.every(v=>!v)&&Object.keys(s.remote).length===0,'next game removes prior physics/input/result/readiness');s.leave();
}
// A new pairing must not inherit the previous game's adapter configuration.
{const s=new w.BioFriends.Session();s.config={game:'g06',mode:'race'};s.prepareAuto('host','test',0);check(s.config===null&&s.epoch===0,'automatic re-pair clears old game configuration');s.config={game:'g02',mode:'defense'};s.link.offer=async()=>'';s.host('test',0);check(s.config===null,'manual re-pair clears old game configuration');}
// Optional negotiated hero selection stays host-authoritative and clears old readiness.
// RTC can deliver control messages before the second channel's onopen callback.
// The guest must defer the hello/config until it can send its acknowledgement.
{const h=new w.BioFriends.Session(),g=new w.BioFriends.Session(),wire=[];h.role='host';g.role='guest';h.hero=0;g.hero=3;h.room=g.room='';
 for(const s of [h,g]){s.link.state='pairing';s.link.sid='a'.repeat(32);}
 const channels=[];for(const [s,other]of [[h,g],[g,h]]){const pair={};for(const label of ['control','input']){const dc={label,readyState:'connecting',bufferedAmount:0,send(text){wire.push(()=>other.link.channels[label].onmessage({data:text}));},close(){this.readyState='closed';}};s.link.attach(dc);pair[label]=dc;}channels.push(pair);}
 channels[0].control.readyState=channels[0].input.readyState='open';channels[0].input.onopen();
 channels[1].control.readyState='open';while(wire.length)wire.shift()();
 check(g.peerHello==null&&g.link.earlyMessages.length>0,'early hello waits for both native channels');
 channels[1].input.readyState='open';channels[1].input.onopen();while(wire.length)wire.shift()();
 check(h.configAck&&g.configAck&&h.phase==='lobby'&&g.phase==='lobby','staggered channel opening completes real protocol acknowledgement');
 check(g.link.stats.rejected===0&&g.link.earlyMessages.length===0,'buffer drained without protocol rejection');h.leave();g.leave();
}
{const h=new w.BioFriends.Session(),g=new w.BioFriends.Session(),tag=w.BioG05Network.TAG;h.role='host';g.role='guest';h.hero=0;g.hero=3;h.room=g.room='';h.phase=g.phase='lobby';h.epoch=g.epoch=1;h.link.state=g.link.state='connected';h.peerHello={hero:3,games:g.capabilities};g.peerHello={hero:0,games:h.capabilities};const config={game:'g05',mode:'pong',engine:tag,heroes:[0,3],room:'',epoch:1};h.config=structuredClone(config);g.config=structuredClone(config);h.configAck=g.configAck=true;h.link.send=(t,d)=>g.receive(t,d,'control');g.link.send=(t,d)=>h.receive(t,d,'control');
 check(g.setHero(5),'guest requests hero selection');check(h.config.heroes[1]===5&&g.config.heroes[1]===5&&g.hero===5,'host confirms guest hero');check(h.setHero(2),'host changes hero');check(h.config.heroes[0]===2&&g.config.heroes[0]===2&&g.peerHello.hero===2,'both accept host hero');g.readyFlags[1]=true;check(!g.setHero(1),'cannot change hero when ready');g.readyFlags[1]=false;check(!g.setHero(7),'reject invalid hero');}
// Simultaneous selections can cross while configurations remain ordered.
{const h=new w.BioFriends.Session(),g=new w.BioFriends.Session(),tag=w.BioG05Network.TAG,hostWire=[],guestWire=[];h.role='host';g.role='guest';h.hero=0;g.hero=3;h.room=g.room='';h.phase=g.phase='lobby';h.epoch=g.epoch=1;h.link.state=g.link.state='connected';h.peerHello={hero:3,games:g.capabilities};g.peerHello={hero:0,games:h.capabilities};const config={game:'g05',mode:'pong',engine:tag,heroes:[0,3],room:'',epoch:1};h.config=structuredClone(config);g.config=structuredClone(config);h.configAck=g.configAck=true;h.link.send=(t,d)=>{hostWire.push([t,d]);return true;};g.link.send=(t,d)=>{guestWire.push([t,d]);return true;};check(g.setHero(5)&&h.setHero(2),'simultaneous hero requests accepted');const request=guestWire.shift();check(h.receive(request[0],request[1],'control'),'host accepts prior-epoch guest request');for(const [t,d] of hostWire)check(g.receive(t,d,'control'),'guest accepts ordered host updates');for(const [t,d] of guestWire)h.receive(t,d,'control');check(h.config.heroes.join(',')==='2,5'&&g.config.heroes.join(',')==='2,5'&&h.configAck,'simultaneous changes converge');}
// Starting a round requires a real guest adapter acknowledgement before the
// host advances physics or exposes a one-sided game. Exercise delayed Safari-like
// creation, wrong-epoch ACK, and transport send failure without faking results.
{const h=new w.BioFriends.Session(),g=new w.BioFriends.Session(),tag=w.BioG05Network.TAG,wire=[];
 for(const [s,role,selected] of [[h,'host',0],[g,'guest',3]]){
  s.role=role;s.hero=selected;s.room='';s.link.state='connected';
  s.phase='lobby';s.epoch=9;s.readyFlags=[true,true];s.configAck=true;
  s.config={game:'g05',mode:'pong',engine:tag,heroes:[0,3],room:'',epoch:9};
 }
 h.link.send=(type,data,fast)=>{wire.push([g,type,structuredClone(data),fast]);return true;};
 g.link.send=(type,data,fast)=>{wire.push([h,type,structuredClone(data),fast]);return true;};
 h.tryStart();
 check(h.startPending&&h.phase==='countdown','host waits for guest real adapter creation');
 h.update(1/30);check(h.tick===0,'no host game steps before guest acknowledges');
 check(!h.receive('start-ack',{epoch:8},'control'),'stale start acknowledgment rejected');
 const first=wire.shift();check(first[1]==='start'&&g.receive(first[1],first[2],'control'),'guest receives actual start and creates game');
 check(g.adapter!==null&&g.phase==='countdown','guest game adapter created before confirming start');
 check(h.startPending&&h.tick===0,'host cannot enter game before ACK delivery');
 const ack=wire.shift();check(ack[1]==='start-ack'&&h.receive(ack[1],ack[2],'control'),'host accepts guest start acknowledgment');
 check(!h.startPending,'host startup barrier is released by real guest ACK');
 h.update(1/30);check(h.tick>0,'host resumes simulation after both peers are in game');
 h.leave();g.leave();
}
{const h=new w.BioFriends.Session(),tag=w.BioG05Network.TAG;
 h.role='host';h.hero=0;h.epoch=2;h.phase='lobby';h.configAck=true;h.readyFlags=[true,true];h.link.state='connected';
 h.config={game:'g05',mode:'pong',engine:tag,heroes:[0,3],room:'',epoch:2};
 h.link.send=()=>false;h.tryStart();
 check(h.link.state==='start-failed'&&h.phase==='disconnected'&&!h.startPending,'failed start packet safely ends one-sided round');
 h.leave();
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

// Continue from a finished score directly, without returning to the lobby and
// requiring two more manual ready clicks. This unit probe never opens RTC.
(async()=>{
 const h=new w.BioFriends.Session(),g=new w.BioFriends.Session(),tag=w.BioG05Network.TAG,wire=[];
 for(const [s,role,hero] of [[h,'host',0],[g,'guest',3]]){
  s.role=role;s.hero=hero;s.room='';s.epoch=4;s.phase='finished';s.resultCount=1;
  s.result={points:[7,6],winner:0};s.link.state='connected';s.peerHello={hero:role==='host'?3:0,games:s.capabilities};
  s.config={game:'g05',mode:'pong',engine:tag,heroes:[0,3],room:'',epoch:4};s.configAck=true;
 }
 h.link.send=(type,data,fast)=>{wire.push([g,type,structuredClone(data),fast]);return true;};
 g.link.send=(type,data,fast)=>{wire.push([h,type,structuredClone(data),fast]);return true;};
 const drain=()=>{let count=0;while(wire.length&&count++<30){const [target,type,data,fast]=wire.shift();check(target.receive(type,data,fast?'input':'control'),'direct continuation packet '+type);}check(count<30,'finite continuation traffic');};
 check(g.next(),'guest can request the next round');check(g.nextRequested,'guest waits for host');
 drain();check(h.config.epoch===5&&g.config.epoch===5&&h.config.continuation&&g.config.continuation,'epoch and continuation synchronize without manual lobby');
 // Each side prepares existing assets automatically and votes once.
 for(let i=0;i<8;i++){await new Promise(resolve=>setImmediate(resolve));drain();if(h.phase==='countdown'&&g.phase==='countdown')break;}
 check(h.phase==='countdown'&&g.phase==='countdown','automatic ready produces three-second countdown on both peers');
 check(h.readyFlags.every(Boolean)&&g.readyFlags.every(Boolean),'both parties agree to the continued round automatically');
 check(!h.next()&&!g.next(),'duplicate next-round actions rejected');
 h.leave();g.leave();
 console.log('PASS FRIENDS DIRECT NEXT: guest request, host epoch, automatic bilateral preparation and countdown');
})().catch(error=>{console.error(error);process.exitCode=1;});
