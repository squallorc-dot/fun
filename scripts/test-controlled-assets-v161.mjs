import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../signaling/worker/worker.mjs';
const origin='https://candidate.workers.dev';let calls=0;
const env={TEST_ENABLED:'true',TEST_EXPIRES_AT:String(Math.floor(Date.now()/1000)+600),TEST_ALLOWED_IPS:'192.0.2.1',ALLOWED_ORIGINS:origin,ASSETS:{async fetch(){calls++;return new Response('<meta name="bio-signaling-endpoint" content="">',{headers:{'content-type':'text/html','cache-control':'public, max-age=31536000',etag:'old'}});}}};
const req=(path,ip='192.0.2.1',headers={})=>new Request(origin+path,{headers:{'CF-Connecting-IP':ip,...headers}});
for(const path of ['/','/arcade/friends/','/arcade/assets/peer-link.js','/arcade/assets/worlds/g02-city.webp','/music/bio-city-awakening-theme-v2.mp3','/arcade/zh/shooter.html']){
 const before=calls;
 for(const variant of [{...env,TEST_ENABLED:'false'},{...env,TEST_EXPIRES_AT:'1000000000'},{...env,TEST_ALLOWED_IPS:''}])assert.equal((await worker.fetch(req(path),variant)).status,403);
 assert.equal((await worker.fetch(req(path,'192.0.2.2',{'X-Forwarded-For':'192.0.2.1',Cookie:'TEST_ENABLED=true'}),env)).status,403);
 assert.equal(calls,before,'gate executes before any static asset/cache binding');
}
for(const path of ['/.git/config','/signaling/worker/wrangler.toml','/arcade/qa/friends-v16/index.html','/assets/secret.js','/arcade/assets/guardians/SOURCE.md','/signaling/受控雲端測試.md'])assert.equal((await worker.fetch(req(path),env)).status,404,path);
const response=await worker.fetch(req('/arcade/friends/index.html',undefined,{'If-None-Match':'old'}),env);
assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('etag'),null);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'self'/);assert((await response.text()).includes(`content="${origin}"`));
assert.equal((await worker.fetch(new Request(origin+'/rooms',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1'}}),env)).status,403,'room creation still requires Origin');
const toml=await readFile('signaling/worker/wrangler.toml','utf8');assert.match(toml,/run_worker_first = true/);assert.match(toml,/workers_dev = false/);assert.match(toml,/preview_urls = false/);assert.match(toml,/TEST_ENABLED = "false"/);
console.log('PASS static gate: navigation without Origin, all asset types denied before binding, private paths denied, no-store and same-origin CSP');
