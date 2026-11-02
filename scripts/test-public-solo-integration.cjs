'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const zh=read('zh/play.html'),ja=read('ja/play.html');
for(const [html,lang]of [[zh,'zh'],[ja,'ja']]){
 assert(!html.includes('../challenge/index.html?lang='+lang),'retired offline challenge has no public entry '+lang);
 assert(!html.includes('hub-more-async'),'no offline challenge card on public hub '+lang);
 for(const id of ['arcade-root','protocol-quiz-root','protocol-quiz'])assert(!html.includes('id="'+id+'"'),'archived duplicate content removed from six-game hub '+id+' '+lang);
 assert(!html.includes('unified-experiences.css')&&!html.includes('classic-arcade-lazy'),'archived experience scripts are not loaded '+lang);
 assert(html.includes('bio-city-v161-signaling.squall-orc.workers.dev')&&/Beta/.test(html),'real-time remains explicitly separate Beta');
 assert(!html.includes('../qa/friends-v16/index.html?lang='+lang),'do not link private manual SDP lab from public hub');
 assert(html.includes('../assets/games-core.js?v=20261101.1'),'central build asset version stays synchronized '+lang);
}
assert(!fs.existsSync(path.join(root,'arcade/challenge/index.html')),'retired public challenge route removed without redirects');
const sitemap=read('sitemap.xml');
assert(/\/(?:zh|ja)\/play\.html/.test(sitemap),'PLAY is the public game URL in sitemap');
for(const lang of ['zh','ja'])assert(sitemap.includes('/'+lang+'/play.html'),'PLAY is indexed in sitemap '+lang);
for(const lang of ['zh','ja'])assert(fs.existsSync(path.join(root,lang,'play.html')),'official PLAY page exists without redirect '+lang);
const core=read('arcade/assets/games-core.js');
for(const term of ['發球先彈兩次','安全平台／陷阱','檢查點','桌球','氮氣','深度']){
 assert(core.includes(term),'solo HUD/onscreen translation missing '+term);
}
const help=read('arcade/assets/game-guide.js');
assert(help.includes("title:'遊戲說明與按鍵'")&&help.includes('g06:')&&help.includes('pong:')&&help.includes('g02:'),'single player controls registry remains complete');
assert(read('assets/arcade-engine.js').includes("namespace:'classic'"),'classic controls use their own accessible dialog identifiers');
const game=read('assets/arcade-engine.js');
assert(game.includes("wave:'波次',score:'得分'"),'G02 SOLO translated HUD');
for(const p of ['arcade/assets/hub.js','arcade/assets/games-core.js','assets/arcade-engine.js']){
 new Function(read(p));
}
console.log('SOLO PUBLIC INTEGRATION PASS: zh/ja independent entry, no offline code exchange, 6 localized game screens, asset paths and JS syntax');
