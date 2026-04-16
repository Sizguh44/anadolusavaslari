import { audioManager } from './audioManager';

/* ── Procedural SFX engine (Web Audio API) ──────────────────── *
 *  Tüm ses efektleri tamamen prosedürel olarak üretilir.        *
 *  Hiçbir harici ses dosyası gerektirmez.                       */

function getCtx(): AudioContext | null {
  if (audioManager.getIsMuted()) return null;
  return new AudioContext();
}

function masterGain(ctx: AudioContext): GainNode {
  const g = ctx.createGain();
  g.gain.value = audioManager.getVolume() * 0.6;
  g.connect(ctx.destination);
  return g;
}

/* Beyaz gürültü üretici (savaş/kalabalık için kullanılır) */
function whiteNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

/* ───────────────────────────────────────────────────────────── *
 *  SALDIRI  — kılıç çarpışmaları + top patlaması + uğultu     *
 * ───────────────────────────────────────────────────────────── */
export function playAttackSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  // ── Kılıç çarpma sesleri (metalik kling kling) ──
  for (let i = 0; i < 5; i++) {
    const t = now + i * 0.18 + Math.random() * 0.08;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 2000 + Math.random() * 3000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.25, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 1500;

    osc.connect(hpf);
    hpf.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // ── Top patlama sesi (düşük frekans boom) ──
  for (const offset of [0.1, 0.55, 0.9]) {
    const t = now + offset;
    const noise = whiteNoise(ctx, 0.6);
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;
    lpf.Q.value = 1;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    noise.connect(lpf);
    lpf.connect(env);
    env.connect(master);
    noise.start(t);
    noise.stop(t + 0.6);

    // Sub bass punch
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0.4, t);
    subEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    sub.connect(subEnv);
    subEnv.connect(master);
    sub.start(t);
    sub.stop(t + 0.5);
  }

  // ── Savaş uğultusu (band-pass gürültü) ──
  const crowd = whiteNoise(ctx, 1.6);
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 600;
  bpf.Q.value = 2;
  const crowdEnv = ctx.createGain();
  crowdEnv.gain.setValueAtTime(0, now);
  crowdEnv.gain.linearRampToValueAtTime(0.18, now + 0.2);
  crowdEnv.gain.setValueAtTime(0.18, now + 1.0);
  crowdEnv.gain.linearRampToValueAtTime(0, now + 1.6);
  crowd.connect(bpf);
  bpf.connect(crowdEnv);
  crowdEnv.connect(master);
  crowd.start(now);
  crowd.stop(now + 1.6);

  setTimeout(() => ctx.close(), 2500);
}

/* ───────────────────────────────────────────────────────────── *
 *  İLHAK  — halkın coşku sesleri (tezahürat)                  *
 * ───────────────────────────────────────────────────────────── */
export function playAnnexSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  // ── Kalabalık tezahüratı (formant benzeri bant geçiren gürültü) ──
  const formants = [500, 800, 1200, 1800];
  for (const f of formants) {
    const noise = whiteNoise(ctx, 1.8);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 4 + Math.random() * 2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.12, now + 0.15);
    env.gain.setValueAtTime(0.12, now + 0.6);
    env.gain.linearRampToValueAtTime(0.18, now + 0.8);
    env.gain.linearRampToValueAtTime(0, now + 1.8);
    noise.connect(bp);
    bp.connect(env);
    env.connect(master);
    noise.start(now);
    noise.stop(now + 1.8);
  }

  // ── Coşku "wooo" dalgası (yükselen sinüsler) ──
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.3;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300 + i * 60, t);
    osc.frequency.linearRampToValueAtTime(500 + i * 80, t + 0.4);
    osc.frequency.linearRampToValueAtTime(350 + i * 40, t + 0.8);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.08, t + 0.1);
    env.gain.linearRampToValueAtTime(0, t + 0.9);
    osc.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 1.0);
  }

  // ── Alkış ritmi (kısa gürültü burst'leri) ──
  for (let i = 0; i < 8; i++) {
    const t = now + 0.3 + i * 0.12 + Math.random() * 0.04;
    const n = whiteNoise(ctx, 0.05);
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 3000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.15, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    n.connect(hpf);
    hpf.connect(env);
    env.connect(master);
    n.start(t);
    n.stop(t + 0.05);
  }

  setTimeout(() => ctx.close(), 2500);
}

/* ───────────────────────────────────────────────────────────── *
 *  SUR İNŞA  — çekiç darbeleri (metal + ahşap)                *
 * ───────────────────────────────────────────────────────────── */
export function playBuildFortSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  // ── Üç çekiç darbesi ──
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.28;

    // Metalik çarpma (yüksek frekans)
    const metal = ctx.createOscillator();
    metal.type = 'square';
    metal.frequency.value = 800 + Math.random() * 400;
    const mEnv = ctx.createGain();
    mEnv.gain.setValueAtTime(0, t);
    mEnv.gain.linearRampToValueAtTime(0.3, t + 0.003);
    mEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    metal.connect(mEnv);
    mEnv.connect(master);
    metal.start(t);
    metal.stop(t + 0.18);

    // Ahşap gövde (düşük thud)
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(200, t);
    thud.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    const tEnv = ctx.createGain();
    tEnv.gain.setValueAtTime(0.25, t);
    tEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    thud.connect(tEnv);
    tEnv.connect(master);
    thud.start(t);
    thud.stop(t + 0.25);

    // Taş/metal yankı
    const ring = ctx.createOscillator();
    ring.type = 'triangle';
    ring.frequency.value = 1200 + i * 200;
    const rEnv = ctx.createGain();
    rEnv.gain.setValueAtTime(0, t + 0.005);
    rEnv.gain.linearRampToValueAtTime(0.08, t + 0.01);
    rEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    ring.connect(rEnv);
    rEnv.connect(master);
    ring.start(t);
    ring.stop(t + 0.4);
  }

  setTimeout(() => ctx.close(), 1500);
}

/* ───────────────────────────────────────────────────────────── *
 *  ORDU ÜRETİMİ  — nizami yürüyen tabur ayak sesleri          *
 * ───────────────────────────────────────────────────────────── */
export function playBuildArmySfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  // Marş temposu: ~120 BPM → 0.25s aralık, 8 adım
  const stepInterval = 0.25;
  const steps = 8;

  for (let i = 0; i < steps; i++) {
    const t = now + i * stepInterval;
    // Her adımda sol/sağ ayak varyasyonu
    const isLeft = i % 2 === 0;
    const basePitch = isLeft ? 100 : 120;

    // ── Ayak vuruşu (gürültü + düşük frek.) ──
    const noise = whiteNoise(ctx, 0.08);
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = isLeft ? 600 : 800;
    const nEnv = ctx.createGain();
    nEnv.gain.setValueAtTime(0.2, t);
    nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    noise.connect(lpf);
    lpf.connect(nEnv);
    nEnv.connect(master);
    noise.start(t);
    noise.stop(t + 0.08);

    // ── Ayak vuruş etkisi (sub thump) ──
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(basePitch, t);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    const tEnv = ctx.createGain();
    tEnv.gain.setValueAtTime(0.22, t);
    tEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    thump.connect(tEnv);
    tEnv.connect(master);
    thump.start(t);
    thump.stop(t + 0.12);
  }

  // ── Zırh şıngırtısı (her 2 adımda hafif metalik ses) ──
  for (let i = 0; i < steps; i += 2) {
    const t = now + i * stepInterval + 0.02;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 3000 + Math.random() * 2000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.04, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  setTimeout(() => ctx.close(), 3000);
}

/* ───────────────────────────────────────────────────────────── *
 *  UI TIKLAMASI  — kısa, temiz tık sesi                       *
 * ───────────────────────────────────────────────────────────── */
export function playClickSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.2, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(env);
  env.connect(master);
  osc.start(now);
  osc.stop(now + 0.08);

  setTimeout(() => ctx.close(), 300);
}

/* ───────────────────────────────────────────────────────────── *
 *  TUR SONU  — davul benzeri düşük boom + boru                 *
 * ───────────────────────────────────────────────────────────── */
export function playEndTurnSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  // ── Davul vuruşu ──
  const kick = ctx.createOscillator();
  kick.type = 'sine';
  kick.frequency.setValueAtTime(150, now);
  kick.frequency.exponentialRampToValueAtTime(50, now + 0.2);
  const kEnv = ctx.createGain();
  kEnv.gain.setValueAtTime(0.35, now);
  kEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  kick.connect(kEnv);
  kEnv.connect(master);
  kick.start(now);
  kick.stop(now + 0.35);

  // ── Boru sesi (kısa bugle) ──
  const horn = ctx.createOscillator();
  horn.type = 'sawtooth';
  horn.frequency.setValueAtTime(440, now + 0.05);
  horn.frequency.linearRampToValueAtTime(523, now + 0.15);
  horn.frequency.setValueAtTime(523, now + 0.35);
  const hLpf = ctx.createBiquadFilter();
  hLpf.type = 'lowpass';
  hLpf.frequency.value = 1200;
  const hEnv = ctx.createGain();
  hEnv.gain.setValueAtTime(0, now + 0.05);
  hEnv.gain.linearRampToValueAtTime(0.12, now + 0.1);
  hEnv.gain.setValueAtTime(0.12, now + 0.3);
  hEnv.gain.linearRampToValueAtTime(0, now + 0.5);
  horn.connect(hLpf);
  hLpf.connect(hEnv);
  hEnv.connect(master);
  horn.start(now + 0.05);
  horn.stop(now + 0.55);

  setTimeout(() => ctx.close(), 1000);
}

/* ───────────────────────────────────────────────────────────── *
 *  BAŞKENT SEÇİMİ  — görkemli trompet fanfar                  *
 * ───────────────────────────────────────────────────────────── */
export function playCapitalSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  const master = masterGain(ctx);
  const now = ctx.currentTime;

  // Kısa fanfar: C5 → E5 → G5
  const notes = [523.25, 659.25, 783.99];
  for (let i = 0; i < notes.length; i++) {
    const t = now + i * 0.2;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = notes[i];
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 1500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.15, t + 0.05);
    env.gain.setValueAtTime(0.15, t + 0.15);
    env.gain.linearRampToValueAtTime(0, t + 0.4);
    osc.connect(lpf);
    lpf.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  setTimeout(() => ctx.close(), 1500);
}
