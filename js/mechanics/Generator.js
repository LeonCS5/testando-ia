// Algoritmos de geracao procedural do labirinto e random com seed.
export function createSeededRandom(seed = Date.now()) {
  let value = (seed >>> 0) || 1;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMaze(width, height, seed = Date.now()) {
  const random = createSeededRandom(seed);
  const grid = Array.from({ length: height }, () => Array(width).fill(1));
  const inBounds = (x, y) => x > 0 && x < width - 1 && y > 0 && y < height - 1;
  const directions = [
    [0, -2],
    [2, 0],
    [0, 2],
    [-2, 0],
  ];

  const stack = [[1, 1]];
  grid[1][1] = 0;

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = [];

    for (const [dx, dy] of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (inBounds(nx, ny) && grid[ny][nx] === 1) {
        neighbors.push([nx, ny]);
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const [nx, ny] = neighbors[Math.floor(random() * neighbors.length)];
    grid[ny][nx] = 0;
    grid[cy + (ny - cy) / 2][cx + (nx - cx) / 2] = 0;
    stack.push([nx, ny]);
  }

  for (let i = 0; i < 35; i += 1) {
    const rx = 1 + 2 * Math.floor(random() * ((width - 1) / 2));
    const ry = 1 + 2 * Math.floor(random() * ((height - 1) / 2));
    grid[ry][rx] = 0;
    const dir = directions[Math.floor(random() * directions.length)];
    const wx = rx + dir[0];
    const wy = ry + dir[1];
    if (inBounds(wx, wy)) grid[wy][wx] = 0;
  }

    // Adicionar mais caminhos adicionais para mais rotas até o centro
    for (let i = 0; i < 60; i += 1) {
      const rx = 1 + 2 * Math.floor(random() * ((width - 1) / 2));
      const ry = 1 + 2 * Math.floor(random() * ((height - 1) / 2));
      const randomDirs = [...directions].sort(() => random() - 0.5);
      for (const [dx, dy] of randomDirs) {
        const wx = rx + dx;
        const wy = ry + dy;
        if (inBounds(wx, wy)) {
          grid[wy][wx] = 0;
          break;
        }
      }
    }

  const openCells = [];
  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      if (grid[y][x] === 0) {
        openCells.push([x, y]);
      }
    }
  }

  return { grid, openCells, seed };
}
