// Bot objetivo do modo vivo: tenta escapar de perseguidores dentro do labirinto. (Refatorado - Simplicity First)
import Bot from './Bot.js';

export default class EvasionBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Objective',
      color: '#ea00ff',
      speed: 320,
      type: 'evader',
      smartLevel: 3,
      avoidOtherBots: true,
      ...options,
    });
    
    this.detectionRange = options.detectionRange || (options.maze ? options.maze.tileSize * 8 : 250);
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

  pickSafeCell(maze, threat, others) {
    const startCell = maze.worldToCell(this.x, this.y);
    if (!threat) return startCell;

    const threatCell = maze.worldToCell(threat.x, threat.y);
    const blocks = new Set();
    for (const o of others) {
      if (!o || o === this) continue;
      const c = maze.worldToCell(o.x, o.y);
      blocks.add(`${c[0]},${c[1]}`);
    }

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const queue = [startCell];
    const visited = new Set([`${startCell[0]},${startCell[1]}`]);
    
    let bestCell = startCell;
    let bestScore = -Infinity;
    
    let exploredCount = 0;
    const MAX_EXPLORE = 80; // Explora no máximo 80 células próximas para não pesar na CPU

    while (queue.length > 0 && exploredCount < MAX_EXPLORE) {
      const [cx, cy] = queue.shift();
      exploredCount++;

      // Pontua a célula: quanto mais longe da ameaça, melhor.
      const distToThreat = Math.abs(cx - threatCell[0]) + Math.abs(cy - threatCell[1]);
      
      let openNeighbors = 0;
      for (const [dx, dy] of dirs) {
        if (!maze.isWallCell(cx + dx, cy + dy)) openNeighbors++;
      }

      // Penaliza severamente becos sem saída para não ser encurralado, e bonifica cruzamentos
      const mobilityBonus = openNeighbors > 2 ? 8 : (openNeighbors <= 1 ? -20 : 0);
      const score = (distToThreat * 3) + mobilityBonus;

      if (score > bestScore) {
        bestScore = score;
        bestCell = [cx, cy];
      }

      // Expande a busca
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        
        // Bloqueia se for parede (exceto se for fantasma), se já foi visitado, ou se tem outro bot/player lá
        if (blocks.has(key) || visited.has(key)) continue;
        if (maze.isWallCell(nx, ny) && this.ghostTimer <= 0) continue;
        
        visited.add(key);
        queue.push([nx, ny]);
      }
    }

    return bestCell;
  }

  update(dt, maze, _, others = []) {
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

    const threat = this.findNearestThreat(others);
    this.shouldEvade = !!threat;
    this.decisionTimer -= dt;

    if (!threat) {
       this.currentSafeWorldTarget = null;
       this.path = [];
       return;
    }

    if (!this.currentSafeWorldTarget || this.decisionTimer <= 0) {
      const safeCell = this.pickSafeCell(maze, threat, others);
      this.currentSafeWorldTarget = maze.getCellCenter(safeCell[0], safeCell[1]);
      this.decisionTimer = 0.2; // Rápida reação a cada 200ms
    }

    if (this.currentSafeWorldTarget) {
      this.smartMove(dt, maze, this.currentSafeWorldTarget, others);
    }
  }

  draw(ctx) {
    if (this.ghostTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
    }

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

    ctx.globalAlpha = 1.0;
  }
}
