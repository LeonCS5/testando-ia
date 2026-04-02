const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const devicePixelRatio = window.devicePixelRatio || 1;

let width = window.innerWidth;
let height = window.innerHeight;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * devicePixelRatio);
  canvas.height = Math.floor(height * devicePixelRatio);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const TILE_SIZE = 24; // real world for drawing
const CELL_W = 21; // odd dims for maze
const CELL_H = 21;
const MAZE_MAX_X = CELL_W;
const MAZE_MAX_Y = CELL_H;
let offsetX = 0;
let offsetY = 0;

function nearestOdd(v) { return v % 2 === 0 ? v - 1 : v; }

class Maze {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.grid = [];
    this.generate();
  }

  generate() {
    this.grid = Array.from({ length: this.h }, () => Array(this.w).fill(1));

    const inBounds = (x, y) => x > 0 && x < this.w - 1 && y > 0 && y < this.h - 1;

    const dirs = [ [0, -2], [2, 0], [0, 2], [-2, 0] ];
    const stack = [];

    let sx = 1, sy = 1;
    this.grid[sy][sx] = 0;
    stack.push([sx, sy]);

    while (stack.length) {
      const current = stack[stack.length - 1];
      const [cx, cy] = current;
      const neighbors = [];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (inBounds(nx, ny) && this.grid[ny][nx] === 1) {
          neighbors.push([nx, ny]);
        }
      }
      if (!neighbors.length) {
        stack.pop();
        continue;
      }
      const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
      const wallX = cx + (nx - cx) / 2;
      const wallY = cy + (ny - cy) / 2;
      this.grid[ny][nx] = 0;
      this.grid[wallY][wallX] = 0;
      stack.push([nx, ny]);
    }

    // carve extra random passages for fun and playability
    for (let i = 0; i < 35; i++) {
      const rx = 1 + 2 * Math.floor(Math.random() * ((this.w - 1) / 2));
      const ry = 1 + 2 * Math.floor(Math.random() * ((this.h - 1) / 2));
      this.grid[ry][rx] = 0;
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const wx = rx + dir[0];
      const wy = ry + dir[1];
      if (inBounds(wx, wy)) this.grid[wy][wx] = 0;
    }

    this.openCells = [];
    for (let y = 1; y < this.h; y += 2) {
      for (let x = 1; x < this.w; x += 2) {
        if (this.grid[y][x] === 0) this.openCells.push([x, y]);
      }
    }
  }

  randomOpenCell() {
    const idx = Math.floor(Math.random() * this.openCells.length);
    return this.openCells[idx] || [1,1];
  }

  isWall(x, y) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gy < 0 || gy >= this.h || gx < 0 || gx >= this.w) return true;
    return this.grid[gy][gx] === 1;
  }

  draw(ctx) {
    const tileScale = TILE_SIZE;
    const outW = this.w * tileScale;
    const outH = this.h * tileScale;
    const gx = offsetX + (width - outW) / 2;
    const gy = offsetY + (height - outH) / 2;

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.grid[y][x] === 1) {
          const px = gx + x * tileScale;
          const py = gy + y * tileScale;
          const intensity = 0.3 + (x + y) % 2 * 0.1;
          ctx.fillStyle = `rgba(38,122,255,${intensity})`;
          ctx.fillRect(px, py, tileScale, tileScale);
        }
      }
    }
  }
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 160;
    this.size = TILE_SIZE * 0.6; // smaller to avoid corners getting stuck
    this.vx = 0;
    this.vy = 0;
    this.wallHitCooldown = 0;
  }

  update(dt, maze, input, effectManager) {
    this.vx = 0;
    this.vy = 0;
    if (input.left) this.vx = -this.speed;
    if (input.right) this.vx = this.speed;
    if (input.up) this.vy = -this.speed;
    if (input.down) this.vy = this.speed;

    if (this.vx !== 0 || this.vy !== 0) {
      const mag = Math.hypot(this.vx, this.vy);
      this.vx = this.vx / mag * this.speed;
      this.vy = this.vy / mag * this.speed;
      effectManager.spawnTrail(this.x, this.y);
    }

    const step = Math.min(dt, 1/30);
    let nx = this.x + this.vx * step;
    let ny = this.y + this.vy * step;

    let collision = false;
    const half = this.size / 2;

    const check = (cx, cy) => {
      const corners = [
        [cx-half, cy-half],
        [cx+half, cy-half],
        [cx-half, cy+half],
        [cx+half, cy+half]
      ];
      for (const [px, py] of corners) {
        const cellx = Math.floor((px - offsetX - (width - maze.w * TILE_SIZE)/2)/TILE_SIZE);
        const celly = Math.floor((py - offsetY - (height - maze.h * TILE_SIZE)/2)/TILE_SIZE);
        if (maze.isWall(cellx, celly)) return true;
      }
      return false;
    };

    if (check(nx, this.y)) {
      nx = this.x;
      collision = true;
    }
    if (check(this.x, ny)) {
      ny = this.y;
      collision = true;
    }

    if (collision) {
      if (this.wallHitCooldown <= 0) {
        effectManager.localShake(0.2, 0.8);
        sounds.wallHit();
        this.wallHitCooldown = 0.18;
      }
      nx = this.x;
      ny = this.y;
    }

    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - dt);
    this.x = nx;
    this.y = ny;
  }

  draw(ctx) {
    const glow = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, this.size);
    glow.addColorStop(0, 'rgba(94,255,128,0.9)');
    glow.addColorStop(0.8, 'rgba(22,160,33,0.05)');
    glow.addColorStop(1, 'rgba(22,160,33,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2ef98e';
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.strokeStyle = '#56ffab';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

class Exit {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseSize = TILE_SIZE * 0.7;
  }

  draw(ctx, time) {
    const pulse = (Math.sin(time * 0.01) + 1) / 2;
    const size = this.baseSize + pulse * 12;
    const alpha = 0.6 + pulse * 0.3;

    ctx.strokeStyle = `rgba(255,0,214,${0.35 + pulse * 0.35})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255,0,214,${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.maxLife = life; this.color = color;
  }
  update(dt) { this.life -= dt; this.x += this.vx * dt; this.y += this.vy * dt; }
  draw(ctx) {
    const t = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${t})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.5 + 2*(1 - t), 0, Math.PI*2);
    ctx.fill();
  }
}

class EffectManager {
  constructor() {
    this.particles = [];
    this.shakeTimer = 0;
    this.shakePower = 0;
    this.glitchCounter = 0;
  }

  spawnTrail(x, y) {
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.35 + Math.random() * 0.15, [46, 249, 142]));
    }
  }

  localShake(duration, power) { this.shakeTimer = Math.max(this.shakeTimer, duration); this.shakePower = Math.max(this.shakePower, power); }

  triggerGlitch() { this.glitchCounter = 0.25; }

  update(dt) {
    if (this.shakeTimer > 0) { this.shakeTimer = Math.max(0, this.shakeTimer - dt); }
    if (this.glitchCounter > 0) { this.glitchCounter = Math.max(0, this.glitchCounter - dt); }

    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.life > 0);
  }

  applyScreenShake(ctx) {
    if (this.shakeTimer > 0) {
      const mag = this.shakePower * (this.shakeTimer / 0.2);
      const tx = (Math.random() - 0.5) * mag * 6;
      const ty = (Math.random() - 0.5) * mag * 6;
      ctx.translate(tx, ty);
    }
  }

  drawGlitchOverlay(ctx) {
    if (this.glitchCounter <= 0) return;
    const alpha = (this.glitchCounter / 0.25) * 0.45;
    ctx.fillStyle = `rgba(255,13,195,${alpha})`;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * height;
      const h = 4 + Math.random() * 16;
      ctx.fillStyle = `rgba(255, 0, 214, ${alpha*0.5})`;
      ctx.fillRect(0, y, width, h);
    }
  }
}

class InputManager {
  constructor() {
    this.left = this.right = this.up = this.down = false;
    this.enter = false;
    this.escape = false;
    this.retry = false;
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }
  handleKey(e, value) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.left = value;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.right = value;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.up = value;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.down = value;
    if (e.code === 'Enter' || e.code === 'Space') this.enter = value;
    if (e.code === 'Escape') this.escape = value;
    if (e.code === 'KeyR') this.retry = value;
  }
}

const input = new InputManager();
const maze = new Maze(CELL_W, CELL_H);

let player = null;
let exitTarget = null;
const effects = new EffectManager();
const sounds = new (class {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  playTone(freq, duration, type = 'sine', gain = 0.18) {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
  wallHit() { this.playTone(180, 0.08, 'square', 0.2); }
  mazeRegenerate() { this.playTone(380, 0.12, 'sawtooth', 0.18); this.playTone(620, 0.06, 'sine', 0.11); }
  levelComplete() { this.playTone(520, 0.16, 'triangle', 0.2); this.playTone(720, 0.12, 'triangle', 0.15); }
})( );

let lastTime = 0;
let regenTimer = 15;
let score = 0;
let bestScore = 0;
let gameState = 'menu';
let levelCompleteTimer = 0;

function worldPosForCell(x, y) {
  const totalW = maze.w * TILE_SIZE;
  const totalH = maze.h * TILE_SIZE;
  const baseX = offsetX + (width - totalW) / 2;
  const baseY = offsetY + (height - totalH) / 2;
  return [baseX + x * TILE_SIZE + TILE_SIZE / 2, baseY + y * TILE_SIZE + TILE_SIZE / 2];
}

function setPlayerToRandomOpenCell() {
  const [rx, ry] = maze.randomOpenCell();
  const [wx, wy] = worldPosForCell(rx, ry);
  player.x = wx;
  player.y = wy;
  player.wallHitCooldown = 0;
}

function ensurePlayerInsideOpenCell() {
  if (!player) return;
  const [cellx, celly] = getCellCoord(player.x, player.y);
  if (maze.isWall(cellx, celly)) {
    setPlayerToRandomOpenCell();
  }
}

function placeEntities() {
  const [px, py] = maze.randomOpenCell();
  const [wx, wy] = worldPosForCell(px, py);
  player = new Player(wx, wy);

  let ex, ey; let test = 0;
  do {
    [ex, ey] = maze.randomOpenCell();
    const [ex2, ey2] = worldPosForCell(ex, ey);
    const dx = ex2 - wx;
    const dy = ey2 - wy;
    if (Math.hypot(dx, dy) > TILE_SIZE * 10 || test > 30) break;
    test++;
  } while (true);
  const [exitX, exitY] = worldPosForCell(ex, ey);
  exitTarget = new Exit(exitX, exitY);

  ensurePlayerInsideOpenCell();
}

placeEntities();

function regenerateMaze() {
  maze.generate();
  // keep player in a valid cell
  ensurePlayerInsideOpenCell();

  let ex, ey; let tries = 0;
  do {
    [ex, ey] = maze.randomOpenCell();
    const [px, py] = getCellCoord(player.x, player.y);
    const [exW, eyW] = worldPosForCell(ex, ey);
    const dx = exW - player.x;
    const dy = eyW - player.y;
    if (Math.hypot(dx, dy) > TILE_SIZE * 8 || tries > 50) break;
    tries++;
  } while (true);
  const [exitX, exitY] = worldPosForCell(ex, ey);
  exitTarget = new Exit(exitX, exitY);

  effects.triggerGlitch();
  sounds.mazeRegenerate();
  regenTimer = 15;
}

function getCellCoord(x, y) {
  const totalW = maze.w * TILE_SIZE;
  const totalH = maze.h * TILE_SIZE;
  const baseX = offsetX + (width - totalW) / 2;
  const baseY = offsetY + (height - totalH) / 2;
  const cx = Math.floor((x - baseX) / TILE_SIZE);
  const cy = Math.floor((y - baseY) / TILE_SIZE);
  return [cx, cy];
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (gameState === 'menu') {
    if (input.enter) {
      score = 0;
      regenTimer = 15;
      placeEntities();
      gameState = 'playing';
      sounds.playTone(440, 0.1, 'sine', 0.2);
    }
  } else if (gameState === 'levelComplete') {
    if (input.retry) {
      score = 0;
      regenTimer = 15;
      placeEntities();
      gameState = 'playing';
    }
    levelCompleteTimer -= dt;
    if (levelCompleteTimer <= 0) {
      regenerateMaze();
      gameState = 'playing';
    }
  } else if (gameState === 'playing') {
    ensurePlayerInsideOpenCell();
    if (input.escape) {
      gameState = 'menu';
    }
    if (input.retry) {
      score = 0;
      regenTimer = 15;
      placeEntities();
      sounds.playTone(330, 0.1, 'square', 0.20);
    }

    regenTimer -= dt;
    if (regenTimer <= 0) regenerateMaze();

    effects.update(dt);
    player.update(dt, maze, input, effects);

    const [pcx, pcy] = getCellCoord(player.x, player.y);
    const [ecx, ecy] = getCellCoord(exitTarget.x, exitTarget.y);
    if (pcx === ecx && pcy === ecy) {
      score += 1;
      bestScore = Math.max(bestScore, score);
      effects.localShake(0.5, 1);
      sounds.levelComplete();
      gameState = 'levelComplete';
      levelCompleteTimer = 1.0;
    }
  }

  ctx.save();
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = '#04040a';
  ctx.fillRect(0,0,width,height);

  ctx.save();
  effects.applyScreenShake(ctx);

  if (gameState !== 'menu') {
    maze.draw(ctx);
    exitTarget?.draw(ctx, timestamp);
    player?.draw(ctx);
    effects.particles.forEach(p => p.draw(ctx));
  }

  ctx.restore();
  effects.drawGlitchOverlay(ctx);
  ctx.restore();

  ctx.fillStyle = '#d6b3ff';
  ctx.font = '16px Segoe UI';

  if (gameState === 'menu') {
    ctx.fillStyle = '#00ffcc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillText('Neon Labyrinth', width / 2, height / 2 - 60);
    ctx.font = '18px Segoe UI';
    ctx.fillText('Press ENTER or SPACE to start', width / 2, height / 2 - 20);
    ctx.fillText('Use WASD / Arrow keys to move', width / 2, height / 2 + 10);
    ctx.fillText('Press ESC during play to return to menu', width / 2, height / 2 + 40);
    ctx.fillText(`Best Score: ${bestScore}`, width / 2, height / 2 + 80);
    ctx.textAlign = 'left';
  } else if (gameState === 'levelComplete') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Segoe UI';
    ctx.fillText('Level Complete!', width / 2, height / 2);
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Next maze in ${levelCompleteTimer.toFixed(1)}s`, width / 2, height / 2 + 28);
    ctx.fillText('Press R to retry from zero', width / 2, height / 2 + 56);
    ctx.textAlign = 'left';
  } else {
    ctx.fillText(`Score: ${score}`, 14, height - 24);
    ctx.fillText(`Regen in: ${regenTimer.toFixed(1)}s`, 14, height - 44);
    ctx.fillText(`Best: ${bestScore}`, 14, height - 64);
    ctx.fillText('Press ESC for menu, R to restart', 14, height - 84);
  }

  input.enter = false;
  input.escape = false;
  input.retry = false;

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
