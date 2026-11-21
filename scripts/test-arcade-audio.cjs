'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../arcade/assets/audio-policy.js'),'utf8'),scope);
const {normalize,nextTrack}=scope.BioArcadeAudioPolicy;
assert.equal(normalize({}).playMode,'shuffle');
assert.equal(normalize({playMode:'scene',track:2}).playMode,'shuffle','migrate former automatic scene default');
assert.equal(normalize({playMode:'scene',audioRevision:2}).playMode,'scene','retain explicitly selected scene mode');
for(const playMode of ['manual','off','shuffle'])assert.equal(normalize({playMode,track:2}).playMode,playMode);
assert.equal(normalize({track:2}).playMode,'manual','legacy chosen song stays chosen');
assert.equal(normalize({volume:0,auto:false}).volume,0);
assert.equal(normalize({volume:0,auto:false}).auto,false);
assert.equal(normalize({track:5}).track,0,'removed tracks cannot be requested');
assert.equal(normalize({volume:'invalid',sfx:400}).volume,40);
assert.equal(normalize({volume:'invalid',sfx:400}).sfx,100);
assert.equal(normalize(null).playMode,'shuffle');
for(const previous of [null,0,1,2,3]){
 const possible=new Set();
 for(let i=0;i<100;i++){const n=nextTrack(4,previous,()=>i/100);assert(n>=0&&n<4);if(previous!==null)assert.notEqual(n,previous);possible.add(n);}
 assert.equal(possible.size,previous===null?4:3,'all eligible songs remain selectable');
}
assert.equal(nextTrack(1,0),0);
console.log('AUDIO PASS: fresh defaults, existing preference migration, explicit silence/manual modes and non-repeating random stages.');
const audioSource=fs.readFileSync(require('node:path').join(__dirname,'../arcade/assets/friend-audio.js'),'utf8');
class MockMedia{
 constructor(){this.src='';this.paused=true;this.currentTime=0;this.playCalls=0;this.handlers={};this.volume=1;this.loop=false;}
 addEventListener(name,cb){(this.handlers[name]??=[]).push(cb);}
 trigger(name){for(const cb of this.handlers[name]??[])cb();}
 async play(){this.playCalls++;this.paused=false;this.trigger('playing');}
 pause(){this.paused=true;this.trigger('pause');}
}
const audioScope={
 BioArcadeAudioPolicy:{normalize,nextTrack},
 Audio:MockMedia,
 document:{currentScript:{src:'https://example.test/arcade/assets/friend-audio.js'},hidden:false},
 localStorage:{getItem:()=>null,setItem:()=>{}},
 URL,
};
audioScope.window=audioScope;
vm.runInNewContext(audioSource,audioScope);
async function audioRegression(){
 const music=new audioScope.BioFriendAudio();
 music.set({playMode:'shuffle',track:1,loop:true,auto:true});
 music.round();await Promise.resolve();await Promise.resolve();
 const before={src:music.media.src,time:37.5,track:music.prefs.track,playCalls:music.media.playCalls};
 music.media.currentTime=before.time;
 for(let i=0;i<10;i++)music.round();
 await Promise.resolve();
 assert.equal(music.prefs.track,before.track,'rematch and chapter transition retain the existing song');
 assert.equal(music.media.src,before.src,'rematch never replaces the audio source');
 assert.equal(music.media.currentTime,37.5,'rematch preserves playback position');
 assert.equal(music.media.playCalls,before.playCalls,'rematch does not call play again');
 assert.equal(music.media.loop,false,'shuffle uses natural song completion, not endless native same-song repeat');
 music.media.trigger('ended');await Promise.resolve();await Promise.resolve();
 assert.notEqual(music.prefs.track,before.track,'shuffle changes song only after media ended');
 assert(music.media.src!==before.src,'natural ending loads a new track');
 music.pause();const pausedCalls=music.media.playCalls;
 music.round();await Promise.resolve();
 assert.equal(music.media.playCalls,pausedCalls,'explicit pause remains paused on next match');
 const manual=new audioScope.BioFriendAudio();
 manual.set({playMode:'manual',track:2,loop:true});
 manual.round();await Promise.resolve();await Promise.resolve();
 const manualSource=manual.media.src;
 assert.equal(manual.media.loop,true,'manual looping still repeats the selected song');
 manual.media.trigger('ended');await Promise.resolve();
 assert.equal(manual.media.src,manualSource,'manual mode never changes the selected track');
 const noLoop=new audioScope.BioFriendAudio();
 noLoop.set({playMode:'shuffle',loop:false,track:0});
 noLoop.round();await Promise.resolve();await Promise.resolve();
 const count=noLoop.media.playCalls;
 noLoop.media.trigger('ended');await Promise.resolve();
 assert.equal(noLoop.media.playCalls,count,'disabled loop stops at natural end');
 console.log('FRIEND OST PASS: ten consecutive rounds maintain src/time, natural-end shuffle, manual repeat and explicit pause');
}
audioRegression().catch(e=>{console.error(e);process.exitCode=1;});

