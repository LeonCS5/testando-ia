// Bot Nova: variante de IA com parametros proprios de navegacao.
import Bot from './Bot.js';

/**
 * Nova - Explorer bot with medium intelligence
 * Balanced speed and decisions, explores alternatives
 */
export default class NovaBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Nova',
      color: '#f7ff4f',
      speed: 175,
      type: 'explorer',
      behavior: 'explorer',
      smartLevel: 2,
      ...options,
    });
  }
}
