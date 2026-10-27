// Export full-resolution review videos; production rendering is never changed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw=path.join(root,'arcade/qa/racing-v15'),gameplay=path.join(root,'arcade/qa/gameplay-v15');
const out=path.join(root,'arcade/qa/20261028-racing');fs.mkdirSync(out,{recursive:true});
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest={export:'VP9 CQ18, yuv444p; full source dimensions and all 12fps frames retained',versions:{},files:[]};
function copy(from,name){fs.copyFileSync(from,path.join(out,name));}
function verifyVideo(file,frames,width,height){
 const data=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames','-of','json',file],{encoding:'utf8'})).streams[0];
 assert(Number(data.nb_read_frames)===frames&&data.width===width&&data.height===height,'complete full-resolution video '+file);
}
for(const version of ['before','after']){
 const folder=path.join(raw,version),meta=JSON.parse(fs.readFileSync(path.join(folder,'sequences.json')));
 const source=version==='before'?execFileSync('git',['show','8314ab5:arcade/assets/games-core.js'],{cwd:root}):fs.readFileSync(path.join(root,'arcade/assets/games-core.js'));
 assert(meta.sourceHash===hash(source));assert(meta.clips.length===15&&meta.clips.reduce((n,c)=>n+c.frames,0)===568);
 manifest.versions[version]={sourceHash:meta.sourceHash,clips:15,frames:568};
 copy(path.join(folder,'sequences.json'),version+'-sequences.json');
 for(const clip of meta.clips){
  assert(clip.poses.length===clip.frames&&clip.poses.every(p=>p.rasterColors>16));
  const file=version+'-'+clip.name+'.webm';
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(folder,clip.name+'.webm'),'-c:v','libvpx-vp9','-cpu-used','4','-row-mt','1','-threads','2','-b:v','0','-crf','18','-pix_fmt','yuv444p',path.join(out,file)]);
  verifyVideo(path.join(out,file),clip.frames,clip.width,clip.height);
  manifest.files.push({file,sha256:hash(fs.readFileSync(path.join(out,file))),frames:clip.frames,width:clip.width,height:clip.height});
 }
 copy(path.join(folder,'c5-desktop/0020.png'),version+'-c5-near-plane-1012.25.png');
}
const before=JSON.parse(fs.readFileSync(path.join(raw,'before/sequences.json'))),after=JSON.parse(fs.readFileSync(path.join(raw,'after/sequences.json')));
for(let i=0;i<15;i++){
 const a=before.clips[i],b=after.clips[i];
 assert.deepEqual([a.name,a.start,a.step,a.frames,a.width,a.height],[b.name,b.start,b.step,b.frames,b.width,b.height]);
 assert.deepEqual(a.poses.map(p=>[p.progress,p.speed,p.viewport]),b.poses.map(p=>[p.progress,p.speed,p.viewport]));
}
const results=JSON.parse(fs.readFileSync(path.join(gameplay,'results.json')));
assert(results.completions===230&&results.cupDefeats===2&&results.samples.length===210,'full genuine campaign run required');
copy(path.join(gameplay,'results.json'),'gameplay-results.json');
const duel=JSON.parse(fs.readFileSync(path.join(gameplay,'g06-actual-cup-duel.json')));
assert(duel.sourceHash===manifest.versions.after.sourceHash&&duel.inputs.length>100,'current engine and actual ordinary-input tape');
verifyVideo(path.join(gameplay,'g06-actual-cup-duel.webm'),duel.frames.length,1440,900);
assert(duel.events.some(e=>e.against==='player')&&duel.events.some(e=>e.by==='player'&&duel.events.some(c=>c.by===e.against&&c.against==='player'&&c.time<e.time)));
for(const ext of ['json','webm'])copy(path.join(gameplay,'g06-actual-cup-duel.'+ext),'g06-actual-cup-duel.'+ext);
for(let hero=0;hero<7;hero++)copy(path.join(gameplay,'guardian-car-'+hero+'.png'),'guardian-car-'+hero+'.png');
copy(path.join(gameplay,'guardian-cars.json'),'guardian-cars.json');
for(const locale of ['zh','ja'])for(const base of ['normal','hard','expert'])copy(path.join(gameplay,locale+'-g06-'+base+'-cup-final.png'),locale+'-g06-'+base+'-cup-final.png');
manifest.genuineRace={frames:duel.frames.length,events:duel.events.length,scenario:duel.scenario,source:'ordinary controls, one 0.2s brake error and recovery, inherited grid after four genuine rounds; no state/result setters'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>第 5C 批連續畫面驗收</title>
<style>body{margin:24px auto;padding:0 18px;max-width:1400px;background:#081d2a;color:#e1f6ed;font:16px system-ui}a{color:#99e7d8}button,select{font:inherit;padding:10px;margin:6px}video,img{max-width:100%;height:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cars{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}figure{margin:0}figcaption{padding:8px}details{margin:20px 0}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style>
<h1>第 5C 批：道路連續畫面、六車競爭與五章錦標賽</h1>
<p>道路前後各 15 段／568 影格，使用相同姿態的正式渲染器重播；這些是攝影機與遮擋測試，不能當作真實完賽證據。下方另附使用一般操作完成五章的實際第五章賽事。影片保持完整尺寸與全部影格，採 VP9 CQ18 匯出；遊戲本身畫質未調降。</p>
<p><a href="../../docs/36_v1.5_第5C批_G06競速錦標賽與視覺整合_20261028.md">完整驗收文件</a> · <a href="manifest.json">影片驗證清單</a> · <a href="before-sequences.json">修改前逐格位置／相機</a> · <a href="after-sequences.json">修改後逐格位置／相機</a></p>
<label>章節與視窗 <select id="clip">${after.clips.map(c=>`<option value="${c.name}">C${c.chapter} · ${c.view} · ${c.width}×${c.height} · ${c.frames} frames</option>`).join('')}</select></label><button id="play">同時從頭播放</button>
<div class="pair"><figure><figcaption>修改前：main 8314ab5</figcaption><video id="before" controls muted playsinline preload="metadata"></video></figure><figure><figcaption>修改後：第 5C 批</figcaption><video id="after" controls muted playsinline preload="metadata"></video></figure></div>
<details><summary>第五章 1012.25：近端路段單格定位（需配合連續影片）</summary><div class="pair"><img alt="修改前近端道路" src="before-c5-near-plane-1012.25.png"><img alt="修正後近端道路" src="after-c5-near-plane-1012.25.png"></div></details>
<h2>實際第五章六車賽事</h2><p>前四章實際完賽後繼承起跑順位；普通輸入、120Hz 物理、20Hz 控制，影片 12fps。包含一次第 5 秒、0.2 秒煞車失誤，之後恢復正常控制，以驗證 AI 超越與玩家追趕。這是明示的操作情境，不代表每場正常駕駛都必定被反超。<a href="g06-actual-cup-duel.json">逐格六車位置、名次與超車事件</a></p><video controls muted playsinline preload="metadata" src="g06-actual-cup-duel.webm"></video>
<h2>七守護者原創程序車款</h2><p>車殼不同，碰撞寬度與操控性能相同。<a href="guardian-cars.json">車款資料</a></p><div class="cars">${['烈焰 GT','共振機甲','鋼鐵越野','光子疾影','三重泡影','翠葉巡遊','先知星環'].map((name,i)=>`<figure><img loading="lazy" alt="${name}" src="guardian-car-${i}.png"><figcaption>${name}</figcaption></figure>`).join('')}</div>
<h2>五章實際結算（繁中／日文與三種基礎難度）</h2><p><a href="gameplay-results.json">230 次真實通關與兩次錦標賽失敗驗證</a>；手機／桌面視窗依原矩陣輪替，皆為 Cloud Chromium，非實體裝置。</p><div class="pair">${['zh','ja'].flatMap(locale=>['normal','hard','expert'].map(base=>`<figure><img loading="lazy" alt="${locale} ${base} 五章積分結算" src="${locale}-g06-${base}-cup-final.png"><figcaption>${locale} · ${base}</figcaption></figure>`)).join('')}</div>
<script>const select=document.querySelector('#clip'),videos=[document.querySelector('#before'),document.querySelector('#after')];function choose(){videos.forEach((v,i)=>{v.pause();v.src=(i?'after-':'before-')+select.value+'.webm';v.load();});}select.addEventListener('change',choose);document.querySelector('#play').addEventListener('click',async()=>{videos.forEach(v=>v.currentTime=0);await Promise.allSettled(videos.map(v=>v.play()));});choose();</script></html>`);
console.log('CURATED PROOF PASS 30 road clips / 1136 frames / genuine duel / seven bodies / six cup results');
