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
 console.log('PASS test gate: fail-closed IPv4/IPv6, expiry, switch, origins and every request type');
} finally { Date.now=original; }
