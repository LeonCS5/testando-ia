import { normalizeVector } from '../utils/MathUtils.js';

class MinHeap {
  constructor(compare) {
    this.data = [];
    this.compare = compare;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  push(item) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.data[index], this.data[parent]) >= 0) break;
      [this.data[index], this.data[parent]] = [this.data[parent], this.data[index]];
      index = parent;
    }
  }

  bubbleDown(index) {
    const size = this.data.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < size && this.compare(this.data[left], this.data[smallest]) < 0) {
        smallest = left;
      }
      if (right < size && this.compare(this.data[right], this.data[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.data[index], this.data[smallest]] = [this.data[smallest], this.data[index]];
      index = smallest;
    }
  }
}

export default class Bot {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.speed = options.speed || 120;
    this.size = options.size || 12;
    this.color = options.color || '#ff4fe3';
    this.name = options.name || 'BOT';
    this.type = options.type || 'balanced';
    this.smartLevel = options.smartLevel || 2; // 1=low, 2=medium, 3=high
    this.behavior = options.behavior || this.type || 'racer';
    this.path = [];
    this.pathIndex = 0;
    this.lastGoal = null;
    this.lastCell = null;
    this.lastPlannedFrom = null;
    this.prevDistToNext = Infinity;
    this.noProgressFrames = 0;
    this.maxNoProgressFrames = 16;
    this.deviationCooldown = 0;
    this.localRandom = typeof options.random === 'function' ? options.random : Math.random;
    this.maze = options.maze || null;
    this.updateSize();
  }

  updateSize() {
    if (this.maze && Number.isFinite(this.maze.tileSize)) {
      this.size = this.maze.tileSize * 0.5;
    }
  }

  collides(x, y, maze) {
    const half = this.size / 2;
    const points = [
      [x - half, y - half],
      [x + half, y - half],
      [x - half, y + half],
      [x + half, y + half],
      [x, y - half],
      [x, y + half],
      [x - half, y],
      [x + half, y],
    ];
    return points.some(([cx, cy]) => maze.isWallAtWorld(cx, cy));
  }

  heuristic(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  toKey(cell) {
    return `${cell[0]},${cell[1]}`;
  }

  isValidPath(path, maze, goal) {
    if (!Array.isArray(path) || path.length === 0) return false;
    const last = path[path.length - 1];
    if (!last || last[0] !== goal[0] || last[1] !== goal[1]) return false;
    for (let i = 0; i < path.length; i += 1) {
      const [x, y] = path[i];
      if (maze.isWallCell(x, y)) return false;
      if (i > 0) {
        const [px, py] = path[i - 1];
        if (Math.abs(x - px) + Math.abs(y - py) !== 1) return false;
      }
    }
    return true;
  }

  resetPathState() {
    this.path = [];
    this.pathIndex = 0;
    this.prevDistToNext = Infinity;
    this.noProgressFrames = 0;
  }

  setPath(path, current, goal) {
    this.path = path;
    this.pathIndex = 0;
    this.prevDistToNext = Infinity;
    this.noProgressFrames = 0;
    this.lastGoal = [goal[0], goal[1]];
    this.lastPlannedFrom = [current[0], current[1]];
  }

  findPath(start, goal, maze, occupancy = new Map(), occupancyWeight = 0) {
    const startKey = this.toKey(start);
    const goalKey = this.toKey(goal);

    const open = new MinHeap((a, b) => {
      if (a.f !== b.f) return a.f - b.f;
      if (a.h !== b.h) return a.h - b.h;
      return a.g - b.g;
    });
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map([[startKey, 0]]);
    open.push({ x: start[0], y: start[1], g: 0, h: this.heuristic(start, goal), f: this.heuristic(start, goal) });
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (!open.isEmpty()) {
      const node = open.pop();
      const cx = node.x;
      const cy = node.y;
      const currentKey = `${cx},${cy}`;
      if (closed.has(currentKey)) continue;
      closed.add(currentKey);

      if (currentKey === goalKey) {
        const path = [];
        let key = goalKey;
        while (key) {
          const [px, py] = key.split(',').map(Number);
          path.unshift([px, py]);
          key = cameFrom.get(key);
        }
        return path;
      }

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (maze.isWallCell(nx, ny)) continue;
        if (closed.has(key)) continue;

        const occupancyPenalty = key === goalKey ? 0 : ((occupancy.get(key) || 0) * occupancyWeight);
        const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1 + occupancyPenalty;

        if (tentativeG >= (gScore.get(key) ?? Infinity)) continue;

        const h = this.heuristic([nx, ny], goal);
        const f = tentativeG + h;

        cameFrom.set(key, currentKey);
        gScore.set(key, tentativeG);
        open.push({ x: nx, y: ny, g: tentativeG, h, f });
      }
    }

    return [];
  }

  moveWithAxisCollision(deltaX, deltaY, maze) {
    if (deltaX !== 0) {
      const nextX = this.x + deltaX;
      if (!this.collides(nextX, this.y, maze)) {
        this.x = nextX;
      }
    }
    if (deltaY !== 0) {
      const nextY = this.y + deltaY;
      if (!this.collides(this.x, nextY, maze)) {
        this.y = nextY;
      }
    }
  }

  moveTowardsCell(dt, maze, targetCell, separationOffset = { x: 0, y: 0 }) {
    const [targetX, targetY] = maze.getCellCenter(targetCell[0], targetCell[1]);
    const adjustedTargetX = targetX + separationOffset.x;
    const adjustedTargetY = targetY + separationOffset.y;
    const maxStep = this.speed * Math.min(dt, 1 / 30);
    const dx = adjustedTargetX - this.x;
    const dy = adjustedTargetY - this.y;
    const snapRadius = Math.max(0.45, maxStep * 0.9);

    if (Math.hypot(targetX - this.x, targetY - this.y) <= snapRadius) {
      this.x = targetX;
      this.y = targetY;
      return true;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      const stepX = Math.sign(dx) * Math.min(Math.abs(dx), maxStep);
      this.moveWithAxisCollision(stepX, 0, maze);
    } else {
      const stepY = Math.sign(dy) * Math.min(Math.abs(dy), maxStep);
      this.moveWithAxisCollision(0, stepY, maze);
    }

    return false;
  }

  buildOccupancyMap(others) {
    const occupancy = new Map();
    if (!Array.isArray(others)) return occupancy;
    for (const other of others) {
      if (!other || other === this) continue;
      const cell = this.maze.worldToCell(other.x, other.y);
      const key = this.toKey(cell);
      occupancy.set(key, (occupancy.get(key) || 0) + 1);
    }
    return occupancy;
  }

  getSeparationOffset(others, maze) {
    if (!Array.isArray(others) || others.length === 0) return { x: 0, y: 0 };
    let repelX = 0;
    let repelY = 0;
    const desiredGap = Math.max(this.size, maze.tileSize * 0.45);

    for (const other of others) {
      if (!other || other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0 || dist >= desiredGap) continue;
      const strength = (desiredGap - dist) / desiredGap;
      repelX += (dx / dist) * strength;
      repelY += (dy / dist) * strength;
    }

    if (repelX === 0 && repelY === 0) return { x: 0, y: 0 };
    const repel = normalizeVector(repelX, repelY);
    const magnitude = maze.tileSize * 0.18;
    return { x: repel.x * magnitude, y: repel.y * magnitude };
  }

  shouldRepath(current, goal, maze) {
    const goalChanged = !this.lastGoal || this.lastGoal[0] !== goal[0] || this.lastGoal[1] !== goal[1];
    const pathInvalid = !this.isValidPath(this.path, maze, goal);
    const hasPath = this.path.length > 1;
    const outOfBoundsIndex = this.pathIndex >= this.path.length;
    const nextCell = this.path[this.pathIndex + 1] || null;
    const noNextNode = hasPath && !nextCell;
    const blockedByWall = nextCell ? maze.isWallCell(nextCell[0], nextCell[1]) : false;
    const movedTooFar = this.lastPlannedFrom
      ? this.heuristic(current, this.lastPlannedFrom) > 3
      : false;
    const stalled = this.noProgressFrames >= this.maxNoProgressFrames;

    return goalChanged || pathInvalid || !hasPath || outOfBoundsIndex || noNextNode || blockedByWall || movedTooFar || stalled;
  }

  selectNextCell(current, maze) {
    if (this.path.length === 0 || this.pathIndex + 1 >= this.path.length) return null;
    let nextCell = this.path[this.pathIndex + 1];

    if (this.behavior === 'explorer') {
      this.deviationCooldown = Math.max(0, this.deviationCooldown - 1);
      const shouldDeviate = this.deviationCooldown <= 0 && this.localRandom() < 0.16;
      if (shouldDeviate) {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        const candidates = dirs
          .map(([dx, dy]) => [current[0] + dx, current[1] + dy])
          .filter(([x, y]) => !maze.isWallCell(x, y))
          .filter(([x, y]) => !(x === nextCell[0] && y === nextCell[1]));
        if (candidates.length > 0) {
          nextCell = candidates[Math.floor(this.localRandom() * candidates.length)];
          this.deviationCooldown = 10;
        }
      }
    }

    return nextCell;
  }

  updatePathProgress(targetCell, maze) {
    if (!targetCell) {
      this.prevDistToNext = Infinity;
      this.noProgressFrames = Math.min(this.noProgressFrames + 1, this.maxNoProgressFrames + 2);
      return;
    }

    const [tx, ty] = maze.getCellCenter(targetCell[0], targetCell[1]);
    const dist = Math.hypot(tx - this.x, ty - this.y);
    const progressThreshold = Math.max(0.04, maze.tileSize * 0.0015);
    if (this.prevDistToNext - dist > progressThreshold) {
      this.noProgressFrames = 0;
    } else {
      this.noProgressFrames = Math.min(this.noProgressFrames + 1, this.maxNoProgressFrames + 2);
    }
    this.prevDistToNext = dist;
  }

  advancePathIndexIfNeeded(current) {
    while (this.pathIndex + 1 < this.path.length) {
      const node = this.path[this.pathIndex];
      const nextNode = this.path[this.pathIndex + 1];
      const atNode = node[0] === current[0] && node[1] === current[1];
      const jumpedAhead = nextNode[0] === current[0] && nextNode[1] === current[1];
      if (jumpedAhead) {
        this.pathIndex += 1;
        continue;
      }
      if (atNode) return;
      if (this.pathIndex > 0) {
        const prevNode = this.path[this.pathIndex - 1];
        const atPrev = prevNode[0] === current[0] && prevNode[1] === current[1];
        if (atPrev) {
          this.pathIndex -= 1;
          return;
        }
      }
      return;
    }
  }

  greedyFallbackCell(current, goal, maze, occupancy = new Map()) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    let bestCell = null;
    let bestScore = Infinity;
    const safeWeight = this.behavior === 'safe' ? 0.65 : 0.18;

    for (const [dx, dy] of dirs) {
      const nx = current[0] + dx;
      const ny = current[1] + dy;
      if (maze.isWallCell(nx, ny)) continue;
      const key = `${nx},${ny}`;
      const occupancyPenalty = occupancy.get(key) || 0;
      const score = this.heuristic([nx, ny], goal) + occupancyPenalty * safeWeight;
      if (score < bestScore) {
        bestScore = score;
        bestCell = [nx, ny];
      }
    }

    return bestCell;
  }

  smartMove(dt, maze, exitWorld, others = []) {
    const current = maze.worldToCell(this.x, this.y);
    const goal = maze.worldToCell(exitWorld[0], exitWorld[1]);
    const occupancy = this.buildOccupancyMap(others);
    const occupancyWeight = this.behavior === 'safe' ? 0.7 : 0;

    if (this.shouldRepath(current, goal, maze)) {
      const newPath = this.findPath(current, goal, maze, occupancy, occupancyWeight);
      if (newPath.length > 0) {
        this.setPath(newPath, current, goal);
      } else {
        this.resetPathState();
        this.lastGoal = [goal[0], goal[1]];
      }
    }

    this.advancePathIndexIfNeeded(current);

    const nextCell = this.selectNextCell(current, maze);
    const targetCell = nextCell || this.greedyFallbackCell(current, goal, maze, occupancy) || goal;
    const separationOffset = this.getSeparationOffset(others, maze);

    const reached = this.moveTowardsCell(dt, maze, targetCell, separationOffset);
    if (reached && nextCell && targetCell[0] === nextCell[0] && targetCell[1] === nextCell[1]) {
      this.pathIndex = Math.min(this.pathIndex + 1, Math.max(0, this.path.length - 1));
    }

    this.updatePathProgress(targetCell, maze);

    this.lastCell = current;
  }

  update(dt, maze, exitWorld, others = []) {
    if (maze) this.maze = maze;
    this.updateSize();
    
    if (!exitWorld) return;

    // Keep old API fallback: smartLevel now only scales speed aggressiveness.
    const speedFactor = this.smartLevel >= 3 ? 1.0 : this.smartLevel === 2 ? 0.94 : 0.9;
    const baseSpeed = this.speed;
    this.speed = baseSpeed * speedFactor;
    this.smartMove(dt, maze, exitWorld, others);
    this.speed = baseSpeed;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.font = '12px Segoe UI';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - this.size - 8);
  }
}