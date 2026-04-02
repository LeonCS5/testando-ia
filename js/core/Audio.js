export default class Audio {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // --- SISTEMA DE PLAYLIST ---
    this.playlist = ['cyberpunk', 'metal', 'arcade']; 
    this.currentTrack = 'cyberpunk'; 
    this.step = 0; 
  }

  resume() {
    if (this.audioCtx.state === 'suspended') {
      return this.audioCtx.resume();
    }
    return Promise.resolve();
  }

  // Sorteia uma música diferente toda vez que o nível reinicia
  shuffleTrack() {
    const randomIndex = Math.floor(Math.random() * this.playlist.length);
    this.currentTrack = this.playlist[randomIndex];
    this.step = 0; // Zera a contagem para a música não começar atravessada
    console.log("Tocando agora a trilha:", this.currentTrack);
  }

  // --- MOTOR DE ÁUDIO E EFEITOS BASE ---

  playTone(freq, duration, type = 'sine', gain = 0.18, delay = 0, filterFreq = 20000) {
    const now = this.audioCtx.currentTime + delay;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter(); 

    oscillator.type = type;
    oscillator.frequency.value = freq;

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

  playModernKick() {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  makeDistortionCurve(amount = 50) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  playGuitarChug(freq, delay = 0) {
    const now = this.audioCtx.currentTime + delay;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    
    const distortion = this.audioCtx.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(400); 
    distortion.oversample = '4x';

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // --- EFEITOS SONOROS DO JOGO ---

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

  // --- O MAESTRO (ROTEADOR DE MÚSICA) ---
  
  playBeat(tension = 0) {
    this.step++; // Avança um passo no tempo eternamente

    if (this.currentTrack === 'cyberpunk') {
      this.playCyberpunk(tension);
    } else if (this.currentTrack === 'metal') {
      this.playMetal(tension);
    } else if (this.currentTrack === 'arcade') {
      this.playArcade(tension);
    }
  }

    // --- AS FAIXAS DA PLAYLIST (VERSÃO TURBO) ---

  playCyberpunk(tension) {
    const step4 = this.step % 4;

    // 1. RITMO E KICK (Sempre ativo)
    if (step4 === 0 || step4 === 2) this.playModernKick();
    if (step4 === 1 || step4 === 3) {
      this.playTone(250, 0.15, 'sawtooth', 0.1, 0, 4000); 
      setTimeout(() => { 
        if (this.audioCtx.state === 'running') this.playTone(8000, 0.1, 'square', 0.05, 0, 10000); 
      }, 15);
    }

    // 2. HI-HAT (Prato constante para dar preenchimento)
    this.playTone(10000, 0.04, 'square', 0.02, 0, 15000);
    setTimeout(() => {
      if (this.audioCtx.state === 'running') this.playTone(10000, 0.03, 'square', 0.01, 0, 15000);
    }, 70);

    // 3. BAIXO DARKSYNTH (Sempre ativo, o filtro abre com a tensão)
    const bassNotes = [65.41, 73.42, 77.78, 98.00]; 
    const filterOpen = 1200 + (tension * 2500); 
    this.playTone(bassNotes[step4], 0.25, 'sawtooth', 0.18 + (tension * 0.1), 0, filterOpen);

    // 4. ARPEJADOR (Agora entra quase IMEDIATAMENTE - aos 5% de tensão)
    if (tension > 0.05) { 
      const arpeggioNotes = [261.63, 311.13, 392.00, 466.16, 523.25];
      const randomArp = arpeggioNotes[Math.floor(Math.random() * arpeggioNotes.length)];
      const arpOctave = tension > 0.6 ? 2 : 1; 
      this.playTone(randomArp * arpOctave, 0.2, 'sine', 0.12 + (tension * 0.1), 0, 5000);
    }

    // 5. SIRENE CRÍTICA (Entra quando falta pouco tempo - 70%)
    if (tension > 0.7 && step4 === 0) {
      this.playTone(800, 0.4, 'sawtooth', 0.12); 
      this.playTone(820, 0.4, 'sawtooth', 0.12); 
    }
  }

  playMetal(tension) {
    const step8 = this.step % 8;

    // 1. BUMBO DUPLO (Sempre ativo)
    if (step8 % 2 === 0) this.playModernKick(); 
    
    // 2. PRATO DE CONDUÇÃO (Preenche as frequências altas no Metal)
    this.playTone(12000, 0.02, 'square', 0.03, 0, 15000);

    // 3. GUITARRA CHUG (Sempre ativa)
    if (step8 === 0 || step8 === 1 || step8 === 4 || step8 === 5) {
      this.playGuitarChug(41.2, 0); // Corda Mi solta
    }
    if (step8 === 6) {
      this.playGuitarChug(46.2, 0); // Variação de nota (F#)
    }

    // 4. BAIXO SUSTENTADO (Adiciona "peso" extra a partir de 40% de tensão)
    if (tension > 0.4 && step8 === 0) {
      this.playTone(82.4, 0.5, 'sawtooth', 0.12, 0, 500);
    }
  }

  playArcade(tension) {
    const step4 = this.step % 4;
    
    // 1. BUMBO QUADRADO (Sempre ativo)
    if (step4 === 0) {
      this.playTone(60, 0.15, 'square', 0.3); 
    }
    
    // 2. MELODIA DE 8-BITS (Agora entra logo no começo - 10% de tensão)
    if (tension > 0.1) {
      const notes = [440, 523, 659, 783]; // Notas da escala
      const currentNote = notes[this.step % notes.length];
      this.playTone(currentNote, 0.1, 'triangle', 0.1);
    }

    // 3. RUÍDO DIGITAL (Entra para causar confusão aos 60% de tensão)
    if (tension > 0.6 && step4 % 2 !== 0) {
      this.playTone(2000, 0.05, 'square', 0.05, 0, 1000);
    }
  }
}