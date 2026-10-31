// Validate the public Beta destination while keeping the independent local
// manual-lobby and challenge smoke checks on the CI test origin.
// Never follow an external production Worker from an isolated CI browser.
import assert from 'node:assert/strict';import {setup} from './lib/friends-browser.mjs';
const app=await setup({viewport:{width:390,height:844}});
try{
 for(const [i,page] of app.pages.entries()){
  const locale=i?'ja':'zh',origin=new URL(page.url()).origin;
  await page.goto(origin+'/arcade/'+locale+'/index.html');
  const publicUrl='https://bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/?lang='+locale;
  const link=page.locator('a[href="'+publicUrl+'"]');
  assert.equal(await link.count(),1,'official hub exposes exact Beta origin in '+locale);
  // The local manual QA lobby is separately exercised; the public destination
  // requires Cloudflare deployment and is verified by cloud acceptance.
  await page.goto(origin+'/arcade/qa/friends-v16/index.html?lang='+locale);
  await page.waitForFunction(()=>!!window.BioFriendsApp);
  assert.equal(await page.locator('#language').inputValue(),locale);
  await page.locator('#challenge-link').click();
  await page.waitForFunction(()=>!!window.BioChallengeApp);
  assert.equal(new URL(page.url()).searchParams.get('lang'),locale);
 }
 assert.deepEqual(app.errors,[]);
 console.log('FRIENDS ENTRY PASS: exact bilingual Beta URL plus local manual lobby and challenge');
}finally{await app.close();}
