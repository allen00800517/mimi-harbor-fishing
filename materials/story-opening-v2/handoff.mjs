import {storageKey,developmentHref} from '../../development-context.mjs';
// Only the integrated entry sends a handoff. The standalone review retains its link.
export function installHandoff({ win = window, doc = document } = {}) {
  const embedded = new URLSearchParams(win.location.search).get('embedded') === '1' && win.parent !== win;
  doc.documentElement.classList.toggle('embedded-play', embedded);
  const link = doc.querySelector('.game-link');
  if(link)link.href=developmentHref(link.getAttribute('href'),win.location.search);
  let leaving = false;
  const start = event => {
    if (leaving) { event.preventDefault(); return; }
    const sound = doc.getElementById('soundButton').getAttribute('aria-pressed') !== 'false';
    try { win.localStorage.setItem(storageKey('cherry-fishing-sound-v1',win.location.search), String(sound)); } catch {}
    if (!embedded) return;
    event.preventDefault(); leaving = true;
    // The story's music fades out before the handoff instead of being cut off.
    const go = () => { win.dispatchEvent(new Event('cherry:leaving-story')); win.parent.postMessage({ type: 'cherry:start-fishing', sound }, win.location.origin); };
    if (win.cherryTitleMusic?.fadeOut(500)) setTimeout(go, 500); else go();
  };
  link.addEventListener('click', start);
  return () => link.removeEventListener('click', start);
}
installHandoff();
