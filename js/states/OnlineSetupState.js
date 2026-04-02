import MenuState from './MenuState.js';
import PlayState from './PlayState.js';

export default class OnlineSetupState {
  constructor(game) {
    this.game = game;
    this.onlineName = 'PLAYER';
    this.colors = [
      { label: 'Neon Green', value: '#2ef98e' },
      { label: 'Electric Blue', value: '#4be3ff' },
      { label: 'Hot Pink', value: '#ff4fe3' },
      { label: 'Lime Yellow', value: '#f7ff4f' },
    ];
    this.selectedColorIndex = 0;
    this.cooldown = 0;
  }

  onEnter() {
    this.cooldown = 0;
  }

  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown <= 0) {
      if (input.left || input.up) {
        this.selectedColorIndex = (this.selectedColorIndex - 1 + this.colors.length) % this.colors.length;
        this.cooldown = 0.16;
      } else if (input.right || input.down) {
        this.selectedColorIndex = (this.selectedColorIndex + 1) % this.colors.length;
        this.cooldown = 0.16;
      }

      if (input.backspace) {
        this.onlineName = this.onlineName.slice(0, -1);
        this.cooldown = 0.08;
      }
      if (input.text && this.onlineName.length < 12) {
        this.onlineName += input.text.toUpperCase();
        this.cooldown = 0.08;
      }
    }

    if (input.enter) {
      const config = {
        online: true,
        width: 31,
        height: 31,
        time: 28,
        playerName: this.onlineName.trim() || 'PLAYER',
        playerColor: this.colors[this.selectedColorIndex].value,
      };
      this.game.changeState(new PlayState(this.game, config));
    }

    if (input.escape) {
      this.game.changeState(new MenuState(this.game));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    ctx.fillStyle = '#00ffcc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px Segoe UI';
    ctx.fillText('Online Lobby', this.game.width / 2, this.game.height / 2 - 100);

    ctx.font = '18px Segoe UI';
    ctx.fillStyle = '#d6b3ff';
    ctx.fillText('Type your name and use ← / → to select color', this.game.width / 2, this.game.height / 2 - 60);
    ctx.fillText('Press ENTER to start match, ESC to cancel', this.game.width / 2, this.game.height / 2 - 30);

    ctx.font = '24px Segoe UI';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Name: ${this.onlineName}`, this.game.width / 2, this.game.height / 2 + 10);

    const listX = this.game.width / 2 - 180;
    const listY = this.game.height / 2 + 40;
    ctx.font = '16px Segoe UI';
    ctx.textAlign = 'left';
    this.colors.forEach((color, index) => {
      const isSelected = index === this.selectedColorIndex;
      ctx.fillStyle = isSelected ? '#ffffff' : '#8cb2ff';
      ctx.fillText(`${isSelected ? '▶' : ' '} ${color.label}`, listX + 40, listY + index * 30);
      ctx.fillStyle = color.value;
      ctx.fillRect(listX, listY + index * 30 - 18, 28, 22);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(listX, listY + index * 30 - 18, 28, 22);
    });
    ctx.restore();
  }
}
