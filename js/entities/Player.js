import { TILE_SIZE } from '../constants.js';
import { normalizeVector } from '../utils/MathUtils.js';

export default class Player {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.speed = options.speed || 160;
    this.size = TILE_SIZE * 0.5;
    this.color = options.color || '#2ef98e';
    this.name = options.name || 'PLAYER';
    this.wallHitCooldown = 0;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  collides(x, y, maze) {
    const half = this.size / 2;
    const corners = [
      [x - half, y - half],
      [x + half, y - half],
      [x - half, y + half],
      [x + half, y + half],
    ];
    return corners.some(([cx, cy]) => maze.isWallAtWorld(cx, cy));
  }

  update(dt, input, maze, juice, audio) {
    let vx = 0;
    let vy = 0;
    if (input.left) vx = -this.speed;
    if (input.right) vx = this.speed;
    if (input.up) vy = -this.speed;
    if (input.down) vy = this.speed;

    if (vx !== 0 || vy !== 0) {
      const normalized = normalizeVector(vx, vy);
      vx = normalized.x * this.speed;
      vy = normalized.y * this.speed;
      juice.spawnTrail(this.x, this.y);
    }

    const step = Math.min(dt, 1 / 30);
    let nextX = this.x + vx * step;
    let nextY = this.y + vy * step;
    let collision = false;

    if (this.collides(nextX, this.y, maze)) {
      nextX = this.x;
      collision = true;
    }
    if (this.collides(this.x, nextY, maze)) {
      nextY = this.y;
      collision = true;
    }

    if (collision && this.wallHitCooldown <= 0) {
      juice.localShake(0.2, 0.8);
      audio.wallHit();
      this.wallHitCooldown = 0.18;
    }

    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - dt);
    this.x = nextX;
    this.y = nextY;
  }

  draw(ctx) {
    const glow = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, this.size);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}
