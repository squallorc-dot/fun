'use strict';const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm');
class WS{static OPEN=1;static last;constructor(){this.readyState=1;WS.last=this;}send(){}close(){this.readyState=3;this.onclose?.();}}
const root={},scope={window:root,WebSocket:WS,URL,fetch,performance,setTimeout,clearTimeout,setInterval,clearInterval};vm.runInNewContext(fs.readFileSync('arcade/assets/friend-signaling.js','utf8'),scope);
(async()=>{let closed=0,lost=0;const link={state:'idle',close(){closed++;}},options={endpoint:'http://localhost:8787',room:'ABCDEFGH',role:'host',token:'a'.repeat(64),link,onSignalingLost:()=>lost++};
 const p=root.BioFriendSignaling.connect(options);link.state='connected';await p.result;WS.last.onclose();WS.last.onerror();assert.equal(closed,0,'signaling loss must not close established RTC');assert.equal(lost,1,'report signaling loss once');p.close();assert.equal(closed,1,'explicit leave closes RTC');
 closed=0;lost=0;link.state='idle';const q=root.BioFriendSignaling.connect(options);WS.last.onclose();await assert.rejects(q.result,/signaling-closed/);assert.equal(closed,1,'pre-pair signaling failure cleans up RTC');assert.equal(lost,0);console.log('PASS signaling lifecycle: established RTC survives signaling loss; early failure and explicit leave clean up');
})().catch(e=>{console.error(e);process.exitCode=1});
