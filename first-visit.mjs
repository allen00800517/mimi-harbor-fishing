import {storageKey} from './development-context.mjs';
export const FIRST_VISIT_KEY='cherry-first-visit-v1';
export const CHALLENGE_KEY='cherry-first-challenge-v1';
export const STORY_ENDING=new URL('./materials/story-ending-next-v1/index.html?from=challenge',import.meta.url).href;
export const emptyFirstVisit=()=>({version:1,completed:false,endingBeat:null});
export function readFirstVisit(raw){
 if(raw===null)return emptyFirstVisit();
 let v;try{v=JSON.parse(raw);}catch{throw Error('故事進度無法讀取，原有紀錄已保留。');}
 if(v?.version!==1||typeof v.completed!=='boolean'||!(v.endingBeat===null||typeof v.endingBeat==='string'&&v.endingBeat.length>0&&v.endingBeat.length<=100))throw Error('故事進度不完整，原有紀錄已保留。');
 return {version:1,completed:v.completed,endingBeat:v.endingBeat};
}
export function challengeCatchCount(raw){
 try{
  const v=JSON.parse(raw||'null');if(v?.version!==1||!Array.isArray(v.catches))return 0;
  const ids=new Set();for(const c of v.catches)if(c&&typeof c.id==='string'&&c.id.length>0&&c.id.length<=100&&['aji','saba','madai','flounder'].includes(c.species))ids.add(c.id);
  return Math.min(3,ids.size);
 }catch{return 0;}
}
export function loadFirstVisit(search=globalThis.location?.search||'',storage=globalThis.localStorage){return readFirstVisit(storage.getItem(storageKey(FIRST_VISIT_KEY,search)));}
export function continuationMode(search=globalThis.location?.search||'',storage=globalThis.localStorage){
 if(loadFirstVisit(search,storage).completed)return 'normal';
 const count=challengeCatchCount(storage.getItem(storageKey(CHALLENGE_KEY,search)));
 return count>=3?'ending':count>0?'story':null;
}
function save(beat,completed,search,storage){
 if(challengeCatchCount(storage.getItem(storageKey(CHALLENGE_KEY,search)))<3)throw Error('請先完成三尾漁獲挑戰。');
 const previous=loadFirstVisit(search,storage);
 const next={version:1,completed:previous.completed||completed,endingBeat:beat};
 if(JSON.stringify(previous)!==JSON.stringify(next))storage.setItem(storageKey(FIRST_VISIT_KEY,search),JSON.stringify(next));
 return next;
}
export function saveEndingBeat(beat,search=globalThis.location?.search||'',storage=globalThis.localStorage){
 if(typeof beat!=='string'||!beat||beat.length>100)throw Error('故事段落無法保存。');
 return save(beat,false,search,storage);
}
// Only the player's final Continue action calls this. No picture count is persisted.
export function completeFirstVisit(search=globalThis.location?.search||'',storage=globalThis.localStorage){return save(null,true,search,storage);}
