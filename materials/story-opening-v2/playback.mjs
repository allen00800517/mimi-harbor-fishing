// Movie captions follow decoded media time, not wall-clock loading time.
export function clipText(scene, seconds, complete = false) {
  if (complete) return scene.text;
  return (scene.clip?.cues || []).filter(cue => seconds >= cue.at).at(-1)?.text || '';
}
// Typewriter only. Time never advances the page; navigation requires reader input.
export class StoryPlayback {
  constructor(scenes) { this.scenes = scenes; this.index = -1; this.elapsed = 0; this.charMs = 45; }
  get scene() { return this.scenes[this.index]; }
  get textEnd() { return this.scene ? this.scene.lead + Array.from(this.scene.text).length * this.charMs : 0; }
  get count() { return this.scene ? Math.min(Array.from(this.scene.text).length, Math.max(0, Math.floor((this.elapsed - this.scene.lead) / this.charMs))) : 0; }
  get textComplete() { return !!this.scene && this.elapsed >= this.textEnd; }
  select(index) { if (!Number.isInteger(index) || !this.scenes[index]) throw new RangeError('Unknown story page'); this.index = index; this.elapsed = 0; }
  tick(delta) {
    if (!this.scene || !Number.isFinite(delta) || delta < 0) return;
    // Visible but throttled windows may render at 1 Hz. Preserve reading pace there,
    // while a long stall still cannot consume a whole page in a single frame.
    this.elapsed = Math.min(this.textEnd, this.elapsed + Math.min(delta, 1000));
  }
  finishText() { if (this.scene) this.elapsed = Math.max(this.elapsed, this.textEnd); }
  reset() { this.index = -1; this.elapsed = 0; }
}
