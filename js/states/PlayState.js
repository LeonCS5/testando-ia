import Maze from '../entities/Maze.js';
import Player from '../entities/Player.js';
import Juice from '../mechanics/Juice.js';
import MenuState from './MenuState.js';
import LiveMaze from '../entities/LiveMaze.js';
import { BOT_ROSTER } from '../config/botRoster.js';

export default class PlayState {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.seedCursor = Number.isFinite(config.seed) ? config.seed : Math.floor(Date.now() % 2147483647);

    const resolvedModeId = config.modeId || 'custom';
    const resolvedIsLiveMaze = Boolean(config.liveMaze || resolvedModeId === 'live-maze' || config.label === 'Labirinto Vivo');

    // Usa LiveMaze se liveMaze estiver ativo, senão usa Maze normal
    const MazeClass = resolvedIsLiveMaze ? LiveMaze : Maze;
    this.maze = new MazeClass(config.width, config.height, { seed: this.seedCursor });
    
    this.player = null;
    this.bots = [];
    this.exit = null;
    this.exitWorld = null;
    this.juice = new Juice();
    this.timer = config.time;
    this.levelComplete = false;
    this.winnerName = '';
    this.nextMatchCountdown = 0;
    this.beatCountdown = 1.0; // Começa tocando a cada 1 segundo
    this.online = Boolean(config.online);
    this.modeId = resolvedModeId;
    this.isLiveMaze = resolvedIsLiveMaze;
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
    const ranking = JSON.parse(localStorage.getItem('botRanking') || '{}');
    ranking[name] = (ranking[name] || 0) + points;
    localStorage.setItem('botRanking', JSON.stringify(ranking));
  }

  onEnter() {
    this.reset();
  }

  onResize() {
    this.maze.setLayout(this.game.width, this.game.height);
    if (this.exit) {
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
    this.exitWorld = this.maze.getCellCenter(exitCellX, exitCellY);

    // Spawn único para todos em um canto aleatório
    const corners = [
      { x: 1, y: 1 },
      { x: this.maze.width - 2, y: 1 },
      { x: 1, y: this.maze.height - 2 },
      { x: this.maze.width - 2, y: this.maze.height - 2 },
    ];
    const corner = corners[Math.floor(this.random() * corners.length)];
    const [startCellX, startCellY] = this.maze.getClosestOpenCell(corner.x, corner.y, new Set([`${exitCellX},${exitCellY}`]));
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

  updateLiveMaze(dt) {
    if (!this.isLiveMaze || typeof this.maze.update !== 'function') return;
    this.maze.update(dt);
  }

  applyLiveMazePush(entity, dt, allowShake = false) {
    if (!this.isLiveMaze || typeof this.maze.getPushVectorFromWall !== 'function') return;

    const push = this.maze.getPushVectorFromWall(entity.x, entity.y);
    if (push.strength <= 0) return;

    entity.x += push.x * dt * 0.25;
    entity.y += push.y * dt * 0.25;

    if (allowShake && push.strength > 1) {
      this.juice.localShake(0.3, push.strength * 1.5);
    }
  }

  updateBots(dt) {
    if (!this.online) return;

    this.bots.forEach((bot) => {
      bot.update(dt, this.maze, this.exitWorld, this.bots);
      this.applyLiveMazePush(bot, dt, false);
    });
  }

  handleInput(input) {
    if (input.escape) {
      this.game.changeState(new MenuState(this.game));
      return true;
    }

    if (input.retry) {
      this.reset();
      return true;
    }

    return false;
  }

  updateBeat(dt) {
    this.beatCountdown -= dt;
    if (this.beatCountdown > 0) return;

    const timeRatio = Math.max(0, this.timer / this.config.time);
    const tension = 1 - timeRatio;
    this.game.audio.playBeat(tension);

    let nextDelay = 0.1;
    const track = this.game.audio.currentTrack;
    if (track === 'cyberpunk') {
      nextDelay = 0.12 + (timeRatio * 0.10);
    } else if (track === 'metal') {
      nextDelay = 0.15 + (timeRatio * 0.10);
    } else if (track === 'arcade') {
      nextDelay = 0.20 + (timeRatio * 0.15);
    }
    this.beatCountdown = nextDelay;
  }

  checkWinner() {
    const [exitX, exitY] = this.exitWorld;
    const playerDistance = Math.hypot(exitX - this.player.x, exitY - this.player.y);

    if (playerDistance < this.player.size * 0.8) {
      this.levelComplete = true;
      this.winnerName = this.player.name;
      this.nextMatchCountdown = 3;
      this.juice.localShake(0.5, 1);
      this.game.audio.playerWin();
      if (this.online) this.addRankingPoints(this.player.name);
      return true;
    }

    if (!this.online) return false;
    for (const bot of this.bots) {
      const botDistance = Math.hypot(exitX - bot.x, exitY - bot.y);
      if (botDistance < bot.size * 0.8) {
        this.levelComplete = true;
        this.winnerName = bot.name;
        this.nextMatchCountdown = 3;
        this.juice.localShake(0.5, 1);
        this.game.audio.botWin();
        this.addRankingPoints(bot.name);
        return true;
      }
    }

    return false;
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
    if (this.handleInput(input)) {
      return;
    }

    if (this.levelComplete) {
      this.nextMatchCountdown = Math.max(0, this.nextMatchCountdown - dt);
      if (this.nextMatchCountdown <= 0) {
        this.reset();
      }
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this.juice.triggerGlitch();
      this.game.audio.timeOut();
      this.reset();
      return;
    }

    this.juice.update(dt);
    this.updateBeat(dt);

    this.updateLiveMaze(dt);
    this.player.update(dt, input, this.maze, this.juice, this.game.audio);

    this.applyLiveMazePush(this.player, dt, true);
    this.updateBots(dt);

    this.checkWinner();
  }

  draw(ctx, timestamp) {
    ctx.save();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, this.game.width, this.game.height);
    ctx.save();
    this.juice.applyScreenShake(ctx);
    this.maze.draw(ctx);
    this.drawExit(ctx, timestamp);
    this.player.draw(ctx);
    if (this.online) {
      this.bots.forEach((bot) => bot.draw(ctx));
    }
    this.juice.drawParticles(ctx);
    ctx.restore();
    this.juice.drawGlitch(ctx, this.game.width, this.game.height);
    this.drawHud(ctx);
    ctx.restore();
  }

  drawExit(ctx, timestamp) {
    if (!this.exitWorld) return;
    const [x, y] = this.exitWorld;
    const pulse = (Math.sin(timestamp * 0.01) + 1) / 2;
    const size = 10 + pulse * 10;
    const alpha = 0.6 + pulse * 0.3;
    ctx.strokeStyle = `rgba(255,0,214,${0.35 + pulse * 0.35})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,0,214,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHud(ctx) {
    ctx.fillStyle = '#d6b3ff';
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Time: ${this.timer.toFixed(1)}s`, 14, this.game.height - 24);
    
    // Mostra "Labirinto Vivo" se ativo
    if (this.isLiveMaze) {
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 18px Segoe UI';
      ctx.fillText('⚡ LABIRINTO VIVO ⚡', 14, 40);
      ctx.fillStyle = '#d6b3ff';
      ctx.font = '16px Segoe UI';
    }
    
    ctx.fillText(`Maze regenerates in: ${Math.max(0, this.timer).toFixed(1)}s`, 14, this.game.height - 44);
    ctx.fillText('Press ESC for menu, R to restart', 14, this.game.height - 64);

    if (this.online) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Player: ${this.player.name}`, 14, this.game.height - 84);
      
        // Exibir ranking
        const ranking = JSON.parse(localStorage.getItem('botRanking') || '{}');
        const rankingEntries = Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 5);
        ctx.fillStyle = '#00ffcc';
        ctx.fillText('RANKING:', this.game.width - 200, 30);
        ctx.fillStyle = '#d6b3ff';
        ctx.font = '12px Segoe UI';
        rankingEntries.forEach((entry, idx) => {
          ctx.fillText(`${idx + 1}. ${entry[0]}: ${entry[1]}`, this.game.width - 200, 50 + idx * 18);
        });
        ctx.font = '16px Segoe UI';
    }

    if (this.levelComplete) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px Segoe UI';
      ctx.fillStyle = '#00ffcc';
      ctx.fillText(this.winnerName ? `${this.winnerName} won!` : 'Level Complete!', this.game.width / 2, this.game.height / 2);
      ctx.font = '16px Segoe UI';
      ctx.fillText(`Next match in ${this.nextMatchCountdown.toFixed(1)}s`, this.game.width / 2, this.game.height / 2 + 32);
      ctx.textAlign = 'left';
    }
  }
}
