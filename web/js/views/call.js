import { h, toast, avatar } from '../ui.js';
import { icon } from '../icons.js';
import { onS, emitS } from '../socket.js';
import { sfx } from '../sound.js';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export class CallManager {
  constructor(app) {
    this.app = app;
    this.pc = null;
    this.localStream = null;
    this.peer = null;
    this.peerName = '';
    this.pendingCandidates = [];
    this.pendingOffer = null;
    this.muted = false;
    this.camOff = false;
    this.overlay = null;
    this.incomingEl = null;
  }

  bindSocket() {
    onS('call:incoming', ({ from, name }) => this.onIncoming(from, name));
    onS('call:accepted', () => toast('Chamada aceita', 'success'));
    onS('call:rejected', () => { toast('Chamada recusada', 'info'); this.cleanup(); });
    onS('call:ended', () => { toast('Chamada encerrada', 'info'); this.cleanup(); });
    onS('rtc:signal', ({ from, data }) => this.onSignal(from, data));
  }

  async getMedia() {
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.camOff = false;
    } catch (e1) {
      // câmera indisponível/ocupada → tenta só áudio (chamada de voz funciona mesmo assim)
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.camOff = true;
      const why = e1.name === 'NotReadableError' ? 'câmera em uso por outro app' : e1.name === 'NotFoundError' ? 'nenhuma câmera encontrada' : e1.name === 'NotAllowedError' ? 'acesso negado' : (e1.name || 'erro');
      toast('Sem vídeo (' + why + ') — chamada só com áudio', 'info');
    }
    return this.localStream;
  }

  newPeer() {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => { if (e.candidate && this.peer) emitS('rtc:signal', { to: this.peer, data: { type: 'ice', candidate: e.candidate } }); };
    pc.ontrack = (e) => { const v = this.overlay && this.overlay.querySelector('.remote video'); if (v && e.streams[0]) { v.srcObject = e.streams[0]; const nv = this.overlay.querySelector('.remote .novid'); if (nv) nv.style.display = 'none'; } };
    pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) { /* keep overlay; user ends manually */ } };
    this.pc = pc;
    return pc;
  }

  // Caller
  async start(toUserId, name) {
    if (this.pc) return toast('Já existe uma chamada', 'error');
    try {
      this.peer = toUserId; this.peerName = name || 'amigo';
      await this.getMedia();
      const pc = this.newPeer();
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
      this.showOverlay('Chamando ' + this.peerName + '…');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emitS('call:invite', { to: toUserId });
      emitS('rtc:signal', { to: toUserId, data: { type: 'offer', sdp: offer } });
      sfx.call();
    } catch (e) { toast('Sem acesso ao microfone (' + (e.name || e.message) + ')', 'error'); this.cleanup(); }
  }

  onIncoming(from, name) {
    if (this.pc) { emitS('call:reject', { to: from }); return; }
    this.peer = from; this.peerName = name;
    sfx.call();
    this.incomingEl = h('div', { class: 'incoming-call card ticks' },
      h('div', { class: 'row gap-12' }, avatar({ username: name }, 44), h('div', {}, h('div', { style: { fontWeight: 700 } }, name), h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Chamada de vídeo recebida'))),
      h('div', { class: 'ic-actions' },
        h('button', { class: 'btn btn-primary btn-block', html: icon('video', 16) + '<span>Atender</span>', onClick: () => this.accept() }),
        h('button', { class: 'btn btn-block', html: icon('phoneOff', 16), onClick: () => { emitS('call:reject', { to: from }); this.cleanup(); } })));
    document.body.appendChild(this.incomingEl);
  }

  async accept() {
    try {
      this.incomingEl?.remove(); this.incomingEl = null;
      await this.getMedia();
      const pc = this.newPeer();
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
      this.showOverlay('Conectando com ' + this.peerName + '…');
      emitS('call:accept', { to: this.peer });
      if (this.pendingOffer) { await this.applyOffer(this.pendingOffer); this.pendingOffer = null; }
    } catch (e) { toast('Sem acesso ao microfone (' + (e.name || e.message) + ')', 'error'); this.cleanup(); }
  }

  async applyOffer(offer) {
    const pc = this.pc; if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitS('rtc:signal', { to: this.peer, data: { type: 'answer', sdp: answer } });
  }

  async onSignal(from, data) {
    if (this.peer && from !== this.peer) return;
    if (data.type === 'offer') {
      if (!this.pc) { this.pendingOffer = data.sdp; return; } // wait for accept
      await this.applyOffer(data.sdp);
    } else if (data.type === 'answer') {
      if (this.pc) { await this.pc.setRemoteDescription(new RTCSessionDescription(data.sdp)); await this.flushCandidates(); }
    } else if (data.type === 'ice') {
      const c = new RTCIceCandidate(data.candidate);
      if (this.pc && this.pc.remoteDescription) { try { await this.pc.addIceCandidate(c); } catch {} }
      else this.pendingCandidates.push(c);
    }
  }

  async flushCandidates() {
    while (this.pendingCandidates.length) { const c = this.pendingCandidates.shift(); try { await this.pc.addIceCandidate(c); } catch {} }
  }

  showOverlay(statusText) {
    const localVideo = h('video', { autoplay: 'true', muted: 'true', playsinline: 'true' });
    const remoteVideo = h('video', { autoplay: 'true', playsinline: 'true' });
    if (this.localStream) localVideo.srcObject = this.localStream;
    this.overlay = h('div', { class: 'call-overlay' },
      h('div', { class: 'call-stage' },
        h('div', { class: 'video-tile local' }, localVideo, h('div', { class: 'label' }, 'Você')),
        h('div', { class: 'video-tile remote' }, remoteVideo, h('div', { class: 'novid' }, h('span', { class: 'ico', style: { width: '40px', height: '40px' }, html: icon('video', 40) }), h('span', {}, statusText)), h('div', { class: 'label' }, this.peerName))),
      h('div', { class: 'call-bar' },
        this.barBtn('mic', 'Mudo', () => this.toggleMute()),
        this.barBtn('video', 'Câmera', () => this.toggleCam()),
        h('button', { class: 'call-btn danger', title: 'Encerrar', html: icon('phoneOff', 24), onClick: () => this.end() })));
    document.body.appendChild(this.overlay);
  }

  barBtn(ic, title, onClick) {
    const b = h('button', { class: 'call-btn', title, html: icon(ic, 22), onClick: () => { onClick(); } });
    b.dataset.icon = ic; return b;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.localStream) this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.muted));
    const b = this.overlay?.querySelector('.call-btn[data-icon="mic"]');
    if (b) { b.classList.toggle('off', this.muted); b.innerHTML = icon(this.muted ? 'micOff' : 'mic', 22); }
  }
  toggleCam() {
    this.camOff = !this.camOff;
    if (this.localStream) this.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.camOff));
    const b = this.overlay?.querySelector('.call-btn[data-icon="video"]');
    if (b) b.classList.toggle('off', this.camOff);
  }

  end() { if (this.peer) emitS('call:end', { to: this.peer }); this.cleanup(); }

  cleanup() {
    try { this.pc && this.pc.close(); } catch {}
    this.pc = null;
    if (this.localStream) { this.localStream.getTracks().forEach((t) => t.stop()); this.localStream = null; }
    this.overlay?.remove(); this.overlay = null;
    this.incomingEl?.remove(); this.incomingEl = null;
    this.peer = null; this.pendingOffer = null; this.pendingCandidates = []; this.muted = false; this.camOff = false;
  }
}
