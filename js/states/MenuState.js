import PlayState from './PlayState.js';
import OnlineSetupState from './OnlineSetupState.js';
import { GAME_MODES, cloneMode } from '../config/gameModes.js';

export default class MenuState {
  constructor(game) {
    this.game = game;
    this.options = GAME_MODES.map((mode) => cloneMode(mode));
    this.selectedIndex = 0;
    this.cooldown = 0;
  }

  onEnter() {
    this.cooldown = 0;
  }

  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown <= 0) {
      if (input.left || input.up) {
        this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
        this.cooldown = 0.16;
      } else if (input.right || input.down) {
        this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
        this.cooldown = 0.16;
      }
    }

    if (input.enter) {
      const selected = cloneMode(this.options[this.selectedIndex]);
      this.game.pendingModeConfig = cloneMode(selected);
      if (selected.online) {
        this.game.changeState(new OnlineSetupState(this.game, selected));
      } else {
        this.game.changeState(new PlayState(this.game, selected));
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, this.game.width, this.game.height);
    ctx.fillStyle = '#00ffcc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px Segoe UI';
    ctx.fillText('Neon Labyrinth', this.game.width / 2, this.game.height / 2 - 120);

    ctx.font = '18px Segoe UI';
    ctx.fillStyle = '#d6b3ff';
    ctx.fillText('Use ←/→ or ↑/↓ to choose difficulty', this.game.width / 2, this.game.height / 2 - 70);
    ctx.fillText('Press ENTER to start', this.game.width / 2, this.game.height / 2 - 40);

    this.options.forEach((option, index) => {
      const isSelected = index === this.selectedIndex;
      ctx.font = isSelected ? 'bold 28px Segoe UI' : '18px Segoe UI';
      ctx.fillStyle = isSelected ? '#ff8cff' : '#8cb2ff';
      ctx.fillText(`${option.label} — ${option.width}x${option.height}`, this.game.width / 2, this.game.height / 2 + index * 40 + 10);
    });
    ctx.restore();
  }
}
