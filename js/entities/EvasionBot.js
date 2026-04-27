// Bot objetivo do modo vivo: tenta escapar de perseguidores dentro do labirinto.
import Bot from './Bot.js';

/**
 * EvasionBot - Objective that runs away when threatened
 * Moves when approached, actively evading pursuers
 */
export default class EvasionBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Objective',
      color: '#ffff00',
      speed: 520,
      type: 'evader',
      behavior: 'evader',
      smartLevel: 3,
      avoidOtherBots: false,
      ...options,
    });
    
    this.detectionRange = options.detectionRange || 20; // Ativa fuga quando algo fica perto
    this.shouldEvade = false;
    this.evasionCooldown = 0;
    this.lastEvasionTarget = null;
    this.decisionTimer = 0;
    this.decisionInterval = options.decisionInterval || 0.12;
    this.currentSafeWorldTarget = null;
  }

  findNearestThreat(others, maze) {
    if (!Array.isArray(others) || others.length === 0) return null;
    
    let nearest = null;
    let closestDist = this.detectionRange;
    
    for (const other of others) {
      if (!other || other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < closestDist) {
        closestDist = dist;
        nearest = other;
      }
    }
    
    return nearest;
  }

  countOpenNeighbors(cell, maze) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let count = 0;
    for (const [dx, dy] of dirs) {
      const nx = cell[0] + dx;
      const ny = cell[1] + dy;
      if (!maze.isWallCell(nx, ny)) count += 1;
    }
    return count;
  }

  pickSafeCell(maze, others = []) {
    if (!Array.isArray(maze.openCells) || maze.openCells.length === 0) {
      return maze.worldToCell(this.x, this.y);
    }

    const current = maze.worldToCell(this.x, this.y);
    const nearestThreat = this.findNearestThreat(others, maze);
    const nearestThreatCell = nearestThreat ? maze.worldToCell(nearestThreat.x, nearestThreat.y) : null;
    const baseThreatDist = nearestThreatCell
      ? Math.abs(current[0] - nearestThreatCell[0]) + Math.abs(current[1] - nearestThreatCell[1])
      : 0;

    let fleeX = 0;
    let fleeY = 0;
    if (nearestThreatCell) {
      const rawX = current[0] - nearestThreatCell[0];
      const rawY = current[1] - nearestThreatCell[1];
      const len = Math.hypot(rawX, rawY) || 1;
      fleeX = rawX / len;
      fleeY = rawY / len;
    }

    const sampleStep = Math.max(1, Math.floor(maze.openCells.length / 160));
    let best = current;
    let bestScore = -Infinity;

    for (let i = 0; i < maze.openCells.length; i += sampleStep) {
      const cell = maze.openCells[i];
      const [cx, cy] = cell;
      if (maze.isWallCell(cx, cy)) continue;

      let nearestThreatDist = Infinity;
      for (const other of others) {
        if (!other || other === this) continue;
        const threatCell = maze.worldToCell(other.x, other.y);
        const dist = Math.abs(cx - threatCell[0]) + Math.abs(cy - threatCell[1]);
        if (dist < nearestThreatDist) nearestThreatDist = dist;
      }

      if (!Number.isFinite(nearestThreatDist)) nearestThreatDist = 0;
      const distFromSelf = Math.abs(cx - current[0]) + Math.abs(cy - current[1]);
      const mobilityBonus = this.countOpenNeighbors(cell, maze) * 0.9;
      const toCellX = cx - current[0];
      const toCellY = cy - current[1];
      const toCellLen = Math.hypot(toCellX, toCellY) || 1;
      const awayAlignment = ((toCellX / toCellLen) * fleeX) + ((toCellY / toCellLen) * fleeY);
      const directionBonus = awayAlignment * 4;
      const approachPenalty = nearestThreatCell && nearestThreatDist < baseThreatDist
        ? (baseThreatDist - nearestThreatDist) * 8
        : 0;
      const score = (nearestThreatDist * 3.2) + mobilityBonus + directionBonus - (distFromSelf * 0.28) - approachPenalty;

      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }

    return best;
  }

  pickImmediateEscapeCell(maze, threat) {
    const current = maze.worldToCell(this.x, this.y);
    const threatCell = maze.worldToCell(threat.x, threat.y);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    const rawX = current[0] - threatCell[0];
    const rawY = current[1] - threatCell[1];
    const len = Math.hypot(rawX, rawY) || 1;
    const fleeX = rawX / len;
    const fleeY = rawY / len;

    let best = current;
    let bestScore = -Infinity;

    for (const [dx, dy] of dirs) {
      const nx = current[0] + dx;
      const ny = current[1] + dy;
      if (maze.isWallCell(nx, ny)) continue;

      const distToThreat = Math.abs(nx - threatCell[0]) + Math.abs(ny - threatCell[1]);
      const stepLen = Math.hypot(dx, dy) || 1;
      const alignment = ((dx / stepLen) * fleeX) + ((dy / stepLen) * fleeY);
      const score = distToThreat * 3 + alignment * 4 + this.countOpenNeighbors([nx, ny], maze) * 0.6;

      if (score > bestScore) {
        bestScore = score;
        best = [nx, ny];
      }
    }

    return best;
  }

  update(dt, maze, _, others = []) {
    if (maze) this.maze = maze;
    this.updateSize();

    const threat = this.findNearestThreat(others, maze);

    if (threat) {
      this.shouldEvade = true;
      this.lastEvasionTarget = threat;
      this.evasionCooldown = 0.45;
    } else if (this.evasionCooldown > 0) {
      this.evasionCooldown = Math.max(0, this.evasionCooldown - dt);
      this.shouldEvade = this.evasionCooldown > 0;
    } else {
      this.shouldEvade = false;
    }

    this.decisionTimer = Math.max(0, this.decisionTimer - dt);
    if (!this.currentSafeWorldTarget || this.decisionTimer <= 0 || this.shouldEvade) {
      let safeCell;
      if (threat) {
        const threatDist = Math.hypot(threat.x - this.x, threat.y - this.y);
        if (threatDist < this.detectionRange * 0.45) {
          safeCell = this.pickImmediateEscapeCell(maze, threat);
        }
      }

      if (!safeCell) {
        safeCell = this.pickSafeCell(maze, others);
      }

      this.currentSafeWorldTarget = maze.getCellCenter(safeCell[0], safeCell[1]);
      this.decisionTimer = this.decisionInterval;
    }

    if (!this.currentSafeWorldTarget) return;
    this.smartMove(dt, maze, this.currentSafeWorldTarget, others);

    const currentCell = maze.worldToCell(this.x, this.y);
    if (maze.isWallCell(currentCell[0], currentCell[1])) {
      const [safeX, safeY] = maze.getClosestOpenCell(currentCell[0], currentCell[1]);
      const [worldX, worldY] = maze.getCellCenter(safeX, safeY);
      this.x = worldX;
      this.y = worldY;
    }
  }

  draw(ctx) {
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
    const radius = (this.size * 0.5) * (0.9 + pulse * 0.25);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();

    const outlineAlpha = this.shouldEvade ? pulse : 0.85;
    ctx.strokeStyle = `rgba(255, 255, 255, ${outlineAlpha})`;
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
