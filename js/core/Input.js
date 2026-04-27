// Captura teclado e expoe estado de input por frame para os estados do jogo.
export default class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.enter = false;
    this.escape = false;
    this.retry = false;
    this.text = '';
    this.backspace = false;

    window.addEventListener('keydown', (event) => this.handleKey(event, true));
    window.addEventListener('keyup', (event) => this.handleKey(event, false));
  }

  handleKey(event, value) {
    const map = {
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

    const prop = map[event.code];
    if (prop) this[prop] = value;
    if (!value) return;

    if (event.code === 'Backspace') {
      this.backspace = true;
      return;
    }

    if (event.key.length === 1 && /^[a-zA-Z0-9 ]$/.test(event.key)) {
      this.text = event.key;
    }
  }

  consumeFrameButtons() {
    this.enter = false;
    this.escape = false;
    this.retry = false;
    this.text = '';
    this.backspace = false;
  }
}
