// FrumbusEscafletado - Item coletável que permite atravessar paredes
export default class FrumbusEscafletado {
  constructor(maze, randomFunc) {
    this.maze = maze;
    this.random = randomFunc || Math.random;
    
    this.state = 'WAITING'; // WAITING, SPAWNED, ACTIVE, COOLDOWN
    this.timer = this.getRandomTime(2, 5);
    
    this.x = 0;
    this.y = 0;
    this.size = 12;
    this.owner = null; // Quem pegou
  }
  
  getRandomTime(min, max) {
    return min + this.random() * (max - min);
  }
  
  spawn() {
    const cell = this.maze.randomOpenCell();
    const pos = this.maze.getCellCenter(cell[0], cell[1]);
    this.x = pos[0];
    this.y = pos[1];
    this.state = 'SPAWNED';
    this.timer = this.getRandomTime(2, 5); // Tempo antes de teleportar se não for pego
  }
  
  update(dt, entities) {
    if (this.state === 'WAITING') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.spawn();
      }
    } else if (this.state === 'SPAWNED') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.spawn(); // Troca de lugar
      } else {
        // Checar colisões com entities
        for (const entity of entities) {
          if (!entity) continue;
          const dist = Math.hypot(entity.x - this.x, entity.y - this.y);
          if (dist < (this.size + (entity.size || 10))) {
            // Coletado!
            this.state = 'ACTIVE';
            this.timer = 5; // 5 segundos de efeito
            this.owner = entity;
            if (typeof entity.activateGhost === 'function') {
              entity.activateGhost(5);
            }
            break;
          }
        }
      }
    } else if (this.state === 'ACTIVE') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'COOLDOWN';
        this.timer = 5; // 5 segundos de cooldown
        this.owner = null;
      }
    } else if (this.state === 'COOLDOWN') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'WAITING';
        this.timer = this.getRandomTime(2, 5);
      }
    }
  }
  
  draw(ctx) {
    if (this.state !== 'SPAWNED') return;
    
    const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(255, 0, 255, ${pulse})`; // Magenta neon
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }
}
