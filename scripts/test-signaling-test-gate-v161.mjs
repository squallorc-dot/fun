import assert from 'node:assert/strict';
import worker from '../signaling/worker/worker.mjs';

const now=1700000000000, original=Date.now; Date.now=()=>now;
const env={TEST_ENABLED:'true',TEST_EXPIRES_AT:String(now/1000+60),TEST_ALLOWED_IPS:'192.0.2.1,2001:db8::1',ALLOWED_ORIGINS:'https://candidate.example'};
const request=(ip,method='OPTIONS',origin='https://candidate.example')=>new Request('https://signal.example/rooms',{method,headers:{...(ip?{'CF-Connecting-IP':ip}:{}),Origin:origin,...(method==='GET'?{Upgrade:'websocket'}:{})}});
try {
 for(const method of ['OPTIONS','POST','GET']){
  for(const [label,override,ip] of [
   ['disabled',{TEST_ENABLED:'false'},'192.0.2.1'],['missing switch',{TEST_ENABLED:undefined},'192.0.2.1'],
   ['expired',{TEST_EXPIRES_AT:String(now/1000)},'192.0.2.1'],['bad expiry',{TEST_EXPIRES_AT:'tomorrow'},'192.0.2.1'],
   ['empty list',{TEST_ALLOWED_IPS:''},'192.0.2.1'],['invalid list',{TEST_ALLOWED_IPS:'192.0.2.1,invalid'},'192.0.2.1'],
   ['too many',{TEST_ALLOWED_IPS:Array(17).fill('192.0.2.1').join(',')},'192.0.2.1'],
   ['unlisted',{},'192.0.2.2'],['missing address',{},null],['spoofed list',{},'192.0.2.1,192.0.2.2']
  ]) assert.equal((await worker.fetch(request(ip,method),{...env,...override})).status,403,`${method}: ${label}`);
 }
 assert.equal((await worker.fetch(request('192.0.2.1'),env)).status,204);
 assert.equal((await worker.fetch(request('2001:0db8:0:0:0:0:0:1'),env)).status,204,'IPv6 canonicalization');
 assert.equal((await worker.fetch(request('192.0.2.1','OPTIONS','https://other.example'),env)).status,403);
 assert.equal((await worker.fetch(request('192.0.2.1','POST'),env)).status,503,'rate secret remains mandatory');
 // Device-only troubleshooting: no IP allowlist, but no more than 15 minutes,
 // valid Cloudflare ingress IP, explicit opt-in and all original origin/rate checks.
 const brief={...env,TEST_OPEN_WINDOW:'true',TEST_EXPIRES_AT:String(now/1000+900),TEST_ALLOWED_IPS:''};
 assert.equal((await worker.fetch(request('192.0.2.99'),brief)).status,204,'15-minute open window');
 assert.equal((await worker.fetch(request('2001:db8::99'),brief)).status,204,'IPv6 device in open window');
 assert.equal((await worker.fetch(request('192.0.2.99','POST'),brief)).status,503,'rate gate not bypassed');
 for(const [label,override,ip] of [
  ['not opted in',{TEST_OPEN_WINDOW:'false'},'192.0.2.99'],
  ['over 15 minutes',{TEST_EXPIRES_AT:String(now/1000+901)},'192.0.2.99'],
  ['expired',{TEST_EXPIRES_AT:String(now/1000)},'192.0.2.99'],
  ['disabled',{TEST_ENABLED:'false'},'192.0.2.99'],
  ['no ingress IP',{},null],
  ['bad ingress IP',{},'192.0.2.1,192.0.2.99']
 ])assert.equal((await worker.fetch(request(ip),{...brief,...override})).status,403,'open window: '+label);
 assert.equal((await worker.fetch(request('192.0.2.99','OPTIONS','https://evil.example'),brief)).status,403,'open window origin');

 console.log('PASS test gate: fail-closed IPv4/IPv6, expiry, switch, origins and every request type');
} finally { Date.now=original; }
