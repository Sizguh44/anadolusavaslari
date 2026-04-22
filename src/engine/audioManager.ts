const STORAGE_KEY_VOLUME = 'as_audio_volume';
const STORAGE_KEY_MUTED = 'as_audio_muted';

/**
 * Web Audio API, bazı ortamlarda (jsdom test, SSR, çok eski tarayıcılar)
 * mevcut olmayabilir. Tarayıcıda "AudioContext" veya "webkitAudioContext"
 * hangisi varsa onu döneriz; hiçbiri yoksa null — bu durumda tüm motor
 * no-op çalışır.
 */
function resolveAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/* ── Procedural ambient BGM engine (Web Audio API) ──────────── *
 *  La minör atmosferik müzik: drone + pad akorlar + seyrek melodi
 *  Gerilimli, sanatsal, arka planda çalıp yormayan              */

// La minör pentatonik melodi frekansları (A3–D5)
const MELODY_FREQS = [
  220.00, 261.63, 293.66, 329.63, 392.00,   // A3 C4 D4 E4 G4
  440.00, 523.25, 587.33,                     // A4 C5 D5
];

// Pad akor setleri (La minör çevresi)
const CHORD_SETS: number[][] = [
  [110.00, 130.81, 164.81],   // Am :  A2 C3 E3
  [146.83, 174.61, 220.00],   // Dm :  D3 F3 A3
  [130.81, 164.81, 196.00],   // C  :  C3 E3 G3
  [164.81, 196.00, 246.94],   // Em :  E3 G3 B3
];

class ProceduralBGM {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private isPlaying = false;
  private timers: number[] = [];
  private activeOscillators: OscillatorNode[] = [];

  start(volume: number) {
    if (this.isPlaying) return;
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.isPlaying = true;

    // ── Master gain ──
    this.master = this.ctx.createGain();
    this.master.gain.value = volume * 0.35;
    this.master.connect(this.ctx.destination);

    // ── Global low-pass filter (sıcak, yumuşak ton) ──
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 900;
    lpf.Q.value = 0.7;
    lpf.connect(this.master);

    // ── Çok yavaş LFO → filtre cutoff üzerinde hareket ──
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.04;
    const lfoAmp = this.ctx.createGain();
    lfoAmp.gain.value = 500;
    lfo.connect(lfoAmp);
    lfoAmp.connect(lpf.frequency);
    lfo.start();
    this.activeOscillators.push(lfo);

    this.createDrone(lpf);
    this.schedulePadChords(lpf);
    this.scheduleMelody(lpf);
  }

  /* Sürekli drone: kök nota + beşli + alt oktav */
  private createDrone(dest: AudioNode) {
    if (!this.ctx) return;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.22;
    droneGain.connect(dest);

    const tones: [number, number][] = [[110, 0.45], [164.81, 0.28], [55, 0.18]];
    for (const [freq, vol] of tones) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      osc.connect(g);
      g.connect(droneGain);
      osc.start();
      this.activeOscillators.push(osc);
    }
  }

  /* Yavaş döngüsel pad akorları (≈8 sn/akor) */
  private schedulePadChords(dest: AudioNode) {
    let chordIdx = 0;
    const playChord = () => {
      if (!this.ctx || !this.isPlaying) return;
      const chord = CHORD_SETS[chordIdx % CHORD_SETS.length];
      chordIdx++;

      const padGain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.12, now + 3);
      padGain.gain.setValueAtTime(0.12, now + 5);
      padGain.gain.linearRampToValueAtTime(0, now + 8);
      padGain.connect(dest);

      for (const freq of chord) {
        // Her nota iki hafif detune osilatör → zengin pad dokusu
        for (const detune of [-5, 5]) {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          osc.connect(padGain);
          osc.start(now);
          osc.stop(now + 9);
        }
      }

      this.timers.push(window.setTimeout(playChord, 8000));
    };
    playChord();
  }

  /* Seyrek melodi notaları (3–8 sn aralık, yavaş attack/release) */
  private scheduleMelody(dest: AudioNode) {
    const playNote = () => {
      if (!this.ctx || !this.isPlaying) return;
      const freq = MELODY_FREQS[Math.floor(Math.random() * MELODY_FREQS.length)];
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const env = this.ctx.createGain();
      const now = this.ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.15, now + 1.4);
      env.gain.setValueAtTime(0.15, now + 2.2);
      env.gain.linearRampToValueAtTime(0, now + 4.2);

      osc.connect(env);
      env.connect(dest);
      osc.start(now);
      osc.stop(now + 4.5);

      this.timers.push(
        window.setTimeout(playNote, 3000 + Math.random() * 5000),
      );
    };
    this.timers.push(window.setTimeout(playNote, 2000));
  }

  setVolume(v: number) {
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(
        v * 0.35,
        this.ctx.currentTime + 0.1,
      );
    }
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.activeOscillators.forEach((o) => {
      try { o.stop(); } catch { /* already stopped */ }
    });
    this.activeOscillators = [];
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  get playing() {
    return this.isPlaying;
  }
}

/* ── Public AudioManager (aynı API) ────────────────────────── */

class AudioManager {
  private bgm = new ProceduralBGM();
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const v = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (v !== null) this.volume = parseFloat(v);
      const m = localStorage.getItem(STORAGE_KEY_MUTED);
      if (m !== null) this.isMuted = m === 'true';
    } catch { /* localStorage unavailable */ }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, this.volume.toString());
      localStorage.setItem(STORAGE_KEY_MUTED, this.isMuted.toString());
    } catch { /* ignore */ }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  public playContext() {
    if (!this.isInitialized) this.init();
    if (this.isMuted) return;
    if (!this.bgm.playing) {
      this.bgm.start(this.volume);
    }
  }

  public pause() {
    this.bgm.stop();
  }

  public setVolume(newVolume: number) {
    this.volume = Math.max(0, Math.min(1, newVolume));

    if (this.volume === 0) {
      this.isMuted = true;
      this.bgm.stop();
    } else {
      this.bgm.setVolume(this.volume);
      if (this.isMuted) {
        this.isMuted = false;
        this.playContext();
      }
    }

    this.saveSettings();
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.bgm.stop();
    } else {
      if (this.volume <= 0) this.volume = 0.5;
      this.playContext();
    }

    this.saveSettings();
    this.notify();
  }

  public getVolume() { return this.volume; }
  public getIsMuted() { return this.isMuted; }
}

export const audioManager = new AudioManager();
