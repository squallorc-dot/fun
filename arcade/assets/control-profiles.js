/* Input preferences only. Audio, effects, difficulty and saves are independent. */
((root)=>{'use strict';
 const KEY='bio_arcade_controls_v1';
 const defaults=Object.freeze({version:1,profile:'two',joystick:'fixed',stickSize:108,buttonScale:1,gap:12,inset:0,raise:0,deadzone:.18,sensitivity:1,smoothing:20,mirror:false,gestures:true,assist:false});
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function normalize(value){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{},p={...defaults};
  if(['two','left','right','desktop'].includes(v.profile))p.profile=v.profile;
  if(['fixed','floating'].includes(v.joystick))p.joystick=v.joystick;
  for(const [key,a,b]of [['stickSize',88,136],['buttonScale',.8,1.2],['gap',8,18],['inset',0,48],['raise',0,48],['deadzone',.1,.3],['sensitivity',.6,1.6],['smoothing',0,100]])if(typeof v[key]==='number'&&Number.isFinite(v[key]))p[key]=clamp(v[key],a,b);
  for(const key of ['mirror','gestures','assist'])if(typeof v[key]==='boolean')p[key]=v[key];
  return p;
 }
 const oneHand=p=>p.profile==='left'||p.profile==='right';
 function vector(x,y,p,axis='xy'){
  if(axis==='x')y=0;if(axis==='y')x=0;
  const length=Math.hypot(x,y);if(length<=p.deadzone)return {x:0,y:0};
  const magnitude=clamp((Math.min(1,length)-p.deadzone)/(1-p.deadzone)*p.sensitivity,0,1);
  return {x:x/length*magnitude,y:y/length*magnitude};
 }
 function smooth(previous,target,dt,milliseconds){if(target.x===0&&target.y===0||milliseconds===0)return {...target};const a=1-Math.exp(-Math.max(0,dt)/(milliseconds/1000));return {x:previous.x+(target.x-previous.x)*a,y:previous.y+(target.y-previous.y)*a};}
 function geometry(p,keys,compact,g02,factor=1,shortRows=0){
  const d=Math.max(76,p.stickSize*(compact?92/108:1)*factor),b=Math.max(56,(compact?64:g02?78:70)*p.buttonScale*factor),s=Math.max(48,(compact?56:64)*p.buttonScale*factor),gap=Math.max(8,p.gap*factor),zone=d+(p.joystick==='floating'?32*factor:0);
  let stick={x:0,y:0,w:zone,h:zone,d},buttons=[];
  if(oneHand(p)&&shortRows){
   const rows=Math.min(shortRows,Math.max(1,keys.length)),ah=rows===2?b+gap+s:Math.max(b,s);
   stick.x=0;stick.y=(ah-zone)/2;
   buttons=keys.map((key,i)=>{const size=i?s:b,col=Math.floor(i/rows),row=i%rows;return {key,x:zone+gap+(col?b+gap+(col-1)*(s+gap):0),y:row*(b+gap),w:size,h:size};});
   if(p.profile==='right'){stick.x=-stick.x-stick.w;buttons=buttons.map(r=>({...r,x:-r.x-r.w}));}
  }else if(oneHand(p)){
   const angles=keys.length===4?[180,220,260,300]:keys.length===3?[180,240,300]:keys.length===2?[180,240]:[180];
   const angleStep=keys.length===4?40:60;
   const pairBounds=[];for(let i=0;i<angles.length;i++)for(let j=i+1;j<angles.length;j++){const a=angles[i]*Math.PI/180,c=angles[j]*Math.PI/180;pairBounds.push(((i?s:b)/2+(j?s:b)/2+gap)/Math.max(Math.abs(Math.cos(a)-Math.cos(c)),Math.abs(Math.sin(a)-Math.sin(c))));}
   const radius=Math.max(...pairBounds,zone/2+b/2+gap,(b/2+s/2+gap)/(2*Math.sin(angleStep*Math.PI/360)),...angles.map((angle,i)=>{const a=angle*Math.PI/180;return (zone/2+(i?s:b)/2+gap)/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));}));
   stick.x=-zone/2;stick.y=-zone/2;
   buttons=keys.map((key,i)=>{const a=angles[i]*Math.PI/180,size=i?s:b;return {key,x:Math.cos(a)*radius*(p.profile==='left'?-1:1)-size/2,y:Math.sin(a)*radius-size/2,w:size,h:size};});
  }else{
   buttons=keys.map((key,i)=>{const col=i%2,row=Math.floor(i/2),size=i?s:b;return {key,x:col*(b+gap),y:row*(b+gap),w:size,h:size};});
  }
  const bounds=items=>({left:Math.min(...items.map(r=>r.x)),top:Math.min(...items.map(r=>r.y)),right:Math.max(...items.map(r=>r.x+r.w)),bottom:Math.max(...items.map(r=>r.y+r.h))});
  const all=bounds([stick,...buttons]),action=buttons.length?bounds(buttons):{left:0,top:0,right:0,bottom:0};
  return {stick,buttons,bounds:all,action,zone};
 }
 function layout({width,height=300,compact=false,g02=false,keys=['fire'],prefs=defaults,safe={left:20,right:20,bottom:10}}){
  const p=normalize(prefs),available=Math.max(180,width-safe.left-safe.right),budget=compact&&oneHand(p)?Math.min(available,width-safe.left-safe.right-Math.max(120,width*.35)-12):available;let factor=1,g;
  for(let i=0;i<18;i++){
   g=geometry(p,keys,compact,g02,factor,compact&&oneHand(p)&&height<184?(height-safe.bottom-6<112?1:2):0);
   const needWidth=oneHand(p)?g.bounds.right-g.bounds.left:g.zone+(g.action.right-g.action.left)+12;
   const needHeight=oneHand(p)?g.bounds.bottom-g.bounds.top:Math.max(g.zone,g.action.bottom);
   if(needWidth<=budget+.1&&(!compact||needHeight<=height-safe.bottom-6+.1))break;
   factor*=.95;
  }
  let stick={...g.stick},buttons=g.buttons.map(r=>({...r})),dockHeight,reservedLeft=0,reservedRight=0;
  if(oneHand(p)){
   const w=g.bounds.right-g.bounds.left,h=g.bounds.bottom-g.bounds.top,inset=Math.min(p.inset,Math.max(0,budget-w));
   const x=p.profile==='left'?safe.left+inset:width-safe.right-inset-w;
   dockHeight=compact?height:Math.ceil(h+safe.bottom+p.raise+12);
   const y=clamp(dockHeight-safe.bottom-p.raise-h,0,Math.max(0,dockHeight-h));
   const move=r=>({...r,x:r.x-g.bounds.left+x,y:r.y-g.bounds.top+y});
   stick=move(stick);buttons=buttons.map(move);
   if(compact){if(p.profile==='left')reservedLeft=Math.ceil(x+w+12);else reservedRight=Math.ceil(width-x+12);}
  }else{
   const aw=g.action.right,ah=g.action.bottom,room=Math.max(0,(available-g.zone-aw-12)/2),inset=Math.min(p.inset,room);
   let lx=safe.left+inset,rx=width-safe.right-inset-aw;
   if(p.profile==='desktop'&&!compact){const gap=Math.min(72,Math.max(12,width-safe.left-safe.right-g.zone-aw))-Math.min(inset,24);lx=(width-g.zone-aw-gap)/2;rx=lx+g.zone+gap;}
   const mirrored=p.mirror,h=Math.max(g.zone,ah);dockHeight=compact?height:Math.ceil(h+safe.bottom+p.raise+12);
   const y=clamp(dockHeight-safe.bottom-p.raise-h,0,Math.max(0,dockHeight-h));
   stick.x=mirrored?width-lx-g.zone:lx;stick.y=y+(h-g.zone)/2;
   buttons=buttons.map(r=>({...r,x:mirrored?width-rx-aw+r.x:rx+r.x,y:y+(h-ah)/2+r.y}));
   if(compact){reservedLeft=Math.ceil((mirrored?width-rx:lx+g.zone)+12);reservedRight=Math.ceil((mirrored?lx+g.zone:width-rx)+12);}
  }
  return {stick,buttons,height:dockHeight,reservedLeft,reservedRight,compact,profile:p.profile};
 }
 let prefs=defaults;try{prefs=normalize(JSON.parse(root.localStorage?.getItem(KEY)||'{}'));}catch{prefs=normalize(null);}
 function set(value,persist=true){prefs=normalize(value);if(persist)try{root.localStorage?.setItem(KEY,JSON.stringify(prefs));}catch{}if(root.dispatchEvent&&typeof CustomEvent!=='undefined')root.dispatchEvent(new CustomEvent('bio-controls-change',{detail:{...prefs}}));return {...prefs};}
 let settingsOpen=false;
 function createInput({root:element,stick,knob,buttons,context,enabled,space,onLayout=()=>{},onAction=()=>{}}){
  const doc=element.ownerDocument,win=doc.defaultView,abort=new AbortController(),signal=abort.signal;
  let id=null,raw={x:0,y:0},filtered={x:0,y:0},anchor={x:0,y:0},origin={x:0,y:0},signature='',pulse=new Set(),upLatch=false,downLatch=false,plan=null,queued=0,disposed=false;
  const keyboardVisual=new Set(),owners=new Map(buttons.map(b=>[b.el,new Set()])),base=doc.createElement('span');base.className='bio-stick-base';
  stick.classList.add('bio-stick-zone');knob.classList.add('bio-stick-knob');base.appendChild(knob);stick.replaceChildren(base);element.classList.add('bio-controls');
  for(const b of buttons)b.el.classList.add('bio-action');
  function gestureAxis(){const c=context();return oneHand(prefs)&&prefs.gestures&&(c.game==='g03'||c.game==='g06'||c.game==='g05'&&c.mode!=='pong');}
  function target(){return vector(raw.x,raw.y,prefs,gestureAxis()?'xy':context().axis);}
  function paint(){if(!plan?.stick)return;const d=plan.stick.d,R=d*.34;base.style.left=(anchor.x-d/2)+'px';base.style.top=(anchor.y-d/2)+'px';knob.style.transform='translate(calc(-50% + '+clamp(raw.x,-1,1)*R+'px),calc(-50% + '+clamp(raw.y,-1,1)*R+'px))';}
  function paintButtons(){for(const {el,key}of buttons){const down=owners.get(el).size>0||keyboardVisual.has(key);el.classList.toggle('is-held',down);el.setAttribute('aria-pressed',String(down));}}
  function reset(){
   const previous=id;id=null;raw={x:0,y:0};filtered={x:0,y:0};pulse.clear();keyboardVisual.clear();upLatch=downLatch=false;
   for(const [el,ids]of owners){const held=[...ids];ids.clear();el.classList.remove('is-held');el.setAttribute('aria-pressed','false');for(const pointerId of held)try{if(el.hasPointerCapture(pointerId))el.releasePointerCapture(pointerId);}catch{}}
   try{if(previous!==null&&stick.hasPointerCapture(previous))stick.releasePointerCapture(previous);}catch{}
   if(plan?.stick){anchor={x:plan.stick.w/2,y:plan.stick.h/2};origin={...anchor};paint();}
  }
  function position(){
   if(disposed)return;const c=context(),visible=win.matchMedia('(pointer:coarse)').matches||win.innerWidth<=1100||prefs.profile!=='two';
   element.style.setProperty('display',visible?'block':'none','important');
   element.dataset.profile=prefs.profile;element.dataset.joystick=prefs.joystick;
   if(!visible){reset();plan={reservedLeft:0,reservedRight:0,height:0,compact:false,visible:false};onLayout(plan);return;}
   const compact=win.innerWidth>win.innerHeight&&win.innerHeight<=540,box=space().getBoundingClientRect(),parent=element.parentElement.getBoundingClientRect();
   element.style.setProperty('position',compact?'absolute':'relative','important');
   element.style.setProperty('top',compact?box.top-parent.top+'px':'auto','important');element.style.setProperty('bottom','auto','important');element.style.setProperty('left','0','important');element.style.setProperty('right','0','important');element.style.setProperty('width','100%','important');
   const rect=element.getBoundingClientRect(),css=win.getComputedStyle(element);
   const safe={left:Math.max(20,(parseFloat(css.paddingLeft)||20)-rect.left),right:Math.max(20,(parseFloat(css.paddingRight)||20)-(win.innerWidth-rect.right)),bottom:Math.max(10,(parseFloat(css.paddingBottom)||10)-(win.innerHeight-rect.bottom))};
   const suppress=key=>oneHand(prefs)&&(prefs.assist&&key==='fire'&&['g01','g02','g05'].includes(c.game)||prefs.gestures&&(c.game==='g03'&&['jump','down'].includes(key)||c.game==='g06'&&['fire','down'].includes(key)||c.game==='g05'&&c.mode!=='pong'&&key==='jump'));
   for(const b of buttons)b.el.dataset.controlHidden=String(suppress(b.key));
   const active=buttons.filter(b=>!b.el.hidden&&!suppress(b.key)),keys=active.map(b=>b.key);
   const next={...layout({width:element.clientWidth||parent.width,height:Math.max(150,box.height),compact,g02:c.game==='g02',keys,prefs,safe}),visible:true};
   const stamp=JSON.stringify({prefs,keys,stick:next.stick,buttons:next.buttons,compact});if(stamp!==signature){reset();signature=stamp;}plan=next;
   element.style.setProperty('height',plan.height+'px','important');
   function place(el,r){for(const [key,value]of Object.entries({left:r.x,top:r.y,width:r.w,height:r.h}))el.style.setProperty(key,value+'px','important');}
   place(stick,plan.stick);base.style.width=base.style.height=plan.stick.d+'px';knob.style.width=knob.style.height=plan.stick.d*.44+'px';if(id===null){anchor={x:plan.stick.w/2,y:plan.stick.h/2};origin={...anchor};}paint();
   for(const r of plan.buttons){const b=active.find(b=>b.key===r.key);place(b.el,r);}
   onLayout(plan);
  }
  function schedule(){if(!queued&&!disposed)queued=win.requestAnimationFrame(()=>{queued=0;position();});}
  function update(e){if(e.pointerId!==id||!plan)return;const r=stick.getBoundingClientRect(),R=plan.stick.d*.34;raw={x:(e.clientX-r.left-origin.x)/R,y:(e.clientY-r.top-origin.y)/R};const axis=gestureAxis()?'xy':context().axis;if(axis==='x')raw.y=0;if(axis==='y')raw.x=0;const length=Math.hypot(raw.x,raw.y);if(length>1){raw.x/=length;raw.y/=length;}paint();}
  stick.addEventListener('pointerdown',e=>{if(!enabled()||settingsOpen||id!==null||!plan?.visible)return;e.preventDefault();id=e.pointerId;const r=stick.getBoundingClientRect(),half=plan.stick.d/2;origin=prefs.joystick==='floating'?{x:e.clientX-r.left,y:e.clientY-r.top}:{x:r.width/2,y:r.height/2};anchor={x:clamp(origin.x,half,r.width-half),y:clamp(origin.y,half,r.height-half)};try{stick.setPointerCapture(id);}catch{}update(e);},{signal});
  stick.addEventListener('pointermove',update,{signal});
  for(const {el,key}of buttons)el.addEventListener('pointerdown',e=>{if(!enabled()||settingsOpen)return;e.preventDefault();owners.get(el).add(e.pointerId);pulse.add(key);paintButtons();try{el.setPointerCapture(e.pointerId);}catch{}onAction(key,e);},{signal});
  function release(e){if(id===e.pointerId){id=null;raw={x:0,y:0};filtered={x:0,y:0};upLatch=downLatch=false;if(plan?.stick){anchor={x:plan.stick.w/2,y:plan.stick.h/2};origin={...anchor};paint();}}for(const ids of owners.values())ids.delete(e.pointerId);paintButtons();}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])win.addEventListener(type,release,{signal});
  win.addEventListener('resize',()=>{reset();schedule();},{signal});win.addEventListener('bio-controls-change',()=>{reset();schedule();},{signal});
  const observer=new ResizeObserver(schedule);observer.observe(space());
  function held(){const keys=new Set();for(const {el,key}of buttons)if(owners.get(el).size)keys.add(key);return keys;}
  position();
  return {reset,layout:position,schedule,setKeyboard(keys){keyboardVisual.clear();for(const key of keys)keyboardVisual.add(key);paintButtons();},
   read(dt){if(!enabled()||settingsOpen){reset();return {x:0,y:0,actions:new Set(),pulses:new Set(),assist:false};}
    const desired=target();filtered=smooth(filtered,desired,dt,prefs.smoothing);const actions=held(),pulses=new Set(pulse);pulse.clear();let jump=false,drop=false;
    if(gestureAxis()){
     if(desired.y<-.65&&!upLatch)jump=true;if(desired.y>.65&&!downLatch)drop=true;
     if(desired.y<-.65)upLatch=true;else if(desired.y>-.35)upLatch=false;
     if(desired.y>.65)downLatch=true;else if(desired.y<.35)downLatch=false;
     if(context().game==='g06'){if(desired.y<-.65)actions.add('fire');if(desired.y>.65)actions.add('down');}
     else{if(jump)pulses.add('jump');if(drop&&context().game==='g03')pulses.add('down');}
    }
    return {x:context().axis==='y'?0:filtered.x,y:context().axis==='x'?0:filtered.y,actions,pulses,assist:oneHand(prefs)&&prefs.assist};
   },
   get debug(){const t=target(),c=context(),dirs=[];if(c.axis!=='y'){if(t.x<-.2)dirs.push('left');if(t.x>.2)dirs.push('right');}if(c.axis!=='x'){if(t.y<-.2)dirs.push('up');if(t.y>.2)dirs.push('down');}return {profile:prefs.profile,joystick:prefs.joystick,held:id!==null,id,dirs,actions:[...held()],owners:[...owners.values()].reduce((n,s)=>n+s.size,0),actionOwners:Object.fromEntries(buttons.map(b=>[b.key,owners.get(b.el).size])),vector:{...filtered},desired:{...t},layout:plan};},
   dispose(){disposed=true;reset();abort.abort();observer.disconnect();if(queued)win.cancelAnimationFrame(queued);}
  };
 }
 const labels=ja=>ja?{
  title:'操作設定',close:'閉じる',profile:'操作配置',profiles:['標準・両手','左手のみ','右手のみ','卓上・中央配置'],joystick:'スティック',sticks:['固定','フローティング'],reset:'標準設定に戻す',advanced:'サイズ・位置・感度',stickSize:'スティックの大きさ',buttonScale:'ボタンの大きさ',gap:'ボタン間隔',inset:'内側への距離',raise:'下端からの高さ',sensitivity:'感度',deadzone:'中央の遊び',smoothing:'方向のなめらかさ',mirror:'左右を入れ替える',gestures:'片手スティックの上下操作',assist:'片手の基本アクション補助',note:'画質・アニメーション・音量・ステージ内容は変わりません。',saved:'このブラウザーに保存',safe:'小さい画面では重なりや画面外を防ぐ範囲に調整します。',assistNote:'格闘は届く相手に通常攻撃、射撃は自動発射、球技はタイミング補助。移動・回避・スキルは自分で操作。',gestureNote:'階段：上でジャンプ、下で1段通過。バレー：上でジャンプ。レース：上でブースト、下でブレーキ。',descriptions:['左右に移動とアクションを分ける標準配置。','移動とアクションを左側にまとめます。','移動とアクションを右側にまとめます。','操作を中央寄りに配置。キーボード・マウスも引き続き使えます。']
 }:{
  title:'操作設定',close:'關閉',profile:'操作配置',profiles:['標準雙手','左手單手','右手單手','桌面置中'],joystick:'搖桿形式',sticks:['固定搖桿','浮動搖桿'],reset:'恢復標準設定',advanced:'尺寸、位置與靈敏度',stickSize:'搖桿大小',buttonScale:'動作鍵大小',gap:'按鍵間距',inset:'向內移動',raise:'離底部高度',sensitivity:'搖桿靈敏度',deadzone:'中心無反應區',smoothing:'方向平滑',mirror:'左右鏡像',gestures:'單手搖桿上下手勢',assist:'單手主要動作輔助',note:'畫質、動畫、音量與關卡內容維持完整標準。',saved:'偏好保存在目前瀏覽器',safe:'小螢幕會限制在安全範圍，避免按鍵重疊或超出畫面。',assistNote:'格鬥在攻擊範圍內出招、射擊自動開火、球類輔助揮擊時機；移動、閃避與技能仍由你操作。',gestureNote:'下樓梯：上推跳躍、下推穿過一層。排球：上推跳躍。賽車：上推氮氣、下推煞車。',descriptions:['方向與動作分列兩側，保留原本雙手操作。','搖桿和動作鍵集中在左側，方便左手拇指操作。','搖桿和動作鍵集中在右側，方便右手拇指操作。','控制組向中央靠攏，適合平放手機；鍵盤、滑鼠也能照常使用。']
 };
 function createSettings({onOpen=()=>{},onClose=()=>{}}={}){
  const doc=root.document,L=labels(doc.documentElement.lang.startsWith('ja')),layer=doc.createElement('div');layer.className='bio-control-layer';layer.id='control-settings-layer';layer.hidden=true;
  const range=(key,min,max,step,unit)=>'<label class="bio-control-field"><span>'+L[key]+' <output data-output="'+key+'"></output></span><input id="control-'+key+'" data-pref="'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" data-unit="'+unit+'"></label>';
  layer.innerHTML='<section class="bio-control-dialog" role="dialog" aria-modal="true" aria-labelledby="control-settings-title"><header><h2 id="control-settings-title">'+L.title+'</h2><button type="button" id="controls-close">'+L.close+'</button></header><p>'+L.note+'</p><label class="bio-control-field"><span>'+L.profile+'</span><select id="control-profile" data-pref="profile">'+['two','left','right','desktop'].map((v,i)=>'<option value="'+v+'">'+L.profiles[i]+'</option>').join('')+'</select></label><p id="control-description"></p><div id="control-preview" aria-hidden="true"></div><label class="bio-control-field"><span>'+L.joystick+'</span><select id="control-joystick" data-pref="joystick"><option value="fixed">'+L.sticks[0]+'</option><option value="floating">'+L.sticks[1]+'</option></select></label><label class="bio-control-check"><input id="control-mirror" data-pref="mirror" type="checkbox">'+L.mirror+'</label><label class="bio-control-check"><input id="control-gestures" data-pref="gestures" type="checkbox">'+L.gestures+'</label><p class="bio-control-detail">'+L.gestureNote+'</p><label class="bio-control-check"><input id="control-assist" data-pref="assist" type="checkbox">'+L.assist+'</label><p class="bio-control-detail">'+L.assistNote+'</p><details><summary>'+L.advanced+'</summary>'+range('stickSize',88,136,4,'px')+range('buttonScale',.8,1.2,.05,'%')+range('gap',8,18,1,'px')+range('inset',0,48,2,'px')+range('raise',0,48,2,'px')+range('sensitivity',.6,1.6,.05,'%')+range('deadzone',.1,.3,.01,'%')+range('smoothing',0,100,5,'ms')+'<p class="bio-control-detail">'+L.safe+'</p></details><footer><button id="controls-reset" type="button">'+L.reset+'</button><span role="status">'+L.saved+'</span></footer></section>';
  doc.body.appendChild(layer);let returned=null;
  function render(){for(const input of layer.querySelectorAll('[data-pref]')){const v=prefs[input.dataset.pref];if(input.type==='checkbox')input.checked=v;else input.value=v;const output=layer.querySelector('[data-output="'+input.dataset.pref+'"]');if(output)output.textContent=(input.dataset.unit==='%'?Math.round(v*100):Math.round(v))+(input.dataset.unit||'');}
   layer.querySelector('#control-mirror').disabled=oneHand(prefs);layer.querySelector('#control-gestures').disabled=!oneHand(prefs);layer.querySelector('#control-assist').disabled=!oneHand(prefs);
   layer.querySelector('#control-description').textContent=L.descriptions[['two','left','right','desktop'].indexOf(prefs.profile)];
   const preview=layer.querySelector('#control-preview'),w=preview.clientWidth||280,p=layout({width:w,keys:['fire','jump','dodge','skill'],prefs:{...prefs,raise:0,inset:Math.min(prefs.inset,8)},safe:{left:12,right:12,bottom:8}});
   const scale=Math.min(1,150/p.height);preview.style.height=p.height*scale+'px';preview.replaceChildren();
   for(const [i,r]of [p.stick,...p.buttons].entries()){const el=doc.createElement('span');el.className=i?'bio-preview-button':'bio-preview-stick';el.style.cssText='left:'+((w-w*scale)/2+r.x*scale)+'px;top:'+r.y*scale+'px;width:'+r.w*scale+'px;height:'+r.h*scale+'px';el.textContent=i?['A','B','C','D'][i-1]:'✥';preview.appendChild(el);}
  }
  function close(){if(layer.hidden)return;layer.hidden=true;settingsOpen=false;doc.body.classList.remove('bio-controls-open');onClose();returned?.focus({preventScroll:true});}
  layer.querySelector('#controls-close').addEventListener('click',close);layer.querySelector('#controls-reset').addEventListener('click',()=>{set(defaults);render();});
  layer.addEventListener('input',e=>{if(e.target.tagName==='SELECT')return;const key=e.target.dataset.pref;if(!key)return;const value=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value):e.target.value;set({...prefs,[key]:value});render();});
  layer.addEventListener('change',e=>{if(e.target.tagName==='SELECT'){set({...prefs,[e.target.dataset.pref]:e.target.value});render();}});
  doc.addEventListener('keydown',e=>{if(layer.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}if(e.key==='Tab'){const fields=[...layer.querySelectorAll('button,input,select,summary')].filter(el=>!el.disabled&&el.getClientRects().length),first=fields[0],last=fields.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}}},true);
  root.addEventListener('bio-controls-change',()=>{if(!layer.hidden)render();});
  return {open(){if(!layer.hidden)return;returned=doc.activeElement;onOpen();settingsOpen=true;layer.hidden=false;doc.body.classList.add('bio-controls-open');render();layer.querySelector('#controls-close').focus({preventScroll:true});},close,get element(){return layer;}};
 }
 root.addEventListener?.('storage',e=>{if(e.key===KEY){try{set(JSON.parse(e.newValue||'{}'),false);}catch{set(defaults,false);}}});
 root.BioControlProfiles=Object.freeze({KEY,defaults,normalize,vector,smooth,layout,oneHand,get prefs(){return {...prefs};},set,createInput,createSettings,get settingsOpen(){return settingsOpen;}});
})(typeof window==='undefined'?globalThis:window);
