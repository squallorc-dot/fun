// Public mobile smoke: single-player hub and separately marked live multiplayer Beta.
// No external Worker navigation or manual SDP/async-code page should be required.
import assert from 'node:assert/strict';import {setup} from './lib/friends-browser.mjs';
const app=await setup({viewport:{width:390,height:844}});
try{
 for(const [i,page] of app.pages.entries()){
  const locale=i?'ja':'zh',origin=new URL(page.url()).origin;
  await page.goto(origin+'/arcade/'+locale+'/index.html');
  const live=page.locator('a[href*="bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/?lang='+locale+'"]');
  assert.equal(await live.count(),1,'live multiplayer remains separate and explicitly beta');
  assert.equal(await page.locator('.hub-more-async').count(),0,'offline code exchange UI is removed');
  assert.equal(await page.locator('a[href*="challenge/index.html"]').count(),0,'offline friend code links are retired');
  assert.equal(await page.locator('[data-launch]').count(),6,'all six solo games remain available');
  assert.equal(await page.locator('#hero-choices').count(),1,'solo hero selector remains mounted');
  assert.equal(await page.locator('#arcade-root').count(),1,'legacy defense game retained in unified hub');
  await page.waitForFunction(()=>!!document.querySelector('#protocol-quiz-root button[data-qaction="start"]'));
  assert.equal(await page.locator('#protocol-quiz-root button[data-qaction="start"]').count(),1,'8-question decision lab mounts on unified hub');
 }
 assert.deepEqual(app.errors,[]);console.log('FRIENDS ENTRY PASS: bilingual solo hub, six games, separate Beta, no offline code exchange');
}finally{await app.close();}
