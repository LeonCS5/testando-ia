import Maze from '../models/maze.js';
import Player from '../models/player.js';
import Exit from '../models/exit.js';
import EffectManager from '../services/effectManager.js';
import { CELL_W, CELL_H, TILE_SIZE } from '../constants.js';

export default class GameModel {
  constructor() {
    this.maze = new Maze(CELL_W, CELL_H);
    this.effects = new EffectManager();
    this.player = null;
    this.exitTarget = null;
    this.score = 0;
    this.bestScore = 0;
    this.regenTimer = 15;
    this.levelCompleteTimer = 0;
    this.gameState = 'menu';
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.placeEntities();
  }

  updateScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  worldPosForCell(cx, cy) {
    const totalW = this.maze.w * TILE_SIZE;
    const totalH = this.maze.h * TILE_SIZE;
    const baseX = (this.screenWidth - totalW) / 2;
    const baseY = (this.screenHeight - totalH) / 2;
    return [baseX + cx * TILE_SIZE + TILE_SIZE / 2, baseY + cy * TILE_SIZE + TILE_SIZE / 2];
  }

  getCellCoord(x, y) {
    const totalW = this.maze.w * TILE_SIZE;
    const totalH = this.maze.h * TILE_SIZE;
    const baseX = (this.screenWidth - totalW) / 2;
    const baseY = (this.screenHeight - totalH) / 2;
    return [Math.floor((x - baseX) / TILE_SIZE), Math.floor((y - baseY) / TILE_SIZE)];
  }

  setPlayerToRandomOpenCell() {
    const [rx, ry] = this.maze.randomOpenCell();
    const [wx, wy] = this.worldPosForCell(rx, ry);
    this.player.x = wx;
    this.player.y = wy;
    this.player.wallHitCooldown = 0;
  }

  ensurePlayerInsideOpenCell() {
    if (!this.player) return;
    const [cellx, celly] = this.getCellCoord(this.player.x, this.player.y);
    if (this.maze.isWall(cellx, celly)) {
      this.setPlayerToRandomOpenCell();
    }
  }

  placeEntities() {
    const [px, py] = this.maze.randomOpenCell();
    const [wx, wy] = this.worldPosForCell(px, py);
    this.player = new Player(wx, wy);

    let ex, ey;
    let tries = 0;
    do {
      [ex, ey] = this.maze.randomOpenCell();
      const [exW, eyW] = this.worldPosForCell(ex, ey);
      if (Math.hypot(exW - wx, eyW - wy) > TILE_SIZE * 10 || tries > 30) break;
      tries++;
    } while (true);

    const [exitX, exitY] = this.worldPosForCell(ex, ey);
    this.exitTarget = new Exit(exitX, exitY);
    this.ensurePlayerInsideOpenCell();
  }

  regenerateMaze(sounds) {
    this.maze.generate();
    this.ensurePlayerInsideOpenCell();

    let ex, ey;
    let tries = 0;
    do {
      [ex, ey] = this.maze.randomOpenCell();
      const [exW, eyW] = this.worldPosForCell(ex, ey);
      if (Math.hypot(exW - this.player.x, eyW - this.player.y) > TILE_SIZE * 8 || tries > 50) break;
      tries++;
    } while (true);

    const [exitX, exitY] = this.worldPosForCell(ex, ey);
    this.exitTarget = new Exit(exitX, exitY);
    this.effects.triggerGlitch();
    sounds.mazeRegenerate();
    this.regenTimer = 15;
  }

  resetRound() {
    this.score = 0;
    this.regenTimer = 15;
    this.placeEntities();
  }

  update(dt, input, sounds) {
    if (this.gameState === 'menu') {
      if (input.enter) {
        this.resetRound();
        this.gameState = 'playing';
        sounds.playTone(440, 0.1, 'sine', 0.2);
      }
      return;
    }

    if (this.gameState === 'levelComplete') {
      if (input.retry) {
        this.resetRound();
        this.gameState = 'playing';
      }
      this.levelCompleteTimer -= dt;
      if (this.levelCompleteTimer <= 0) {
        this.regenerateMaze(sounds);
        this.gameState = 'playing';
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    this.ensurePlayerInsideOpenCell();
    if (input.escape) this.gameState = 'menu';
    if (input.retry) {
      this.resetRound();
      sounds.playTone(330, 0.1, 'square', 0.2);
    }

    this.regenTimer -= dt;
    if (this.regenTimer <= 0) this.regenerateMaze(sounds);

    this.effects.update(dt);
    this.player.update(dt, this.maze, input, this.effects, this.getCellCoord.bind(this));
    this.effects.consumeSoundRequest(sounds);

    const [pcx, pcy] = this.getCellCoord(this.player.x, this.player.y);
    const [ecx, ecy] = this.getCellCoord(this.exitTarget.x, this.exitTarget.y);
    if (pcx === ecx && pcy === ecy) {
      this.score += 1;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.effects.localShake(0.5, 1);
      sounds.levelComplete();
      this.gameState = 'levelComplete';
      this.levelCompleteTimer = 1.0;
    }
  }
}
