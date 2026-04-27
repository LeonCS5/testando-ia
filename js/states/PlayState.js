// Estado de gameplay: orquestra entidades, reset de rodada e ponte para update/draw.
import Player from '../entities/Player.js';
import Juice from '../mechanics/Juice.js';
import EvasionBot from '../entities/EvasionBot.js';
import { BOT_ROSTER } from '../config/botRoster.js';
import {
  SPAWN_CORNERS,
  createMazeForMode,
  resolveCornerCell,
} from './play/modeUtils.js';
import { addRankingPoint } from './play/rankingStore.js';
import { normalizeMode } from '../config/gameModes.js';
import { updatePlayState } from './play/updateHandlers.js';
import { drawPlayState } from './play/renderHandlers.js';
import FrumbusEscafletado from '../entities/FrumbusEscafletado.js';
import JumpscareBot from '../entities/JumpscareBot.js';

export default class PlayState {
  constructor(game, config) {
    this.game = game;
    this.config = normalizeMode(config, config);
    this.seedCursor = Number.isFinite(config.seed) ? config.seed : Math.floor(Date.now() % 2147483647);

    this.maze = createMazeForMode(this.config, this.seedCursor);
    
    this.player = null;
    this.bots = [];
    this.exit = null;
    this.exitWorld = null;
    this.evasionObjective = null; // Para modo labirinto vivo
    this.frumbus = null; // Item mágico
    this.jumpscareBot = null; // Bot de jumpscare

    this.juice = new Juice();
    this.timer = this.config.time;
    this.levelComplete = false;
    this.winnerName = '';
    this.nextMatchCountdown = 0;
    this.beatCountdown = 1.0; // Começa tocando a cada 1 segundo
    this.online = Boolean(this.config.online);
    this.modeId = this.config.modeId || 'custom';
    this.isLiveMaze = Boolean(this.config.liveMaze);
    this.playerName = config.playerName || 'PLAYER';
    this.playerColor = config.playerColor || '#2ef98e';
  }

  nextMazeSeed() {
    const next = this.seedCursor >>> 0;
    this.seedCursor = (this.seedCursor + 1) >>> 0;
    return next;
  }

  random() {
    if (this.maze && typeof this.maze.nextRandom === 'function') return this.maze.nextRandom();
    if (this.maze && typeof this.maze.random === 'function') return this.maze.random();
    return Math.random();
  }

  addRankingPoints(name, points = 1) {
    if (!this.online) return;
    addRankingPoint(name, points);
  }

  onEnter() {
    this.reset();
  }

  onResize() {
    this.maze.setLayout(this.game.width, this.game.height);
    if (!this.isLiveMaze && this.exit) {
      this.exitWorld = this.maze.getCellCenter(this.exit[0], this.exit[1]);
    }
  }

  reset() {
    this.maze.generate(this.nextMazeSeed());
    this.maze.setLayout(this.game.width, this.game.height);
    this.placeEntities();
    this.timer = this.config.time;
    this.levelComplete = false;
    this.winnerName = '';
    this.nextMatchCountdown = 0;
    this.game.audio.shuffleTrack();
  }

  placeEntities() {
    const [exitCellX, exitCellY] = this.findCentralOpenCell();
    this.exit = [exitCellX, exitCellY];
    
    // Em modo labirinto vivo, objetivo é um bot que foge e tem item mágico
    if (this.isLiveMaze) {
      const [exitX, exitY] = this.maze.getCellCenter(exitCellX, exitCellY);
      this.evasionObjective = new EvasionBot(exitX, exitY, {
        maze: this.maze,
        random: () => this.random(),
      });
      this.frumbus = new FrumbusEscafletado(this.maze, () => this.random());
    } else {
      this.exitWorld = this.maze.getCellCenter(exitCellX, exitCellY);
    }

    const corner = SPAWN_CORNERS[Math.floor(this.random() * SPAWN_CORNERS.length)];
    const [cornerX, cornerY] = resolveCornerCell(this.maze, corner);
    
    // Spawn do JumpscareBot (1 por mapa, para não ser irritante demais)
    const [scareXCell, scareYCell] = this.maze.randomOpenCell();
    const [scareX, scareY] = this.maze.getCellCenter(scareXCell, scareYCell);
    this.jumpscareBot = new JumpscareBot(scareX, scareY, { maze: this.maze });

    const [startCellX, startCellY] = this.maze.getClosestOpenCell(cornerX, cornerY, new Set([`${exitCellX},${exitCellY}`]));
    const [startX, startY] = this.maze.getCellCenter(startCellX, startCellY);

    // Cria o player na célula inicial
    this.player = new Player(startX, startY, this.maze, {
      color: this.playerColor,
      name: this.playerName,
    });

    this.bots = this.createBots(startX, startY);
  }

  createBots(startX, startY) {
    return BOT_ROSTER.map((BotClass) => {
      return new BotClass(startX, startY, {
        maze: this.maze,
        random: () => this.random(),
      });
    });
  }

  findCentralOpenCell() {
    const centerX = Math.floor(this.maze.width / 2);
    const centerY = Math.floor(this.maze.height / 2);
    if (!this.maze.grid[centerY][centerX]) {
      return [centerX, centerY];
    }
    return this.maze.getClosestOpenCell(centerX, centerY);
  }

  update(dt, input) {
    updatePlayState(this, dt, input);
  }

  draw(ctx, timestamp) {
    drawPlayState(this, ctx, timestamp);
  }
}
