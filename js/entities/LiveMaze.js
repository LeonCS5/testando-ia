// Variante de Maze com paredes moveis e empurrao para criar o modo labirinto vivo.
import Maze from './Maze.js';

/**
 * LiveMaze - Labirinto com paredes que se movem
 * As paredes se deslocam em tempo real, empurrando jogadores e bots
 */
export default class LiveMaze extends Maze {
  constructor(width, height, options = {}) {
    super(width, height, options);
    this.liveConfig = {
      stepInterval: Number.isFinite(options.liveStepInterval) ? options.liveStepInterval : 0.52,
      regroupInterval: Number.isFinite(options.liveRegroupInterval) ? options.liveRegroupInterval : 7.0,
      mobileWallRatio: Number.isFinite(options.mobileWallRatio) ? options.mobileWallRatio : 0.12,
      maxGroupSize: Number.isFinite(options.maxGroupSize) ? options.maxGroupSize : 5,
      pushForce: 8,
      pushMultiplier: Number.isFinite(options.pushMultiplier) ? options.pushMultiplier : 1,
      widenChance: Number.isFinite(options.widenChance) ? options.widenChance : 0.42,
    };
    this.stepTimer = 0;
    this.regroupTimer = 0;
    this.movementCount = 0;
    this.mobileWallKeys = new Set();
    this.wallGroups = [];
    this.protectedCells = new Set();
    this.enforceOuterWalls();
    this.widenCorridors();
    this.initializeWallGroups();
    this.updateOpenCellsList();
  }

  generate(seed = this.seed) {
    super.generate(seed);
    this.enforceOuterWalls();

    // Durante super(), generate pode ser chamado antes de inicializar campos do LiveMaze
    if (!this.liveConfig || !this.mobileWallKeys || !this.wallGroups) {
      this.updateOpenCellsList();
      return;
    }

    this.widenCorridors();
    this.initializeWallGroups();
    this.updateOpenCellsList();
  }

  cellKey(x, y) {
    return `${x},${y}`;
  }

  isBorderCell(x, y) {
    return x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1;
  }

  isProtectedCell(x, y) {
    return this.protectedCells.has(this.cellKey(x, y));
  }

  setProtectedCells(cells = []) {
    this.protectedCells.clear();
    for (const cell of cells) {
      if (!Array.isArray(cell) || cell.length < 2) continue;
      const [x, y] = cell;
      if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) continue;
      this.protectedCells.add(this.cellKey(x, y));
      this.grid[y][x] = 0;
    }

    // Remove mobile walls from protected area and refresh grouping.
    for (const key of [...this.mobileWallKeys]) {
      if (this.protectedCells.has(key)) {
        this.mobileWallKeys.delete(key);
      }
    }

    this.regroupWalls();
    this.updateOpenCellsList();
  }

  enforceOuterWalls() {
    for (let x = 0; x < this.width; x++) {
      this.grid[0][x] = 1;
      this.grid[this.height - 1][x] = 1;
    }
    for (let y = 0; y < this.height; y++) {
      this.grid[y][0] = 1;
      this.grid[y][this.width - 1] = 1;
    }
  }

  update(dt) {
    this.stepTimer += dt;
    this.regroupTimer += dt;

    if (this.regroupTimer >= this.liveConfig.regroupInterval) {
      this.regroupTimer = 0;
      this.regroupWalls();
    }

    while (this.stepTimer >= this.liveConfig.stepInterval) {
      this.stepTimer -= this.liveConfig.stepInterval;
      this.moveWallGroupsStep();
      this.movementCount++;
    }
  }

  randomDir() {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return dirs[Math.floor(this.random() * dirs.length)];
  }

  widenCorridors() {
    const widenChance = this.liveConfig?.widenChance ?? 0.35;

    // Abre passagens adicionais para o modo vivo ficar jogavel
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] !== 1) continue;

        const neighbors = [
          this.grid[y - 1][x],
          this.grid[y + 1][x],
          this.grid[y][x - 1],
          this.grid[y][x + 1],
        ];
        const openCount = neighbors.filter((value) => value === 0).length;
        const oppositeOpen =
          (this.grid[y - 1][x] === 0 && this.grid[y + 1][x] === 0) ||
          (this.grid[y][x - 1] === 0 && this.grid[y][x + 1] === 0);

        if ((openCount >= 3 || oppositeOpen) && this.random() < widenChance) {
          this.grid[y][x] = 0;
        }
      }
    }
  }

  initializeWallGroups() {
    const mobileWallRatio = this.liveConfig?.mobileWallRatio ?? 0.18;

    this.mobileWallKeys.clear();
    this.wallGroups = [];

    const interiorWalls = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] === 1 && !this.isProtectedCell(x, y)) interiorWalls.push([x, y]);
      }
    }

    const maxMobile = Math.max(8, Math.floor(interiorWalls.length * mobileWallRatio));
    const picked = this.pickRandomCells(interiorWalls, maxMobile);

    for (const [x, y] of picked) {
      this.mobileWallKeys.add(`${x},${y}`);
    }

    this.regroupWalls();
  }

  pickRandomCells(cells, count) {
    const pool = [...cells];
    const result = [];
    const limit = Math.min(count, pool.length);
    for (let i = 0; i < limit; i++) {
      const idx = Math.floor(this.random() * pool.length);
      result.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return result;
  }

  regroupWalls() {
    const maxGroupSize = this.liveConfig?.maxGroupSize ?? 6;

    const allMobileCells = [...this.mobileWallKeys].map((key) => key.split(',').map(Number));
    const remaining = [...allMobileCells];
    const groups = [];

    while (remaining.length > 0) {
      const seedIdx = Math.floor(this.random() * remaining.length);
      const seed = remaining.splice(seedIdx, 1)[0];
      const groupCells = [seed];

      while (groupCells.length < maxGroupSize && remaining.length > 0) {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const [rx, ry] = remaining[i];
          let localBest = Infinity;
          for (const [gx, gy] of groupCells) {
            const d = Math.abs(rx - gx) + Math.abs(ry - gy);
            if (d < localBest) localBest = d;
          }
          if (localBest < bestDist) {
            bestDist = localBest;
            bestIdx = i;
          }
        }

        if (bestIdx < 0 || bestDist > 4) break;
        groupCells.push(remaining.splice(bestIdx, 1)[0]);
      }

      groups.push({
        cells: groupCells,
        dir: this.randomDir(),
      });
    }

    this.wallGroups = groups;
  }

  canMoveGroup(group, dx, dy) {
    const own = new Set(group.cells.map(([x, y]) => `${x},${y}`));

    for (const [x, y] of group.cells) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) return false;
      if (this.isBorderCell(nx, ny)) return false;
      if (this.isProtectedCell(nx, ny)) return false;

      const targetKey = `${nx},${ny}`;
      if (this.grid[ny][nx] === 1 && !own.has(targetKey)) return false;
    }

    return true;
  }

  moveGroup(group, dx, dy) {
    for (const [x, y] of group.cells) {
      this.grid[y][x] = 0;
    }

    for (let i = 0; i < group.cells.length; i++) {
      const [x, y] = group.cells[i];
      const nx = x + dx;
      const ny = y + dy;
      group.cells[i] = [nx, ny];
      this.grid[ny][nx] = 1;
    }
  }

  moveWallGroupsStep() {
    this.enforceOuterWalls();
    if (this.wallGroups.length === 0) return;

    for (const group of this.wallGroups) {
      const [dx, dy] = group.dir;
      if (this.canMoveGroup(group, dx, dy)) {
        this.moveGroup(group, dx, dy);
        continue;
      }

      // Se travou, tenta nova direção para manter o movimento vivo
      let moved = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        const nextDir = this.randomDir();
        const [adx, ady] = nextDir;
        if (!this.canMoveGroup(group, adx, ady)) continue;
        group.dir = nextDir;
        this.moveGroup(group, adx, ady);
        moved = true;
        break;
      }

      // Se ficou encurralado, deixa direção pronta para proxima tentativa
      if (!moved) {
        group.dir = this.randomDir();
      }
    }

    // Reconstroi chaves para futuro regroup
    this.mobileWallKeys.clear();
    for (const group of this.wallGroups) {
      for (const [x, y] of group.cells) {
        this.mobileWallKeys.add(`${x},${y}`);
      }
    }

    this.updateOpenCellsList();
  }

  updateOpenCellsList() {
    this.openCells = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 0) {
          this.openCells.push([x, y]);
        }
      }
    }
  }

  // Retorna empurrão apenas em contato real com parede (proximidade curta)
  getPushVectorFromWall(worldX, worldY, entitySize = this.tileSize * 0.45) {
    const half = entitySize / 2;
    const probe = Math.max(1.2, this.tileSize * 0.08);
    const samples = [
      { x: worldX, y: worldY - half - probe, dx: 0, dy: 1 },
      { x: worldX, y: worldY + half + probe, dx: 0, dy: -1 },
      { x: worldX - half - probe, y: worldY, dx: 1, dy: 0 },
      { x: worldX + half + probe, y: worldY, dx: -1, dy: 0 },
    ];

    let pushX = 0;
    let pushY = 0;
    let touchCount = 0;

    for (const sample of samples) {
      if (!this.isWallAtWorld(sample.x, sample.y)) continue;
      touchCount += 1;
      const force = this.liveConfig.pushForce * this.liveConfig.pushMultiplier;
      pushX += sample.dx * force;
      pushY += sample.dy * force;
    }

    return { x: pushX, y: pushY, strength: touchCount };
  }

  draw(ctx) {
    const tileScale = this.tileSize;
    const now = Date.now();
    
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.grid[y][x] === 1) {
          // Animação de pulsação mais agressiva
          const pulse = (Math.sin(now * 0.008 + (x + y) * 0.1) + 1) / 2;
          const intensity = (0.4 + (pulse * 0.35)) * (0.3 + ((x + y) % 2) * 0.2);
          
          // Cores mais vibrantes - roxo/magenta para marcar movimento
          const hue = 270 + pulse * 30; // Roxo a magenta
          ctx.fillStyle = `hsla(${hue}, 100%, ${40 + pulse * 20}%, ${intensity})`;
          ctx.fillRect(this.originX + x * tileScale, this.originY + y * tileScale, tileScale, tileScale);

          // Borda pulsante bem visível
          ctx.strokeStyle = `rgba(${200 + pulse * 55}, 100, ${255}, ${pulse * 0.7})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(this.originX + x * tileScale, this.originY + y * tileScale, tileScale, tileScale);
        }
      }
    }
  }
}