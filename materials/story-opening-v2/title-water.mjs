// The logo and both water layers share this short title-only clock and one atlas.
export class TitleWater {
  constructor(canvas, onBurst = () => {}) {
    this.canvas = canvas; this.context = canvas?.getContext?.('2d');
    this.foreground = canvas?.ownerDocument?.getElementById('titleWaterFront');
    this.frontContext = this.foreground?.getContext?.('2d');
    this.onBurst = onBurst; this.image = null; this.logoAnimation = null;
    this.raf = 0; this.paused = false; this.elapsed = 0; this.last = null; this.fired = false;
    this.tick = now => {
      this.raf = 0;
      if (!this.image || this.paused) return;
      if (this.last !== null) this.elapsed += Math.max(0, now - this.last);
      this.last = now;
      if (this.logoAnimation) this.logoAnimation.currentTime = this.elapsed;
      this.canvas.dataset.elapsed = String(Math.round(this.elapsed));
      const seconds = (this.elapsed - 340) / 1000;
      if (seconds >= 0) {
        if (!this.fired) { this.fired = true; this.onBurst(); }
        // The rising logo breaks the water plane first; the spray follows40ms later.
        // A bottom-anchored fan opens quickly from the same impulse.
        const impulse = Math.min(1, seconds / .22);
        const opening = 1 - (1 - impulse) ** 3;
        const transform = `scale(${.34 + .66 * opening},${.52 + .48 * opening})`;
        this.canvas.style.transform = transform;
        if (this.foreground) this.foreground.style.transform = transform;
        const frame = Math.floor(seconds * 30); // Original24fps,1.25x title edit.
        if (frame >= 36) { this.stop(); return; }
        const sx = frame % 6 * 512, sy = Math.floor(frame / 6) * 288;
        this.context.clearRect(0, 0, 512, 288);
        this.context.drawImage(this.image, sx, sy, 512, 288, 0, 0, 512, 288);
        this.canvas.dataset.frame = String(frame);
        // A brief lower lip hides the small logo, then reveals it through the spray.
        // The rear water stays opaque and animated throughout the reveal.
        if (this.frontContext) {
          this.foreground.style.opacity = String(Math.max(0, Math.min(1, (8 - frame) / 5)));
          if (frame <= 8) {
            this.frontContext.clearRect(0, 0, 512, 288);
            this.frontContext.drawImage(this.image, sx, sy, 512, 288, 0, 0, 512, 288);
          } else if (this.foreground.width !== 1) {
            this.foreground.width = 1; this.foreground.height = 1;
          }
        }
      }
      this.raf = requestAnimationFrame(this.tick);
    };
  }
  play(image) {
    this.stop();
    if (!this.context || !image) { image?.removeAttribute('src'); return; }
    this.image = image; this.elapsed = 0; this.fired = false; this.paused = false;
    this.canvas.width = 512; this.canvas.height = 288;
    if (this.foreground) { this.foreground.width = 512; this.foreground.height = 288; }
    const logo = this.canvas.ownerDocument?.getElementById('logo');
    this.logoAnimation = (logo?.getAnimations?.() || []).find(a => a.animationName === 'titlePop') || null;
    if (this.logoAnimation) { this.logoAnimation.pause(); this.logoAnimation.currentTime = 0; }
    this.last = performance.now();
    this.canvas.dataset.state = 'playing'; this.raf = requestAnimationFrame(this.tick);
  }
  setPaused(paused) {
    if (!this.image || paused === this.paused) return;
    this.paused = paused; this.last = null;
    globalThis.cancelAnimationFrame?.(this.raf); this.raf = paused ? 0 : requestAnimationFrame(this.tick);
  }
  stop() {
    globalThis.cancelAnimationFrame?.(this.raf); this.raf = 0;
    try { this.logoAnimation?.finish(); } catch {}
    this.logoAnimation = null;
    this.image?.removeAttribute('src'); this.image = null;
    if (this.canvas) { this.canvas.width = 1; this.canvas.height = 1; this.canvas.dataset.state = 'idle'; if (this.canvas.style) this.canvas.style.transform = ''; delete this.canvas.dataset.frame; delete this.canvas.dataset.elapsed; }
    if (this.foreground) { this.foreground.width = 1; this.foreground.height = 1; this.foreground.style.opacity = '0'; this.foreground.style.transform = ''; }
  }
}
