export default class GameController {
  constructor(model, view, input, sounds) {
    this.model = model;
    this.view = view;
    this.input = input;
    this.sounds = sounds;
    this.lastTime = 0;
    window.addEventListener('resize', () => this.view.resize());
  }

  start() {
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  gameLoop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.model.update(dt, this.input, this.sounds);
    this.view.render(timestamp);
    this.input.consumeFrameButtons();

    requestAnimationFrame((ts) => this.gameLoop(ts));
  }
}
