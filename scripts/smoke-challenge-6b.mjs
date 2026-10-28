import assert from 'node:assert/strict';import {setup} from './lib/friends-browser.mjs';
for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
 const v=await setup({viewport});const [a,b]=v.pages;try{
  for(const [i,p]of v.pages.entries()){const origin=new URL(p.url()).origin;await p.goto(origin+'/arcade/qa/challenge-v16/index.html?lang='+(i?'ja':'zh'));await p.waitForFunction(()=>!!window.BioChallengeApp);}
  await a.locator('#game').selectOption('g03');await a.locator('#chapter').selectOption('3');await a.locator('#difficulty').selectOption('hard');await a.locator('#create').click();const code=await a.locator('#code').inputValue();await b.locator('#code').fill(code);await b.locator('#check').click();assert.equal(await b.locator('#start').isEnabled(),true);
  await Promise.all([a.locator('#start').click(),b.locator('#start').click()]);await Promise.all(v.pages.map(p=>p.waitForFunction(()=>BioChallengeApp.inspect().playing)));
  const layouts=await Promise.all(v.pages.map(p=>p.evaluate(()=>BioChallengeApp.inspect().geometry.platforms.map(({x,y,w,type,pickup})=>({x,y,w,type,pickup})))));assert.deepEqual(layouts[0],layouts[1]);
  // Wait for genuine loss/end states; no score, platform or health setters.
  await Promise.all(v.pages.map(p=>p.waitForFunction(()=>!!BioChallengeApp.inspect().result,null,{timeout:30000})));const stairResult=await a.locator('#result').inputValue();await b.locator('#result').fill(stairResult);await b.locator('#compare').click();assert.match(await b.locator('#comparison').innerText(),/フレンド:/g);
  await a.locator('#leave').click();await b.locator('#leave').click();await b.locator('#code').fill(code+'x');await b.locator('#check').click();assert.equal(await b.locator('#start').isDisabled(),true);
  await a.locator('#game').selectOption('g04');await a.locator('#create').click();const marble=await a.locator('#code').inputValue();await b.locator('#code').fill(marble);await b.locator('#check').click();await Promise.all([a.locator('#start').click(),b.locator('#start').click()]);await Promise.all(v.pages.map(p=>p.waitForFunction(()=>BioChallengeApp.inspect().playing&&BioChallengeApp.inspect().condition.game==='g04')));assert.equal(await a.evaluate(()=>BioChallengeApp.inspect().geometry.stage),1);
  // Real keyboard firing and recall drive both engines to an actual result.
  for(let n=0;n<60;n++){if(await a.evaluate(()=>!!BioChallengeApp.inspect().result)&&await b.evaluate(()=>!!BioChallengeApp.inspect().result))break;await Promise.all(v.pages.map(async p=>{await p.keyboard.press('j');await new Promise(r=>setTimeout(r,55));await p.keyboard.press('l');}));await new Promise(r=>setTimeout(r,90));}
  await Promise.all(v.pages.map(p=>p.waitForFunction(()=>!!BioChallengeApp.inspect().result,null,{timeout:15000})));const resultA=await a.locator('#result').inputValue();await b.locator('#result').fill(resultA);await b.locator('#compare').click();assert.match(await b.locator('#comparison').innerText(),/フレンド:/g);
  assert.deepEqual(v.errors,[]);console.log('6B CHALLENGE BROWSER PASS',viewport.width,viewport.height,'zh/ja seed exchange, gameplay start, invalid code');
 }finally{await v.close();}
}
