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
  }
  findNearestPrey(others) {
    if (!others || others.length === 0) return null;
    let nearest = null;
    let closestDist = Infinity;
    for (const other of others) {
      if (!other || other === this || other.ghostTimer > 0) continue;
      const dist = Math.hypot(other.x - this.x, other.y - this.y);
      if (dist < closestDist) {
        closestDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  update(dt, maze, exitWorld, others = [], state = null) {
    if (maze) this.maze = maze;
    this.updateSize();

    if (this.jumpscareCooldown > 0) {
      this.jumpscareCooldown -= dt;
      return; // Fica parado um pouco depois de dar o susto
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
    if (state) {
      const allTargets = [state.player, ...others];
      for (const target of allTargets) {
        if (!target || target === this || target.ghostTimer > 0) continue;
        
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
            this.jumpscareCooldown = 0.5; // Cooldown baixo pro player
          } else {
            // Se for bot, apenas amaldiçoa e deixa ele parado por 3 segundos
            target.cursedTimer = 3;
            this.jumpscareCooldown = 0.5; // Cooldown baixo pros bots tbm
          }
          break;
        }
      }
    }
  }

  draw(ctx) {
    // Efeito visual similar à onda escura do Live Maze, mas pulsando e maior (igual ao objetivo evasion)
    const pulse = (Math.sin(Date.now() * 0.008 + (this.x + this.y) * 0.1) + 1) / 2;
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
