'use strict';const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const source=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/campaign-core.js'),'utf8');let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
function load(storage){const root={};Object.defineProperty(root,'localStorage',{get:()=>{if(storage===null)throw Error('storage getter denied');return storage;}});vm.runInNewContext(source,{window:root});return root.BioCampaign;}
const bag=new Map(),db={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,v)},C=load(db);
if(!process.argv[2]){
 for(const [id,mode]of [['g01','volley'],['g02','volley'],['g03','volley'],['g04','volley'],['g05','volley'],['g05','pong'],['g06','volley']])for(const difficulty of ['normal','hard','expert']){
  const store=new Map(),database={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},p=load(database),key=p.key(id,mode,difficulty);p.complete(id,mode,difficulty,5,99999);check(!store.has(key),id+' cannot write a locked completion');for(let chapter=1;chapter<=5;chapter++){const saved=p.complete(id,mode,difficulty,chapter,chapter*100);check(saved.unlocked===Math.min(5,chapter+1)&&saved.wins===chapter&&saved.best===chapter*100,id+'/'+mode+'/'+difficulty+' sequential save');}check(load(database).read(id,mode,difficulty).best===500,id+' reloads old-format three-field saves');p.complete(id,mode,difficulty,1,10);check(p.read(id,mode,difficulty).best===500&&p.read(id,mode,difficulty).wins===6,id+' legitimate replay counts a win but never erases best');
 }
 db.setItem(C.key('g04','volley','normal'),'corrupt-json');check(C.read('g04','volley','normal').unlocked===1&&C.isPersistent(),'corrupt JSON is not confused with a storage permission failure');
 let blocked=true;const recover={getItem:()=>'{"unlocked":1,"best":700,"wins":1}',setItem:(k,v)=>{if(blocked)throw Error('quota');recover.saved=JSON.parse(v);}},p=load(recover);p.complete('g06','volley','normal',1,600);check(p.read('g06','volley','normal').unlocked===2&&!p.isPersistent(),'pending write takes precedence over an older readable save');blocked=false;p.complete('g06','volley','normal',2,800);check(recover.saved.unlocked===3&&recover.saved.best===800&&p.isPersistent(),'persistence recovery writes pending progression without migration');
}
if(!process.argv[2]||process.argv[2]==='finite'){
 C.complete('g01','volley','normal',1,800);C.complete('g01','volley','normal',2,Infinity);check(C.read('g01','volley','normal').best===800,'nonfinite score cannot erase a valid previous best');
}
if(!process.argv[2]||process.argv[2]==='blocked'){
 const privateDb={getItem:()=>null,setItem:()=>{throw Error('quota');}},P=load(privateDb);P.complete('g05','pong','normal',1,500);check(P.read('g05','pong','normal').unlocked===2,'quota failure preserves unlocks for this page session');check(P.read('g05','volley','normal').unlocked===1,'volatile sport-mode saves stay separate');
 const denied=load(null);check(denied.read('g06','volley','normal').unlocked===1,'denied localStorage getter recovers');denied.complete('g06','volley','normal',1,900);check(denied.read('g06','volley','normal').unlocked===2,'denied getter still permits session progression');
}
console.log('CAMPAIGN INTEGRITY PASS '+checks+' checks');
