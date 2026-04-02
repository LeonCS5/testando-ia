import GameModel from './model/gameModel.js';
import GameView from './view/gameView.js';
import GameController from './controller/gameController.js';
import InputManager from './services/inputManager.js';
import SoundController from './services/soundController.js';

const canvas = document.getElementById('gameCanvas');
const input = new InputManager();
const sounds = new SoundController();
const model = new GameModel();
const view = new GameView(canvas, model);
const controller = new GameController(model, view, input, sounds);

controller.start();
