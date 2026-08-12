/** Soft Web Audio tones — no external audio files required. */

import type { TransportMode } from "./transportModes";

const STORAGE_KEY = "relax_maps_sound_muted";
let sharedCtx: AudioContext | null = null;
let audioMuted = false;

if (typeof window !== "undefined") {
  audioMuted = localStorage.getItem(STORAGE_KEY) === "true";
}

export function isAudioMuted(): boolean {
  return audioMuted;
}

export function setAudioMuted(muted: boolean): void {
  audioMuted = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(muted));
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined" || audioMuted) return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

export async function unlockSoothingAudio(): Promise<boolean> {
  if (audioMuted) return false;
  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine"
) {
  if (audioMuted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Gentle rising pad when the map page opens. Returns true if audio started. */
export async function playMapWelcome(): Promise<boolean> {
  if (audioMuted) return false;
  const ready = await unlockSoothingAudio();
  const ctx = getCtx();
  if (!ready || !ctx || ctx.state !== "running") return false;
  const t = ctx.currentTime + 0.05;
  tone(ctx, 261.63, t, 1.6, 0.045);
  tone(ctx, 329.63, t + 0.35, 1.5, 0.035);
  tone(ctx, 392.0, t + 0.7, 1.8, 0.03);
  tone(ctx, 523.25, t + 1.05, 1.4, 0.025);
  return true;
}

/** Soft chime when Go starts navigation. */
export async function playGoChime(): Promise<void> {
  if (audioMuted) return;
  await unlockSoothingAudio();
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  tone(ctx, 392.0, t, 0.55, 0.05);
  tone(ctx, 523.25, t + 0.12, 0.7, 0.04);
  tone(ctx, 659.25, t + 0.28, 0.9, 0.03);
}

/** Distinct soft motif for each transport mode button. */
export async function playModeSound(mode: TransportMode): Promise<void> {
  if (audioMuted) return;
  await unlockSoothingAudio();
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;

  if (mode === "walk") {
    // Soft stepwise climb
    tone(ctx, 293.66, t, 0.45, 0.04);
    tone(ctx, 349.23, t + 0.18, 0.5, 0.035);
    tone(ctx, 440.0, t + 0.36, 0.65, 0.03);
    return;
  }
  if (mode === "cycle") {
    // Light rolling triad
    tone(ctx, 349.23, t, 0.55, 0.04, "triangle");
    tone(ctx, 523.25, t + 0.1, 0.6, 0.035, "triangle");
    tone(ctx, 698.46, t + 0.22, 0.7, 0.03, "triangle");
    return;
  }
  if (mode === "drive") {
    // Deeper, steadier pair
    tone(ctx, 196.0, t, 0.7, 0.05);
    tone(ctx, 246.94, t + 0.15, 0.75, 0.04);
    tone(ctx, 311.13, t + 0.35, 0.55, 0.03);
    return;
  }
  // transit — open fifth + soft chime
  tone(ctx, 261.63, t, 0.8, 0.04);
  tone(ctx, 392.0, t + 0.05, 0.85, 0.035);
  tone(ctx, 523.25, t + 0.4, 0.55, 0.03, "triangle");
}

