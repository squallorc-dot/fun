const assert=require('node:assert/strict');require('../arcade/assets/friend-invite.js');
const {create,consume}=globalThis.BioFriendInvite,token='a'.repeat(64),room='ABCDEFGH';
const url=create('https://example.test/fun/arcade/friends/?old=x#other',room,token,'ja');
assert(url.startsWith('https://example.test/fun/arcade/friends/?lang=ja#'));assert(!url.split('#')[0].includes(token));
let replaced='',history={state:null,replaceState(_s,_t,value){replaced=value;}};
assert.deepEqual(consume({href:url},history),{room,token});assert(!replaced.includes('#'));assert(!replaced.includes(token));
for(const fragment of ['invite=1&room='+room+'&token='+token+'&token='+token,'invite=2&room='+room+'&token='+token,'invite=1&room=00000000&token='+token,'invite=1&room='+room+'&token=x','x'.repeat(129)]){replaced='';assert.throws(()=>consume({href:'https://example.test/friends/#'+fragment},history));assert.equal(replaced,'https://example.test/friends/');}
assert.throws(()=>create('http://example.test/friends/',room,token));assert.throws(()=>create('https://user@example.test/friends/',room,token));assert.equal(consume({href:'https://example.test/friends/'},history),null);
console.log('PASS invitations: HTTPS, fragment-only credential, immediate history removal, strict format and duplicate rejection');
