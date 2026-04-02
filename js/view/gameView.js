import { TILE_SIZE } from '../constants.js';

export default class GameView {
  constructor(canvas, model) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * window.devicePixelRatio || 1);
    this.canvas.height = Math.floor(this.height * window.devicePixelRatio || 1);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    this.model.updateScreenSize(this.width, this.height);
  }

  render(timestamp) {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#04040a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.model.effects.applyScreenShake(this.ctx);
    if (this.model.gameState !== 'menu') {
      this.drawMaze();
      this.drawExit(timestamp);
      this.drawPlayer();
      this.drawParticles();
    }
    this.ctx.restore();

    this.model.effects.drawGlitchOverlay(this.ctx, this.width, this.height);
    this.ctx.restore();

    this.drawHud();
  }

  drawMaze() {
    const tileScale = TILE_SIZE;
    const outW = this.model.maze.w * tileScale;
    const outH = this.model.maze.h * tileScale;
    const gx = (this.width - outW) / 2;
    const gy = (this.height - outH) / 2;

    for (let y = 0; y < this.model.maze.h; y++) {
      for (let x = 0; x < this.model.maze.w; x++) {
        if (this.model.maze.grid[y][x] === 1) {
          const intensity = 0.3 + ((x + y) % 2) * 0.1;
          this.ctx.fillStyle = `rgba(38,122,255,${intensity})`;
          this.ctx.fillRect(gx + x * tileScale, gy + y * tileScale, tileScale, tileScale);
        }
      }
    }
  }

  drawPlayer() {
    const player = this.model.player;
    if (!player) return;

    const glow = this.ctx.createRadialGradient(player.x, player.y, player.size * 0.2, player.x, player.y, player.size);
    glow.addColorStop(0, 'rgba(94,255,128,0.9)');
    glow.addColorStop(0.8, 'rgba(22,160,33,0.05)');
    glow.addColorStop(1, 'rgba(22,160,33,0)');
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, player.size * 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#2ef98e';
    this.ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
    this.ctx.strokeStyle = '#56ffab';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
  }

  drawExit(timestamp) {
    const exitTarget = this.model.exitTarget;
    if (!exitTarget) return;
    const pulse = (Math.sin(timestamp * 0.01) + 1) / 2;
    const size = exitTarget.baseSize + pulse * 12;
    const alpha = 0.6 + pulse * 0.3;

    this.ctx.strokeStyle = `rgba(255,0,214,${0.35 + pulse * 0.35})`;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(exitTarget.x, exitTarget.y, size * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = `rgba(255,0,214,${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(exitTarget.x, exitTarget.y, size * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawParticles() {
    for (const particle of this.model.effects.particles) {
      const t = Math.max(0, particle.life / particle.maxLife);
      this.ctx.fillStyle = `rgba(${particle.color[0]},${particle.color[1]},${particle.color[2]},${t})`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, 1.5 + 2 * (1 - t), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawHud() {
    this.ctx.fillStyle = '#d6b3ff';
    this.ctx.font = '16px Segoe UI';

    if (this.model.gameState === 'menu') {
      this.ctx.fillStyle = '#00ffcc';
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bold 32px Segoe UI';
      this.ctx.fillText('Neon Labyrinth', this.width / 2, this.height / 2 - 60);
      this.ctx.font = '18px Segoe UI';
      this.ctx.fillText('Press ENTER or SPACE to start', this.width / 2, this.height / 2 - 20);
      this.ctx.fillText('Use WASD / Arrow keys to move', this.width / 2, this.height / 2 + 10);
      this.ctx.fillText('Press ESC during play to return to menu', this.width / 2, this.height / 2 + 40);
      this.ctx.fillText(`Best Score: ${this.model.bestScore}`, this.width / 2, this.height / 2 + 80);
      this.ctx.textAlign = 'left';
    } else if (this.model.gameState === 'levelComplete') {
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bold 26px Segoe UI';
      this.ctx.fillText('Level Complete!', this.width / 2, this.height / 2);
      this.ctx.font = '16px Segoe UI';
      this.ctx.fillText(`Next maze in ${this.model.levelCompleteTimer.toFixed(1)}s`, this.width / 2, this.height / 2 + 28);
      this.ctx.fillText('Press R to retry from zero', this.width / 2, this.height / 2 + 56);
      this.ctx.textAlign = 'left';
    } else {
      this.ctx.fillText(`Score: ${this.model.score}`, 14, this.height - 24);
      this.ctx.fillText(`Regen in: ${this.model.regenTimer.toFixed(1)}s`, 14, this.height - 44);
      this.ctx.fillText(`Best: ${this.model.bestScore}`, 14, this.height - 64);
      this.ctx.fillText('Press ESC for menu, R to restart', 14, this.height - 84);
    }
  }
}
