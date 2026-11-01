// The release candidate uses the existing site and lobby; no external analytics requests.
import assert from 'node:assert/strict';import {setup} from './lib/friends-browser.mjs';
const app=await setup({viewport:{width:390,height:844}});
try{
 for(const [i,page]of app.pages.entries()){
  const locale=i?'ja':'zh',origin=new URL(page.url()).origin;await page.goto(origin+'/arcade/'+locale+'/index.html');
  const live=page.locator('a[href*="bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/?lang='+locale+'"]');
  assert.equal(await live.count(),1,'live multiplayer remains separate and explicitly beta');
  const link=page.locator('a[href="../challenge/index.html?lang='+locale+'"]');
  assert.equal(await link.count(),1,'public hub must expose offline friend challenge mode');
  await link.click();await page.waitForFunction(()=>!!window.BioChallengeApp);
  assert(new URL(page.url()).pathname.endsWith('/arcade/challenge/index.html'),'public standalone challenge path');
  assert.equal(new URL(page.url()).searchParams.get('lang'),locale);
  assert.equal(await page.locator('#create').count(),1,'challenge-code creation UI exists');
  await page.locator('#friends-link').click();
  assert(new URL(page.url()).pathname.endsWith('/arcade/'+locale+'/index.html'),'challenge returns to local game center');
 }
 assert.deepEqual(app.errors,[]);console.log('FRIENDS ENTRY PASS: public bilingual asynchronous challenge and separate real-time Beta; mobile viewport');
}finally{await app.close();}
