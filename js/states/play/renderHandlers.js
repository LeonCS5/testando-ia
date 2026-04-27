// Pipeline de render da partida: cenario, entidades, efeitos visuais e HUD.
import { getTopRanking } from './rankingStore.js';

function drawExit(state, ctx, timestamp) {
  if (!state.exitWorld) return;
  const [x, y] = state.exitWorld;
  const pulse = (Math.sin(timestamp * 0.01) + 1) / 2;
  const size = 10 + pulse * 10;
  const alpha = 0.6 + pulse * 0.3;
  ctx.strokeStyle = `rgba(255,0,214,${0.35 + pulse * 0.35})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,0,214,${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(state, ctx) {
  ctx.fillStyle = '#d6b3ff';
  ctx.font = '16px Segoe UI';
  ctx.fillText(`Time: ${state.timer.toFixed(1)}s`, 14, state.game.height - 24);

  if (state.isLiveMaze) {
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 18px Segoe UI';
    ctx.fillText('⚡ LABIRINTO VIVO ⚡', 14, 40);
    ctx.fillStyle = '#d6b3ff';
    ctx.font = '16px Segoe UI';
  }

  ctx.fillText(`Maze regenerates in: ${Math.max(0, state.timer).toFixed(1)}s`, 14, state.game.height - 44);
  ctx.fillText('Press ESC for menu, R to restart', 14, state.game.height - 64);

  if (state.online) {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Player: ${state.player.name}`, 14, state.game.height - 84);

    const rankingEntries = getTopRanking(5);
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('RANKING:', state.game.width - 200, 30);
    ctx.fillStyle = '#d6b3ff';
    ctx.font = '12px Segoe UI';
    rankingEntries.forEach((entry, idx) => {
      ctx.fillText(`${idx + 1}. ${entry[0]}: ${entry[1]}`, state.game.width - 200, 50 + idx * 18);
    });
    ctx.font = '16px Segoe UI';
  }

  if (state.levelComplete) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(state.winnerName ? `${state.winnerName} won!` : 'Level Complete!', state.game.width / 2, state.game.height / 2);
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Next match in ${state.nextMatchCountdown.toFixed(1)}s`, state.game.width / 2, state.game.height / 2 + 32);
    ctx.textAlign = 'left';
  }
}

export function drawPlayState(state, ctx, timestamp) {
  ctx.save();
  ctx.fillStyle = '#04040a';
  ctx.fillRect(0, 0, state.game.width, state.game.height);
  ctx.save();
  state.juice.applyScreenShake(ctx);
  state.maze.draw(ctx);

  if (state.evasionObjective) {
    state.evasionObjective.draw(ctx);
  } else {
    drawExit(state, ctx, timestamp);
  }

  if (state.frumbus) {
    state.frumbus.draw(ctx);
  }

  if (state.jumpscareBot) {
    state.jumpscareBot.draw(ctx);
  }

  state.player.draw(ctx);
  if (state.online) {
    state.bots.forEach((bot) => bot.draw(ctx));
  }
  state.juice.drawParticles(ctx);
  ctx.restore();
  state.juice.drawGlitch(ctx, state.game.width, state.game.height);
  drawHud(state, ctx);
  ctx.restore();
}