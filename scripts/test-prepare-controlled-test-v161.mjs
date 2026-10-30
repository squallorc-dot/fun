import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'bio-candidate-'));
const script=resolve('scripts/prepare-controlled-test-v161.mjs');
const page='arcade/friends/index.html',config='signaling/worker/wrangler.toml';
const initialHtml=await readFile(page,'utf8'),initialToml=await readFile(config,'utf8');
const run=(candidate,signal)=>spawnSync(process.execPath,[script,candidate,signal],{cwd:dir,encoding:'utf8'});
try{
 await mkdir(join(dir,'arcade/friends'),{recursive:true});await mkdir(join(dir,'signaling/worker'),{recursive:true});
 await writeFile(join(dir,page),initialHtml);await writeFile(join(dir,config),initialToml);
 for(const [candidate,signal] of [['http://candidate.example','https://signal.example'],['https://squallorc-dot.github.io','https://signal.example'],['https://candidate.example/path','https://signal.example'],['https://candidate.example','https://user:pass@signal.example']]){
  assert.notEqual(run(candidate,signal).status,0);assert.equal(await readFile(join(dir,page),'utf8'),initialHtml);assert.equal(await readFile(join(dir,config),'utf8'),initialToml);
 }
 assert.equal(run('https://candidate.example','https://signal.example').status,0);
 assert.match(await readFile(join(dir,page),'utf8'),/bio-signaling-endpoint" content="https:\/\/signal\.example"/);
 assert.match(await readFile(join(dir,config),'utf8'),/ALLOWED_ORIGINS = "https:\/\/candidate\.example"/);
 assert.notEqual(run('https://candidate.example','https://signal.example').status,0,'prevents accidental reuse');
 console.log('PASS controlled candidate: exact HTTPS origins, protected formal origin and local-only configuration');
}finally{await rm(dir,{recursive:true,force:true});}
