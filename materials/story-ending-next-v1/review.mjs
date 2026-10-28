import {storageKey,isDevelopment,developmentHref} from '../../development-context.mjs';
import {shots} from './shots.mjs';
import {loadFirstVisit,saveEndingBeat,completeFirstVisit,challengeCatchCount,CHALLENGE_KEY} from '../../first-visit.mjs';
export {shots};
const $=id=>document.getElementById(id),reader=document.querySelector('.reader'),video=$('motion');
const integrated=new URLSearchParams(location.search).get('from')==='challenge';
const reviewMode=!integrated;
let finishing=false;
document.documentElement.classList.toggle('review-mode',reviewMode);
const clip='../story-ending-v1/motion/bucket-slam-native-v4.mp4',first='../story-ending-v1/motion/bucket-first-v2.webp',held='../story-ending-v1/motion/bucket-held-v2.webp';
let soundEnabled=true,needsTap=false;
try{soundEnabled=localStorage.getItem(storageKey('cherry-fishing-sound-v1'))!=='false';}catch{}
$('sound-toggle').textContent=soundEnabled?'音效：開':'音效：關';$('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));
// Story caption shared with the opening and the shop scenes (docs/STORY_CAPTION.md): typewriter text, tap to finish the line, tap again to go on.
let typing=0,typed='';
function typeLine(text){clearInterval(typing);typing=0;typed=text;const el=$('line');if(reduced.matches||!text){el.textContent=text;return;}let n=0;el.textContent='';typing=setInterval(()=>{n++;el.textContent=text.slice(0,n);if(n>=text.length){clearInterval(typing);typing=0;}},38);}
function finishTyping(){if(!typing)return false;clearInterval(typing);typing=0;$('line').textContent=typed;return true;}
let current=0,revision=0,pending=0,warm=null,heldImage=null,finished=true,userPaused=false,loadTimer=0;
function clearWarm(){if(warm){warm.src='';warm=null;}}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function unloadVideo(){
 clearTimeout(loadTimer);video.onended=video.onerror=video.onplaying=video.ontimeupdate=video.onloadeddata=video.onwaiting=video.onstalled=null;
 video.pause();video.hidden=true;video.removeAttribute('src');video.load();
}
function prepareClip(){
 if(video.getAttribute('src')===clip&&!video.error)return;
 unloadVideo();video.preload='auto';video.poster=first;video.src=clip;video.load();
}
function warmBucket(){
 warm=new Image();warm.src=first;void warm.decode().catch(()=>{});
 heldImage=new Image();heldImage.src=held;void heldImage.decode().catch(()=>{});
 if(!reduced.matches)prepareClip();
}
function cleanup(keepPrepared=false){if(!keepPrepared){unloadVideo();heldImage=null;}finished=true;userPaused=false;needsTap=false;$('motion-toggle').hidden=true;$('sound-toggle').hidden=true;reader.classList.remove('waiting-caption');}
function blocked(){return document.hidden||reader.classList.contains('peek');}
// The 2.9 s bucket clip needs no pause/replay control (2026-10-26: fewer buttons over the art); the toggle only appears
// when the phone blocked playback and a tap is needed to start it.
function updateToggle(){if(current===1)$('motion-toggle').hidden=!needsTap;$('motion-toggle').textContent=finished?'重播動畫':(needsTap?'播放動畫':(video.paused?'繼續動畫':'暫停動畫'));}
function hold(token){
 if(token!==revision)return;
 // This is the actual encoded last frame, never the old pre-animation drawing.
 $('art').src=held;reader.classList.remove('waiting-caption');finished=true;
 unloadVideo();$('loading').hidden=true;$('next').disabled=false;updateToggle();
}
// The bucket clip failing (weak network, decoder) must never strand the story: like the opening, it falls back to the
// clip's held last frame and the story carries on (2026-10-22).
function playbackFailure(token){
 if(token!==revision)return;
 needsTap=false;userPaused=false;hold(token);
}
function guardPlayback(token){
 clearTimeout(loadTimer);
 if(!blocked()&&!userPaused)loadTimer=setTimeout(()=>playbackFailure(token),15000);
}
async function decodeStill(img){
 let timer;
 try{await Promise.race([img.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('image timeout')),15000);})]);}
 finally{clearTimeout(timer);}
}
async function resume(token){
 if(token!==revision||finished||blocked()||userPaused)return;
 if(video.readyState<3)guardPlayback(token);
 try{await video.play();if(token===revision){needsTap=false;updateToggle();}}
 catch{if(token===revision){clearTimeout(loadTimer);$('loading').hidden=true;userPaused=true;needsTap=true;updateToggle();}}
}
function playClip(token){
 if(token!==revision)return;
 prepareClip();finished=false;userPaused=false;needsTap=false;reader.classList.add('waiting-caption');
 $('next').disabled=true;$('motion-toggle').hidden=!needsTap;$('art').src=first;
 video.muted=!soundEnabled;video.playsInline=true;video.poster=first;
 video.onloadeddata=()=>{if(token===revision){clearTimeout(loadTimer);$('loading').hidden=true;video.hidden=false;}};
 video.onplaying=()=>{if(token===revision){clearTimeout(loadTimer);$('loading').hidden=true;video.hidden=false;updateToggle();}};
 video.ontimeupdate=()=>{if(token===revision&&video.currentTime>=0.375)reader.classList.remove('waiting-caption');};
 video.onended=()=>hold(token);video.onerror=()=>playbackFailure(token);
 video.onwaiting=video.onstalled=()=>guardPlayback(token);
 guardPlayback(token);void resume(token);updateToggle();
}
async function show(index){
 pending=Math.max(0,Math.min(shots.length-1,index));const target=pending,token=++revision,s=shots[target];
 cleanup(target===1&&!reduced.matches);$('next').disabled=true;
 $('complete').hidden=true;$('caption').hidden=false;$('peek').disabled=false;$('error').hidden=true;$('loading').hidden=false;
 const next=new Image();next.src=target===1?(reduced.matches?held:first):`./art/${s.id}.webp`;
 try{
  // Start the prepared video in the click call stack, preserving Safari's audio gesture.
  // Its poster and held frame were warmed on E01; never wait for a still to decode first.
  if(target!==1||reduced.matches)await decodeStill(next);if(token!==revision)return;
  const art=$('art');art.src=next.src;art.alt=s.alt;current=target;
  $('counter').textContent=reviewMode?`結尾分鏡・${current+1} / ${shots.length}`:'';
  $('speaker').textContent=reviewMode?s.speaker:s.speaker.replace(/・畫外$/,'');$('caption').dataset.tone=s.speaker.startsWith('魚店老闆')?'owner':'chef';$('caption').classList.toggle('silent',!s.line);typeLine(s.line);$('direction').textContent=s.direction;
  $('prev').disabled=current===0;$('next').textContent='繼續 ▸';
  $('loading').hidden=true;$('next').disabled=false;
  if(target===1){$('motion-toggle').hidden=true;$('sound-toggle').hidden=false;if(!reduced.matches)playClip(token);else updateToggle();}
  if(integrated){try{saveEndingBeat(s.key);}catch{throw Error('save');}}
  clearWarm();if(current===0)warmBucket();else if(shots[current+1]){warm=new Image();warm.src=`./art/${shots[current+1].id}.webp`;}
 }catch(error){if(token===revision){if(error.message==='save')cleanup();$('loading').hidden=true;$('next').disabled=true;$('error').querySelector('p').textContent=error.message==='save'?'進度尚未儲存，請重試。':'圖片載入失敗，請重試。';$('error').hidden=false;}}
}
$('prev').onclick=()=>show(current-1);
reader.addEventListener('click',e=>{if(e.target.closest('button,a,header,#complete,#error,#loading')||reader.classList.contains('peek'))return;$('next').click();});
function finishStory(){
 finishing=true;
 try{if(integrated)completeFirstVisit();}
 catch{cleanup();$('error').querySelector('p').textContent='進度尚未儲存，請重試。';$('error').hidden=false;$('next').disabled=true;return;}
 finishing=false;cleanup();$('error').hidden=true;$('complete').hidden=false;$('caption').hidden=true;$('peek').disabled=true;
 if(integrated){
  // The first-visit story ends here: an end card, then back to the title, which leads on to the shop.
  const card=$('complete'),title=$('title-link');card.classList.add('fin');card.querySelector('h2').textContent='魚屋篇　完';card.querySelector('p').textContent='點一下回到標題';
  for(const id of ['replay','challenge-link','free-link','normal-link'])$(id).hidden=true;
  if(isDevelopment())title.href=developmentHref('/');title.hidden=false;title.focus();card.onclick=event=>{if(event.target!==title)location.assign(title.href);};
 }else $('replay').focus();
}
$('next').onclick=()=>{if(finishTyping())return;if(!finished||!$('loading').hidden||!$('error').hidden)return;if(current<shots.length-1){show(current+1);return;}finishStory();};
$('retry').onclick=()=>finishing?finishStory():show(pending);$('replay').onclick=()=>show(0);
$('motion-toggle').onclick=()=>{if(current!==1)return;if(finished){playClip(revision);return;}userPaused=!video.paused;if(userPaused){clearTimeout(loadTimer);video.pause();}else void resume(revision);updateToggle();};
$('sound-toggle').onclick=()=>{soundEnabled=!soundEnabled;try{localStorage.setItem(storageKey('cherry-fishing-sound-v1'),String(soundEnabled));}catch{}video.muted=!soundEnabled;$('sound-toggle').textContent=soundEnabled?'音效：開':'音效：關';$('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));};
$('peek').onclick=()=>{const peek=reader.classList.toggle('peek');$('peek').setAttribute('aria-pressed',String(peek));$('peek').textContent=peek?'返回對話':'看完整圖';if(peek){clearTimeout(loadTimer);video.pause();}else void resume(revision);updateToggle();};
document.addEventListener('keydown',e=>{if(!$('loading').hidden||!$('error').hidden||!$('complete').hidden||document.querySelector('.reader').classList.contains('peek'))return;if(e.key==='ArrowRight'){$('next').click();e.preventDefault();}if(e.key==='ArrowLeft'&&current>0){show(current-1);e.preventDefault();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(loadTimer);video.pause();}else void resume(revision);updateToggle();});
window.addEventListener('pagehide',()=>{revision++;clearWarm();cleanup();});
window.addEventListener('pageshow',e=>{if(e.persisted)show(current);});
let initialShot=0,canStart=true;
try{
 if(integrated){
  if(challengeCatchCount(localStorage.getItem(storageKey(CHALLENGE_KEY)))<3)throw Error('challenge');
  const saved=loadFirstVisit();initialShot=Math.max(0,shots.findIndex(s=>s.key===saved.endingBeat));
 }else if(isDevelopment())initialShot=Math.max(0,Math.min(shots.length-1,Number(new URLSearchParams(location.search).get('shot'))||0));
}catch(error){canStart=false;$('loading').hidden=true;$('error').querySelector('p').textContent=error.message==='challenge'?'請先完成三尾漁獲挑戰。':'故事進度無法讀取，原有紀錄已保留。';$('error').hidden=false;$('retry').textContent=error.message==='challenge'?'返回挑戰':'重新載入';$('retry').onclick=()=>error.message==='challenge'?location.assign(developmentHref('../../?mode=story')):location.reload();}
if(canStart)show(initialShot);
if(isDevelopment()){
 const link=document.querySelector('header a');link.textContent='開發入口';link.href='../../?dev=1';
 for(const a of document.querySelectorAll('a[href^="../../?"]'))if(a!==link)a.href=a.id==='normal-link'?'../../?dev=1&view=normal':developmentHref(a.getAttribute('href'));
}


