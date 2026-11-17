// Synthesised sound, no audio files: short WebAudio blips whose pitch climbs with the combo,
// a low thud for a hit, a shimmer for a level-up. Nothing plays until the player first
// interacts (the browser's autoplay rule), and M mutes everything.
export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = 0) {
    if (muted) return;
    const audio = ensure();
    if (!audio) return;
    try {
      const start = audio.currentTime + when;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  return {
    /** Call from a user gesture so the browser lets audio start. */
    unlock() {
      const audio = ensure();
      if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
    },
    get muted() {
      return muted;
    },
    collect(combo) {
      const base = 420 * Math.pow(1.059, Math.min(combo, 12));
      tone(base, 0.14, 'sine', 0.16);
      tone(base * 1.5, 0.1, 'sine', 0.07, 0.03);
    },
    offCollect() {
      tone(240, 0.08, 'triangle', 0.07);
    },
    hit() {
      tone(140, 0.28, 'sawtooth', 0.2, 0, 55);
      tone(70, 0.32, 'square', 0.1, 0, 40);
    },
    dash() {
      tone(300, 0.16, 'sine', 0.1, 0, 900);
    },
    power() {
      tone(520, 0.12, 'sine', 0.12);
      tone(780, 0.16, 'sine', 0.1, 0.08);
    },
    levelUp() {
      [523, 659, 784, 1047].forEach((freq, index) => tone(freq, 0.18, 'sine', 0.11, index * 0.07));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((freq, index) => tone(freq, 0.3, 'sine', 0.12, index * 0.1));
    },
    over() {
      [392, 330, 262, 196].forEach((freq, index) => tone(freq, 0.3, 'triangle', 0.11, index * 0.12));
    },
  };
}
