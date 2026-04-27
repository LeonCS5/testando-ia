// Classe base dos bots: pathfinding, movimento e comportamento de perseguicao.
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
    this.movementStyle = options.movementStyle || 'flux';
    this.path = [];
    this.pathIndex = 0;
    this.lastGoal = null;
    this.lastCell = null;
    this.lastPlannedFrom = null;
    this.prevDistToNext = Infinity;
    this.noProgressFrames = 0;
    this.maxNoProgressFrames = 24;
    this.deviationCooldown = 0;
    this.hesitationTimer = 0; // For low-level hesitation
    this.avoidOtherBots = Boolean(options.avoidOtherBots);
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
    const manhattan = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    
    // Low-level bots have confused heuristic
    if (this.smartLevel === 1) {
      const confusion = this.localRandom() * manhattan * 0.4;
      return manhattan + confusion;
    }
    
    return manhattan;
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
    const movedX = this.tryMove(deltaX, 0, maze);
    const movedY = this.tryMove(0, deltaY, maze);
    
    // If both directions have movement needed, try diagonal for smooth corners
    if (!movedX && !movedY && deltaX !== 0 && deltaY !== 0) {
      // Try half-steps in both directions
      this.tryMove(deltaX * 0.5, deltaY * 0.5, maze);
    }
  }

  tryMove(deltaX, deltaY, maze) {
    if (deltaX === 0 && deltaY === 0) return false;
    
    const nextX = this.x + deltaX;
    const nextY = this.y + deltaY;
    
    if (!this.collides(nextX, nextY, maze)) {
      this.x = nextX;
      this.y = nextY;
      return true;
    }
    
    // Try partial movements on fail
    if (deltaX !== 0 && !this.collides(nextX, this.y, maze)) {
      this.x = nextX;
      return true;
    }
    if (deltaY !== 0 && !this.collides(this.x, nextY, maze)) {
      this.y = nextY;
      return true;
    }
    
    // Try half-step in primary direction
    const halfX = this.x + deltaX * 0.5;
    const halfY = this.y + deltaY * 0.5;
    if (!this.collides(halfX, this.y, maze)) {
      this.x = halfX;
      return true;
    }
    if (!this.collides(this.x, halfY, maze)) {
      this.y = halfY;
      return true;
    }
    
    return false;
  }

  moveTowardsCell(dt, maze, targetCell, separationOffset = { x: 0, y: 0 }, isGoal = false) {
    // Low-level hesitation
    if (this.hesitationTimer > 0) {
      this.hesitationTimer -= 1;
      return false;
    }

    const [targetX, targetY] = maze.getCellCenter(targetCell[0], targetCell[1]);
    const adjustedTargetX = targetX + separationOffset.x;
    const adjustedTargetY = targetY + separationOffset.y;
    const maxStep = this.speed * Math.min(dt, 1 / 30);
    const dx = adjustedTargetX - this.x;
    const dy = adjustedTargetY - this.y;
    // Larger snap radius for goal - make it easier to "reach"
    const snapRadius = isGoal ? Math.max(1.5, maxStep * 1.2) : Math.max(0.45, maxStep * 0.9);

    if (Math.hypot(targetX - this.x, targetY - this.y) <= snapRadius) {
      this.x = targetX;
      this.y = targetY;
      return true;
    }

    // Calculate movement steps for both axes
    const stepX = Math.sign(dx) * Math.min(Math.abs(dx), maxStep);
    const stepY = Math.sign(dy) * Math.min(Math.abs(dy), maxStep);
    
    // Try to move diagonally when both axes need movement (smooth corners!)
    if (stepX !== 0 && stepY !== 0) {
      this.moveWithAxisCollision(stepX, stepY, maze);
    } else if (stepX !== 0) {
      this.tryMove(stepX, 0, maze);
    } else if (stepY !== 0) {
      this.tryMove(0, stepY, maze);
    }

    return false;
  }

  buildOccupancyMap(others) {
    const occupancy = new Map();
    if (!this.avoidOtherBots) return occupancy;
    if (!Array.isArray(others)) return occupancy;
    for (const other of others) {
      if (!other || other === this) continue;
      const cell = this.maze.worldToCell(other.x, other.y);
      const key = this.toKey(cell);
      occupancy.set(key, (occupancy.get(key) || 0) + 1);
    }
    return occupancy;
  }

  getCorridorCenterOffset(targetCell, maze) {
    // Detect walls around target cell and push bot away from them
    const dirs = [
      { dx: 0, dy: -1, px: 0, py: -1 },  // up
      { dx: 0, dy: 1, px: 0, py: 1 },    // down
      { dx: -1, dy: 0, px: -1, py: 0 },  // left
      { dx: 1, dy: 0, px: 1, py: 0 },    // right
    ];

    let pushX = 0;
    let pushY = 0;
    let wallCount = 0;

    for (const dir of dirs) {
      const nx = targetCell[0] + dir.dx;
      const ny = targetCell[1] + dir.dy;
      if (maze.isWallCell(nx, ny)) {
        wallCount += 1;
        // Push away from wall direction
        pushX -= dir.px * 0.3;
        pushY -= dir.py * 0.3;
      }
    }

    if (wallCount === 0) return { x: 0, y: 0 };
    
    const magnitude = Math.min(wallCount * maze.tileSize * 0.12, maze.tileSize * 0.25);
    if (pushX === 0 && pushY === 0) return { x: 0, y: 0 };
    
    const v = normalizeVector(pushX, pushY);
    return { x: v.x * magnitude, y: v.y * magnitude };
  }

  getSeparationOffset(others, maze) {
    if (!this.avoidOtherBots) return { x: 0, y: 0 };
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
    
    // Level-based stall thresholds
    let stalledThreshold = this.maxNoProgressFrames;
    if (this.smartLevel === 1) stalledThreshold = this.maxNoProgressFrames + 8;
    else if (this.smartLevel === 2) stalledThreshold = this.maxNoProgressFrames + 4;
    const stalled = this.noProgressFrames >= stalledThreshold;

    return goalChanged || pathInvalid || !hasPath || outOfBoundsIndex || noNextNode || blockedByWall || movedTooFar || stalled;
  }

  selectNextCell(current, maze) {
    if (this.path.length === 0 || this.pathIndex + 1 >= this.path.length) return null;
    let nextCell = this.path[this.pathIndex + 1];

    // Flux style: always follow planned path for smoother, consistent movement.
    if (this.movementStyle === 'flux') {
      return nextCell;
    }

    // Level 1: Sometimes pick random adjacent cell (looks confused)
    if (this.smartLevel === 1) {
      const confusionChance = 0.08;
      if (this.localRandom() < confusionChance) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const candidates = dirs
          .map(([dx, dy]) => [current[0] + dx, current[1] + dy])
          .filter(([x, y]) => !maze.isWallCell(x, y));
        if (candidates.length > 0) {
          nextCell = candidates[Math.floor(this.localRandom() * candidates.length)];
          this.hesitationTimer = 3;
        }
      }
    }

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
    const safeWeight = this.avoidOtherBots
      ? (this.behavior === 'safe' ? 0.65 : 0.18)
      : 0;

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
    let current = maze.worldToCell(this.x, this.y);
    if (maze.isWallCell(current[0], current[1])) {
      current = maze.getClosestOpenCell(current[0], current[1]);
    }

    let goal = maze.worldToCell(exitWorld[0], exitWorld[1]);
    if (maze.isWallCell(goal[0], goal[1])) {
      goal = maze.getClosestOpenCell(goal[0], goal[1]);
    }

    const occupancy = this.buildOccupancyMap(others);
    const occupancyWeight = this.avoidOtherBots && this.behavior === 'safe' ? 0.7 : 0;

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
    
    // No offsets when targeting the goal - go straight for it
    let combinedOffset = { x: 0, y: 0 };
    if (targetCell[0] !== goal[0] || targetCell[1] !== goal[1]) {
      // Combine corridor center offset with separation offset only for intermediate cells
      const corridorOffset = this.getCorridorCenterOffset(targetCell, maze);
      const separationOffset = this.getSeparationOffset(others, maze);
      combinedOffset = {
        x: corridorOffset.x + separationOffset.x,
        y: corridorOffset.y + separationOffset.y
      };
    }

    const reached = this.moveTowardsCell(dt, maze, targetCell, combinedOffset, targetCell[0] === goal[0] && targetCell[1] === goal[1]);
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
    this.smartMove(dt, maze, exitWorld, others);
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