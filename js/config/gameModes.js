// Centraliza modos de jogo e utilitarios para clonar/normalizar configuracoes.
export const GAME_MODES = [
  { modeId: 'easy', label: 'Easy', width: 21, height: 21, time: 25, online: false, liveMaze: false },
  { modeId: 'medium', label: 'Medium', width: 31, height: 31, time: 35, online: false, liveMaze: false },
  { modeId: 'hard', label: 'Hard', width: 41, height: 41, time: 50, online: false, liveMaze: false },
  { modeId: 'challenge-bots', label: 'Desafiar Bots', width: 31, height: 31, time: 68, online: true, liveMaze: false },
  { modeId: 'live-maze', label: 'Labirinto Vivo', width: 27, height: 27, time: 95, online: true, liveMaze: true },
];

export const ONLINE_DEFAULT_MODE = GAME_MODES.find((mode) => mode.modeId === 'challenge-bots');

export function cloneMode(mode) {
  return { ...mode };
}

export function normalizeMode(modeConfig = {}, baseMode = ONLINE_DEFAULT_MODE || GAME_MODES[0]) {
  const base = cloneMode(baseMode);
  const merged = { ...base, ...modeConfig };
  const liveFromLabel = merged.label === 'Labirinto Vivo';
  const liveFromModeId = merged.modeId === 'live-maze';

  return {
    ...merged,
    online: Boolean(merged.online),
    liveMaze: Boolean(merged.liveMaze || liveFromLabel || liveFromModeId),
  };
}
