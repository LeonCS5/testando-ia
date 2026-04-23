import Bot from './Bot.js';

/**
 * Flux - Safe bot with maximum intelligence
 * Slower movement, but best decisions and quickest route correction
 */
export default class FluxBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Flux',
      color: '#4be3ff',
      speed: 165,
      type: 'safe',
      behavior: 'safe',
      smartLevel: 3,
      ...options,
    });
  }
}
