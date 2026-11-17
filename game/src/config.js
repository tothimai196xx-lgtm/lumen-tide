// Tuning and palette for Lumen Tide: every number the game balances on lives here, so a
// tweak never means hunting through the world or the renderer.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const LIVES = 3;
export const BEST_KEY = 'lumen-tide-best';
/** Motes collected to climb one level; level 10 tames the tide and wins the game. */
export const MOTES_PER_LEVEL = 20;
export const WIN_LEVEL = 10;

export const PALETTE = {
  seaTop: '#0b1030',
  seaMid: '#0e2a4a',
  seaBottom: '#06222e',
  reefFar: '#0d2f45',
  reefNear: '#082437',
  sand: '#0a1f33',
  text: '#eaf6ff',
  textDim: '#9fc3d8',
  gold: '#ffd166',
  cyan: '#4de8ff',
  magenta: '#ff6ec7',
  danger: '#ff5d5d',
  good: '#7dffb2',
};

export const PLAYER = {
  radius: 20,
  speed: 460,
  /** How fast the wisp closes on the mouse target, per second. */
  mouseChase: 9,
  dashSpeed: 950,
  dashTime: 0.16,
  dashCooldown: 1.1,
  invulnAfterHit: 2,
  trailEvery: 0.016,
};

export const MOTE = {
  radius: 13,
  fallMin: 55,
  fallMax: 95,
  swayAmp: 34,
  swaySpeed: 1.6,
  /** Points for an attuned mote, times the combo multiplier. */
  basePoints: 10,
  /** Points for a mote of any other colour (and it breaks the combo). */
  offPoints: 2,
  maxCombo: 5,
};

export const URCHIN = {
  radius: 22,
  fallMin: 90,
  fallMax: 150,
  spawnStart: 0.16,
  spawnPerLevel: 0.05,
  spawnMax: 0.55,
};

export const SPAWN = {
  moteEvery: 0.62,
  moteEveryPerLevel: -0.035,
  moteEveryMin: 0.3,
  powerupEvery: 17,
};

/** The three mote colours; one is attuned at a time and pays the combo. */
export const MOTE_COLORS = [
  { name: 'CYAN', hex: PALETTE.cyan },
  { name: 'GOLD', hex: PALETTE.gold },
  { name: 'MAGENTA', hex: PALETTE.magenta },
];

export const POWERUPS = {
  shield: { name: 'SHIELD', color: PALETTE.good, seconds: 0 },
  magnet: { name: 'MAGNET', color: PALETTE.cyan, seconds: 6 },
  slow: { name: 'SLOW TIDE', color: PALETTE.magenta, seconds: 5 },
  frenzy: { name: 'FRENZY', color: PALETTE.gold, seconds: 8 },
  heart: { name: 'EXTRA LIFE', color: '#ff6b81', seconds: 0 },
  nova: { name: 'NOVA BURST', color: '#b06ee8', seconds: 0 },
};
