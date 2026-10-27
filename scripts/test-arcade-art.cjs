// Asset provenance / dimensions and the exact drawing contracts that avoid a
// duplicate racing road and non-tileable shaft seams. No game rules are mocked.
'use strict';const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');const root=path.resolve(__dirname,'..');let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
const manifest=JSON.parse(fs.readFileSync(path.join(root,'arcade/assets/guardians/2x/manifest.json')));check(manifest.tile===320&&manifest.frames===71&&manifest.atlases.length===7,'seven full vector-derived animation sets');
for(const row of manifest.atlases){const png=fs.readFileSync(path.join(root,'arcade/assets/guardians/2x',row.file));check(png.readUInt32BE(16)===2560&&png.readUInt32BE(20)===2880,row.key+' native 2x dimensions');check(png.length===row.bytes&&crypto.createHash('sha256').update(png).digest('hex')===row.sha256,row.key+' reproducible manifest');}
const calls=[],scales=[],modules=[];class Image{constructor(){this.width=this.naturalWidth=1024;this.height=this.naturalHeight=1280;}set src(v){this.url=v;queueMicrotask(()=>this.onload());}decode(){return Promise.resolve();}}
const scope={window:{},document:{currentScript:{src:'https://example.test/world-art.js'}},URL,Image,setTimeout,clearTimeout};vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/world-art.js'),'utf8'),scope);const art=scope.window.BioWorldArt;
const ctx=new Proxy({strokeRect:(...args)=>modules.push(args),scale:(...args)=>scales.push(args),drawImage:(...args)=>calls.push(args),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
(async()=>{
 await art.preload('race');art.draw(ctx,'race',960,540,{horizon:189});check(calls.length===1&&calls[0].length===9,'race horizon uses explicit source crop');check(calls[0][2]===0&&calls[0][4]===Math.floor(1280*.18),'source excludes lower transit / water, never paints a second road');
 await art.preload('shaft');const ih=1280*480/1024;
 for(const scroll of [-1000,0,ih/.32-.001,ih/.32+.001,ih*2/.32,100000]){calls.length=0;scales.length=0;art.draw(ctx,'shaft',480,900,{scroll});check(calls.length>=2&&calls.length<=3,'shaft tiles fully cover taller viewport at '+scroll);check(calls.every(c=>c[3]===480&&c[4]===ih),'shaft tiles share exact scale');check(scales.length===calls.length&&scales.every((s,i)=>Math.abs(s[1])===1&&(!i||s[1]===-scales[i-1][1])),'adjacent tiles mirror the same source edge');}
 check(art.inspect().length<=3&&art.inspectRenderCache().bytes<=16*1024*1024,'existing image / raster limits remain');
 for(let chapter=2;chapter<=5;chapter++){modules.length=0;art.chapterLandmarks(ctx,'defense',600,600,chapter,2);check(modules.length>0&&modules.every(([x,y,w,h])=>x+w<60||x>540||y+h<60||y>540),'top-view chapter machinery leaves central battlefield clear: '+chapter);}
 // Simulate a stalled optional request, not just HTTP/decode errors. Native
 // artwork must still load after the optional deadline without a new gesture.
 const timers=new Map();let next=0;class StalledImage{set src(v){if(!v.includes('/2x/'))queueMicrotask(()=>this.onload());}decode(){return Promise.resolve();}}
 const guardianScope={window:{},document:{currentScript:{src:'https://example.test/guardian-art.js'}},URL,Image:StalledImage,setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/guardian-art.js'),'utf8'),guardianScope);const guardian=guardianScope.window.BioGuardianArt,pending=guardian.preload([0],{highResolutionHero:true});[...timers.values()][0]();await pending;const fallback=guardian.inspect().atlases[0];check(fallback.ready&&fallback.fallback&&fallback.resolution===1,'optional high-resolution timeout falls back to native artwork');
 console.log('ART NODE PASS '+checks+' source, crop, tiling, layer and fallback checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
