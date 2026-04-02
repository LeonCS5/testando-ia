export default class Audio {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  resume() {
    if (this.audioCtx.state === 'suspended') {
      return this.audioCtx.resume();
    }
    return Promise.resolve();
  }

  // 1. O NOVO MOTOR DE ÁUDIO (Com Filtro Analógico)
  playTone(freq, duration, type = 'sine', gain = 0.18, delay = 0, filterFreq = 20000) {
    const now = this.audioCtx.currentTime + delay;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter(); 

    oscillator.type = type;
    oscillator.frequency.value = freq;

    // Se o filtro for menor que 20000, ele cria o som "moderno" e abafado
    filter.type = 'lowpass';
    if (filterFreq < 20000) {
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + duration);
    } else {
      filter.frequency.value = filterFreq;
    }

    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // 2. O BUMBO MODERNO (Soco no peito)
  playModernKick() {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    // A frequência cai rápido para dar o "Punch"
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // --- EFEITOS SONOROS ANTIGOS ---
  wallHit() {
    this.playTone(180, 0.08, 'square', 0.18);
  }

  mazeRegenerate() {
    this.playTone(380, 0.12, 'sawtooth', 0.16);
    this.playTone(620, 0.06, 'sine', 0.1);
  }

  playerWin() {
    this.playTone(262, 0.2, 'triangle', 0.2, 0);       
    this.playTone(330, 0.2, 'triangle', 0.2, 0.15);    
    this.playTone(392, 0.2, 'triangle', 0.2, 0.3);     
    this.playTone(523, 0.6, 'triangle', 0.2, 0.45);    
  }

  botWin() {
    this.playTone(600, 0.15, 'square', 0.15, 0);       
    this.playTone(450, 0.15, 'square', 0.15, 0.2);     
    this.playTone(300, 0.5, 'square', 0.15, 0.4);      
  }

  timeOut() {
    this.playTone(300, 0.3, 'sawtooth', 0.2, 0);       
    this.playTone(424, 0.3, 'sawtooth', 0.2, 0);       
    this.playTone(200, 0.3, 'sawtooth', 0.2, 0.2);     
    this.playTone(283, 0.3, 'sawtooth', 0.2, 0.2);     
    this.playTone(100, 0.6, 'square', 0.3, 0.4);       
  }

  // --- TRILHA SONORA DARKSYNTH / CYBERPUNK ---
  playBeat(tension = 0) {
    this.step = (this.step === undefined ? 0 : this.step + 1) % 4;

    // 1. KICK (Punch pesado do bumbo moderno)
    if (this.step === 0 || this.step === 2) {
      this.playModernKick();
    }

    // 2. SNARE (Caixa eletrônica / Clap)
    if (this.step === 1 || this.step === 3) {
      this.playTone(250, 0.15, 'sawtooth', 0.1, 0, 4000); 
      setTimeout(() => {
        if (this.audioCtx.state === 'running') this.playTone(8000, 0.1, 'square', 0.05, 0, 10000);
      }, 15);
    }

    // 3. HI-HAT (Prato duplo e rápido)
    this.playTone(10000, 0.04, 'square', 0.02, 0, 15000);
    setTimeout(() => {
      if (this.audioCtx.state === 'running') this.playTone(10000, 0.03, 'square', 0.01, 0, 15000);
    }, 70);

    // 4. BAIXO DARKSYNTH (Com filtro que "abre" com a tensão)
    const bassNotes = [65.41, 73.42, 77.78, 98.00]; 
    const filterOpen = 1200 + (tension * 2500); 
    this.playTone(bassNotes[this.step], 0.25, 'sawtooth', 0.18 + (tension * 0.1), 0, filterOpen);

    // 5. ARPEJADOR DE SUSPENSE (Senoide limpa)
    if (tension > 0.3) {
      const arpeggioNotes = [261.63, 311.13, 392.00, 466.16, 523.25];
      const randomArp = arpeggioNotes[Math.floor(Math.random() * arpeggioNotes.length)];
      const arpOctave = tension > 0.7 ? 2 : 1; 
      this.playTone(randomArp * arpOctave, 0.2, 'sine', 0.15 + (tension * 0.1), 0, 5000);
    }

    // 6. ALARME CRÍTICO (Fim do tempo)
    if (tension > 0.85 && this.step === 0) {
      this.playTone(800, 0.4, 'sawtooth', 0.15); 
      this.playTone(820, 0.4, 'sawtooth', 0.15); 
    }
  }
}