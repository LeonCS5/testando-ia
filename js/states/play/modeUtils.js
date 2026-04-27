// Helpers de modo de jogo: criacao do labirinto, spawn e calculos de tempo de trilha.
import Maze from '../../entities/Maze.js';
import LiveMaze from '../../entities/LiveMaze.js';
import { normalizeMode } from '../../config/gameModes.js';

export const SPAWN_CORNERS = [
  { x: 1, y: 1 },
  { x: -2, y: 1 },
  { x: 1, y: -2 },
  { x: -2, y: -2 },
];

export function createMazeForMode(config, seed) {
  const normalized = normalizeMode(config, config);
  const isLiveMaze = Boolean(normalized.liveMaze);
  const MazeClass = isLiveMaze ? LiveMaze : Maze;
  return new MazeClass(normalized.width, normalized.height, { seed });
}

export function resolveCornerCell(maze, corner) {
  const cx = corner.x < 0 ? maze.width + corner.x : corner.x;
  const cy = corner.y < 0 ? maze.height + corner.y : corner.y;
  return [cx, cy];
}

export function getBeatDelayByTrack(track, timeRatio) {
  const map = {
    cyberpunk: [0.12, 0.1],
    metal: [0.15, 0.1],
    arcade: [0.2, 0.15],
  };
  const [base, scale] = map[track] || [0.1, 0];
  return base + (timeRatio * scale);
}

export function getExitPosition(exitWorld, evasionObjective) {
  if (evasionObjective) return [evasionObjective.x, evasionObjective.y];
  return exitWorld;
}