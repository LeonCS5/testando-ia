import Game from './core/Game.js';
import Input from './core/Input.js';
import Audio from './core/Audio.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const input = new Input();
const audio = new Audio();

/* 🔥 RESPONSIVIDADE REAL */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* áudio (geralmente precisa de interação do usuário, mas ok) */
audio.resume();

const game = new Game(canvas, input, audio);
game.start();