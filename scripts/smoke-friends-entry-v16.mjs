// The release candidate uses the existing site and lobby; no external analytics requests.
import assert from 'node:assert/strict';import {setup} from './lib/friends-browser.mjs';
const app=await setup({viewport:{width:390,height:844}});
try{
 for(const [i,page]of app.pages.entries()){
  const locale=i?'ja':'zh',origin=new URL(page.url()).origin;await page.goto(origin+'/arcade/'+locale+'/index.html');
  const link=page.locator('a[href="../qa/friends-v16/index.html?lang='+locale+'"]');assert.equal(await link.count(),1);await link.click();await page.waitForFunction(()=>!!window.BioFriendsApp);assert.equal(await page.locator('#language').inputValue(),locale);
  await page.locator('#challenge-link').click();await page.waitForFunction(()=>!!window.BioChallengeApp);assert.equal(new URL(page.url()).searchParams.get('lang'),locale);
 }
 assert.deepEqual(app.errors,[]);console.log('FRIENDS ENTRY PASS: same-site bilingual lobby and self-reported challenge; mobile viewport');
}finally{await app.close();}
