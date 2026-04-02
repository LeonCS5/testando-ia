import Game from './core/Game.js';
import Input from './core/Input.js';
import Audio from './core/Audio.js';

const canvas = document.getElementById('gameCanvas');
const input = new Input();
const audio = new Audio();

audio.resume();

const game = new Game(canvas, input, audio);
game.start();
