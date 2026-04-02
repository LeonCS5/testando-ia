import { TILE_SIZE } from '../constants.js';

export default class Exit {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseSize = TILE_SIZE * 0.7;
  }
}
