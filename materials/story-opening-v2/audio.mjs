import {storageKey} from '../../development-context.mjs';
// A small, independent story mix. No queued late one-shots and no gameplay audio changes.
export class StoryAudio {
  constructor(createContext = () => new (window.AudioContext || window.webkitAudioContext)(), fetcher = url => fetch(url)) {
    this.createContext = createContext; this.fetcher = fetcher;
    this.context = null; this.buffers = {}; this.sources = new Set();
    this.enabled = true; this.active = false; this.ambient = null; this.loads = {}; this.disposed = false;
    this.session = null; this.originalSessionType = 'auto';
    try { this.session = globalThis.navigator?.audioSession; this.originalSessionType = this.session?.type || 'auto'; } catch {}
    try { this.enabled = globalThis.localStorage?.getItem(storageKey('cherry-fishing-sound-v1')) !== 'false'; } catch {}
  }
  sessionMode(active) {
    // Use the same media category as approved native clips on iPhone.
    // Restore the host category whenever story playback stops or hands off.
    try {
      const next = active && this.enabled && !this.disposed ? 'playback' : this.originalSessionType;
      if (this.session && this.session.type !== next) this.session.type = next;
    } catch { /* Optional in browsers without AudioSession support. */ }
  }
  unlock() {
    if (!this.enabled || this.disposed) return;
    try {
      this.sessionMode(true);
      this.context ||= this.createContext();
      this.resuming = this.context.resume().then(() => this.ensureAmbient()).catch(() => {});
      this.loading = Promise.all([
        this.requestLoad('bucket', './audio/bucket-impact-a.wav'),
        this.requestLoad('ocean', '../../assets/audio-v1/ocean.wav'),
      ]);
    } catch { this.sessionMode(false); /* Silent reading is always available. */ }
  }
  requestLoad(key, url) {
    if (this.buffers[key]) return Promise.resolve();
    return this.loads[key] ||= this.load(key, url).finally(() => { delete this.loads[key]; });
  }
  async prepareImpact(timeoutMs = 4000) {
    if (!this.enabled) return true;
    if (this.disposed) return false;
    this.unlock();
    if (!this.context) return false;
    let timer;
    try {
      await Promise.race([
        Promise.all([this.resuming, this.requestLoad('bucket', './audio/bucket-impact-a.wav')]),
        new Promise(resolve => { timer = setTimeout(resolve, timeoutMs); }),
      ]);
      return !this.disposed && (!this.enabled || (this.context?.state === 'running' && !!this.buffers.bucket));
    } finally { clearTimeout(timer); }
  }
  async load(key, url) {
    const context = this.context;
    try {
      const response = await this.fetcher(url);
      if (!response.ok || this.disposed) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (this.disposed) return;
      this.buffers[key] = buffer;
      // Only a quiet bed may join late. An impact is never scheduled by decoding.
      if (key === 'ocean') this.ensureAmbient();
    } catch { /* Missing sound must not block the story. */ }
  }
  play(key, gainValue, loop = false) {
    if (!this.enabled || !this.active || this.context?.state !== 'running' || !this.buffers[key]) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = this.buffers[key]; source.loop = loop; gain.gain.value = gainValue;
    source.connect(gain); gain.connect(this.context.destination);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(); return { source, gain };
  }
  enter(id, impact = true) {
    if (this.disposed) return;
    this.sessionMode(true);
    // A dialog's delayed close event may follow a scene jump. Resuming the
    // same scene must not cut off the impact that has just started.
    if (!impact && this.active && this.sceneId === id) { this.ensureAmbient(); return; }
    this.stopEffects(); this.active = true; this.sceneId = id;
    this.ensureAmbient();
    if (impact && id === 'bucket') return !!this.play('bucket', 0.9);
  }
  ensureAmbient() {
    if (!this.active) return;
    this.ambient ||= this.play('ocean', 0.025, true);
    if (this.ambient) this.ambient.gain.gain.setTargetAtTime(this.sceneId === 'departure' ? 0.07 : 0.025, this.context.currentTime, 0.15);
  }
  stopEffects() {
    for (const source of this.sources) if (source !== this.ambient?.source) { try { source.stop(); } catch {} this.sources.delete(source); }
  }
  stop() {
    this.active = false; this.sessionMode(false);
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    this.ambient = null;
  }
  toggle() {
    this.enabled = !this.enabled;
    try { globalThis.localStorage?.setItem(storageKey('cherry-fishing-sound-v1'), String(this.enabled)); } catch {}
    if (!this.enabled) this.stop(); else this.unlock();
    return this.enabled;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.stop(); this.buffers = {}; this.loads = {};
    const context = this.context; this.context = null;
    void context?.close().catch(() => {});
  }
}

// Title theme (Google Flow Music「Seaside Market Dash」take 2, supplied by the user 2026-10-19).
// The file is trimmed so its first beat is at 0 s. One 120 BPM phrase comes back 60 s later, so after the
// intro the music loops from 20 s to 80 s without replaying the opening. It only ever starts from a tap.
export class TitleMusic {
  constructor(url, loopStart, loopEnd, volume = 0.48) { // 2026-10-28: -20% (the user: too loud)
    this.url = url; this.loopStart = loopStart; this.loopEnd = loopEnd; this.volume = volume;
    this.context = null; this.buffer = null; this.source = null; this.gain = null; this.wanted = null; this.disposed = false;
    this.enabled = true;
    try { this.enabled = globalThis.localStorage?.getItem(storageKey('cherry-fishing-sound-v1')) !== 'false'; } catch {}
  }
  prepare() {
    if (this.context || this.disposed) return;
    try { this.context = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const context = this.context;
    fetch(this.url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))
      .then(data => context.decodeAudioData(data))
      .then(buffer => { if (this.disposed) return; this.buffer = buffer; if (this.wanted) this.begin(); })
      .catch(() => { /* No music must never block the title. */ });
  }
  /** Inside the tap: the only moment iPhone lets sound start. */
  resume() {
    if (!this.enabled || this.disposed) return;
    this.prepare();
    // Same media category as the story mix, so the ring/silent switch behaves like the rest of the game.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try { void this.context?.resume().catch(() => {}); } catch {}
  }
  get playing() { return !!this.source || !!this.wanted; }
  play(delay = 0, offset = 0, level = this.volume) {
    if (!this.enabled || this.disposed || this.source) return;
    this.wanted = { delay, offset, level, at: performance.now() }; this.resume();
    if (this.buffer) this.begin();
  }
  /** Change the volume of what is playing (story beats sit the theme under dialogue). */
  setLevel(level, seconds = .6) {
    if (this.wanted) { this.wanted.level = level; return; }
    const gain = this.gain?.gain; if (!gain || !this.context) return;
    const t = this.context.currentTime;
    try { gain.cancelScheduledValues(t); gain.setValueAtTime(gain.value, t); gain.linearRampToValueAtTime(level, t + Math.max(.02, seconds)); } catch {}
  }
  begin() {
    const wanted = this.wanted; this.wanted = null;
    if (!wanted || this.source || !this.buffer || !this.enabled || this.disposed) return;
    const context = this.context, source = context.createBufferSource(), gain = context.createGain();
    // A late decode still starts on the beat if it can; otherwise right away.
    const delay = Math.max(0, wanted.delay - (performance.now() - wanted.at) / 1000);
    source.buffer = this.buffer; source.loop = true; source.loopStart = this.loopStart; source.loopEnd = this.loopEnd;
    const level = wanted.level ?? this.volume, offset = wanted.offset || 0;
    // Starting mid-song (the story's return of the theme) fades in briefly instead of jumping in at full volume.
    if (offset > 0) { gain.gain.setValueAtTime(0, context.currentTime + delay); gain.gain.linearRampToValueAtTime(level, context.currentTime + delay + .4); }
    else gain.gain.value = level;
    source.connect(gain); gain.connect(context.destination);
    source.start(context.currentTime + delay, offset); this.source = source; this.gain = gain;
  }
  /** Never a hard cut: fades and reports whether anything was playing. */
  fadeOut(ms = 900) {
    this.wanted = null;
    const source = this.source, gain = this.gain; if (!source) return false;
    this.source = this.gain = null;
    const t = this.context.currentTime, end = t + Math.max(.02, ms / 1000);
    try { gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, end); source.stop(end + .05); } catch {}
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    return true;
  }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.fadeOut(400); }
  setPaused(paused) {
    if (!this.context || this.disposed) return;
    try { if (paused) void this.context.suspend().catch(() => {}); else if (this.source) { this.resume(); } } catch {}
  }
  dispose() {
    if (this.disposed) return;
    this.fadeOut(0); this.disposed = true; this.buffer = null;
    const context = this.context; this.context = null;
    setTimeout(() => void context?.close().catch(() => {}), 100);
  }
}
