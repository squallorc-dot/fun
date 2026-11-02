import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const origin='https://bio-city-v161-signaling.squall-orc.workers.dev';
for(const p of ['signaling/worker/wrangler.toml','signaling/worker/wrangler.beta.toml']){
 const txt=read(p);
 for(const line of ['name = "bio-city-v161-signaling"','workers_dev = false','preview_urls = false','TEST_ENABLED = "false"','TEST_OPEN_WINDOW = "false"','BETA_PUBLIC_ENABLED = "false"','run_worker_first = true','name = "ROOMS"','name = "RATE_GATES"'])assert(txt.includes(line),p+' missing '+line);
 assert(!/^\s*(routes?|custom_domain)\s*=/m.test(txt),'unintended route');
}
const conf=read('signaling/worker/wrangler.beta.toml');
assert(conf.includes('ALLOWED_ORIGINS = "'+origin+'"'));
assert(conf.includes('BETA_PUBLIC_ORIGIN = "'+origin+'"'));
assert(read('arcade/friends/index.html').includes('<meta name="bio-signaling-endpoint" content="">'));
assert(read('arcade/friends/index.html').includes('noindex,nofollow'));
const ui=read('arcade/assets/friend-lobby-auto.js');
assert(ui.includes('Beta 測試')&&ui.includes('公開ベータ版'));
for(const lang of ['zh','ja'])assert(read('arcade/'+lang+'/index.html').includes(origin+'/arcade/friends/?lang='+lang));
console.log('PASS public Beta preflight: default-off, exact origin, no new routes, two-language entry links');
