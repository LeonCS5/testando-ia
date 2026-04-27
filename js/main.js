// Ponto de entrada do jogo: cria dependencias, inicia o Game e gerencia resize da tela.
import Game from './core/Game.js';
import Input from './core/Input.js';
import Audio from './core/Audio.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const input = new Input();
const audio = new Audio();

const game = new Game(canvas, input, audio);

/* 🔥 RESPONSIVIDADE REAL + INTEGRAÇÃO COM O GAME */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 🔹 avisa o jogo que o tamanho mudou
  if (game && game.onResize) {
    game.onResize(canvas.width, canvas.height);
  }
}

window.addEventListener("resize", resizeCanvas);

/* inicializa tamanho */
resizeCanvas();

/* 🔊 áudio (precisa de interação em alguns browsers, mas deixamos aqui) */
audio.resume();

/* ▶️ start do jogo */
game.start();