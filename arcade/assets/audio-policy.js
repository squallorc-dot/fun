/* Preference migration and non-repeating stage selection, shared with regression tests. */
((root)=>{'use strict';
 const defaults={track:0,volume:40,sfx:55,loop:true,auto:true,playMode:'shuffle'};
 function normalize(stored,trackCount=4){
  const value=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
  const prefs={...defaults,...value};
  if(!['scene','manual','shuffle','off'].includes(prefs.playMode))prefs.playMode='shuffle';
  if(!Object.hasOwn(value,'playMode')&&Number(value.track)>0)prefs.playMode='manual';
  // Previous releases saved the automatic scene default on every visit.
  // Retain explicit modes from this release, manual tracks, silence and autoplay choices.
  if(value.audioRevision!==2&&prefs.playMode==='scene')prefs.playMode='shuffle';
  prefs.track=Number.isInteger(prefs.track)&&prefs.track>=0&&prefs.track<trackCount?prefs.track:0;
  for(const key of ['volume','sfx'])prefs[key]=Number.isFinite(Number(prefs[key]))?Math.max(0,Math.min(100,Number(prefs[key]))):defaults[key];
  for(const key of ['loop','auto'])prefs[key]=typeof prefs[key]==='boolean'?prefs[key]:defaults[key];
  prefs.audioRevision=2;
  return prefs;
 }
 function nextTrack(count,previous,random=Math.random){
  if(count<2)return 0;
  const valid=Number.isInteger(previous)&&previous>=0&&previous<count;
  const choice=Math.min((valid?count-1:count)-1,Math.floor(random()*(valid?count-1:count)));
  return valid&&choice>=previous?choice+1:choice;
 }
 root.BioArcadeAudioPolicy={normalize,nextTrack};
})(typeof window==='undefined'?globalThis:window);
