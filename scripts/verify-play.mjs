// Official PLAY launch contract: static routing, bilingual six-game source and GTM boundaries.
import fs from 'node:fs';import assert from 'node:assert/strict';
for(const lang of ['zh','ja']){
 const p=lang+'/play.html',html=fs.readFileSync(p,'utf8');
 assert(html.includes('<base href="../arcade/'+lang+'/">'),p+' must resolve shared game assets without copying engines');
 assert(html.includes('href="https://squallorc-dot.github.io/fun/'+lang+'/play.html"'),p+' canonical is new PLAY');
 assert(html.includes('GTM-5M4KVKNX'),p+' GTM retained');
 assert(html.includes('hreflang="ja" href="https://squallorc-dot.github.io/fun/ja/play.html"'),p+' ja hreflang PLAY route');
 assert(html.includes('hreflang="zh-TW" href="https://squallorc-dot.github.io/fun/zh/play.html"'),p+' zh hreflang PLAY route');
 assert(html.includes('data-launch="g06" data-feature="g06"'),p+' G06 featured shortcut routes to same game');
 assert(html.includes('id="game-list"'),p+' game list');
 assert(html.includes('arcade/assets')===false || html.includes('../assets/'),p+' shared resources');
 assert(html.includes('bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/?lang='+lang),p+' beta link retained');
 assert(!html.includes('href="../../arcade/'+lang+'/index.html"'),p+' cannot link old arcade');
 assert(html.includes('src="../assets/hub.js'),p+' canonical shared game hub');
 assert(html.includes('site-navigation-script'),p+' shared site nav');
 const m=html.match(/data-feature="g06"/g)||[];assert(m.length===1,p+' one G06 feature');
}
const shell=fs.readFileSync('scripts/site-shell.mjs','utf8'),hub=fs.readFileSync('arcade/assets/hub.js','utf8');
assert(shell.includes("key==='play'?\`\${lang}/play.html\`"),'site shell routes to PLAY');
assert(hub.includes("ga('arcade_feature_click'"),'feature click is a distinct GA event');
assert(hub.includes("ga('arcade_game_select'"),'game selection is tracked separately from game start');
const nav=fs.readFileSync('assets/navigation.js','utf8');
for(const e of ['site_navigation_click','site_language_switch','arcade_catalog_click','arcade_friends_beta_click'])assert(nav.includes("'"+e+"'"),'navigation tracking missing '+e);
assert(hub.includes("ga('arcade_game_start'")&&hub.includes("ga('game_completed'"),'core gameplay events preserved');
console.log('PASS bilingual PLAY page contract, GTM, G06 and shared engines');
