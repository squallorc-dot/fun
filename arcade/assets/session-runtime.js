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
 async function prepare(tasks,timeout=15000){
  let timer;
  try{
   const results=await Promise.race([Promise.all(tasks),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('asset-timeout')),timeout);})]);
   if(results.flat().some(value=>value!==true))throw new Error('asset-error');
  }finally{clearTimeout(timer);}
 }
 root.BioArcadeSession=Object.freeze({countdown,prepare});
})(typeof window==='undefined'?globalThis:window);
