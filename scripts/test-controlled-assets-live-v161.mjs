// Workerd is a local PoC only. Its synthetic ingress header is not cloud evidence.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:8787';
for(const path of ['/arcade/friends/index.html','/arcade/assets/peer-link.js','/arcade/assets/controls.css','/arcade/assets/guardians/2x/burner-sister.png','/music/bio-city-awakening-theme-v2.mp3','/arcade/zh/shooter.html','/arcade/challenge-v16/index.html']){
 const denied=await fetch(origin+path,{headers:{'CF-Connecting-IP':'192.0.2.99'}});assert.equal(denied.status,403,path);await denied.body?.cancel();
 const response=await fetch(origin+path,{headers:{'CF-Connecting-IP':'192.0.2.1'}});assert.equal(response.status,200,path);assert.equal(response.headers.get('cache-control'),'no-store');
 if(path==='/arcade/friends/index.html')assert((await response.text()).includes(`name="bio-signaling-endpoint" content="${origin}"`));else await response.body?.cancel();
 const cached=await fetch(origin+path,{headers:{'CF-Connecting-IP':'192.0.2.99'}});assert.equal(cached.status,403,'cached assets still require gate: '+path);await cached.body?.cancel();
}
for(const path of ['/signaling/worker/worker.mjs','/arcade/qa/friends-v16/index.html','/.git/config','/assets/private.js']){
 const response=await fetch(origin+path,{headers:{'CF-Connecting-IP':'192.0.2.1'}});assert.equal(response.status,404,path);await response.body?.cancel();
}
console.log('PASS local Workerd run_worker_first: protected static asset types, same-origin endpoint and private paths');
