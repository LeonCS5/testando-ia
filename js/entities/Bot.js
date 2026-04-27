// Classe base dos bots: pathfinding e movimento. (Refatorado - Simplicity First)
import { normalizeVector } from '../utils/MathUtils.js';

export default class Bot {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.speed = options.speed || 120;
    this.size = options.size || 12;
    this.color = options.color || '#ff4fe3';
    this.name = options.name || 'BOT';
    this.type = options.type || 'balanced';
    this.smartLevel = options.smartLevel || 2; 
    this.path = [];
    this.pathIndex = 0;
    this.maze = options.maze || null;
    this.avoidOtherBots = Boolean(options.avoidOtherBots);
    this.ghostTimer = 0;
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

  collides(x, y, maze) {
    if (this.ghostTimer > 0) return false;

    const half = this.size / 2;
    const points = [
      [x - half, y - half], [x + half, y - half],
      [x - half, y + half], [x + half, y + half]
    ];
    return points.some(([cx, cy]) => maze.isWallAtWorld(cx, cy));
  }

  tryMove(dx, dy, maze) {
    if (dx === 0 && dy === 0) return false;
    
    // Tenta mover nos dois eixos juntos
    if (!this.collides(this.x + dx, this.y + dy, maze)) {
      this.x += dx;
      this.y += dy;
      return true;
    }
    // Tenta um eixo de cada vez para deslizar nas paredes
    if (dx !== 0 && !this.collides(this.x + dx, this.y, maze)) {
      this.x += dx;
      return true;
    }
    if (dy !== 0 && !this.collides(this.x, this.y + dy, maze)) {
      this.y += dy;
      return true;
    }
    return false;
  }

  getSeparation(others, maze) {
    if (!this.avoidOtherBots || others.length === 0) return { x: 0, y: 0 };
    let rx = 0, ry = 0;
    const gap = this.size * 2;
    for (const other of others) {
      if (!other || other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < gap) {
        rx += (dx / dist) * (gap - dist);
        ry += (dy / dist) * (gap - dist);
      }
    }
    if (rx === 0 && ry === 0) return { x: 0, y: 0 };
    const norm = normalizeVector(rx, ry);
    return { x: norm.x * maze.tileSize * 0.15, y: norm.y * maze.tileSize * 0.15 };
  }

  moveTowardsCell(dt, maze, targetCell, others) {
    const [tx, ty] = maze.getCellCenter(targetCell[0], targetCell[1]);
    const sep = this.getSeparation(others, maze);
    const destX = tx + sep.x;
    const destY = ty + sep.y;
    
    const dx = destX - this.x;
    const dy = destY - this.y;
    const maxStep = this.speed * Math.min(dt, 1/30);
    
    if (Math.hypot(tx - this.x, ty - this.y) <= Math.max(2, maxStep)) {
      this.x = tx;
      this.y = ty;
      return true;
    }

    const stepX = Math.sign(dx) * Math.min(Math.abs(dx), maxStep);
    const stepY = Math.sign(dy) * Math.min(Math.abs(dy), maxStep);
    this.tryMove(stepX, stepY, maze);
    return false;
  }

  smartMove(dt, maze, exitWorld, others) {
    let current = maze.worldToCell(this.x, this.y);
    let goal = maze.worldToCell(exitWorld[0], exitWorld[1]);

    if (maze.isWallCell(current[0], current[1]) && this.ghostTimer <= 0) current = maze.getClosestOpenCell(current[0], current[1]);
    if (maze.isWallCell(goal[0], goal[1]) && this.ghostTimer <= 0) goal = maze.getClosestOpenCell(goal[0], goal[1]);

    if (this.ghostTimer > 0) {
      this.path = [goal];
      this.pathIndex = 0;
    } else if (this.path.length === 0 || Math.random() < 0.05) {
      const blocks = new Set();
      if (this.avoidOtherBots && others) {
        for (const o of others) {
          if (!o || o === this) continue;
          const c = maze.worldToCell(o.x, o.y);
          blocks.add(`${c[0]},${c[1]}`);
        }
      }

      this.path = maze.findPath(current, goal, blocks);
      // Fallback: se estiver cercado, ignora as ameaças (EXCETO se for evader, evader prefere ficar parado do que cometer suicídio)
      if (this.path.length === 0 && blocks.size > 0 && this.type !== 'evader') {
        this.path = maze.findPath(current, goal);
      }
      this.pathIndex = 0;
    }

    if (this.path.length === 0) return;

    // Avança no caminho se já chegou na célula atual
    if (this.pathIndex < this.path.length) {
      const node = this.path[this.pathIndex];
      if (node[0] === current[0] && node[1] === current[1]) {
        this.pathIndex++;
      }
    }

    const nextCell = this.path[this.pathIndex] || goal;
    this.moveTowardsCell(dt, maze, nextCell, others);
  }

  update(dt, maze, exitWorld, others = []) {
    if (maze) this.maze = maze;
    this.updateSize();

    if (this.ghostTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0 && this.maze && this.maze.isWallAtWorld(this.x, this.y)) {
        const cell = this.maze.worldToCell(this.x, this.y);
        const openCell = this.maze.getClosestOpenCell(cell[0], cell[1]);
        const center = this.maze.getCellCenter(openCell[0], openCell[1]);
        this.x = center[0];
        this.y = center[1];
      }
    }

    if (exitWorld) this.smartMove(dt, maze, exitWorld, others);
  }

  draw(ctx) {
    if (this.ghostTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.font = '12px Segoe UI';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - this.size - 8);
    ctx.globalAlpha = 1.0;
  }
}