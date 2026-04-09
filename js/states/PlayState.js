import Maze from '../entities/Maze.js';
import Player from '../entities/Player.js';
import Bot from '../entities/Bot.js';
import Juice from '../mechanics/Juice.js';
import MenuState from './MenuState.js';

export default class PlayState {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.maze = new Maze(config.width, config.height);
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
    this.playerName = config.playerName || 'PLAYER';
    this.playerColor = config.playerColor || '#2ef98e';
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
    this.maze.generate();
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
    const corner = corners[Math.floor(Math.random() * corners.length)];
    const [startCellX, startCellY] = this.maze.getClosestOpenCell(corner.x, corner.y, new Set([`${exitCellX},${exitCellY}`]));
    const [startX, startY] = this.maze.getCellCenter(startCellX, startCellY);

    // Cria o player na célula inicial
    this.player = new Player(startX, startY, this.maze, {
      color: this.playerColor,
      name: this.playerName,
    });

    const botDefs = [
     { name: 'Astra', color: '#ff4fe3', speed: 210, type: 'smart', smartLevel: 1 },
     { name: 'Nova', color: '#f7ff4f', speed: 180, type: 'smart', smartLevel: 2 },
     { name: 'Flux', color: '#4be3ff', speed: 150, type: 'smart', smartLevel: 3 },
   ];

    this.bots = botDefs.map((botDef) => {
      return new Bot(startX, startY, {
        name: botDef.name,
        color: botDef.color,
        type: botDef.type,
        speed: botDef.speed,
        maze: this.maze,
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
    if (input.escape) {
      this.game.changeState(new MenuState(this.game));
      return;
    }

    if (input.retry) {
      this.reset();
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
      this.game.audio.timeOut(); // <-- MUDOU AQUI (som de erro quando o tempo acaba)
      this.reset();
      return;
    }

    this.juice.update(dt);
    // --- MAESTRO DA TRILHA SONORA TURBO ---
    this.beatCountdown -= dt;
    if (this.beatCountdown <= 0) {
      const timeRatio = Math.max(0, this.timer / this.config.time);
      const tension = 1 - timeRatio;
      
      this.game.audio.playBeat(tension);
      
      let nextDelay = 0.1;
      const track = this.game.audio.currentTrack;
      
      if (track === 'cyberpunk') {
        // Começa rápido (0.14s) e termina insano (0.08s)
        // Isso é cerca de 420 a 750 BPM por passo!
        nextDelay = 0.12 + (timeRatio * 0.10); 
      } 
      else if (track === 'metal') {
        // Começa pesado (0.20s) e termina frenético (0.12s)
        nextDelay = 0.15 + (timeRatio * 0.10); 
      } 
      else if (track === 'arcade') {
        // Começa agitado (0.25s) e termina rápido (0.15s)
        nextDelay = 0.20 + (timeRatio * 0.15); 
      }
      
      this.beatCountdown = nextDelay;
    }
    // ---------------------------------------
    this.player.update(dt, input, this.maze, this.juice, this.game.audio);
    if (this.online) {
      this.bots.forEach((bot) => bot.update(dt, this.maze, this.exitWorld));
    }

    const [exitX, exitY] = this.exitWorld;
    const playerDistance = Math.hypot(exitX - this.player.x, exitY - this.player.y);
    
    // --- 1. VITÓRIA DO JOGADOR ---
    if (playerDistance < this.player.size * 0.8) {
      this.levelComplete = true;
      this.winnerName = this.player.name;
      this.nextMatchCountdown = 3;
      this.juice.localShake(0.5, 1);
      this.game.audio.playerWin(); // <-- MUDOU AQUI!
        if (this.online) this.addRankingPoints(this.player.name);
      return;
    }

    // --- 2. VITÓRIA DOS BOTS ---
    if (this.online) {
      for (const bot of this.bots) {
        const botDistance = Math.hypot(exitX - bot.x, exitY - bot.y);
        if (botDistance < bot.size * 0.8) {
          this.levelComplete = true;
          this.winnerName = bot.name;
          this.nextMatchCountdown = 3;
          this.juice.localShake(0.5, 1);
          this.game.audio.botWin(); // <-- MUDOU AQUI!
            this.addRankingPoints(bot.name);
          return;
        }
      }
    }
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
