// Centraliza modos de jogo e utilitarios para clonar/normalizar configuracoes.
export const MAZE_TUNING = {
  minOpeningFactor: 0.35,
  baseFirstPassOpenings: 52,
  minFirstPassOpenings: 12,
  baseSecondPassOpenings: 90,
  minSecondPassOpenings: 18,
  dualRouteMinExtraSteps: 6,
  dualRouteMaxCarveAttempts: 28,
  dualRoutePathProbeStride: 2,
};

export const GAME_MODES = [
  { modeId: 'easy', label: 'Easy', width: 39, height: 31, time: 25, online: false, liveMaze: false, openingFactor: 2.5 },
  { modeId: 'medium', label: 'Medium', width: 39, height: 31, time: 35, online: false, liveMaze: false, openingFactor: 1.9 },
  { modeId: 'hard', label: 'Hard', width: 39, height: 31, time: 50, online: false, liveMaze: false, openingFactor: 1.35 },
  { modeId: 'challenge-bots', label: 'Desafiar Bots', width: 39, height: 31, time: 68, online: true, liveMaze: false, openingFactor: 1.7 },
  { modeId: 'live-maze', label: 'Labirinto Vivo', width: 39, height: 31, time: 95, online: true, liveMaze: true, openingFactor: 1.8 },
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
