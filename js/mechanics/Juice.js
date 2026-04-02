import Particle from '../entities/Particle.js';

export default class Juice {
  constructor() {
    this.particles = [];
    this.shakeTimer = 0;
    this.shakePower = 0;
    this.glitchTimer = 0;
  }

  spawnTrail(x, y) {
    for (let i = 0; i < 2; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      this.particles.push(
        new Particle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.35 + Math.random() * 0.15,
          [46, 249, 142]
        ),
      );
    }
  }

  localShake(duration, power) {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakePower = Math.max(this.shakePower, power);
  }

  triggerGlitch() {
    this.glitchTimer = 0.25;
  }

  update(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.glitchTimer > 0) {
      this.glitchTimer = Math.max(0, this.glitchTimer - dt);
    }

    this.particles.forEach((particle) => particle.update(dt));
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  applyScreenShake(ctx) {
    if (this.shakeTimer <= 0) return;
    const magnitude = this.shakePower * (this.shakeTimer / 0.2);
    const offsetX = (Math.random() - 0.5) * magnitude * 6;
    const offsetY = (Math.random() - 0.5) * magnitude * 6;
    ctx.translate(offsetX, offsetY);
  }

  drawGlitch(ctx, width, height) {
    if (this.glitchTimer <= 0) return;
    const alpha = (this.glitchTimer / 0.25) * 0.45;
    ctx.fillStyle = `rgba(255, 13, 195, ${alpha})`;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 10; i += 1) {
      const y = Math.random() * height;
      const h = 4 + Math.random() * 16;
      ctx.fillStyle = `rgba(255, 0, 214, ${alpha * 0.5})`;
      ctx.fillRect(0, y, width, h);
    }
  }

  drawParticles(ctx) {
    this.particles.forEach((particle) => particle.draw(ctx));
  }
}
