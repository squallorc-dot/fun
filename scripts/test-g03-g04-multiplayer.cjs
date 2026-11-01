'use strict';
// Genuine two independent game engines, deterministic host authority, mirrored
// guest rendering, score synchronization, shared finish and hostile packet rejection.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root={},cx={window:root,Math,structuredClone,performance:{now:()=>12345},console,setTimeout,clearTimeout};
for(const name of ['games-core.js','g03-g04-network.js'])
 vm.runInNewContext(fs.readFileSync('arcade/assets/'+name,'utf8'),cx,{filename:name});
let checks=0;const check=(ok,msg)=>{assert(ok,msg);checks++};
for(const [game,mode] of [['g03','stairs'],['g04','pinball']]){
 const M=game==='g03'?root.BioG03Network:root.BioG04Network;
 for(const chapter of [1,2,3,4,5]){
  let finished=0;
  const common={mode,chapter,hero:0,remoteHero:3,difficulty:'normal',locale:'zh',testMode:true};
  const host=new M.Adapter({...common,host:true,finish:()=>finished++});
  const guest=new M.Adapter({...common,host:false});
  check(M.input({moveX:.5,fire:true,jump:false}),'known input allowed');
  check(M.EDGES.includes(game==='g03'?'down':'skill'),'solo button action edge must synchronize through host authority');
  check(M.input(game==='g03'?{moveX:0,down:true,jump:false}:{moveX:0,fire:false,skill:true}),'G03/G04 solo-equivalent mobile action accepted by multiplayer');
  check(!M.input({moveX:99,override:true}),'forged input blocked');
  check(JSON.stringify(host.capture()).length<29000,'two independent boards fit authenticated Relay transport');
  for(let i=0;i<240;i++){
   const local=game==='g03'?{moveX:1,right:true,jump:i===8}:{moveX:1,fire:i===130};
   const remote=game==='g03'?{moveX:-1,left:true,jump:i===10}:{moveX:-1,fire:i===145};
   host.step(1/120,local,remote);
  }
  const state=host.capture();
  check(M.snapshot(state),'live host snapshot is valid');
  if(game==='g03'){
   check(state.boards[0].player.x!==state.boards[1].player.x,'individual G03 controls move two different guardians');
   check(state.boards[0].depth!==state.boards[1].depth||state.boards[0].player.x!==state.boards[1].player.x,'independent G03 state');
  }else{
   check(state.boards[0].shotsFired===1&&state.boards[1].shotsFired===1,'both players actually fire their own pinballs');
   check(state.boards[0].angle!==state.boards[1].angle,'G04 aim is independent');
  }
  check(guest.receive(240,state),'guest receives validated host snapshot');
  check(JSON.stringify(guest.capture().boards)===JSON.stringify(state.boards),'guest view mirrors both authoritative boards');
  check(!guest.receive(239,state),'out-of-order state rejected');
  const invalid=structuredClone(state);invalid.scores[1].score=1e20;
  check(!guest.receive(241,invalid),'invalid score cannot overwrite guest render');
  check(!M.snapshot({...state,ended:true,finished:false}),'forged final packet rejected');
  // Real terminal transitions: first player to complete/fail freezes BOTH worlds
  // and both clients derive an identical joint scoreboard and winner.
  if(game==='g03'){
   host.games[0].testFreeFall();
   for(let i=0;i<6000&&!host.game._finished;i++)host.step(1/120,{},{});
  }else{
   for(let stage=0;stage<3&&!host.game._finished;stage++){
    host.games[0].testClearStage();host.step(1/120,{},{});
   }
  }
  const end=host.capture();
  check(end.finished&&end.ended&&end.endedBy!==null,'first finisher terminates both boards');
  check(finished===1,'only one shared result callback');
  check(M.snapshot(end),'shared final snapshot validated');
  check(guest.receive(6500,end,true),'guest accepts final reliable result');
  check(JSON.stringify(host.result(end))===JSON.stringify(guest.result(end)),'both players receive identical final scoreboard');
  check(host.result(end).players.length===2,'both scores retained at shared freeze');
  host.dispose();guest.dispose();
 }
 console.log('PASS '+game+' independent controls, authority, both views, five chapters and joint settlement');
}
console.log('PASS G03/G04 multiplayer network '+checks+' assertions');
