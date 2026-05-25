// SFX: sintetizados via WebAudio por padrão; suporta sons personalizados do PC.
// Desligados por padrão — o usuário ativa nas configurações.
import { idbSet, idbGet, idbDel } from './idb.js';

let ctx;
let enabled = localStorage.getItem('orbit.sound') === '1'; // default OFF
const customUrls = {}; // event -> objectURL

export function setSound(on) { enabled = !!on; localStorage.setItem('orbit.sound', on ? '1' : '0'); }
export function soundOn() { return enabled; }

// ---- sons personalizados ----
const CUSTOM_EVENTS = ['click', 'message', 'notify'];
export async function loadCustomSounds() {
  for (const ev of CUSTOM_EVENTS) {
    try { const blob = await idbGet('sound:' + ev); if (blob) customUrls[ev] = URL.createObjectURL(blob); } catch {}
  }
}
export async function setCustomSound(ev, blob) {
  await idbSet('sound:' + ev, blob);
  if (customUrls[ev]) URL.revokeObjectURL(customUrls[ev]);
  customUrls[ev] = URL.createObjectURL(blob);
}
export async function clearCustomSound(ev) {
  await idbDel('sound:' + ev);
  if (customUrls[ev]) { URL.revokeObjectURL(customUrls[ev]); delete customUrls[ev]; }
}
export function hasCustomSound(ev) { return !!customUrls[ev]; }
export function playCustom(ev) {
  if (!customUrls[ev]) return false;
  try { const a = new Audio(customUrls[ev]); a.volume = 0.8; a.play().catch(() => {}); return true; } catch { return false; }
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone({ freq = 440, type = 'sine', dur = 0.12, gain = 0.12, slideTo = null, delay = 0 }) {
  if (!enabled) return;
  const a = ac(); const t0 = a.currentTime + delay;
  const osc = a.createOscillator(); const g = a.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function noise({ dur = 0.18, gain = 0.07, delay = 0 }) {
  if (!enabled) return;
  const a = ac(); const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); const g = a.createGain(); const f = a.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 1200; src.buffer = buf;
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination); src.start(t0);
}

export const sfx = {
  hover() { if (!enabled) return; if (playCustom('click')) return; tone({ freq: 520, type: 'triangle', dur: 0.05, gain: 0.04 }); },
  click() { if (!enabled) return; if (playCustom('click')) return; tone({ freq: 320, type: 'square', dur: 0.06, gain: 0.06, slideTo: 220 }); },
  open() { if (!enabled) return; tone({ freq: 300, type: 'sine', dur: 0.14, gain: 0.08, slideTo: 620 }); },
  close() { if (!enabled) return; tone({ freq: 520, type: 'sine', dur: 0.12, gain: 0.07, slideTo: 240 }); },
  message() { if (!enabled) return; if (playCustom('message')) return; tone({ freq: 660, type: 'triangle', dur: 0.08, gain: 0.05 }); },
  notify() { if (!enabled) return; if (playCustom('notify')) return; tone({ freq: 720, type: 'sine', dur: 0.1, gain: 0.07 }); tone({ freq: 960, type: 'sine', dur: 0.14, gain: 0.06, delay: 0.1 }); },
  success() { if (!enabled) return; tone({ freq: 523, type: 'sine', dur: 0.1, gain: 0.09 }); tone({ freq: 784, type: 'sine', dur: 0.16, gain: 0.09, delay: 0.09 }); },
  error() { if (!enabled) return; tone({ freq: 200, type: 'sawtooth', dur: 0.18, gain: 0.08, slideTo: 120 }); },
  purchase() { if (!enabled) return; tone({ freq: 440, type: 'triangle', dur: 0.09, gain: 0.09 }); tone({ freq: 660, type: 'triangle', dur: 0.09, gain: 0.09, delay: 0.08 }); tone({ freq: 990, type: 'sine', dur: 0.22, gain: 0.1, delay: 0.16 }); noise({ dur: 0.25, gain: 0.05, delay: 0.16 }); },
  reveal() { if (!enabled) return; tone({ freq: 180, type: 'sine', dur: 0.3, gain: 0.1, slideTo: 880 }); noise({ dur: 0.3, gain: 0.04 }); },
  call() { if (!enabled) return; tone({ freq: 480, type: 'sine', dur: 0.4, gain: 0.08, slideTo: 700 }); },
  boot() { if (!enabled) return; tone({ freq: 120, type: 'sine', dur: 0.5, gain: 0.12, slideTo: 480 }); tone({ freq: 660, type: 'triangle', dur: 0.18, gain: 0.06, delay: 0.5 }); tone({ freq: 990, type: 'sine', dur: 0.3, gain: 0.08, delay: 0.66 }); },
};
