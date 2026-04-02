import { TILE_SIZE } from '../constants.js';

export default class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 160;
    this.size = TILE_SIZE * 0.5; // smaller body so player has more free room inside maze corridors
    this.vx = 0;
    this.vy = 0;
    this.wallHitCooldown = 0;
  }

  update(dt, maze, input, effectManager, getCellCoord) {
    this.vx = 0;
    this.vy = 0;
    if (input.left) this.vx = -this.speed;
    if (input.right) this.vx = this.speed;
    if (input.up) this.vy = -this.speed;
    if (input.down) this.vy = this.speed;

    if (this.vx !== 0 || this.vy !== 0) {
      const mag = Math.hypot(this.vx, this.vy);
      this.vx = (this.vx / mag) * this.speed;
      this.vy = (this.vy / mag) * this.speed;
      effectManager.spawnTrail(this.x, this.y);
    }

    const step = Math.min(dt, 1 / 30);
    let nx = this.x + this.vx * step;
    let ny = this.y + this.vy * step;
    const half = this.size / 2;
    const pushBack = 3;

    const collides = (cx, cy) => {
      const corners = [
        [cx - half, cy - half],
        [cx + half, cy - half],
        [cx - half, cy + half],
        [cx + half, cy + half],
      ];
      for (const [px, py] of corners) {
        const [cellx, celly] = getCellCoord(px, py);
        if (maze.isWall(cellx, celly)) return true;
      }
      return false;
    };

    let collision = false;
    if (collides(nx, this.y)) {
      nx = this.x - Math.sign(this.vx) * pushBack;
      collision = true;
    }
    if (collides(this.x, ny)) {
      ny = this.y - Math.sign(this.vy) * pushBack;
      collision = true;
    }

    if (collision) {
      if (this.wallHitCooldown <= 0) {
        effectManager.localShake(0.2, 0.8);
        effectManager.requestSound('wallHit');
        this.wallHitCooldown = 0.18;
      }
    }

    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - dt);
    this.x = nx;
    this.y = ny;
  }
}
