import {storageKey,isDevelopment,developmentHref} from '../../development-context.mjs';
export const shots=[
 {id:'E01-return-v3-full',speaker:'ミーミー',line:'老闆，我回來了！',direction:'遠景・從店內望向港口，先讓兩人重新出現在同一個空間。',alt:'老闆肩後看女主角帶著魚桶和釣竿走回魚攤，帶著克制的得意與要證明自己的神情。'},
 {id:'E02-bucket-v3-full',speaker:'ミーミー・畫外',line:'看吧！這些都是我親手釣的！',direction:'手部特寫・魚桶落桌，呼應開場老闆放下釣具的動作。',alt:'女主角雙手把藍色魚桶放到木板上，整尾魚自然交疊裝滿魚桶，魚尾從桶緣向外垂下，釣竿放在桌邊。'},
 {id:'E03-inspect',speaker:'魚店老闆',line:'……還真讓妳釣到了。',direction:'反應近景・先打量、再承認事實，尚未被料理說服。',alt:'老闆低頭查看魚桶，微微挑眉，帶著意外與審視，沒有提前露出友善笑容。'}
];
const $=id=>document.getElementById(id),reader=document.querySelector('.reader'),video=$('motion');
const reviewMode=new URLSearchParams(location.search).get('review')==='1';
document.documentElement.classList.toggle('review-mode',reviewMode);
const clip='./motion/bucket-slam-native-v4.mp4',first='./motion/bucket-first-v2.webp',held='./motion/bucket-held-v2.webp';
let soundEnabled=true,needsTap=false;
try{soundEnabled=localStorage.getItem(storageKey('cherry-fishing-sound-v1'))!=='false';}catch{}
$('sound-toggle').textContent=soundEnabled?'音效：開':'音效：關';$('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));
let current=0,revision=0,pending=0,warm=null,heldImage=null,finished=true,userPaused=false,loadTimer=0;
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
function updateToggle(){$('motion-toggle').textContent=finished?'重播動畫':(needsTap?'播放動畫':(video.paused?'繼續動畫':'暫停動畫'));}
function hold(token){
 if(token!==revision)return;
 // This is the actual encoded last frame, never the old pre-animation drawing.
 $('art').src=held;reader.classList.remove('waiting-caption');finished=true;
 unloadVideo();$('loading').hidden=true;$('next').disabled=false;updateToggle();
}
function playbackFailure(token){
 if(token!==revision)return;
 unloadVideo();finished=false;userPaused=true;needsTap=false;
 $('loading').hidden=true;$('error').querySelector('p').textContent='動畫載入失敗，請重試。';$('error').hidden=false;
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
 $('next').disabled=true;$('motion-toggle').hidden=false;$('art').src=first;
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
  $('counter').textContent=`${reviewMode?'結尾分鏡・':''}${current+1} / ${shots.length}`;
  $('speaker').textContent=s.speaker;$('line').textContent=s.line;$('direction').textContent=s.direction;
  $('download').href=`./originals/${s.id}.png`;$('prev').disabled=current===0;$('next').textContent=current===shots.length-1?'繼續 ▸':'下一張 ▸';
  $('loading').hidden=true;$('next').disabled=false;
  if(target===1){$('motion-toggle').hidden=false;$('sound-toggle').hidden=false;if(!reduced.matches)playClip(token);else updateToggle();}
  warm=null;if(current===0)warmBucket();else if(shots[current+1]){warm=new Image();warm.src=`./art/${shots[current+1].id}.webp`;}
 }catch{if(token===revision){$('loading').hidden=true;$('error').querySelector('p').textContent='圖片載入失敗，請重試。';$('error').hidden=false;}}
}
$('prev').onclick=()=>show(current-1);
$('next').onclick=()=>{if(!finished||!$('loading').hidden)return;if(current<shots.length-1){show(current+1);return;}cleanup();$('complete').hidden=false;$('caption').hidden=true;$('peek').disabled=true;$('replay').focus();};
$('retry').onclick=()=>show(pending);$('replay').onclick=()=>show(0);
$('motion-toggle').onclick=()=>{if(current!==1)return;if(finished){playClip(revision);return;}userPaused=!video.paused;if(userPaused){clearTimeout(loadTimer);video.pause();}else void resume(revision);updateToggle();};
$('sound-toggle').onclick=()=>{soundEnabled=!soundEnabled;try{localStorage.setItem(storageKey('cherry-fishing-sound-v1'),String(soundEnabled));}catch{}video.muted=!soundEnabled;$('sound-toggle').textContent=soundEnabled?'音效：開':'音效：關';$('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));};
$('peek').onclick=()=>{const peek=reader.classList.toggle('peek');$('peek').setAttribute('aria-pressed',String(peek));$('peek').textContent=peek?'返回對話':'看完整圖';if(peek){clearTimeout(loadTimer);video.pause();}else void resume(revision);updateToggle();};
document.addEventListener('keydown',e=>{if(!$('loading').hidden||!$('error').hidden||!$('complete').hidden||document.querySelector('.reader').classList.contains('peek'))return;if(e.key==='ArrowRight'){$('next').click();e.preventDefault();}if(e.key==='ArrowLeft'&&current>0){show(current-1);e.preventDefault();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(loadTimer);video.pause();}else void resume(revision);updateToggle();});
window.addEventListener('pagehide',()=>{revision++;warm=null;cleanup();});
window.addEventListener('pageshow',e=>{if(e.persisted)show(current);});
show(isDevelopment()?Math.max(0,Math.min(2,Number(new URLSearchParams(location.search).get('shot'))||0)):0);
if(isDevelopment()){
 const link=document.createElement('a');link.textContent='← 開發入口';link.href='../../?dev=1';link.style.cssText='position:fixed;left:10px;bottom:8px;z-index:700;padding:10px 12px;background:#14394b;color:white;border-radius:8px;font:12px system-ui;text-decoration:none';document.body.append(link);
 for(const a of document.querySelectorAll('a[href^="../../?"]'))if(a!==link)a.href=developmentHref(a.getAttribute('href'));
}


