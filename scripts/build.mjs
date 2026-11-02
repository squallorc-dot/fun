// FUNAI CARE single-template bilingual static build, Node 20+, no external dependencies
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {navigation,footer} from './site-shell.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const keys=["home","world","heroes","story","music","strategy"];
function render(lang,key,c,content){
const l=c.locales[lang], m=c.meta[key][lang], prefix=key==="home"?"":"../";
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const route=(la,k)=>k==="home"?(la==="zh"?"FUNAI-CARE.html":"FUNAI-CARE_jp.html"):`${la}/${k}.html`;
const rel=(la,k)=>prefix+route(la,k);
const abs=(la,k)=>c.base+route(la,k);
const current=k=>key===k?' aria-current="page"':"";


const metaJson=JSON.stringify({"@context":"https://schema.org","@type":"WebPage",name:m.title,url:abs(lang,key),inLanguage:l.htmlLang,description:m.desc}).replace(/</g,"\\u003c");
return `<!DOCTYPE html>
<html lang="${l.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.desc)}">
<meta name="theme-color" content="#061423">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FUNAI CARE">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.desc)}">
<meta property="og:url" content="${abs(lang,key)}">
<meta property="og:image" content="${c.ogImage}">
<meta property="og:image:type" content="image/webp">
<meta property="og:image:alt" content="${esc(l.alt)}">
<meta property="og:image:width" content="1672">
<meta property="og:image:height" content="941">
<meta property="og:locale" content="${lang==="zh"?"zh_TW":"ja_JP"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.desc)}">
<meta name="twitter:image" content="${c.ogImage}">
<meta name="twitter:image:alt" content="${esc(l.alt)}">
<link rel="canonical" href="${abs(lang,key)}">
<link rel="alternate" hreflang="zh-TW" href="${abs("zh",key)}">
<link rel="alternate" hreflang="ja" href="${abs("ja",key)}">
<link rel="alternate" hreflang="x-default" href="${abs("zh",key)}">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}assets/site.css?v=${c.version}">${key==="play"?`<link rel="stylesheet" href="${prefix}assets/protocol.css?v=20261024.25"><link rel="stylesheet" href="${prefix}assets/arcade.css?v=${c.arcadeVersion}">`:""}
<link rel="stylesheet" href="${prefix}assets/navigation.css?v=${c.version}">
<link rel="stylesheet" href="${prefix}assets/site-pages.css?v=${c.version}">
<script type="application/ld+json">${metaJson}</script>
<script>(function(w,d,s,n,i){w[n]=w[n]||[];w[n].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${c.gtm}');</script>
</head>
<body data-page="${key}">
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${c.gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip-link" href="#main-content">${esc(l.skip)}</a>
${navigation(lang,key,c,{prefix})}
<main id="main-content" class="app-width">${content}</main>
${footer(lang,c)}
<button type="button" class="backtop" aria-label="${esc(l.backtop)}">↑</button>
<div id="global-audio-player" class="floating-audio-player" aria-live="polite"><div class="f-audio-info"><span class="f-audio-label">NOW PLAYING</span><span id="f-audio-name" class="f-audio-name">FUNAI CARE</span></div><button class="f-audio-btn" onclick="stopAllHeroAudio()" type="button" aria-label="${esc(l.stop)}">⏸</button></div>
<script defer src="${prefix}assets/navigation.js?v=${c.version}"></script><script defer src="${prefix}assets/site.js?v=${c.version}"></script>${key==="play"?`<script defer src="${prefix}assets/protocol-engine.js?v=${c.version}"></script><script defer src="${prefix}arcade/assets/audio-policy.js?v=${c.arcadeVersion}"></script><script defer src="${prefix}arcade/assets/session-runtime.js?v=${c.arcadeVersion}"></script><script defer src="${prefix}arcade/assets/control-profiles.js?v=${c.arcadeVersion}"></script><script defer src="${prefix}arcade/assets/world-art.js?v=${c.arcadeVersion}"></script><script defer src="${prefix}arcade/assets/guardian-art.js?v=${c.arcadeVersion}"></script><link rel="stylesheet" href="${prefix}arcade/assets/controls.css?v=${c.arcadeVersion}"><script defer src="${prefix}assets/arcade-engine.js?v=${c.arcadeVersion}"></script><script defer src="${prefix}assets/${lang}-play.js?v=${c.version}"></script>`:""}
</body></html>
`;
}
const c=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
const check=process.argv.includes('--check');
let bad=0;
for(const lang of ['zh','ja']){
 for(const key of keys){
  const input=path.join(root,'content',lang,key+'.html');
  const output=path.join(root,key==='home'?(lang==='zh'?'FUNAI-CARE.html':'FUNAI-CARE_jp.html'):`${lang}/${key}.html`);
  const built=render(lang,key,c,fs.readFileSync(input,'utf8'));
  if(check){
   if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==built){
    console.error('Out of sync:',path.relative(root,output)); bad++;
   }
  }else{
   fs.mkdirSync(path.dirname(output),{recursive:true});
   fs.writeFileSync(output,built,'utf8');
   console.log('Built',path.relative(root,output));
  }
 }
}
if(check){if(bad){console.error(bad+' files need rebuilding. Run: node scripts/build.mjs');process.exitCode=1;}else console.log('All 12 editorial pages match their central sources.');}

// PLAY is the single public six-game page. Retain the legacy Arcade markup as
// an internal source only (no old URL redirect and no duplicate navigation).
function makePlay(lang,source,c){
 let html=source;
 html=html.replaceAll(c.base+'arcade/zh/index.html',c.base+'zh/play.html').replaceAll(c.base+'arcade/ja/index.html',c.base+'ja/play.html');
 html=html.replace("<head>","<head><base href=\"../arcade/"+lang+"/\">");
 html=html.replaceAll("../../arcade/zh/index.html","../../zh/play.html").replaceAll("../../arcade/ja/index.html","../../ja/play.html");
 html=html.replaceAll("../zh/index.html","../../zh/play.html").replaceAll("../ja/index.html","../../ja/play.html");
 html=html.replaceAll('href="#main-content"','href="../../'+lang+'/play.html#main-content"');
 html=html.replaceAll('href="#game-list"','href="../../'+lang+'/play.html#game-list"');
 html=html.replace(/(<link rel="stylesheet" href="\.\.\/assets\/arcade-hub\.css)\?v=[^"]+/g,'$1?v=20261102.play1');
 html=html.replace(/(<script defer src="\.\.\/assets\/hub\.js)\?v=[^"]+/g,'$1?v=20261102.play1');
 html=html.replace(/<title>[^<]*<\/title>/,'<title>'+(lang==='zh'?'PLAY｜六款守護者遊戲｜FUNAI CARE':'PLAY｜ガーディアンズの6つのゲーム｜FUNAI CARE')+'</title>');
 const label=lang==='zh'?'焦點挑戰｜G06 極速競賽':'注目の挑戦｜G06 超高速レース',desc=lang==='zh'?'穿梭 Bio-City 賽道，轉向、煞車與氮氣衝刺；選擇守護者，挑戰你的最佳紀錄。':'Bio-Cityのコースを走り、ハンドル・ブレーキ・ブーストを駆使してベスト記録に挑もう。',action=lang==='zh'?'立即挑戰賽車':'レースに挑戦',all=lang==='zh'?'查看全部六款遊戲':'6つのゲームを見る';
 const feature='<section class="play-feature" aria-labelledby="play-feature-title"><div class="play-feature-art"><img src="../assets/covers/g06.webp?v=20261025.5" width="960" height="540" alt="'+(lang==='zh'?'Bio-City 極速競賽賽車封面':'Bio-City レースゲームのカバー')+'" loading="eager"></div><div class="play-feature-copy"><span class="kicker">FOCUS / G06 RACING</span><h2 id="play-feature-title">'+label+'</h2><p>'+desc+'</p><div class="play-feature-actions"><button class="btn play-feature-primary" type="button" data-launch="g06" data-feature="g06">'+action+'</button><a class="btn secondary" href="../../'+lang+'/play.html#game-list">'+all+' ↓</a></div></div></section>';
 if(!html.includes('</section><div class="hub-progress">'))throw Error('missing hub section for '+lang);
 return html.replace('</section><div class="hub-progress">','</section>'+feature+'<div class="hub-progress">');
}
for(const lang of ['zh','ja']){
 const source=fs.readFileSync(path.join(root,'arcade',lang,'index.html'),'utf8');
 const file=path.join(root,lang,'play.html'),html=makePlay(lang,source,c);
 if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==html){console.error('Out of sync:',lang+'/play.html');bad++;}}
 else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html,'utf8');console.log('Built',lang+'/play.html');}
}
if(check&&bad)process.exitCode=1;
