// src/utils/heavenlySound.js
// Lightweight Web Audio API synthesizer for heavenly game sound effects
// 100% zero external audio asset dependency; runs instantly in any modern browser.

let soundEnabled = true;

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  return soundEnabled;
}

export function toggleSoundEnabled() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  } catch (e) {
    return null;
  }
}

/**
 * Heavenly equip sound (sparkling ascending celestial chime)
 */
export function playEquipSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major chime)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.5);
    });
  } catch (e) {
    // Ignore audio error on restricted autoplay
  }
}

/**
 * Heavenly unequip sound (gentle descending chime)
 */
export function playUnequipSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [783.99, 659.25, 523.25]; // G5, E5, C5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  } catch (e) {
    // Ignore
  }
}

/**
 * Heavenly victory / Level up sound (triumphant celestial harp flourish)
 */
export function playLevelUpSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major triumphant chime

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.7);
    });
  } catch (e) {
    // Ignore
  }
}
