// Sistema de efeitos visuais: particulas, tremor de tela e glitch temporario.
import Particle from '../entities/Particle.js';

export default class Juice {
  constructor() {
    this.particles = [];
    this.shakeTimer = 0;
    this.shakePower = 0;
    this.glitchTimer = 0;
    this.jumpscareActiveTimer = 0;
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

  triggerJumpscare() {
    this.jumpscareActiveTimer = 0.8; // Quase 1 segundo de susto
  }

  update(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.glitchTimer > 0) {
      this.glitchTimer = Math.max(0, this.glitchTimer - dt);
    }
    if (this.jumpscareActiveTimer > 0) {
      this.jumpscareActiveTimer = Math.max(0, this.jumpscareActiveTimer - dt);
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

  drawJumpscare(ctx, width, height) {
    if (this.jumpscareActiveTimer <= 0) return;
    
    const progress = 1 - (this.jumpscareActiveTimer / 0.8); // Vai de 0 a 1
    const alpha = this.jumpscareActiveTimer / 0.8;
    
    // Fundo vermelho sangue e pulsante
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 0, 0, ${alpha * 0.9})` : `rgba(0, 0, 0, ${alpha * 0.9})`;
    ctx.fillRect(0, 0, width, height);

    // O rosto gigante saltando (FNAF style)
    const centerX = width / 2;
    const centerY = height / 2;
    // O raio cresce de 50 para mais de 2000 px, "saindo" da tela
    const radius = 50 + Math.pow(progress, 3) * 2000; 

    // Cor base do rosto
    const pulse = (Math.sin(Date.now() * 0.05) + 1) / 2;
    const hue = 270 + pulse * 30; // Roxo a magenta
    ctx.fillStyle = `hsla(${hue}, 100%, ${10 + pulse * 20}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Vazio central (boca/olho aberto devorando o jogador)
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Dentes bizarros
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
        const innerRadius = radius * 0.45;
        const outerRadius = radius * 0.8;
        
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle - 0.1) * outerRadius, centerY + Math.sin(angle - 0.1) * outerRadius);
        ctx.lineTo(centerX + Math.cos(angle) * innerRadius, centerY + Math.sin(angle) * innerRadius);
        ctx.lineTo(centerX + Math.cos(angle + 0.1) * outerRadius, centerY + Math.sin(angle + 0.1) * outerRadius);
        ctx.fill();
    }

    // Estática brutal
    for (let i = 0; i < 30; i += 1) {
      const y = Math.random() * height;
      const h = 5 + Math.random() * 50;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(255,0,0,${alpha})`;
      ctx.fillRect(0, y, width, h);
    }
  }

  drawParticles(ctx) {
    this.particles.forEach((particle) => particle.draw(ctx));
  }
}
