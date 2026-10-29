// Procedural Web Audio API sound generator for traditional Persian Dooz game
// No external audio assets needed! Works completely offline on Android & Web.

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// Trigger haptic vibration on Android devices if supported
export function triggerHaptic(pattern: number | number[] = 25) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Chrome requires user activation before vibrate
      if ((navigator as any).userActivation?.hasBeenActive) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors if restricted
    }
  }
}

// Sound 1: Stone tap/placement on wooden board
export function playStonePlaceSound() {
  if (!soundEnabled) return;
  triggerHaptic(20);
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(280 + Math.random() * 40, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.09);
}

// Sound 2: Stone selection/pick up
export function playStoneSelectSound() {
  if (!soundEnabled) return;
  triggerHaptic(15);
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.06); // D5

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

// Sound 3: Dooz completed! (Traditional Persian Santur arpeggio)
export function playDoozChimeSound() {
  if (!soundEnabled) return;
  triggerHaptic([40, 60, 80]);
  const ctx = getAudioContext();
  if (!ctx) return;

  // Persian Santur scale notes: D4, F4, G4, A4, D5
  const notes = [293.66, 349.23, 392.0, 440.0, 587.33];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

    gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.07);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.07);
    osc.stop(ctx.currentTime + idx * 0.07 + 0.38);
  });
}

// Sound 4: Remove opponent stone (سوزاندن مهره)
export function playStoneCaptureSound() {
  if (!soundEnabled) return;
  triggerHaptic([50, 40]);
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.16);

  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.17);
}

// Sound 5: Victory fanfare
export function playVictorySound() {
  if (!soundEnabled) return;
  triggerHaptic([100, 50, 100, 50, 150]);
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [392, 440, 523.25, 659.25, 783.99]; // G4, A4, C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.65);
  });
}
