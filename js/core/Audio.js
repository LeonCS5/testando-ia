export default class Audio {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  resume() {
    if (this.audioCtx.state === 'suspended') {
      return this.audioCtx.resume();
    }
    return Promise.resolve();
  }

  playTone(freq, duration, type = 'sine', gain = 0.18) {
    const now = this.audioCtx.currentTime;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  wallHit() {
    this.playTone(180, 0.08, 'square', 0.18);
  }

  mazeRegenerate() {
    this.playTone(380, 0.12, 'sawtooth', 0.16);
    this.playTone(620, 0.06, 'sine', 0.1);
  }

  levelComplete() {
    this.playTone(520, 0.16, 'triangle', 0.18);
    this.playTone(720, 0.12, 'triangle', 0.14);
  }
}
