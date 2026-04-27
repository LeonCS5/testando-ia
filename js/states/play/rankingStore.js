// Acesso ao ranking em localStorage: leitura, escrita e top jogadores.
const RANKING_KEY = 'botRanking';

export function readRanking() {
  try {
    return JSON.parse(localStorage.getItem(RANKING_KEY) || '{}');
  } catch {
    return {};
  }
}

export function addRankingPoint(name, points = 1) {
  const ranking = readRanking();
  ranking[name] = (ranking[name] || 0) + points;
  localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
}

export function getTopRanking(limit = 5) {
  return Object.entries(readRanking())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}