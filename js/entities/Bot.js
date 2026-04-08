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
    this.smartLevel = options.smartLevel || 2; // 1=low, 2=medium, 3=high
    this.path = [];
    this.pathCooldown = 0;
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

  findPath(start, goal, maze) {
    const queue = [start];
    const visited = new Set([`${start[0]},${start[1]}`]);
    const parent = new Map();
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      if (cx === goal[0] && cy === goal[1]) {
        const path = [];
        let key = `${goal[0]},${goal[1]}`;
        while (key) {
          const [px, py] = key.split(',').map(Number);
          path.unshift([px, py]);
          key = parent.get(key);
        }
        return path;
      }

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (maze.isWallCell(nx, ny)) continue;
        visited.add(key);
        parent.set(key, `${cx},${cy}`);
        queue.push([nx, ny]);
      }
    }

    return [];
  }

  fastMove(dt, maze, exitWorld) {
    const step = Math.min(dt, 1 / 30);
    const direction = normalizeVector(exitWorld[0] - this.x, exitWorld[1] - this.y);
    const targetX = this.x + direction.x * this.speed * step;
    const targetY = this.y + direction.y * this.speed * step;
    if (!this.collides(targetX, targetY, maze)) {
      this.x = targetX;
      this.y = targetY;
      return;
    }

    const attempts = [
      { x: direction.x, y: 0 },
      { x: 0, y: direction.y },
      { x: -direction.y, y: direction.x },
      { x: direction.y, y: -direction.x },
    ];

    for (const attempt of attempts) {
      const altX = this.x + attempt.x * this.speed * step;
      const altY = this.y + attempt.y * this.speed * step;
      if (!this.collides(altX, altY, maze)) {
        this.x = altX;
        this.y = altY;
        return;
      }
    }
  }

  balancedMove(dt, maze, exitWorld) {
    const step = Math.min(dt, 1 / 30);
    const [currentCx, currentCy] = maze.worldToCell(this.x, this.y);
    const [goalCx, goalCy] = maze.worldToCell(exitWorld[0], exitWorld[1]);
    const dx = goalCx - currentCx;
    const dy = goalCy - currentCy;
    const attempts = [];

    if (dx !== 0 && dy !== 0) {
      attempts.push({ x: Math.sign(dx), y: Math.sign(dy) });
    }
    attempts.push({ x: Math.sign(dx), y: 0 });
    attempts.push({ x: 0, y: Math.sign(dy) });
    attempts.push({ x: -Math.sign(dy), y: Math.sign(dx) });
    attempts.push({ x: Math.sign(dy), y: -Math.sign(dx) });

    for (const attempt of attempts) {
      const candidateX = this.x + attempt.x * this.speed * step;
      const candidateY = this.y + attempt.y * this.speed * step;
      if (!this.collides(candidateX, candidateY, maze)) {
        this.x = candidateX;
        this.y = candidateY;
        return;
      }
    }
  }

  smartMove(dt, maze, exitWorld) {
    const step = Math.min(dt, 1 / 30);
    this.pathCooldown = Math.max(0, this.pathCooldown - dt);
    const current = maze.worldToCell(this.x, this.y);
    const goal = maze.worldToCell(exitWorld[0], exitWorld[1]);

    if (this.pathCooldown <= 0 || !this.path.length || this.path[this.path.length - 1][0] !== goal[0] || this.path[this.path.length - 1][1] !== goal[1]) {
      this.path = this.findPath(current, goal, maze);
      this.pathCooldown = 0.3;
    }

    if (this.path.length < 2) {
      this.fastMove(dt, maze, exitWorld);
      return;
    }

    let nextIndex = 1;
    while (nextIndex < this.path.length && this.path[nextIndex][0] === current[0] && this.path[nextIndex][1] === current[1]) {
      nextIndex++;
    }

    if (nextIndex >= this.path.length) {
      this.fastMove(dt, maze, exitWorld);
      return;
    }

    const nextCell = this.path[nextIndex];
    const [targetWorldX, targetWorldY] = maze.getCellCenter(nextCell[0], nextCell[1]);
    const direction = normalizeVector(targetWorldX - this.x, targetWorldY - this.y);

    const targetX = this.x + direction.x * this.speed * step;
    const targetY = this.y + direction.y * this.speed * step;

    if (!this.collides(targetX, targetY, maze)) {
      this.x = targetX;
      this.y = targetY;
      return;
    }

    const attempts = [
      { x: direction.x, y: 0 },
      { x: 0, y: direction.y }
    ];

    for (const attempt of attempts) {
      const altX = this.x + attempt.x * this.speed * step;
      const altY = this.y + attempt.y * this.speed * step;
      if (!this.collides(altX, altY, maze)) {
        this.x = altX;
        this.y = altY;
        return;
      }
    }
  }

  update(dt, maze, exitWorld) {
    if (!exitWorld) return;

    // Choose move based on smartLevel
    switch(this.smartLevel) {
      case 3:
        this.smartMove(dt, maze, exitWorld);
        break;
      case 2:
        Math.random() < 0.7 ? this.smartMove(dt, maze, exitWorld) : this.balancedMove(dt, maze, exitWorld);
        break;
      case 1:
        Math.random() < 0.4 ? this.smartMove(dt, maze, exitWorld) : this.fastMove(dt, maze, exitWorld);
        break;
      default:
        this.fastMove(dt, maze, exitWorld);
        break;
    }
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