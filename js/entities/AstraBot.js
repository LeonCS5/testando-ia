import Bot from './Bot.js';

/**
 * Astra - Racer bot with low intelligence
 * Fast movement, but makes more mistakes and slower decisions
 */
export default class AstraBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Astra',
      color: '#ff4fe3',
      speed: 205,
      type: 'racer',
      behavior: 'racer',
      smartLevel: 1,
      ...options, // Allow overrides
    });
  }
}
