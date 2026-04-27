import Bot from './Bot.js';

export default class JumpscareBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Demiurgo',
      color: '#1a0022', // Roxo muito escuro, quase preto
      speed: 55, // Lento
      type: 'jumpscare',
      smartLevel: 0,
      ...options,
    });
    this.jumpscareCooldown = 0;
    this.catchCount = 0;
    this.baseSpeed = this.speed;
    this.ignoredTargets = new Set(); // Alvos que já foram pegos nesse ciclo
    this.hasMultiplied = false;
  }
  findNearestPrey(others) {
    if (!others || others.length === 0) return null;
    let nearest = null;
    let closestDist = Infinity;
    for (const other of others) {
      if (!other || other === this || other.ghostTimer > 0 || this.ignoredTargets.has(other)) continue;
      const dist = Math.hypot(other.x - this.x, other.y - this.y);
      if (dist < closestDist) {
        closestDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  update(dt, maze, exitWorld, others = [], state = null, newBotsArray = null) {
    if (maze) this.maze = maze;
    this.updateSize();

    if (this.jumpscareCooldown > 0) {
      this.jumpscareCooldown -= dt;
    }

    // Caça a presa mais próxima (Player ou outros bots)
    if (state) {
      const allTargets = [state.player, ...others];
      const prey = this.findNearestPrey(allTargets);
      if (prey) {
        this.smartMove(dt, maze, [prey.x, prey.y], allTargets);
      }
    }

    // Checa colisão com o jogador ou outros bots para dar o jumpscare
    if (state && this.jumpscareCooldown <= 0) {
      const allTargets = [state.player, ...others];
      for (const target of allTargets) {
        if (!target || target === this || target.ghostTimer > 0 || this.ignoredTargets.has(target)) continue;
        
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist < (this.size + target.size) * 0.9) {
          
          if (target === state.player) {
            // Bateu no jogador! Dá o Jumpscare!
            if (state.juice) {
               state.juice.localShake(2.5, 10); // Tremedeira monstruosa
               if (typeof state.juice.triggerJumpscare === 'function') {
                 state.juice.triggerJumpscare();
               }
            }
            if (state.game && state.game.audio && typeof state.game.audio.wallHit === 'function') {
               state.game.audio.wallHit(); 
            }
          }
          
          target.cursedTimer = 3; // O alvo fica parado por 3 segundos (player ou bot)
          this.jumpscareCooldown = 0.5; // Cooldown baixo pro Demiurgo
          
          // Incrementa as capturas e velocidade
          this.ignoredTargets.add(target);
          this.catchCount++;
          this.speed = Math.min(150, this.speed + 15); // Máximo de 150
          
          if (this.catchCount >= 4) {
            this.catchCount = 0;
            this.ignoredTargets.clear(); // Libera todos para poder pegar novamente
            
            // Um demiurgo só pode se multiplicar 1 vez!
            if (!this.hasMultiplied && newBotsArray) {
              this.hasMultiplied = true;
              this.speed = this.speed / 2; // A velocidade atual é dividida entre os dois
              
              const [cx, cy] = maze.randomOpenCell();
              const [nx, ny] = maze.getCellCenter(cx, cy);
              // O novo nasce com a metade da velocidade e pode se multiplicar 1 vez no futuro
              newBotsArray.push(new JumpscareBot(nx, ny, { maze: maze, speed: this.speed }));
            }
          }
          
          break;
        }
      }
    }
  }

  draw(ctx) {
    // Sincroniza exatamente com a célula do Live Maze em que ele está
    let gridX = 0;
    let gridY = 0;
    if (this.maze) {
      gridX = Math.floor((this.x - this.maze.originX) / this.maze.tileSize);
      gridY = Math.floor((this.y - this.maze.originY) / this.maze.tileSize);
    }
    const pulse = (Math.sin(Date.now() * 0.008 + (gridX + gridY) * 0.1) + 1) / 2;
    const hue = 270 + pulse * 30; // Roxo a magenta
    const intensity = (0.4 + (pulse * 0.35));
    
    ctx.fillStyle = `hsla(${hue}, 100%, ${30 + pulse * 20}%, ${intensity})`;
    
    // O tamanho visual imita a pulsação do EvasionBot
    const visualPulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
    const radius = (this.size * 0.5) * (0.9 + visualPulse * 0.25) * 1.35; // Bem grande e assustador
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Borda pulsante similar à parede
    ctx.strokeStyle = `rgba(${200 + pulse * 55}, 100, 255, ${pulse * 0.7})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
  }
}
