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

  // Adicionamos o parâmetro 'delay' (em segundos) para criar melodias
  playTone(freq, duration, type = 'sine', gain = 0.18, delay = 0) {
    const now = this.audioCtx.currentTime + delay;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = freq;
    
    // O volume sobe no tempo exato agendado e decai
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  wallHit() {
    this.playTone(180, 0.08, 'square', 0.18);
  }

  mazeRegenerate() {
    this.playTone(380, 0.12, 'sawtooth', 0.16);
    this.playTone(620, 0.06, 'sine', 0.1);
  }

  // --- NOVAS MÚSICAS / JINGLES ---

  // 1. Jogador Ganha: Proporções Pitagóricas (Acorde Maior)
  // Som heroico, ascendente e com onda 'triangle' que soa suave como um videogame antigo.
  playerWin() {
    this.playTone(262, 0.2, 'triangle', 0.2, 0);       // Nota Dó (C)
    this.playTone(330, 0.2, 'triangle', 0.2, 0.15);    // Nota Mi (E)
    this.playTone(392, 0.2, 'triangle', 0.2, 0.3);     // Nota Sol (G)
    this.playTone(523, 0.6, 'triangle', 0.2, 0.45);    // Dó mais agudo (Oitava) segurado por mais tempo
  }

  // 2. Bot Ganha: Robótico e Descendente
  // Usa ondas 'square' (quadradas), que soam artificiais e robóticas, caindo de tom.
  botWin() {
    this.playTone(600, 0.15, 'square', 0.15, 0);       // Bip alto
    this.playTone(450, 0.15, 'square', 0.15, 0.2);     // Bip médio
    this.playTone(300, 0.5, 'square', 0.15, 0.4);      // Bip grave ("womp womp" robótico)
  }

  // 3. O Tempo Acaba: Dissonância e Glitch
  // Usa o "Trítono" (uma proporção matemática de notas que o cérebro acha muito instável e assustadora) e ondas 'sawtooth' rasgadas.
  timeOut() {
    this.playTone(300, 0.3, 'sawtooth', 0.2, 0);       // Som base
    this.playTone(424, 0.3, 'sawtooth', 0.2, 0);       // Trítono tocando junto (Gera tensão/alarme)
    
    this.playTone(200, 0.3, 'sawtooth', 0.2, 0.2);     // Cai para um tom mais grave
    this.playTone(283, 0.3, 'sawtooth', 0.2, 0.2);     // Trítono acompanhando
    
    this.playTone(100, 0.6, 'square', 0.3, 0.4);       // "Queda de energia" final e grave
  }

// Trilha sonora procedural (Bumbo + Baixo + Arpejo)
  playBeat(tension = 0) {
    // 1. O Bumbo (Kick) original
    this.playTone(60, 0.15, 'sine', 0.5); 
    this.playTone(120, 0.05, 'triangle', 0.2); 
    
    // 2. Chimbau (Hi-hat) eletrônico agudo para dar ritmo
    this.playTone(6000, 0.03, 'square', 0.05);

    // 3. A Escala Musical do Suspense (Dó Menor Pentatônica)
    // Frequências: Dó, Mi bemol, Fá, Sol, Si bemol
    const scale = [262, 311, 349, 392, 466]; 
    const randomNote = scale[Math.floor(Math.random() * scale.length)];

    // 4. A Matemática da Tensão (Muda o som conforme o tempo acaba)
    // Se a tensão passar de 70%, o som pula uma oitava (fica mais agudo e urgente)
    const octave = tension > 0.7 ? 2 : 1; 
    
    // Se a tensão passar de 50%, a onda muda de 'square' (videogame) para 'sawtooth' (rasgada/alerta)
    const waveType = tension > 0.5 ? 'sawtooth' : 'square';
    
    // O volume do baixo aumenta levemente junto com a tensão
    const synthVolume = 0.08 + (tension * 0.07);

    // 5. Toca o Sintetizador (Baixo/Arpejo)
    this.playTone(randomNote * octave, 0.15, waveType, synthVolume);
    
    // Adiciona uma nota grave constante de fundo se a tensão estiver muito alta
    if (tension > 0.8) {
      this.playTone(131, 0.1, 'sawtooth', 0.15); // Dó grave pulsando
    }
  }
}