// FUNAI CARE single-template bilingual static build, Node 20+, no external dependencies
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const keys=["home","world","heroes","story","music","play","strategy"];
function render(lang,key,c,content){
const l=c.locales[lang], m=c.meta[key][lang], prefix=key==="home"?"":"../";
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const route=(la,k)=>k==="home"?(la==="zh"?"FUNAI-CARE.html":"FUNAI-CARE_jp.html"):`${la}/${k}.html`;
const rel=(la,k)=>prefix+route(la,k);
const abs=(la,k)=>c.base+route(la,k);
const current=k=>key===k?' aria-current="page"':"";
const nav=keys.map((k,i)=>`<a href="${rel(lang,k)}"${current(k)}>${esc(l.names[i])}</a>`).join("");
const bottom=["home","heroes","story","music"].map((k,i)=>`<a href="${rel(lang,k)}"${current(k)}><span>${["⌂","♛","▶","♫"][i]}</span>${esc(l.names[keys.indexOf(k)])}</a>`).join("");
const metaJson=JSON.stringify({"@context":"https://schema.org","@type":"WebPage",name:m.title,url:abs(lang,key),inLanguage:l.htmlLang,description:m.desc}).replace(/</g,"\\u003c");
return `<!DOCTYPE html>
<html lang="${l.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.desc)}">
<meta name="theme-color" content="#061423">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FUNAI CARE">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.desc)}">
<meta property="og:url" content="${abs(lang,key)}">
<meta property="og:image" content="${c.ogImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(l.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${c.ogImage}">
<meta name="twitter:image:alt" content="${esc(l.alt)}">
<link rel="canonical" href="${abs(lang,key)}">
<link rel="alternate" hreflang="zh-TW" href="${abs("zh",key)}">
<link rel="alternate" hreflang="ja" href="${abs("ja",key)}">
<link rel="alternate" hreflang="x-default" href="${abs("zh",key)}">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}assets/site.css?v=${c.version}">${key==="play"?`<link rel="stylesheet" href="${prefix}assets/protocol.css?v=20261024.25"><link rel="stylesheet" href="${prefix}assets/arcade.css?v=20261025.5">`:""}
<script type="application/ld+json">${metaJson}</script>
<script>(function(w,d,s,n,i){w[n]=w[n]||[];w[n].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${c.gtm}');</script>
</head>
<body data-page="${key}">
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${c.gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip-link" href="#main-content">${esc(l.skip)}</a>
<header class="app-header"><div class="app-header-inner">
<a class="logo" href="${rel(lang,"home")}"><span class="logo-icon">✦</span><span><b>FUNAI CARE</b><small>${esc(l.logo)}</small></span></a>
<nav class="main-nav" id="primary-menu" aria-label="${esc(l.navAria)}">${nav}</nav>
<div class="language-links"><a href="${rel("zh",key)}"${lang==="zh"?' aria-current="page"':""}>繁中</a><a href="${rel("ja",key)}"${lang==="ja"?' aria-current="page"':""}>日本語</a></div>
<div class="mobile-header-controls">
 <details class="mobile-language"><summary aria-label="${lang==="zh"?"選擇語言":"言語を選択"}">${lang==="zh"?"繁中":"日本語"}<span class="mobile-language-arrow" aria-hidden="true">⌄</span></summary><div class="mobile-language-options"><a href="${rel("zh",key)}"${lang==="zh"?' aria-current="page"':""}>繁中</a><a href="${rel("ja",key)}"${lang==="ja"?' aria-current="page"':""}>日本語</a></div></details>
 <button type="button" class="mobile-explore-toggle" aria-controls="mobile-explore-panel" aria-expanded="false" aria-label="${lang==="zh"?"開啟探索選單":"探索メニューを開く"}"><span class="mobile-menu-bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
</div>
</div><nav id="mobile-explore-panel" class="mobile-explore-panel" aria-label="${lang==="zh"?"探索其他內容":"その他のページを探す"}" hidden>${["world","play","strategy"].map(k=>`<a href="${rel(lang,k)}"${current(k)}><span class="mobile-explore-icon" aria-hidden="true">${{world:"◎",play:"◇",strategy:"✦"}[k]}</span><span><strong>${esc(l.names[keys.indexOf(k)])}</strong><small>${lang==="zh"?{world:"認識 Bio-City 世界觀",play:"角色配對與小遊戲",strategy:"企劃創作與數位應用"}[k]:{world:"Bio-City の世界観",play:"ヒーロー診断・ミニゲーム",strategy:"制作・デジタル活用"}[k]}</small></span><span class="mobile-explore-chevron" aria-hidden="true">›</span></a>`).join("")}</nav><div class="reading-progress"></div></header>
<nav class="bottom-nav" aria-label="${esc(l.quick)}">${bottom}</nav>
<main id="main-content" class="app-width">${content}</main>
<footer class="app-footer"><div class="app-width"><strong>${esc(l.brand)}</strong><p class="footer-credit">${lang==="zh"?"企劃・創作・網站製作｜家葦":"企画・クリエイティブ・Webサイト制作｜家葦"}</p><small class="footer-edition">FUNAI CARE · Bio-City · 2026</small></div></footer>
<button type="button" class="backtop" aria-label="${esc(l.backtop)}">↑</button>
<div id="global-audio-player" class="floating-audio-player" aria-live="polite"><div class="f-audio-info"><span class="f-audio-label">NOW PLAYING</span><span id="f-audio-name" class="f-audio-name">FUNAI CARE</span></div><button class="f-audio-btn" onclick="stopAllHeroAudio()" type="button" aria-label="${esc(l.stop)}">⏸</button></div>
<script defer src="${prefix}assets/site.js?v=${c.version}"></script>${key==="play"?`<script defer src="${prefix}assets/protocol-engine.js?v=${c.version}"></script><script defer src="${prefix}arcade/assets/world-art.js?v=20261025.5"></script><script defer src="${prefix}arcade/assets/guardian-art.js?v=20261025.5"></script><script defer src="${prefix}assets/arcade-engine.js?v=20261025.5"></script><script defer src="${prefix}assets/${lang}-play.js?v=${c.version}"></script>`:""}
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
if(check){if(bad){console.error(bad+' files need rebuilding. Run: node scripts/build.mjs');process.exitCode=1;}else console.log('All 14 pages match their central sources.');}
