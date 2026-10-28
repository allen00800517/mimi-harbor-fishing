// One inline clip with synchronized native audio. End never advances the story.
export class StoryClip {
  constructor(host, onState = () => {}, showStill = () => {}, createVideo = () => document.createElement('video'), onTime = () => {}) {
    this.host = host; this.onState = onState; this.showStill = showStill; this.createVideo = createVideo;
    this.video = null; this.timer = null; this.paused = false;
    this.onTime = onTime; this.lockAdvance = false;
  }
  get blocking() { return !!(this.lockAdvance && this.video && !this.video.ended); }
  setSoundEnabled(enabled) { this.soundEnabled = enabled; if(this.video) this.video.muted = !enabled; }
  show(clip, { reduced = false, paused = false, soundEnabled = false } = {}) {
    this.clear(); this.paused = paused; this.lockAdvance = !!clip.lockAdvance;
    if (reduced) { this.showStill(clip.still); this.onState('still'); return; }
    const v = this.createVideo(); this.video = v;
    this.needsTap = false; this.soundEnabled = soundEnabled;
    v.className = 'art story-clip'; v.hidden = true; v.muted = !soundEnabled; v.defaultMuted = !soundEnabled;
    v.playsInline = true; v.loop = false; v.preload = 'auto'; v.poster = clip.poster;
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-label', clip.alt || '老闆伸手取魚，在碰到魚之前突然停住');
    v.ontimeupdate = () => { if (this.video === v && !this.paused) this.onTime(v.currentTime); };
    const fail = () => {
      if (this.video !== v) return;
      this.clear(); this.showStill(clip.still); this.onState('fallback');
    };
    v.onplaying = () => {
      if (this.video !== v) return;
      if (this.paused) { v.pause(); return; }
      clearTimeout(this.timer); this.timer = null; this.needsTap = false; v.hidden = false; this.onState('playing');
    };
    v.onended = () => {
      if (this.video !== v) return;
      clearTimeout(this.timer); this.timer = null; this.onState('held');
    };
    v.onerror = fail; this.fail = fail;
    this.host.append(v); v.src = clip.src; this.onState('loading');
    if (!paused) this.timer = setTimeout(fail, 12000);
    if (!paused) this.resume();
  }
  pause() { this.paused = true; clearTimeout(this.timer); this.timer = null; this.video?.pause(); }
  resume() {
    this.paused = false;
    const v = this.video;
    if (!v || v.ended) return;
    if (v.hidden && !this.timer) this.timer = setTimeout(this.fail, 12000);
    try {
      Promise.resolve(v.play()).then(() => {
        if (this.video !== v || this.paused) v.pause();
      }).catch(error => {
        if(this.video !== v || this.paused) return;
        if(error?.name === 'NotAllowedError') {
          clearTimeout(this.timer); this.timer = null; this.needsTap = true; this.onState('awaiting-gesture');
        } else this.fail();
      });
    } catch { if (this.video === v) this.fail(); }
  }
  clear() {
    this.needsTap = false;
    clearTimeout(this.timer); this.timer = null;
    const v = this.video; this.video = null;
    if (v) { v.onplaying = v.onended = v.onerror = v.ontimeupdate = null; v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }
  }
}
