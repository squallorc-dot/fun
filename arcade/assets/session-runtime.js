/* Shared startup gate and cancellable resume clock. No game physics or visual modes. */
((root)=>{'use strict';
 function countdown({tick,done,seconds=3,setTimer=setTimeout,clearTimer=clearTimeout}){
  let timer=null,generation=0,running=false;
  function cancel(){generation++;running=false;if(timer!==null)clearTimer(timer);timer=null;}
  function start(){cancel();const current=generation;let left=seconds;running=true;
   const step=()=>{if(current!==generation)return;if(left<=0){timer=null;running=false;done();return;}tick(left--);if(current===generation)timer=setTimer(step,1000);};
   step();
  }
  return {start,cancel,get running(){return running;}};
 }
 // Simulation runs at 120 Hz while Canvas still draws on every animation frame.
 // A bounded 250 ms catch-up absorbs ordinary stalls without an unbounded update spiral.
 function simulation({hz=120,maxFrame=.25,maxSteps=30}={}){
  const step=1/hz;let debt=0,ticks=0,frames=0,discarded=0,generation=0;
  function clear(){debt=0;generation++;}
  function reset(){clear();ticks=frames=discarded=0;}
  return {clear,reset,advance(delta,update){
   frames++;const elapsed=Number.isFinite(delta)?Math.max(0,delta):0,accepted=Math.min(elapsed,maxFrame);discarded+=elapsed-accepted;debt+=accepted;
   const current=generation;let count=0;
   while(debt+1e-10>=step&&count<maxSteps){debt=Math.max(0,debt-step);ticks++;count++;if(update(step)===false||current!==generation){debt=0;break;}}
   if(count===maxSteps&&debt>=step){const keep=debt%step;discarded+=debt-keep;debt=keep;}
   return count;
  },get metrics(){return {hz,ticks,frames,time:ticks*step,debt,discarded,maxFrame,maxSteps};}};
 }
 async function prepare(tasks,timeout=15000){
  let timer;
  try{
   const results=await Promise.race([Promise.all(tasks),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('asset-timeout')),timeout);})]);
   if(results.flat().some(value=>value!==true))throw new Error('asset-error');
  }finally{clearTimeout(timer);}
 }
 root.BioArcadeSession=Object.freeze({countdown,prepare,simulation});
})(typeof window==='undefined'?globalThis:window);
