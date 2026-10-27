// Bounded, test-only evidence for actionability / iframe stalls. No retries,
// force-clicks, animation suppression or larger action timeouts are installed.
import fs from 'node:fs';import path from 'node:path';
export async function observeBrowser(context){
 await context.addInitScript(heartbeat=>{
  const events=[],samples=[];let frames=0,lastFrame=performance.now(),lastTimer=lastFrame,maxTimerGap=0;
  const record=(type,extra={})=>{events.push({at:Math.round(performance.now()),type,...extra});if(events.length>80)events.shift();};
  const frame=now=>{frames++;lastFrame=now;requestAnimationFrame(frame);};if(heartbeat)requestAnimationFrame(frame);
  setInterval(()=>{const now=performance.now();maxTimerGap=Math.max(maxTimerGap,now-lastTimer);lastTimer=now;},100);
  setInterval(()=>{const s=window.BioSuiteHub?.debugState||window.BioArcadeShooter?.state;samples.push({at:performance.now(),hidden:document.hidden,phase:document.querySelector('#stage')?.dataset.phase||s?.phase,active:s?.active,paused:s?.paused,loading:s?.loading,queued:s?.rafQueued,simulation:s?.simulation});if(samples.length>80)samples.shift();},500);
  for(const type of ['pointerdown','pointerup','click','visibilitychange','blur','focus'])window.addEventListener(type,e=>{const b=e.target?.closest?.('button');record(type,{id:b?.id||e.target?.id||'',launch:b?.dataset.launch,hidden:document.hidden});},true);
  window.__bioBrowserDiagnostics=()=>{const box=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,x:r.x,y:r.y,display:s.display,visibility:s.visibility,inert:e.inert,disabled:e.disabled};};return {at:performance.now(),heartbeat,frames,lastFrame,frameGap:heartbeat?performance.now()-lastFrame:null,maxTimerGap,hidden:document.hidden,focus:document.activeElement?.id,setup:box('setup'),play:box('setup-play'),back:box('stage-back'),events,samples};};
 },process.env.BIO_TEST_RAF_HEARTBEAT==='1');
 if(process.env.BIO_BROWSER_TRACE==='1')await context.tracing.start({snapshots:true,screenshots:false,sources:true});
}
export async function recordBrowserFailure(browser,qa){
 let i=0;for(const context of browser.contexts()){
  for(const page of context.pages()){
   const evidence={url:page.url(),frames:[]};for(const frame of page.frames())evidence.frames.push(await frame.evaluate(()=>({url:location.href,probe:window.__bioBrowserDiagnostics?.(),hub:window.BioSuiteHub?.debugState,shooter:window.BioArcadeShooter?.state})).catch(e=>({error:String(e)})));
   const file=path.join(qa,'failure-diagnostics-'+i+'.json');fs.writeFileSync(file,JSON.stringify(evidence,null,2));console.error('ACTIONABILITY DIAGNOSTICS '+file+' '+JSON.stringify(evidence.frames.map(f=>({url:f.url,hidden:f.probe?.hidden,timerGap:f.probe?.maxTimerGap,phase:f.hub?.active||f.shooter?.phase}))));i++;
  }
  if(process.env.BIO_BROWSER_TRACE==='1')await context.tracing.stop({path:path.join(qa,'failure-trace-'+i+'.zip')}).catch(()=>{});
 }
}
