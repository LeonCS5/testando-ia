export default class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.5 + 2 * (1 - alpha), 0, Math.PI * 2);
    ctx.fill();
  }
}
