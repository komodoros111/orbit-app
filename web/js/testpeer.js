// Modo de teste: cria "amigos bots" que NÃO respondem mensagens, mas
// aceitam chamada automaticamente e respondem o WebRTC com áudio+vídeo
// sintéticos — pra testar voz/vídeo sozinho. Ativado por window.__ORBIT_TEST__.
import { BASE } from './config.js';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function apiAs(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let d = null; try { d = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error((d && d.error) || ('Erro ' + res.status)), { status: res.status });
  return d;
}

// vídeo sintético (canvas animado) + áudio sintético (tom suave)
function makeSyntheticStream(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext('2d');
  let t = 0;
  const draw = () => {
    t += 1;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 640, 360);
    // anel orbital
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
    ctx.save(); ctx.translate(320, 180); ctx.rotate(t * 0.02);
    ctx.beginPath(); ctx.ellipse(0, 0, 150, 70, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(150, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // núcleo
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(320, 180, 26, 0, Math.PI * 2); ctx.fill();
    // texto
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ORBIT • TESTE', 320, 70);
    ctx.font = '16px Inter, sans-serif'; ctx.fillStyle = '#bbb';
    ctx.fillText(label + ' — chamada aceita automaticamente', 320, 300);
    ctx.fillText(new Date().toLocaleTimeString('pt-BR'), 320, 326);
    requestAnimationFrame(draw);
  };
  draw();
  const stream = canvas.captureStream(15);
  // áudio: tom suave contínuo
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator(); const gain = ac.createGain(); const dest = ac.createMediaStreamDestination();
    osc.type = 'sine'; osc.frequency.value = 330; gain.gain.value = 0.04;
    osc.connect(gain).connect(dest); osc.start();
    dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  } catch {}
  return stream;
}

class TestBot {
  constructor(label, mainUser) {
    this.label = label;
    this.mainUser = mainUser;
    this.token = null;
    this.user = null;
    this.sock = null;
    this.pc = null;
    this.peer = null;
    this.pendingOffer = null;
    this.pendingIce = [];
    this.stream = null;
  }

  async ensureAccount() {
    const email = `${this.label.toLowerCase().replace(/\s+/g, '')}.${this.mainUser.id}@orbit.local`;
    const password = 'testbot-' + this.mainUser.id;
    try {
      const r = await apiAs(null, 'POST', '/api/auth/register', { username: this.label, email, password });
      this.token = r.token; this.user = r.user;
    } catch (e) {
      const r = await apiAs(null, 'POST', '/api/auth/login', { email, password });
      this.token = r.token; this.user = r.user;
    }
  }

  async befriendMain() {
    // 1) o usuário principal manda pedido pro bot
    const mainToken = localStorage.getItem('orbit.token');
    try { await apiAs(mainToken, 'POST', '/api/friends/request', { username: this.user.username + '#' + this.user.tag }); } catch (e) { /* já amigos / já enviado */ }
    // 2) o bot aceita o pedido recebido do usuário principal
    try {
      const { incoming } = await apiAs(this.token, 'GET', '/api/friends/requests');
      const req = incoming.find((r) => r.user.id === this.mainUser.id);
      if (req) await apiAs(this.token, 'POST', `/api/friends/requests/${req.id}/accept`);
    } catch {}
  }

  connect() {
    if (!window.io) return;
    this.sock = window.io(BASE === location.origin ? undefined : BASE, { auth: { token: this.token }, transports: ['websocket', 'polling'], forceNew: true });
    this.sock.on('call:incoming', ({ from }) => this.onIncoming(from));
    this.sock.on('rtc:signal', ({ from, data }) => this.onSignal(from, data));
    this.sock.on('call:end', () => this.cleanup());
    this.sock.on('call:ended', () => this.cleanup());
    // ignora mensagens de propósito (bot mudo)
  }

  newPc() {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => { if (e.candidate && this.peer) this.sock.emit('rtc:signal', { to: this.peer, data: { type: 'ice', candidate: e.candidate } }); };
    this.pc = pc;
    return pc;
  }

  onIncoming(from) {
    if (this.pc) return; // já em chamada
    this.peer = from;
    this.sock.emit('call:accept', { to: from });
    const pc = this.newPc();
    this.stream = makeSyntheticStream(this.label);
    this.stream.getTracks().forEach((tr) => pc.addTrack(tr, this.stream));
    if (this.pendingOffer) { this.applyOffer(this.pendingOffer); this.pendingOffer = null; }
  }

  async onSignal(from, data) {
    if (this.peer && from !== this.peer) return;
    if (data.type === 'offer') {
      if (!this.pc) { this.pendingOffer = data.sdp; return; }
      await this.applyOffer(data.sdp);
    } else if (data.type === 'answer') {
      // bot não inicia chamadas; ignora
    } else if (data.type === 'ice') {
      const c = new RTCIceCandidate(data.candidate);
      if (this.pc && this.pc.remoteDescription) { try { await this.pc.addIceCandidate(c); } catch {} }
      else this.pendingIce.push(c);
    }
  }

  async applyOffer(offer) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    while (this.pendingIce.length) { try { await this.pc.addIceCandidate(this.pendingIce.shift()); } catch {} }
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.sock.emit('rtc:signal', { to: this.peer, data: { type: 'answer', sdp: answer } });
  }

  cleanup() {
    try { this.pc && this.pc.close(); } catch {}
    this.pc = null; this.peer = null; this.pendingOffer = null; this.pendingIce = [];
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
  }

  async start() {
    await this.ensureAccount();
    await this.befriendMain();
    this.connect();
  }
}

let started = false;
export async function startTestPeer(mainUser) {
  if (started) return;
  started = true;
  const labels = ['Treino A', 'Treino B'];
  const bots = labels.map((l) => new TestBot(l, mainUser));
  for (const b of bots) { try { await b.start(); } catch (e) { console.warn('[testpeer]', b.label, e.message); } }
  console.log('[testpeer] bots de teste prontos:', labels.join(', '));
  return bots;
}
