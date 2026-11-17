// The power-up deck of Lumen Tide: what each pickup does, what it looks like, and
// which one the tide deals next. The world still moves the pickups and applies
// them; this file decides the deck, so a new power-up is one table row here plus
// one branch where the world applies it — never a hunt through the renderer.
import { PALETTE } from './config.js';

/**
 * Every power-up the tide can deal. `seconds` is how long a timed effect lasts;
 * 0 means the pickup acts at once. `glyph` is the mark drawn inside its bubble.
 */
export const POWERUP_KINDS = {
  shield: {
    name: 'SHIELD',
    color: PALETTE.good,
    glyph: '◈',
    seconds: 0,
    blurb: 'SHIELD UP — ONE HIT BLOCKED',
  },
  magnet: {
    name: 'MAGNET',
    color: PALETTE.cyan,
    glyph: 'U',
    seconds: 6,
    blurb: 'MAGNET — MOTES FLY TO YOU',
  },
  slow: {
    name: 'SLOW TIDE',
    color: PALETTE.magenta,
    glyph: '◷',
    seconds: 5,
    blurb: 'SLOW TIDE — EVERYTHING DRIFTS',
  },
  frenzy: {
    name: 'FRENZY',
    color: PALETTE.gold,
    glyph: '×2',
    seconds: 8,
    blurb: 'FRENZY — DOUBLE POINTS!',
  },
  heart: {
    name: 'EXTRA LIFE',
    color: '#ff6b81',
    glyph: '♥',
    seconds: 0,
    blurb: 'EXTRA LIFE — THE REEF PROVIDES',
  },
  nova: {
    name: 'NOVA BURST',
    color: '#b06ee8',
    glyph: '✦',
    seconds: 0,
    blurb: 'NOVA BURST — THE URCHINS SHATTER',
  },
};

/** The mark drawn inside a power-up's bubble; unknown kinds fall back to a star. */
export function powerupGlyph(kind) {
  const def = POWERUP_KINDS[kind];
  return def ? def.glyph : '✦';
}

/** The display name of a power-up kind. */
export function powerupName(kind) {
  const def = POWERUP_KINDS[kind];
  return def ? def.name : 'POWER-UP';
}

/** The glow colour of a power-up kind. */
export function powerupColor(kind) {
  const def = POWERUP_KINDS[kind];
  return def ? def.color : PALETTE.gold;
}

/** The banner line a power-up flies when the wisp takes it. */
export function powerupBanner(kind) {
  const def = POWERUP_KINDS[kind];
  return def ? def.blurb : 'POWER-UP!';
}

/**
 * Deal the next power-up, weighted by the state of the run: a wisp down to its
 * last life is dealt hearts far more often, novas turn up once the reef gets
 * crowded, and frenzy is always on the table. `state` is the world's state.
 */
export function pickPowerupKind(random, state) {
  const weights = [
    ['shield', 3],
    ['magnet', 3],
    ['slow', 3],
    ['frenzy', 3],
  ];
  if (state.lives <= 1) weights.push(['heart', 6]);
  else if (state.lives < 4) weights.push(['heart', 2]);
  if (state.level >= 3) weights.push(['nova', 2 + Math.min(3, state.level - 3)]);
  let total = 0;
  for (const [, weight] of weights) total += weight;
  let roll = random.next() * total;
  for (const [kind, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return 'shield';
}

/**
 * Build a power-up item to place by hand (for a staged scene), shaped exactly
 * like the ones the world spawns: same fields, same fall and sway.
 */
export function makePowerupItem(kind, x, y) {
  const def = POWERUP_KINDS[kind] ?? POWERUP_KINDS.frenzy;
  return {
    kind: 'powerup',
    power: kind,
    name: def.name,
    hex: def.color,
    x,
    y,
    radius: 18,
    fall: 70,
    baseX: x,
    swayPhase: 0.6,
    swaySpeed: 1.4,
    active: true,
  };
}
