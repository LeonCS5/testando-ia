export default class SoundController {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playTone(freq, duration, type = 'sine', gain = 0.18) {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  wallHit() {
    this.playTone(180, 0.08, 'square', 0.2);
  }

  mazeRegenerate() {
    this.playTone(380, 0.12, 'sawtooth', 0.18);
    this.playTone(620, 0.06, 'sine', 0.11);
  }

  levelComplete() {
    this.playTone(520, 0.16, 'triangle', 0.2);
    this.playTone(720, 0.12, 'triangle', 0.15);
  }
}
