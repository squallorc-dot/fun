/* Runs without Node dependencies. Checks start -> gameplay -> termination on all new game modules. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');let source=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8');const ctx={window:{},Math,console};vm.runInNewContext(source,ctx);const R=ctx.window.BioSuiteGames;
for(const [name,mode] of [['g01','volley'],['g03','volley'],['g04','volley'],['g05','volley'],['g05','pong'],['g06','volley']]){
 let result=null,env={hero:0,difficulty:'normal',mode,I:{hero:['B','M','C','Y','J','V','O']},sfx:()=>{},finish:(...args)=>result=args,ga:()=>{}};
 const g=R[name](env);g.w=640;g.h=510;g.start();
 if(typeof g.hud!=='function'||typeof g.draw!=='function'||typeof g.update!=='function')throw Error(name+' contract missing');
 for(let i=0;i<9000&&!result;i++){
  const inp={left:i%180<50,right:i%180>=50&&i%180<110,up:i%135<40,down:false,fire:i%18<11,jump:i%119===0,dodge:i%137===0,skill:i%171===0,pointer:{down:false,x:280,y:210}};
  g.update(.016,inp);g.hud();
 }
 if(!result||typeof result[0]!=='boolean'||!Number.isFinite(result[1]))throw Error(name+' did not complete a real match');
 console.log(name,mode,result[0]?'win':'lose','score',result[1]);
}
// Deterministic G05 regression: previous volleyball match could exceed 9000 frames.
const sourceCode=source;
for(const mode of ['volley','pong']){
 for(const difficulty of ['normal','hard','expert']){
  for(let seed=1;seed<=35;seed++){
   let state=seed;
   const seededMath=Object.create(Math);
   seededMath.random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
   const scope={window:{},console};
   vm.runInNewContext(sourceCode,vm.createContext({...scope,Math:seededMath}));
   const engine=scope.window.BioSuiteGames.g05;
   let result=null;
   const env={hero:0,difficulty,mode,I:{hero:['B','M','C','Y','J','V','O']},sfx:()=>{},finish:(...args)=>{result=args},ga:()=>{}};
   const game=engine(env);game.w=640;game.h=510;game.start();
   for(let i=0;i<9000&&!result;i++){
    const input={left:i%180<50,right:i%180>=50&&i%180<110,up:i%135<40,down:false,fire:i%18<11,jump:i%119===0,dodge:i%137===0,skill:i%171===0,pointer:{down:false,x:280,y:210}};
    game.update(.016,input);
   }
   if(!result||typeof result[0]!=='boolean'||!Number.isFinite(result[1]))throw Error(`G05 ${mode}/${difficulty} seed ${seed} failed to settle`);
  }
 }
 console.log('G05',mode,'105 seeded matches: PASS');
}
