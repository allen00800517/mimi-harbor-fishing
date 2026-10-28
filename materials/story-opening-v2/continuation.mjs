import {continuationMode,loadFirstVisit} from '../../first-visit.mjs';
import {storageKey,developmentHref,isDevelopment} from '../../development-context.mjs';
const q=new URLSearchParams(location.search),embedded=q.get('embedded')==='1'&&window.parent!==window;
const start=document.getElementById('startButton'),replay=document.getElementById('replayOpening'),link=document.querySelector('.game-link');
let mode=null,error=false,bypass=false,leaving=false;
try{mode=continuationMode();}catch{error=true;}
// After the story the boss is waiting: until the first shop scene has been seen, START leads to the shop.
function shopIntroSeen(){try{const v=JSON.parse(localStorage.getItem(storageKey('cherry-normal-mode-v1'))||'null');return Array.isArray(v?.scenes)&&v.scenes.includes('intro');}catch{return true;}}
if(!q.has('scene')&&mode){const toShop=mode==='normal'&&!shopIntroSeen();start.textContent=toShop?'前往鮮魚店':mode==='normal'?'繼續遊戲':mode==='ending'?'繼續故事':'繼續挑戰';replay.hidden=false;if(toShop){const hint=document.getElementById('titleHint');hint.textContent='老闆有事找妳';hint.hidden=false;}}
else mode=null;
if(error){document.getElementById('entrySaveError').hidden=false;}
function leave(event,target){
 event.preventDefault();event.stopImmediatePropagation();if(leaving)return;leaving=true;
 const sound=document.getElementById('soundButton').getAttribute('aria-pressed')!=='false';
 try{localStorage.setItem(storageKey('cherry-fishing-sound-v1'),String(sound));}catch{}
 // The title theme fades out first, so leaving never cuts the music off mid-note.
 const go=()=>{
  window.dispatchEvent(new Event('cherry:leaving-story'));
  if(embedded)parent.postMessage({type:'cherry:continue-fishing',sound,mode:target},location.origin);
  else location.assign(target==='ending'?developmentHref('../../materials/story-ending-next-v1/index.html?from=challenge'):target==='normal'?isDevelopment()?'../../?dev=1&view=normal':'../../?mode=normal':developmentHref('../../?mode=story'));
 };
 if(window.cherryTitleMusic?.fadeOut(500))setTimeout(go,500);else go();
}
// Opened on its own (not inside the game page), a title restored from Safari's back/forward cache after leaving would keep
// leaving=true and ignore START; start it fresh instead (2026-10-29).
window.addEventListener('pageshow',event=>{if(event.persisted&&leaving)location.reload();});
start.addEventListener('click',event=>{
 if(error){event.preventDefault();event.stopImmediatePropagation();return;}
 if(!bypass&&mode)leave(event,mode);
},true);
replay.addEventListener('click',()=>{bypass=true;start.click();bypass=false;});
link.addEventListener('click',event=>{try{if(loadFirstVisit().completed)leave(event,'normal');}catch{event.preventDefault();event.stopImmediatePropagation();}},true);

// Hidden way into the development entry (開發入口) from the published game: tap the title logo five times quickly.
// It only opens the development view, whose saves are separate from the real ones.
let logoTaps=[];
document.addEventListener('pointerdown',event=>{
 const title=document.getElementById('titleScreen'),logo=document.getElementById('logo');if(!title||title.hidden||!logo)return;
 const r=logo.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return;
 const now=performance.now();logoTaps=[...logoTaps.filter(t=>now-t<2500),now];if(logoTaps.length<5)return;logoTaps=[];
 const target=document.getElementById('devEntry').href;(embedded?parent:window).location.assign(target);
},true);
