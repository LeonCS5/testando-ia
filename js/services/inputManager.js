export default class InputManager {
  constructor() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.enter = false;
    this.escape = false;
    this.retry = false;
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  handleKey(e, value) {
    const mapping = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      Enter: 'enter',
      Space: 'enter',
      Escape: 'escape',
      KeyR: 'retry',
    };
    const prop = mapping[e.code];
    if (prop) this[prop] = value;
  }

  consumeFrameButtons() {
    this.enter = false;
    this.escape = false;
    this.retry = false;
  }
}
