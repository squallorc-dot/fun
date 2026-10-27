// The CI gate reruns all 50 seeds, rather than trusting committed statistics.
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'arcade/qa/racing-v15/balance'),strategies=['idle','basic','held','safe','skilled'];fs.mkdirSync(out,{recursive:true});let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
async function main(){
 await Promise.all(strategies.map(strategy=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,'analyze-g06-balance.cjs')],{cwd:root,env:{...process.env,RACE_ROOT:root,RACE_SEEDS:'50',RACE_LABEL:'after',RACE_STRATEGY:strategy,RACE_DETAILS:strategy==='skilled'?'1':'0',RACE_REPORT:path.join(out,strategy+'.json')},stdio:['ignore','inherit','inherit']});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(strategy+' analysis exit '+code)));})));
 const reports=strategies.map(s=>JSON.parse(fs.readFileSync(path.join(out,s+'.json')))),groups=reports.flatMap(r=>r.groups),rows=strategies.flatMap(s=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out,s+'.json.samples.json.gz')))));
 check(reports.every(r=>r.seedCount===50&&r.completionPaths===750)&&rows.length===3750,'all 50 seeds / five chapters / three difficulties / five strategies actually ran');
 check(new Set(reports.map(r=>r.sourceHash)).size===1&&new Set(reports.map(r=>r.strategyHash)).size===1,'one frozen engine and controller across the whole matrix');
 for(const group of groups){check(group.races===50,'full group coverage');if(group.strategy==='idle'&&group.chapter>=4)check(group.podiumRate===0,'fourth/fifth zero-input cannot podium');if(group.strategy==='skilled'){check(group.podiumRate>=.8,'a consistently feasible skilled route '+group.chapter+'/'+group.difficulty);if(group.difficulty==='expert')check(group.firstPlaceRate>0,'a genuine expert victory exists for every circuit');}if(group.strategy==='safe'&&group.difficulty==='normal')check(group.podiumRate>=.25,'reasonable conservative normal route '+group.chapter);}
 const mean=(strategy,key)=>groups.filter(g=>g.strategy===strategy).reduce((n,g)=>n+g[key],0)/15;
 check(mean('skilled','meanRank')<mean('held','meanRank')&&mean('skilled','meanRank')<mean('basic','meanRank'),'timed braking/nitro beats holding boost and basic steering');check(mean('held','podiumRate')<.75,'permanent boost is not near-guaranteed completion');
 check(rows.filter(r=>r.strategy==='idle'&&r.chapter===5&&r.difficulty==='expert'&&r.seed===7).every(r=>!r.win),'original seed seven failure is fixed through real driving physics');
 check(rows.some(r=>r.caughtAfterLead>0)&&rows.some(r=>r.recaptures>0)&&rows.some(r=>r.aiPasses>0),'real pursuit, AI/AI passes and regained positions occur');
 for(const row of rows){check(row.standings.length===6&&row.standings.every(r=>['finished','dnf'].includes(r.status)),'no stuck or unclassified rival');check(row.time===null||Number.isFinite(row.time)&&row.time>0,'finite actual finish time');}
 const summary={checks,races:rows.length,seedCount:50,physicsHz:120,controllerHz:20,sourceHash:reports[0].sourceHash,strategyHash:reports[0].strategyHash,groups};fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log('G06 BALANCE PASS '+checks+' checks / '+rows.length+' actual races / 50 seeds');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
