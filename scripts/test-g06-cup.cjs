'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
const source=fs.readFileSync(path.join(__dirname,'../arcade/assets/race-cup.js'),'utf8'),bag=new Map(),db={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,v)},w={localStorage:db};vm.runInNewContext(source,{window:w});const C=w.BioRaceCup;
function result(rank=1){const order=C.IDS.filter(id=>id!=='player');order.splice(rank-1,0,'player');return {rank,status:'finished',bestLap:15,passes:2,standings:order.map((id,i)=>({id,position:i+1,status:'finished',time:30+i}))};}
bag.set('bio_arcade_campaign_v11_g06_normal','{"unlocked":5,"best":99999,"wins":20}');const legacy=bag.get('bio_arcade_campaign_v11_g06_normal');
for(const difficulty of ['normal','hard','expert'])for(let hero=0;hero<7;hero++){
 let cup=C.fresh(difficulty,hero);check(C.gridFor(cup,1).at(-1)==='player','first round starts sixth');
 for(let chapter=1;chapter<=5;chapter++){
  const rank=(chapter-1)%3+1,grid=C.gridFor(cup,chapter),next=C.record(cup,chapter,result(rank),grid);check(next.rounds.length===chapter,'one real classification records one round');check(C.record(next,chapter,result(1),grid).rounds.length===chapter,'replay cannot add a second round');
  check(C.record(next,chapter+1,{...result(4),rank:4},C.gridFor(next,chapter+1)).rounds.length===chapter,'loss never awards points or unlocks next round');
  cup=C.save(next);check(C.read(difficulty,hero).rounds.length===chapter,'independent cup reload');if(chapter<5)check(C.gridFor(cup,chapter+1).indexOf('player')===rank-1,'actual grid order inherits first/second/third');
 }
 const rows=C.standings(cup);check(rows.length===6&&rows.every(r=>r.ranks.length===5),'five chapter final classification');check(rows.reduce((n,r)=>n+r.points,0)===155,'fixed 31 points per completed round');
}
check(bag.get('bio_arcade_campaign_v11_g06_normal')===legacy,'legacy campaign bytes remain untouched');
const id=C.key('normal',0);db.setItem(id,'broken-json');check(C.read('normal',0).rounds.length===0,'corrupt cup recovers safely');
let cup=C.record(C.fresh('normal',0),1,result(),C.DEFAULT);const privateDb={getItem:()=>null,setItem:()=>{throw Error('quota');}};C.save(cup,privateDb);check(C.read('normal',0,privateDb).rounds.length===1&&!C.isPersistent(privateDb),'write failure keeps this page cup and discloses volatility');
const denied={};Object.defineProperty(denied,'localStorage',{get(){throw Error('denied');}});vm.runInNewContext(source,{window:denied});denied.BioRaceCup.save(cup);check(denied.BioRaceCup.read('normal',0).rounds.length===1,'denied getter has an independent memory fallback');
db.setItem(id,'{"version":2,"future":true}');C.save(cup);check(JSON.parse(db.getItem(id)).version===2&&!C.isPersistent(),'unsupported future data is never overwritten');
check(C.record(C.fresh('normal',0),2,result(),C.DEFAULT).rounds.length===0,'cannot invent a missing earlier round');
const invalid=result();invalid.standings[1].id='player';check(C.record(C.fresh('normal',0),1,invalid,C.DEFAULT).rounds.length===0,'duplicate racer ids reject corrupt results');
console.log('G06 CUP PASS '+checks+' storage / five-round / seven-hero checks');
