// Cloudflare official Git Builds preflight. Runs on the separate release branch
// before Wrangler can publish; no API token or other credential is written here.
// The source commit must pass BOTH independent CI workflows. Fail CLOSED.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {build} from './build-controlled-assets-v161.mjs';

const SOURCE_SHA='c06eeacad9dc9fc8beee4e32c7c1e1bc6e7eecdb';
const REPO='squallorc-dot/fun', PR_NUMBER=38;
const RELEASE_BRANCH='release/bio-city-v161-stun-beta';
const BASE_URL='https://api.github.com/repos/'+REPO;
const required=['FUNAI CARE bilingual quality gate','v1.6.1 signaling prototype'];
const requiredJobs={
 'FUNAI CARE bilingual quality gate':['verify','browser','arcade-engines','arcade-controls-browser','arcade-performance-browser','arcade-session-browser'],
 'v1.6.1 signaling prototype':['signaling-local-rtc','g02-cross-engine']
};
const allowedChanges=new Set(['wrangler.toml','package.json','scripts/cloudflare-beta-build-v161.mjs','signaling/Beta雲端自動部署說明.md']);
const headers={'Accept':'application/vnd.github+json','User-Agent':'BioCity-Cloudflare-Beta-Build'};
async function api(path){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),16000);
 try{
  const response=await fetch(BASE_URL+path,{headers,signal:controller.signal});
  if(!response.ok)throw Error('GitHub CI status query unavailable: '+response.status);
  return await response.json();
 }finally{clearTimeout(timer);}
}
try{
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:10000}).trim();
 assert(/^[a-f0-9]{40}$/.test(head),'invalid Git checkout');
 const info=await api('/pulls/'+PR_NUMBER);
 assert.equal(info.head.sha,SOURCE_SHA,'PR head changed; requires new vetted release');
 assert.equal(info.draft,true,'candidate PR must remain Draft before Beta acceptance');
 assert.equal(info.merged,false,'do not publish merged PR via release branch');
 const runs=await api('/actions/runs?head_sha='+SOURCE_SHA+'&per_page=100');
 // Fail closed: every quality and RTC job must pass on the exact PR head.
 for(const name of required){
  const items=(runs.workflow_runs||[]).filter(x=>x.name===name&&x.head_sha===SOURCE_SHA);
  const green=items.find(x=>x.status==='completed'&&x.conclusion==='success');
  assert(green,'CI must be completed/success for '+name);
  const jobsData=await api('/actions/runs/'+green.id+'/jobs?per_page=100');
  for(const jobName of requiredJobs[name]){
   const job=(jobsData.jobs||[]).find(x=>x.name===jobName);
   assert(job&&job.status==='completed'&&job.conclusion==='success','required CI job not green: '+name+'/'+jobName);
  }
 }
 const compare=await api('/compare/'+SOURCE_SHA+'...'+head);
 assert.equal(compare.status,'ahead','release must advance only tested source');
 assert(compare.ahead_by>=1,'release must retain the tested source as an ancestor');
 assert.equal(compare.files?.length,allowedChanges.size,'release must differ from tested source by precisely four config files');
 assert((compare.files||[]).every(x=>allowedChanges.has(x.filename)&&x.status==='added'),'release modifies only approved deployment files');
 assert((compare.files||[]).every(x=>allowedChanges.has(x.filename)),'no untested application change is allowed');
 const conf=readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
 for(const line of ['name = "bio-city-v161-signaling"','workers_dev = true','preview_urls = false','TEST_ENABLED = "false"','TEST_OPEN_WINDOW = "false"','BETA_PUBLIC_ENABLED = "true"','main = "signaling/worker/worker.mjs"','directory = "./signaling/worker/candidate-assets"','name = "ROOMS"','name = "RATE_GATES"']){
  assert(conf.includes(line),'invalid Cloudflare release config: '+line);
 }
 assert(!/^\s*(routes?|custom_domain)\s*=/m.test(conf),'unexpected public route');
 assert(!conf.includes('RATE_SECRET ='),'do not store secrets in repo');
 const peer=readFileSync(new URL('../arcade/assets/peer-link.js',import.meta.url),'utf8');
 assert(peer.includes("stun:stun.l.google.com:19302"),'Google STUN must be in Beta');
 assert(peer.includes('betaStun=false'),'manual QA must remain opt-in');
 const {files,bytes}=await build();
 assert(files>=80&&bytes>10000000,'missing controlled assets');
 console.log('Cloudflare Beta: verified '+SOURCE_SHA.slice(0,8)+' (6 quality and 2 RTC jobs green), limited to four release config files, '+files+' controlled assets. MAIN UNCHANGED.');
}catch(error){
 console.error('CLOUDFLARE BETA DEPLOY BLOCKED: '+error.message);
 process.exitCode=1;
}
