import { scenes, assetFor, originalFor } from './scenes.mjs';
import { StoryPlayback, clipText } from './playback.mjs';
import { StoryAudio, TitleMusic } from './audio.mjs';
import { StoryClip } from './clip.mjs';
import { TitleWater } from './title-water.mjs';

const $ = (id) => document.getElementById(id);
const playback = new StoryPlayback(scenes);
const reviewMode = new URLSearchParams(location.search).get('review') === '1';
const quickCheck = new URLSearchParams(location.search).has('scene');
document.documentElement.classList.toggle('review-mode', reviewMode);
document.documentElement.classList.toggle('quick-check', quickCheck);
const sound = new StoryAudio();
// Title: only 「點一下開始」 at first. The tap starts the logo splash and the theme together (also the gesture
// iPhone needs before any sound). A scene quick check skips straight to its scene.
const music = new TitleMusic('./audio/title-theme.mp3', 20, 80.0012);
window.cherryTitleMusic = music;
let gateOpen = quickCheck, revealTitle = null;
// Story music (the user, 2026-10-19): the title theme carries on, quietly, under the first beat; it stops dead on the
// boss's 「……炸魚排？？？」 so the line lands in silence, and once the mood turns tense there is no music for the rest
// of the opening (the story is short). The 'theme' entry stays available should a later beat want it back.
const STORY_MUSIC = { arrival: 'under' };
const UNDER = .176, THEME = .4, THEME_FROM = 42; // 2026-10-28: -20%
function storyMusic(id) {
  const want = STORY_MUSIC[id];
  if (!want) { music.fadeOut(id === 'appraisal' ? 150 : 900); return; }
  const level = want === 'under' ? UNDER : THEME;
  if (music.playing) music.setLevel(level, want === 'under' ? 1.2 : .5);
  else music.play(0, want === 'under' ? 0 : THEME_FROM, level);
  if (id === 'bucket') { music.setLevel(.12, .05); setTimeout(() => { if (playback.scene?.id === 'bucket') music.setLevel(THEME, .8); }, 900); }
}
if (gateOpen) $('tapGate').hidden = true; else if (music.enabled) music.prepare();
$('soundButton').textContent = sound.enabled ? '音效：開' : '音效：關';
$('soundButton').setAttribute('aria-pressed', String(sound.enabled));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let art = $('art'), logo = $('logo');
const titleWater = new TitleWater($('titleWater')); 
let phase = 'title', busy = false, peeking = false;
let request = 0, raf = 0, lastTime = null, prefetch = null, pending = [];
let retry = () => showHome();
let clipSeconds = 0, clipFinished = false;
let loadingTimer = null;
const clip = new StoryClip($('artStage'), state => {
  $('screen').dataset.clipState = state;
  if (phase === 'story' && playback.scene?.clip?.cues) {
    clipFinished = ['held', 'still', 'fallback'].includes(state);
    if (clipFinished) playback.finishText();
    renderText();
  }
}, src => { art.src = src; }, undefined, seconds => {
  clipSeconds = seconds;
  if (phase === 'story' && playback.scene?.clip?.cues) renderText();
});

function imageRequest(src, alt, className) {
  const img = new Image(); img.alt = alt; img.className = className;
  img.draggable = false; img.decoding = 'async';
  let settled = false, rejectPromise;
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject;
    img.onload = async () => {
      try {
        await img.decode();
        if (!settled) { settled = true; clearTimeout(timeout); resolve(img); }
      } catch (error) {
        if (!settled) { settled = true; clearTimeout(timeout); reject(error); }
      }
    };
    img.onerror = () => { if (!settled) { settled = true; clearTimeout(timeout); reject(new Error('Image could not load')); } };
  });
  const timeout = setTimeout(() => { if (!settled) { settled = true; img.removeAttribute('src'); rejectPromise(new Error('Image load timed out')); } }, 25000);
  const cancel = () => {
    clearTimeout(timeout); img.onload = img.onerror = null; img.removeAttribute('src');
    if (!settled) { settled = true; rejectPromise(new DOMException('Cancelled', 'AbortError')); }
  };
  // Prefetch may fail before it is claimed by navigation; navigation still observes the rejection.
  promise.catch(() => {});
  img.src = src;
  return { src, img, promise, cancel };
}
function stopClock() { cancelAnimationFrame(raf); raf = 0; lastTime = null; }
function discardPrefetch() { prefetch?.cancel(); prefetch = null; }
function pauseRequired() { return busy || phase !== 'story' || peeking || document.hidden || $('materialsDialog').open || !$('errorPanel').hidden; }
function runClock() {
  if (raf || pauseRequired() || playback.textComplete || playback.scene?.clip?.cues) return;
  lastTime = null; raf = requestAnimationFrame(tick);
}
function tick(now) {
  raf = 0;
  if (pauseRequired()) { lastTime = null; return; }
  const dt = lastTime === null ? 0 : now - lastTime; lastTime = now;
  playback.tick(dt); renderText();
  if (!playback.textComplete) raf = requestAnimationFrame(tick);
  else lastTime = null;
}
function setBusy(value) {
  clearTimeout(loadingTimer); loadingTimer = null;
  busy = value; $('loading').hidden = true; $('screen').setAttribute('aria-busy', String(value));
  // Cached page turns should not flash a loading veil over the held frame.
  if (value) loadingTimer = setTimeout(() => { $('loading').hidden = false; }, 250);
  $('startButton').disabled = value;
  $('replayBeat').disabled = value;
  $('previousButton').disabled = value || playback.index <= 0;
  $('nextButton').disabled = value;
  if (value) stopClock();
}
function beginLoad(retryAction) {
  titleWater.stop();
  // Keep the outgoing frame visible until the replacement image is decoded.
  clip.pause();
  sound.stopEffects();
  ++request; stopClock(); for (const item of pending) item.cancel(); pending = [];
  $('errorPanel').hidden = true; retry = retryAction; setBusy(true); return request;
}
function failure(token, message) {
  if (token !== request) return;
  sound.stop();
  $('errorPanel').querySelector('p').textContent = message || '載入失敗，閱讀位置已保留。';
  setBusy(false); $('errorPanel').hidden = false;
  $('previousButton').disabled = $('nextButton').disabled = true;
  $('startButton').disabled = true;
}
function installArt(img, transition = 'cut') {
  if (img === art) {
    if (transition === 'impact') { art.classList.remove('impact'); void art.offsetWidth; art.classList.add('impact'); }
    return; // Continuing dialogue keeps the same painting; explicit impact replay restarts its shake.
  }
  const old = art; img.id = 'art'; img.className = `art${transition === 'soft' ? ' soft' : transition === 'impact' ? ' impact' : ''}`;
  old.replaceWith(img); old.removeAttribute('src'); art = img;
}
function prepareNext(index) {
  discardPrefetch();
  if (scenes[index] && assetFor(scenes[index]) !== art.getAttribute('src')) prefetch = imageRequest(assetFor(scenes[index]), scenes[index].alt, 'art');
}
function setPeek(value) {
  peeking = value; $('screen').classList.toggle('peek-mode', value);
  $('storyPanel').hidden = phase !== 'story' || value; $('restoreText').hidden = !value;
  $('peekButton').setAttribute('aria-pressed', String(value));
  if (value) { stopClock(); sound.stop(); clip.pause(); } else { runClock(); if (!pauseRequired()) { sound.enter(playback.scene?.id, false); clip.resume(); } }
}
function renderText() {
  const scene = playback.scene; if (!scene) return;
  const visible = scene.clip?.cues ? clipText(scene, clipSeconds, clipFinished) : Array.from(scene.text).slice(0, playback.count).join('');
  $('storyPanel').classList.toggle('awaiting-line', scene.clip?.cues ? !visible : playback.elapsed < scene.lead);
  if ($('text').textContent !== visible) $('text').textContent = visible;
  if (scene.clip?.cues) $('accessibleText').textContent = `${scene.speaker}：${visible}`;
  $('nextButton').disabled = busy || (clip.blocking && !clip.needsTap);
  if (clip.needsTap) { $('nextButton').textContent = '繼續播放 ▸'; return; }
  if (clip.blocking) { $('nextButton').textContent = '演出中…'; return; }
  $('nextButton').textContent = playback.textComplete ? (playback.index === scenes.length - 1 ? '準備釣魚 ▸' : scene.id === 'defiance' ? '前往碼頭 ▸' : '繼續 ▸') : '繼續 ▸';
}
async function showHome() {
  sound.stop(); music.fadeOut(300); // Back at the title the theme starts again from its beginning.
  const token = beginLoad(showHome); discardPrefetch(); phase = 'title'; playback.reset(); setPeek(false);
  $('titleScreen').hidden = false; $('titleScreen').classList.remove('is-ready');
  $('storyPanel').hidden = $('endPanel').hidden = true;
  $('homeButton').hidden = true; $('replayBeat').hidden = true; $('progress').textContent = '魚屋篇';
  const bg = imageRequest('../story-opening-v1/art/title-background.webp', '夏日日本港町與魚市場，女主角準備進店買魚。', 'art');
  const title = imageRequest('../story-opening-v1/art/title-transparent.webp', 'ミーミーの 買い出しラッシュ！魚屋篇', 'logo');
  // Decoration has a bounded fallback. A failed splash cannot
  // prevent START or delay a cold title indefinitely.
  const water = reducedMotion ? [] : [imageRequest('./art/title-flow-splash-v1.webp', '', '')];
  const waterTimeout = setTimeout(() => water.forEach(item => item.cancel()), 2000);
  const waterReady = Promise.all(water.map(item => item.promise)).then(() => true, () => false).finally(() => clearTimeout(waterTimeout));
  pending = [bg, title, ...water];
  try {
    const [bgImg, titleImg, hasWater] = await Promise.all([bg.promise, title.promise, waterReady]);
    if (token !== request) return;
    installArt(bgImg, 'soft'); clip.clear(); delete $('screen').dataset.clipState;
    const oldLogo = logo; titleImg.id = 'logo'; oldLogo.replaceWith(titleImg); oldLogo.removeAttribute('src'); logo = titleImg;
    $('titleScreen').classList.toggle('has-title-water', hasWater);
    pending = []; setBusy(false);
    // The water bursts 0.34 s in (title-water.mjs); the first beat lands with it.
    const reveal = () => { $('titleScreen').classList.add('is-ready'); if (hasWater && water.length) titleWater.play(water[0].img); music.play(.34); };
    if (gateOpen) reveal(); else revealTitle = reveal;
    prepareNext(0);
  } catch { failure(token); }
}
async function showScene(index) {
  if (!scenes[index]) return;
  // Continue on the exact displayed video surface: converting to an image here
  // can change colour/brightness even when that image is the same decoded frame.
  const keepClip = scenes[index].holdClipFrom === playback.scene?.id &&
    !!clip.video?.ended && !clip.video.hidden;
  const token = beginLoad(() => showScene(index));
  const src = assetFor(scenes[index]);
  let item;
  if (keepClip || art.getAttribute('src') === src) { discardPrefetch(); item = { promise: Promise.resolve(art), cancel() {} }; }
  else if (prefetch?.src === src) { item = prefetch; prefetch = null; }
  else { discardPrefetch(); item = imageRequest(src, scenes[index].alt, 'art'); }
  pending = [item];
  try {
    const img = await item.promise;
    if (scenes[index].id === 'bucket' && !await sound.prepareImpact()) {
      failure(token, '音效載入失敗，請重試或關閉音效。'); return;
    }
    if (token !== request) return;
    pending = []; phase = 'story'; playback.select(index); peeking = false; clipSeconds = 0; clipFinished = false;
    $('screen').classList.remove('peek-mode'); $('restoreText').hidden = true;
    $('titleScreen').hidden = $('endPanel').hidden = true; logo.removeAttribute('src');
    $('storyPanel').hidden = false; $('storyPanel').dataset.tone = scenes[index].tone;
    $('storyPanel').classList.toggle('compact', !!scenes[index].compact);
    $('storyPanel').classList.toggle('silent', scenes[index].tone === 'silent');
    $('homeButton').hidden = false; $('replayBeat').hidden = !(reviewMode || quickCheck);
    $('speaker').textContent = scenes[index].speaker.replace(/・畫外$/, ''); // 「畫外」 is a storyboard note, not a name $('pageTitle').textContent = ['hesitation', 'appraisal'].includes(scenes[index].id) ? '' : scenes[index].title;
    $('progress').textContent = `${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
    $('accessibleText').textContent = scenes[index].text ? `${scenes[index].speaker}：${scenes[index].text}` : scenes[index].alt;
    installArt(img, scenes[index].transition);
    if (!keepClip) { clip.clear(); delete $('screen').dataset.clipState; }
    img.alt = scenes[index].alt;
    if (reducedMotion) playback.finishText();
    setBusy(false); renderText(); prepareNext(index + 1); runClock();
    if (scenes[index].clip) clip.show(scenes[index].clip, { reduced: reducedMotion, paused: pauseRequired(), soundEnabled: sound.enabled });
    storyMusic(scenes[index].id);
    if (!pauseRequired()) {
      const played = sound.enter(scenes[index].id);
      if (scenes[index].id === 'bucket') $('screen').dataset.impactSound = played ? 'played' : sound.enabled ? 'unavailable' : 'muted';
    }
  } catch { failure(token); }
}
function showEnd() {
  clip.clear(); sound.stop();
  phase = 'end'; $('replayBeat').hidden = true; stopClock(); discardPrefetch();
  $('storyPanel').hidden = true; $('endPanel').hidden = false;
  $('progress').textContent = '';
}
function nextPage() {
  if (clip.needsTap && !pauseRequired()) { clip.resume(); return; }
  if (busy || phase !== 'story' || peeking || clip.blocking || !$('errorPanel').hidden) return;
  if (!playback.textComplete) { playback.finishText(); renderText(); return; }
  if (playback.index + 1 >= scenes.length) showEnd();
  else showScene(playback.index + 1);
}
function openMaterials() {
  clip.pause(); sound.stop();
  stopClock();
  if (typeof $('materialsDialog').showModal === 'function') $('materialsDialog').showModal();
  else location.href = './review.html';
}
for (const [i, scene] of scenes.entries()) {
  const li = document.createElement('li'), jump = document.createElement('button'), link = document.createElement('a');
  jump.type = 'button'; jump.className = 'scene-jump'; jump.textContent = scene.title;
  jump.addEventListener('click', () => { $('materialsDialog').close(); showScene(i); });
  link.href = originalFor(scene); link.target = '_blank'; link.rel = 'noopener'; link.className = 'original-link'; link.textContent = 'PNG 原圖';
  li.append(jump, link); $('sceneList').append(li);
}
$('startButton').addEventListener('click', () => { if (!busy && phase === 'title') showScene(Math.max(0, scenes.findIndex(s => s.id === new URLSearchParams(location.search).get('scene')))); });
$('nextButton').addEventListener('click', nextPage);
$('tapGate').addEventListener('click', () => {
  if (gateOpen) return;
  gateOpen = true; $('tapGate').hidden = true; music.resume();
  const reveal = revealTitle; revealTitle = null; reveal?.();
});
let blockedArtGesture = false;
$('artStage').addEventListener('pointerdown', () => { blockedArtGesture = clip.blocking; });
$('artStage').addEventListener('pointercancel', () => { blockedArtGesture = false; });
$('artStage').addEventListener('click', () => {
  if (blockedArtGesture) { blockedArtGesture = false; return; }
  if (!peeking) nextPage();
});
$('previousButton').addEventListener('click', () => { if (!busy && playback.index > 0) showScene(playback.index - 1); });
$('homeButton').addEventListener('click', showHome);
$('replayButton').addEventListener('click', () => showScene(0));
$('peekButton').addEventListener('click', () => setPeek(true));
$('restoreText').addEventListener('click', () => { setPeek(false); $('peekButton').focus(); });
$('materialsButton').addEventListener('click', openMaterials);
$('endMaterials').addEventListener('click', openMaterials);
$('materialsDialog').addEventListener('close', () => { runClock(); if (!pauseRequired()) { sound.enter(playback.scene?.id, false); clip.resume(); } });
$('replayBeat').addEventListener('click', () => { if (!busy && phase === 'story') showScene(playback.index); });
$('retryButton').addEventListener('click', () => { discardPrefetch(); retry(); });
document.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
document.addEventListener('click', () => { if (music.playing) music.resume(); }, { capture: true });
document.addEventListener('keydown', () => sound.unlock(), { capture: true });
document.addEventListener('click', () => sound.unlock(), { capture: true });
$('soundButton').addEventListener('click', () => {
  const enabled = sound.toggle();
  clip.setSoundEnabled(enabled);
  $('soundButton').textContent = enabled ? '音效：開' : '音效：關';
  $('soundButton').setAttribute('aria-pressed', String(enabled));
  if (enabled && !pauseRequired()) { sound.enter(playback.scene?.id, false); clip.resume(); }
  music.setEnabled(enabled);
  if (enabled && phase === 'title' && gateOpen && !revealTitle) music.play(0);
  if (enabled && phase === 'story' && playback.scene) storyMusic(playback.scene.id);
});
document.addEventListener('visibilitychange', () => { titleWater.setPaused(document.hidden); music.setPaused(document.hidden); for (const animation of $('titleScreen').getAnimations?.({subtree:true}) || []) { if (animation === titleWater.logoAnimation) continue; if (document.hidden && animation.playState === 'running') animation.pause(); else if (!document.hidden && animation.playState === 'paused') animation.play(); } if (document.hidden) { stopClock(); sound.stop(); clip.pause(); } else { runClock(); if (!pauseRequired()) { sound.enter(playback.scene?.id, false); clip.resume(); } } });
document.addEventListener('keydown', (event) => {
  if ($('materialsDialog').open || phase !== 'story' || peeking || busy) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); if (!event.repeat) nextPage(); }
  if (event.key === 'ArrowLeft' && playback.index > 0) { event.preventDefault(); showScene(playback.index - 1); }
});
function releaseStory() { titleWater.stop(); clearTimeout(loadingTimer); clip.clear(); sound.stop(); ++request; stopClock(); discardPrefetch(); for (const item of pending) item.cancel(); pending = []; art.removeAttribute('src'); logo.removeAttribute('src'); }
window.addEventListener('cherry:leaving-story', () => { releaseStory(); sound.dispose(); music.dispose(); });
window.addEventListener('pagehide', releaseStory);
window.addEventListener('pageshow', (event) => { if (event.persisted) { if (playback.index >= 0) showScene(playback.index); else showHome(); } });
showHome();
