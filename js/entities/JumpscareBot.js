import Bot from './Bot.js';

export default class JumpscareBot extends Bot {
  constructor(x, y, options = {}) {
    super(x, y, {
      name: 'Demiurgo',
      color: '#1a0022', // Roxo muito escuro, quase preto
      speed: 55, // Lento
      type: 'jumpscare',
      smartLevel: 0,
      avoidOtherBots: false,
      ...options,
    });
    
    this.dirX = 0;
    this.dirY = 0;
    this.jumpscareCooldown = 0;
    this.pickRandomDirection();
  }

  pickRandomDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
  }

  update(dt, maze, exitWorld, others = [], state = null) {
    if (maze) this.maze = maze;
    this.updateSize();

    if (this.jumpscareCooldown > 0) {
      this.jumpscareCooldown -= dt;
      return; // Fica parado um pouco depois de dar o susto
    }

    const stepX = this.dirX * this.speed * dt;
    const stepY = this.dirY * this.speed * dt;

    // Se bateu na parede, gira pra uma direção aleatória
    const moved = this.tryMove(stepX, stepY, maze);
    if (!moved) {
      this.pickRandomDirection();
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
          
          this.pickRandomDirection(); // Muda o rumo
          break;
        }
      }
    }
  }

  draw(ctx) {
    const pulse = 0.8 + Math.sin(Date.now() / 150) * 0.2;
    ctx.globalAlpha = pulse;
    
    // Corpo
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // "Aura" / Sombra do jumpscare
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10 * pulse;

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  }
}
