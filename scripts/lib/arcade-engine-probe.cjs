/* Execute the real G02 engine with a DOM/Canvas shell; only expose its existing closures.
   Physics, collisions, random choices, animation state and loop are not replaced. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const canvasContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
async function shooter({hero=0,chapter=1,difficulty='normal',seed=71,source,viewport={width:1440,height:900},coarse=false,coopHero=null}={}){
 let random=seed>>>0,randomCalls=0;const math=Object.create(Math);math.random=()=>{randomCalls++;return ((random=(Math.imul(random,1664525)+1013904223)>>>0)/4294967296);};
 const classList=()=>{const set=new Set();return {add:(...xs)=>xs.forEach(x=>set.add(x)),remove:(...xs)=>xs.forEach(x=>set.delete(x)),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)};};
 const ctx=canvasContext(),nodes=new Map();
 function node(name){if(nodes.has(name))return nodes.get(name);const el={name,style:{setProperty(){},removeProperty(){}},dataset:{},classList:classList(),hidden:true,value:'normal',innerHTML:'',addEventListener(){},setAttribute(){},removeAttribute(){},focus(){},getBoundingClientRect:()=>({width:viewport.width,height:viewport.height,left:0,top:0}),getContext:()=>ctx,querySelector:node,querySelectorAll:()=>[]};nodes.set(name,el);return el;}
 const host=node('root'),canvas=node('canvas');canvas.parentElement=node('canvas-parent');
 host.querySelector=selector=>selector==='canvas'||selector==='#arcade-canvas'?canvas:node(selector);
 const storage=new Map(),body=node('body'),html=node('html');html.lang='zh-TW';
 const document={getElementById:()=>host,documentElement:html,body,hidden:false,activeElement:canvas,addEventListener(){}};
 const win={document,Math:math,performance:{now:()=>0},scrollY:0,scrollTo(){},dataLayer:[],devicePixelRatio:1,addEventListener(){},dispatchEvent(){},matchMedia:()=>({matches:false}),BioArcadeChapter:chapter,BioArcadeAudioPolicy:{normalize:()=>({sfx:0})},BioWorldArt:{preload:async()=>true,draw:()=>false},BioGuardianArt:{preload:async()=>[true],draw:()=>false},BioControlProfiles:{settingsOpen:false,prefs:{profile:'two'},set(){},createSettings:()=>({open(){},close(){}}),createInput:()=>({reset(){},dispose(){},setKeyboard(){},read:()=>({x:0,y:0,actions:new Set(),pulses:new Set(),assist:false}),debug:{id:null,actions:[],actionOwners:{},desired:{x:0,y:0}}})}};
 win.innerWidth=viewport.width;win.innerHeight=viewport.height;
 win.matchMedia=query=>({matches:coarse&&query.includes('pointer:coarse')});
 win.parent=win;win.window=win;
 const scope={...win,window:win,console,setTimeout,clearTimeout,innerWidth:viewport.width,innerHeight:viewport.height,requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},CustomEvent:class{constructor(type,value){this.type=type;this.detail=value?.detail;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/session-runtime.js'),'utf8'),scope);
 let code=source||fs.readFileSync(path.join(root,'assets/arcade-engine.js'),'utf8');
 const marker='shell();\n})();';if(!code.includes(marker))throw Error('G02 probe marker missing');
 code=code.replace(marker,"window.__engineProbe={start,loop,draw,refreshHud,beginWave,updateStep:update,dash,skill,harm,liveGame:()=>game,setOptions(h,c,d){chosen=h;window.BioArcadeChapter=c;difficulty=d;},setKeys(values){keys.clear();for(const k of values)keys.add(k);},snapshot(){return JSON.stringify({phase,game});}};"+marker);
 vm.runInNewContext(code,scope);const probe=win.__engineProbe;probe.setOptions(hero,chapter,difficulty);if(coopHero!==null&&!win.BioArcadeShooter.configureCoop({hero:coopHero}))throw Error('invalid co-op configuration');await probe.start();
 return {...probe,setRemoteInput:value=>win.BioArcadeShooter.setRemoteInput(value),coopSnapshot:()=>win.BioArcadeShooter.coopSnapshot(),element:node,get randomCalls(){return randomCalls;},context:ctx,state:()=>win.BioArcadeShooter.state};
}
module.exports={shooter,canvasContext};
