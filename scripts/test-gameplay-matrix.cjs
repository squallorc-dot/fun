// 105 full playable routes. Controllers use visible state and ordinary inputs;
// never clear targets, move a ball/car, refill health or invoke finish directly.
'use strict';const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');const {run,runDefense}=require('./lib/gameplay-probe.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'arcade/assets/campaign-core.js'),'utf8'),bag=new Map(),storage={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,v)},scope={window:{localStorage:storage}};vm.runInNewContext(source,scope);const C=scope.window.BioCampaign;
const modes=[['g01','volley'],['g02','volley'],['g03','volley'],['g04','volley'],['g05','volley'],['g05','pong'],['g06','volley']],samples=[];let checks=0;const check=(v,s)=>{assert(v,s);checks++;},hash=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
function fresh(id,s,label){check(id==='g01'?s.score===0&&s.kills===0&&s.player.hp===s.player.max:id==='g02'?s.wave===1&&s.score===0&&s.kills===0&&s.p.hp===s.p.maxHp:id==='g03'?s.depth===0&&s.player.hp===3&&s.camera===0:id==='g04'?s.stage===1&&s.hits===0&&s.balls.length===0:id==='g05'?s.points[0]===0&&s.points[1]===0&&s.serve>0:s.phase==='countdown'&&s.progress===0&&s.nitro===100,label+' genuine fresh start');}
async function simulate(o){return o.id==='g02'?runDefense(o):run(o);}
async function main(){
 const totals=new Map();for(const [id,mode]of modes){for(let chapter=1;chapter<=5;chapter++)for(const base of ['normal','hard','expert']){
  const difficulty=C.difficultyFor(base,chapter),o={id,mode,chapter,difficulty,hero:id==='g01'?2:0,seed:7,max:900},label=[id,mode,chapter,base,difficulty].join('/');
  check(C.read(id,mode,base).unlocked===chapter,label+' cannot skip a locked chapter');const r=await simulate(o);fresh(id,r.initial,label);
  check(r.outcome?.[0]===true,label+' a real completed route must win');check(Number.isFinite(r.outcome[1])&&r.outcome[1]>=0,label+' finite final score');
  const s=r.state;
  if(id==='g01')check(s.wave===3&&s.kills===19+5*(chapter-1)&&s.enemies.length===0,label+' all enemies and Boss, no shortcut');
  if(id==='g02')check(s.wave===3&&s.spawnLeft===0&&s.enemies.length===0&&!s.boss&&s.kills===28+6*Math.min(chapter-1,3),label+' exact three-wave quota and Boss');
  if(id==='g03')check(s.depth>=s.goal&&s.player.hp>0,label+' actual depth reached alive');
  if(id==='g04')check(s.stage===3&&s.targets.every(t=>t.hp===0)&&s.stageHistory.length===3&&s.stageHistory.every(x=>x.won),label+' three real target layouts, no clear-stage fixture');
  if(id==='g05')check(s.points[0]===(mode==='pong'?7:5)+(chapter-1)*2&&s.points[1]<s.points[0],label+' actual winning rally score');
  if(id==='g06')check(s.checkpointIndex===s.checkpointTotal&&s.standings.every(c=>c.status==='finished')&&s.rank<=3,label+' six real finishers and podium');
  const key=C.key(id,mode,base),total=(totals.get(key)||0)+r.outcome[1];totals.set(key,total);const saved=C.complete(id,mode,base,chapter,total);
  check(saved.unlocked===Math.min(5,chapter+1)&&saved.wins===chapter&&saved.best===Math.floor(total),label+' real outcome saves exactly once');
  fresh(id,await r.retry(),label+' retry');samples.push({id,mode,chapter,base,effectiveDifficulty:difficulty,hero:o.hero,seed:o.seed,score:r.outcome[1],seconds:r.ticks/120,physicsHash:hash(s),saved});
 }console.log('GAMEPLAY MATRIX '+id+'/'+mode+' 15 real paths / retries / saves PASS');}
 let parity=0;for(const [id,mode]of modes){let canonical,tape;for(const fps of [120,60,30,15,10,240]){const r=await simulate({id,mode,chapter:3,difficulty:'hard',hero:id==='g01'?2:0,seed:7,fps,max:900,recordInputs:fps===120,replay:fps===120?null:tape}),signature=hash({state:r.state,result:r.outcome,ticks:r.ticks});check(r.outcome?.[0]===true,id+'/'+mode+' FPS route wins');if(fps===120)tape=r.inputs;else check(hash(r.inputs)===hash(tape),id+'/'+mode+' replays the exact recorded inputs');if(canonical)check(signature===canonical,id+'/'+mode+' identical 120Hz inputs and seed at '+fps+' FPS');else canonical=signature;parity++;}}
 const reloaded={window:{localStorage:storage}};vm.runInNewContext(source,reloaded);for(const [id,mode]of modes)for(const base of ['normal','hard','expert'])check(JSON.stringify(reloaded.window.BioCampaign.read(id,mode,base))===JSON.stringify(C.read(id,mode,base)),id+'/'+mode+'/'+base+' reload preserves final progress');
 const report={seed:7,controllerHz:20,physicsHz:120,recordedInputReplay:true,checks,completionPaths:samples.length,fpsPaths:parity,samples};if(process.argv.includes('--write-results'))fs.writeFileSync(path.join(root,'arcade/docs/v1.5/batch5b-gameplay-matrix-20261027.json'),JSON.stringify(report,null,2)+'\n');
 console.log('GAMEPLAY MATRIX PASS '+checks+' checks; '+samples.length+' genuine seven-mode / chapter / difficulty completions, '+parity+' same-input 10–240 FPS routes');
}main().catch(e=>{console.error(e);process.exitCode=1;});
