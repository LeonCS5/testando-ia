import { TILE_SIZE } from '../constants.js';
import { generateMaze } from '../mechanics/Generator.js';

export default class Maze {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.originX = 0;
    this.originY = 0;
    this.grid = [];
    this.openCells = [];
    this.generate();
  }

  generate() {
    const result = generateMaze(this.width, this.height);
    this.grid = result.grid;
    this.openCells = result.openCells;
  }

  setLayout(screenWidth, screenHeight) {
    const totalWidth = this.width * TILE_SIZE;
    const totalHeight = this.height * TILE_SIZE;
    this.originX = (screenWidth - totalWidth) / 2;
    this.originY = (screenHeight - totalHeight) / 2;
  }

  draw(ctx) {
    const tileScale = TILE_SIZE;
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
    return this.openCells[Math.floor(Math.random() * this.openCells.length)] || [1, 1];
  }

  randomOpenCellExcluding(exclude = new Set()) {
    const choices = this.openCells.filter((cell) => !exclude.has(`${cell[0]},${cell[1]}`));
    if (choices.length === 0) return this.randomOpenCell();
    return choices[Math.floor(Math.random() * choices.length)];
  }

  getCellCenter(cellX, cellY) {
    return [this.originX + cellX * TILE_SIZE + TILE_SIZE / 2, this.originY + cellY * TILE_SIZE + TILE_SIZE / 2];
  }

  isWallAtWorld(x, y) {
    const gridX = Math.floor((x - this.originX) / TILE_SIZE);
    const gridY = Math.floor((y - this.originY) / TILE_SIZE);
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
    const cellX = Math.floor((x - this.originX) / TILE_SIZE);
    const cellY = Math.floor((y - this.originY) / TILE_SIZE);
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
}
