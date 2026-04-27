// Entidade controlada pelo jogador: movimento, colisao e renderizacao do avatar.
import { TILE_SIZE } from '../constants.js';
import Maze from './Maze.js';

export default class Player {
  constructor(x, y, maze, options = {}) {
    this.x = x;
    this.y = y;
    this.maze = maze;

    this.speed = options.speed || 210;
    this.color = options.color || '#2ef98e';
    this.name = options.name || 'PLAYER';

    this.wallHitCooldown = 0;
    this.ghostTimer = 0;
    this.size = 10; // fallback
    this.updateSize();
  }

  activateGhost(time) {
    this.ghostTimer = time;
  }

  updateSize() {
    if (this.maze && Number.isFinite(this.maze.tileSize)) {
      this.size = this.maze.tileSize * 0.5;
    }
  }

  update(dt, input, maze, juice, audio) {
    // Atualiza referência do labirinto se mudou
    if (maze) this.maze = maze;

    this.updateSize();

    let vx = 0;
    let vy = 0;
    if (input.left) vx = -this.speed;
    if (input.right) vx = this.speed;
    if (input.up) vy = -this.speed;
    if (input.down) vy = this.speed;

    // NORMALIZA movimento diagonal
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * this.speed;
      vy = (vy / len) * this.speed;

      // Só chama spawnTrail se existe
      if (juice && typeof juice.spawnTrail === 'function') {
        juice.spawnTrail(this.x, this.y);
      }
    }

    const step = Math.min(dt, 1 / 30);
    let nextX = this.x + vx * step;
    let nextY = this.y + vy * step;

    let collision = false;

    if (this.collides(nextX, this.y)) {
      nextX = this.x;
      collision = true;
    }
    if (this.collides(this.x, nextY)) {
      nextY = this.y;
      collision = true;
    }

    if (collision && this.wallHitCooldown <= 0) {
      if (juice && typeof juice.localShake === 'function') juice.localShake(0.2, 0.8);
      if (audio && typeof audio.wallHit === 'function') audio.wallHit();
      this.wallHitCooldown = 0.18;
    }

    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - dt);

    const wasGhost = this.ghostTimer > 0;
    if (this.ghostTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        // O efeito acabou, tenta ejetar se estiver dentro de uma parede
        if (this.maze && this.maze.isWallAtWorld(this.x, this.y)) {
          const cell = this.maze.worldToCell(this.x, this.y);
          const openCell = this.maze.getClosestOpenCell(cell[0], cell[1]);
          const center = this.maze.getCellCenter(openCell[0], openCell[1]);
          this.x = center[0];
          this.y = center[1];
          nextX = this.x;
          nextY = this.y;
        }
      }
    }

    this.x = nextX;
    this.y = nextY;
  }

  collides(x, y) {
    if (this.ghostTimer > 0) return false;

    const maze = this.maze;
    if (!maze || !Number.isFinite(maze.tileSize)) return false;

    const half = this.size / 2;
    const pontos = [
      [x - half, y - half],
      [x + half, y - half],
      [x - half, y + half],
      [x + half, y + half],
    ];

    for (const [px, py] of pontos) {
      if (maze.isWallAtWorld(px, py)) return true;
    }
    return false;
  }

  draw(ctx) {
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y) || !Number.isFinite(this.size)) return;

    if (this.ghostTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
    }

    const glow = ctx.createRadialGradient(
      this.x, this.y, this.size * 0.2,
      this.x, this.y, this.size
    );
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

    ctx.globalAlpha = 1.0;
  }
}