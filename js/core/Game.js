// Coordena ciclo de jogo, gerenciamento de estado e resize do canvas.
import MenuState from '../states/MenuState.js';

export default class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.audio = audio;

    this.state = null;
    this.lastTime = 0;

    this.width = 0;
    this.height = 0;
    this.pixelRatio = window.devicePixelRatio || 1;

    // 🔥 NÃO usa mais resize direto aqui (controlado pelo main.js)
    this.changeState(new MenuState(this));
  }

  /* 🔥 chamado pelo main.js */
  onResize(width, height) {
    this.width = width;
    this.height = height;

    const ratio = this.pixelRatio;

    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // 🔹 reset do transform (evita acumular escala)
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // 🔹 avisa o state atual
    if (this.state && typeof this.state.onResize === 'function') {
      this.state.onResize(width, height);
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

    // 🔹 garante que novo state já receba tamanho atual
    if (this.state && typeof this.state.onResize === 'function') {
      this.state.onResize(this.width, this.height);
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