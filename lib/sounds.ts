let audioCtx: AudioContext | null = null;
let _muted = typeof window !== "undefined" && localStorage.getItem("md-book-sound-muted") === "true";
const _listeners = new Set<() => void>();

export function isSoundMuted() {
  return _muted;
}

export function subscribeToSoundMuted(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function _notify() {
  _listeners.forEach((cb) => cb());
}

export function setSoundMuted(muted: boolean) {
  _muted = muted;
  try { localStorage.setItem("md-book-sound-muted", String(muted)); } catch {}
  _notify();
}

export function toggleSound() {
  setSoundMuted(!_muted);
  return _muted;
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function play(freq: number, endFreq: number, type: OscillatorType, dur: number, vol: number) {
  if (_muted) return;
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + dur);
  } catch {}
}

export function playFlipSound() {
  play(800, 1200, "sine", 0.06, 0.15);
  setTimeout(() => play(1200, 600, "sine", 0.06, 0.15), 60);
}

export function playNextSound() {
  play(500, 1000, "triangle", 0.1, 0.12);
}

export function playPrevSound() {
  play(600, 400, "triangle", 0.1, 0.12);
}
