// Diagnostic report, not a balance gate: some existing modes auto-accelerate
// or auto-contact the ball. Preserve those rules and report passive outcomes.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {run,runDefense}=require('./lib/gameplay-probe.cjs');
const root=path.resolve(__dirname,'..'),scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/campaign-core.js'),'utf8'),scope);
async function main(){
 const samples=[];
 for(const [id,mode]of [['g01','volley'],['g02','volley'],['g03','volley'],['g04','volley'],['g05','volley'],['g05','pong'],['g06','volley']]){
  for(const base of ['normal','hard','expert'])for(let chapter=1;chapter<=5;chapter++){
   const difficulty=scope.window.BioCampaign.difficultyFor(base,chapter);
   const r=await (id==='g02'?runDefense:run)({id,mode,chapter,difficulty,seed:7,hero:0,max:id==='g04'?5:900,controller:()=>id==='g02'?{keys:[],dodge:false,skill:false}:{} });
   samples.push({id,mode,base,chapter,difficulty,seed:7,seconds:r.ticks/120,result:r.outcome||null,rank:r.state.rank??null});
  }
  console.log('IDLE '+id+'/'+mode+' '+JSON.stringify(samples.filter(s=>s.id===id&&s.mode===mode).reduce((a,s)=>{const k=s.result?(s.result[0]?'win':'loss'):'waiting';a[k]=(a[k]||0)+1;return a;},{})));
 }
 fs.writeFileSync(path.join(root,'arcade/docs/v1.5/batch5b-idle-20261027.json'),JSON.stringify({physicsHz:120,seed:7,unchangedAutoAcceleration:true,unchangedVolleyBodyContact:true,samples},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
