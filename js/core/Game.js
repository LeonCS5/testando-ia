import MenuState from '../states/MenuState.js';

export default class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.audio = audio;
    this.state = null;
    this.lastTime = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.changeState(new MenuState(this));
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.width * ratio);
    this.canvas.height = Math.floor(this.height * ratio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (this.state && typeof this.state.onResize === 'function') {
      this.state.onResize(this.width, this.height);
    }
  }

  changeState(state) {
    if (this.state && typeof this.state.onExit === 'function') {
      this.state.onExit();
    }
    this.state = state;
    if (this.state && typeof this.state.onEnter === 'function') {
      this.state.onEnter();
    }
  }

  start() {
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  gameLoop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 1 / 12);
    this.lastTime = timestamp;

    if (this.state) {
      this.state.update(dt, this.input);
      this.state.draw(this.ctx, timestamp);
    }

    this.input.consumeFrameButtons();
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }
}
