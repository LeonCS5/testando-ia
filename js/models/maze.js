export default class Maze {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.grid = [];
    this.openCells = [];
    this.generate();
  }

  generate() {
    this.grid = Array.from({ length: this.h }, () => Array(this.w).fill(1));
    const inBounds = (x, y) => x > 0 && x < this.w - 1 && y > 0 && y < this.h - 1;
    const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    const stack = [];
    let sx = 1;
    let sy = 1;
    this.grid[sy][sx] = 0;
    stack.push([sx, sy]);

    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = [];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (inBounds(nx, ny) && this.grid[ny][nx] === 1) {
          neighbors.push([nx, ny]);
        }
      }
      if (!neighbors.length) {
        stack.pop();
        continue;
      }
      const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
      const wallX = cx + (nx - cx) / 2;
      const wallY = cy + (ny - cy) / 2;
      this.grid[ny][nx] = 0;
      this.grid[wallY][wallX] = 0;
      stack.push([nx, ny]);
    }

    for (let i = 0; i < 35; i++) {
      const rx = 1 + 2 * Math.floor(Math.random() * ((this.w - 1) / 2));
      const ry = 1 + 2 * Math.floor(Math.random() * ((this.h - 1) / 2));
      this.grid[ry][rx] = 0;
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const wx = rx + dir[0];
      const wy = ry + dir[1];
      if (inBounds(wx, wy)) this.grid[wy][wx] = 0;
    }

    this.openCells = [];
    for (let y = 1; y < this.h; y += 2) {
      for (let x = 1; x < this.w; x += 2) {
        if (this.grid[y][x] === 0) this.openCells.push([x, y]);
      }
    }
  }

  randomOpenCell() {
    return this.openCells[Math.floor(Math.random() * this.openCells.length)] || [1, 1];
  }

  isWall(x, y) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gy < 0 || gy >= this.h || gx < 0 || gx >= this.w) return true;
    return this.grid[gy][gx] === 1;
  }
}
