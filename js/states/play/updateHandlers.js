// Pipeline de update da partida: input, tempo, IA, fisica do modo vivo e condicao de vitoria.
import MenuState from '../MenuState.js';
import { getBeatDelayByTrack, getExitPosition } from './modeUtils.js';

function handleInput(state, input) {
  if (input.escape) {
    state.game.changeState(new MenuState(state.game));
    return true;
  }

  if (input.retry) {
    state.reset();
    return true;
  }

  return false;
}

function updateLiveMaze(state, dt) {
  if (!state.isLiveMaze || typeof state.maze.update !== 'function') return;
  state.maze.update(dt);
}

function applyLiveMazePush(state, entity, dt, allowShake = false) {
  if (!state.isLiveMaze || typeof state.maze.getPushVectorFromWall !== 'function') return;

  const push = state.maze.getPushVectorFromWall(entity.x, entity.y);
  if (push.strength <= 0) return;

  entity.x += push.x * dt * 0.25;
  entity.y += push.y * dt * 0.25;

  if (allowShake && push.strength > 1) {
    state.juice.localShake(0.3, push.strength * 1.5);
  }
}

function updateBots(state, dt) {
  if (!state.online) return;

  const targetExit = state.evasionObjective
    ? [state.evasionObjective.x, state.evasionObjective.y]
    : state.exitWorld;

  state.bots.forEach((bot) => {
    bot.update(dt, state.maze, targetExit, state.bots);
    applyLiveMazePush(state, bot, dt, false);
  });

  if (state.evasionObjective) {
    state.evasionObjective.update(dt, state.maze, null, [state.player, ...state.bots]);
    applyLiveMazePush(state, state.evasionObjective, dt, false);
  }
}

function updateBeat(state, dt) {
  state.beatCountdown -= dt;
  if (state.beatCountdown > 0) return;

  const timeRatio = Math.max(0, state.timer / state.config.time);
  const tension = 1 - timeRatio;
  state.game.audio.playBeat(tension);
  state.beatCountdown = getBeatDelayByTrack(state.game.audio.currentTrack, timeRatio);
}

function checkWinner(state) {
  const [exitX, exitY] = getExitPosition(state.exitWorld, state.evasionObjective);
  const objectiveRadius = state.evasionObjective ? state.evasionObjective.size * 0.7 : 0;
  const playerDistance = Math.hypot(exitX - state.player.x, exitY - state.player.y);

  if (playerDistance < (state.player.size * 0.8 + objectiveRadius)) {
    state.levelComplete = true;
    state.winnerName = state.player.name;
    state.nextMatchCountdown = 3;
    state.juice.localShake(0.5, 1);
    state.game.audio.playerWin();
    if (state.online) state.addRankingPoints(state.player.name);
    return true;
  }

  if (!state.online) return false;
  for (const bot of state.bots) {
    const botDistance = Math.hypot(exitX - bot.x, exitY - bot.y);
    if (botDistance < (bot.size * 0.8 + objectiveRadius)) {
      state.levelComplete = true;
      state.winnerName = bot.name;
      state.nextMatchCountdown = 3;
      state.juice.localShake(0.5, 1);
      state.game.audio.botWin();
      state.addRankingPoints(bot.name);
      return true;
    }
  }

  return false;
}

export function updatePlayState(state, dt, input) {
  if (handleInput(state, input)) return;

  if (state.levelComplete) {
    state.nextMatchCountdown = Math.max(0, state.nextMatchCountdown - dt);
    if (state.nextMatchCountdown <= 0) state.reset();
    return;
  }

  state.timer -= dt;
  if (state.timer <= 0) {
    state.juice.triggerGlitch();
    state.game.audio.timeOut();
    state.reset();
    return;
  }

  state.juice.update(dt);
  updateBeat(state, dt);
  updateLiveMaze(state, dt);

  if (state.frumbusList && state.frumbusList.length > 0) {
    const entities = [state.player, ...state.bots];
    if (state.evasionObjective) entities.push(state.evasionObjective);
    state.frumbusList.forEach(f => f.update(dt, entities));
  }

  if (state.jumpscareBot) {
    state.jumpscareBot.update(dt, state.maze, null, state.bots, state);
  }

  state.player.update(dt, input, state.maze, state.juice, state.game.audio);
  applyLiveMazePush(state, state.player, dt, true);
  updateBots(state, dt);
  checkWinner(state);
}