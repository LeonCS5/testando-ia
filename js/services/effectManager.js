import Particle from '../models/particle.js';

export default class EffectManager {
  constructor() {
    this.particles = [];
    this.shakeTimer = 0;
    this.shakePower = 0;
    this.glitchCounter = 0;
    this.requestedSound = null;
  }

  spawnTrail(x, y) {
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      this.particles.push(new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.35 + Math.random() * 0.15,
        [46, 249, 142]
      ));
    }
  }

  localShake(duration, power) {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakePower = Math.max(this.shakePower, power);
  }

  triggerGlitch() {
    this.glitchCounter = 0.25;
  }

  requestSound(name) {
    this.requestedSound = name;
  }

  consumeSoundRequest(sounds) {
    if (!this.requestedSound || !sounds[this.requestedSound]) return;
    sounds[this.requestedSound]();
    this.requestedSound = null;
  }

  update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.glitchCounter > 0) this.glitchCounter = Math.max(0, this.glitchCounter - dt);
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.life > 0);
  }

  applyScreenShake(ctx) {
    if (this.shakeTimer <= 0) return;
    const mag = this.shakePower * (this.shakeTimer / 0.2);
    const tx = (Math.random() - 0.5) * mag * 6;
    const ty = (Math.random() - 0.5) * mag * 6;
    ctx.translate(tx, ty);
  }

  drawGlitchOverlay(ctx, width, height) {
    if (this.glitchCounter <= 0) return;
    const alpha = (this.glitchCounter / 0.25) * 0.45;
    ctx.fillStyle = `rgba(255,13,195,${alpha})`;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * height;
      const h = 4 + Math.random() * 16;
      ctx.fillStyle = `rgba(255, 0, 214, ${alpha * 0.5})`;
      ctx.fillRect(0, y, width, h);
    }
  }
}
