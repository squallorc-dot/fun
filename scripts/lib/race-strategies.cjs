'use strict';
const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
function control(s,strategy='skilled'){
 if(strategy==='idle')return {};
 const car=s.car,wrap=d=>((d+600)%1200+1200)%1200-600;
 const obstacles=s.traffic.filter(o=>!['finished','dnf'].includes(o.status)&&!o.hit&&wrap(o.z-s.progress)>-7&&wrap(o.z-s.progress)<65);
 const cost=lane=>Math.abs(lane)*1.5+Math.abs(lane-car.lane)*2+obstacles.reduce((n,o)=>{const predicted=o.lane+(o.lateralVelocity||0)*.65;return n+((Math.abs(o.lane-lane)<.38||Math.abs(predicted-lane)<.38)?Math.max(0,65-wrap(o.z-s.progress)):0);},0);
 const target=[0,-.78,.78,-.4,.4].sort((a,b)=>cost(a)-cost(b))[0];
 const excess=s.lateralForce?Math.max(0,car.speed-104/(1+.25*Math.abs(s.roadBend))):0,grip=Math.max(.4,1-excess*.022);
 const compensation=s.roadBend*Math.pow(car.speed/80,2)*(s.lateralForce??(s.chapter===1?.16:.11))*(1+excess*.06)/(.9*(.65+car.speed/100)*grip);
 const moveX=clamp((target-car.lane)*3+compensation);
 if(strategy==='basic')return {moveX};
 if(strategy==='held')return {moveX,fire:true};
 const preview=s.roadPreview||[{distance:0,bend:s.cornerAhead}];
 const limit=Math.min(104,...preview.map(p=>Math.sqrt((104/(1+.25*Math.abs(p.bend))+(strategy==='safe'?0:6))**2+2*(strategy==='safe'?25:36)*p.distance)));
 const down=car.speed>limit+1;
 return {moveX,down,fire:!down&&car.speed>(s.cruiseSpeed||74)-2&&limit>(strategy==='safe'?98:94)&&s.nitro>(strategy==='safe'?35:1)};
}
module.exports={control};
