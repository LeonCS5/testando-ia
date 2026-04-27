// Bot objetivo do modo vivo: tenta escapar de perseguidores dentro do labirinto. (Refatorado - Simplicity First)
import Bot from './Bot.js';

export default class EvasionBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Objective',
      color: '#ffff00',
      speed: 520,
      type: 'evader',
      smartLevel: 3,
      avoidOtherBots: false,
      ...options,
    });
    
    this.detectionRange = options.detectionRange || 20;
    this.shouldEvade = false;
    this.currentSafeWorldTarget = null;
    this.decisionTimer = 0;
  }

  findNearestThreat(others) {
    if (!others || others.length === 0) return null;
    let nearest = null;
    let closestDist = this.detectionRange;
    
    for (const other of others) {
      if (!other || other === this) continue;
      const dist = Math.hypot(other.x - this.x, other.y - this.y);
      if (dist < closestDist) {
        closestDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  pickSafeCell(maze, threat) {
    const current = maze.worldToCell(this.x, this.y);
    if (!threat) return maze.randomOpenCell();

    // Tenta encontrar uma célula vazia adjacente que aumente a distância da ameaça
    const threatCell = maze.worldToCell(threat.x, threat.y);
    const currentDist = Math.abs(current[0] - threatCell[0]) + Math.abs(current[1] - threatCell[1]);

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let best = current;
    let bestDist = currentDist;

    for (const [dx, dy] of dirs) {
      const nx = current[0] + dx;
      const ny = current[1] + dy;
      if (maze.isWallCell(nx, ny)) continue;
      const dist = Math.abs(nx - threatCell[0]) + Math.abs(ny - threatCell[1]);
      if (dist > bestDist) {
        bestDist = dist;
        best = [nx, ny];
      }
    }

    // Se estiver sem saída imediata, escolhe um ponto aleatório longe da ameaça
    if (best[0] === current[0] && best[1] === current[1] && maze.openCells.length > 0) {
       for (let i = 0; i < 10; i++) {
         const randomCell = maze.randomOpenCell();
         const randomDist = Math.abs(randomCell[0] - threatCell[0]) + Math.abs(randomCell[1] - threatCell[1]);
         if (randomDist > currentDist) return randomCell;
       }
    }

    return best;
  }

  update(dt, maze, _, others = []) {
    if (maze) this.maze = maze;
    this.updateSize();

    const threat = this.findNearestThreat(others);
    this.shouldEvade = !!threat;
    this.decisionTimer -= dt;

    if (!this.currentSafeWorldTarget || this.decisionTimer <= 0 || this.shouldEvade) {
      const safeCell = this.pickSafeCell(maze, threat);
      this.currentSafeWorldTarget = maze.getCellCenter(safeCell[0], safeCell[1]);
      this.decisionTimer = 0.5; // Toma nova decisão a cada meio segundo
    }

    if (this.currentSafeWorldTarget) {
      this.smartMove(dt, maze, this.currentSafeWorldTarget, others);
    }
  }

  draw(ctx) {
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
    const radius = (this.size * 0.5) * (0.9 + pulse * 0.25);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${this.shouldEvade ? pulse : 0.85})`;
    ctx.lineWidth = this.shouldEvade ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (this.shouldEvade) {
      ctx.strokeStyle = `rgba(255, 255, 0, ${pulse * 0.75})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius * 1.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.font = '12px Segoe UI';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - this.size - 8);
  }
}
