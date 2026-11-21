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

 // Public Beta must be an entirely separate, explicit, same-origin mode.
 const betaOrigin='https://bio-city-v161-signaling.squall-orc.workers.dev';
 const betaEnv={...env,TEST_ENABLED:'false',TEST_OPEN_WINDOW:'false',BETA_PUBLIC_ENABLED:'true',
  BETA_PUBLIC_ORIGIN:betaOrigin,ALLOWED_ORIGINS:betaOrigin};
 const br=(ip='192.0.2.5',method='OPTIONS',origin=betaOrigin,url=betaOrigin+'/rooms')=>
  new Request(url,{method,headers:{...(ip?{'CF-Connecting-IP':ip}:{}),Origin:origin,...(method==='GET'?{Upgrade:'websocket'}:{})}});
 assert.equal((await worker.fetch(br(),betaEnv)).status,204,'public Beta explicitly enabled');
 assert.equal((await worker.fetch(br('2001:db8::5'),betaEnv)).status,204,'public IPv6 allowed without unstable whitelist');
 assert.equal((await worker.fetch(br('192.0.2.5','POST'),betaEnv)).status,503,'public Beta still requires rate secret');
 for(const [label,override,ip,url,origin] of [
  ['off',{BETA_PUBLIC_ENABLED:'false'},'192.0.2.5',betaOrigin+'/rooms',betaOrigin],
  ['mixed test/Beta',{TEST_ENABLED:'true'},'192.0.2.5',betaOrigin+'/rooms',betaOrigin],
  ['open test flag',{TEST_OPEN_WINDOW:'true'},'192.0.2.5',betaOrigin+'/rooms',betaOrigin],
  ['bad configured origin',{BETA_PUBLIC_ORIGIN:'https://evil.example'},'192.0.2.5',betaOrigin+'/rooms',betaOrigin],
  ['wildcard',{ALLOWED_ORIGINS:'*'},'192.0.2.5',betaOrigin+'/rooms',betaOrigin],
  ['missing client IP',{},null,betaOrigin+'/rooms',betaOrigin],
  ['another host',{},'192.0.2.5','https://other.example/rooms',betaOrigin],
  ['cross-site Origin',{},'192.0.2.5',betaOrigin+'/rooms','https://evil.example']
 ])assert.equal((await worker.fetch(br(ip,'OPTIONS',origin,url),{...betaEnv,...override})).status,403,'public Beta '+label);
 console.log('PASS isolated public Beta: exact origin, IPv4/IPv6, closed by default, no test bypass');
 console.log('PASS test gate: fail-closed IPv4/IPv6, expiry, switch, origins and every request type');
} finally { Date.now=original; }
