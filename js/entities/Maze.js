// Entidade de labirinto estatico: gera grade, layout na tela e consultas de colisao.
import { TILE_SIZE } from '../constants.js';
import { createSeededRandom, generateMaze } from '../mechanics/Generator.js';
import { MAZE_TUNING } from '../config/gameModes.js';

export default class Maze {
  constructor(width, height, options = {}) {
    this.tileSize = TILE_SIZE;
    this.width = width;
    this.height = height;
    this.openingFactor = Number.isFinite(options.openingFactor) ? options.openingFactor : 1;
    this.seed = Number.isFinite(options.seed) ? options.seed : Math.floor(Date.now() % 2147483647);
    this.rng = createSeededRandom(this.seed);
    this.originX = 0;
    this.originY = 0;
    this.grid = [];
    this.openCells = [];
    this.generate();
  }

  generate(seed = this.seed) {
    if (Number.isFinite(seed)) {
      this.seed = seed;
    }
    const result = generateMaze(this.width, this.height, this.seed, {
      openingFactor: this.openingFactor,
    });
    this.grid = result.grid;
    this.openCells = result.openCells;
    this.rng = createSeededRandom(this.seed + 1337);
  }

  nextRandom() {
    return this.rng();
  }

  // Backward-compatible alias used by existing states/entities.
  random() {
    return this.nextRandom();
  }

setLayout(screenWidth, screenHeight) {
  // 🔥 calcula tile dinamicamente baseado no tamanho REAL do mapa
  this.tileSize = Math.min(
    screenWidth / this.width,
    screenHeight / this.height
  );

  const totalWidth = this.width * this.tileSize;
  const totalHeight = this.height * this.tileSize;

  this.originX = (screenWidth - totalWidth) / 2;
  this.originY = (screenHeight - totalHeight) / 2;
}

  draw(ctx) {
    const tileScale = this.tileSize;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.grid[y][x] === 1) {
          const intensity = 0.3 + ((x + y) % 2) * 0.1;
          ctx.fillStyle = `rgba(38, 122, 255, ${intensity})`;
          ctx.fillRect(this.originX + x * tileScale, this.originY + y * tileScale, tileScale, tileScale);
        }
      }
    }
  }

  randomOpenCell() {
    return this.openCells[Math.floor(this.nextRandom() * this.openCells.length)] || [1, 1];
  }

  randomOpenCellExcluding(exclude = new Set()) {
    const choices = this.openCells.filter((cell) => !exclude.has(`${cell[0]},${cell[1]}`));
    if (choices.length === 0) return this.randomOpenCell();
    return choices[Math.floor(this.nextRandom() * choices.length)];
  }

  getCellCenter(cellX, cellY) {
    return [this.originX + cellX * this.tileSize + this.tileSize / 2, this.originY + cellY * this.tileSize + this.tileSize / 2];
  }

  isWallAtWorld(x, y) {
    const gridX = Math.floor((x - this.originX) / this.tileSize);
    const gridY = Math.floor((y - this.originY) / this.tileSize);
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return true;
    }
    return this.grid[gridY][gridX] === 1;
  }

  isWallCell(cellX, cellY) {
    if (cellX < 0 || cellX >= this.width || cellY < 0 || cellY >= this.height) return true;
    return this.grid[cellY][cellX] === 1;
  }

  worldToCell(x, y) {
    const cellX = Math.floor((x - this.originX) / this.tileSize);
    const cellY = Math.floor((y - this.originY) / this.tileSize);
    return [cellX, cellY];
  }

  getClosestOpenCell(cx, cy, exclude = new Set()) {
    return this.openCells.reduce((best, cell) => {
      const key = `${cell[0]},${cell[1]}`;
      if (exclude.has(key)) return best;
      const dx = cell[0] - cx;
      const dy = cell[1] - cy;
      const dist = dx * dx + dy * dy;
      if (!best || dist < best.dist) {
        return { cell, dist };
      }
      return best;
    }, null).cell;
  }

  updateOpenCellsList() {
    this.openCells = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.grid[y][x] === 0) this.openCells.push([x, y]);
      }
    }
  }

  findPath(start, goal, blockedKeys = null) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const queue = [start];
    const startKey = `${start[0]},${start[1]}`;
    const goalKey = `${goal[0]},${goal[1]}`;
    const visited = new Set([startKey]);
    const cameFrom = new Map();
    
    // Converte single string para Set por retrocompatibilidade
    const blocks = typeof blockedKeys === 'string' ? new Set([blockedKeys]) : (blockedKeys || new Set());

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const currentKey = `${cx},${cy}`;
      if (currentKey === goalKey) {
        const path = [];
        let walk = goalKey;
        while (walk) {
          const [px, py] = walk.split(',').map(Number);
          path.unshift([px, py]);
          walk = cameFrom.get(walk);
        }
        return path;
      }

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (blocks.has(key) && key !== goalKey && key !== startKey) continue;
        if (this.isWallCell(nx, ny) || visited.has(key)) continue;
        visited.add(key);
        cameFrom.set(key, currentKey);
        queue.push([nx, ny]);
      }
    }

    return [];
  }

  hasAlternativeLongerPath(start, goal, shortestLength) {
    const shortest = this.findPath(start, goal);
    if (shortest.length === 0) return false;

    for (let i = MAZE_TUNING.dualRoutePathProbeStride; i < shortest.length - MAZE_TUNING.dualRoutePathProbeStride; i += MAZE_TUNING.dualRoutePathProbeStride) {
      const blocked = `${shortest[i][0]},${shortest[i][1]}`;
      const alternative = this.findPath(start, goal, blocked);
      if (alternative.length >= shortestLength + MAZE_TUNING.dualRouteMinExtraSteps) return true;
    }

    return false;
  }

  carveRandomWallBetweenOpenCells() {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const candidates = [];

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        if (this.grid[y][x] !== 1) continue;
        let openNeighbors = 0;
        for (const [dx, dy] of dirs) {
          if (!this.isWallCell(x + dx, y + dy)) openNeighbors += 1;
        }
        if (openNeighbors >= 2) candidates.push([x, y]);
      }
    }

    if (candidates.length === 0) return false;
    const [cx, cy] = candidates[Math.floor(this.nextRandom() * candidates.length)];
    this.grid[cy][cx] = 0;
    return true;
  }

  ensureDualRoutes(start, goal) {
    if (!Array.isArray(start) || !Array.isArray(goal)) return;
    if (this.isWallCell(start[0], start[1]) || this.isWallCell(goal[0], goal[1])) return;

    const shortest = this.findPath(start, goal);
    if (shortest.length === 0) return;

    const shortestLength = shortest.length;
    if (this.hasAlternativeLongerPath(start, goal, shortestLength)) return;

    for (let attempt = 0; attempt < MAZE_TUNING.dualRouteMaxCarveAttempts; attempt += 1) {
      const carved = this.carveRandomWallBetweenOpenCells();
      if (!carved) break;
      if (this.hasAlternativeLongerPath(start, goal, shortestLength)) {
        this.updateOpenCellsList();
        return;
      }
    }

    this.updateOpenCellsList();
  }
}
