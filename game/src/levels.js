// The ten tides of Lumen Tide: one named stretch of reef per level. Level 10 tames
// the tide and wins the game. This file owns everything about climbing levels —
// their names, what the player sees when one turns, the bonus a level-up pays, and
// how far through the current level the catch count has got — so the world and the
// HUD never hard-code a tide's name or its arithmetic in two places.
import { MOTES_PER_LEVEL, MOTE_COLORS, PALETTE } from './config.js';

/** The reef's ten tides, in the order the player swims them. */
export const TIDE_NAMES = [
  'First Light',
  'Green Shoals',
  'Coral Drift',
  'Kelp Maze',
  'Sunken Bells',
  'Lantern Deep',
  'Violet Current',
  'Storm Surge',
  'Abyssal Glow',
  'The Tamed Tide',
];

/** A tide's glow colour, cycling the three mote colours and ending in gold. */
const TIDE_GLOWS = [
  PALETTE.cyan,
  PALETTE.good,
  PALETTE.magenta,
  PALETTE.cyan,
  PALETTE.gold,
  PALETTE.magenta,
  PALETTE.cyan,
  PALETTE.good,
  PALETTE.magenta,
  PALETTE.gold,
];

/** Clamp any level number to a real tide, so endless play past 10 still names one. */
export function tideName(level) {
  const index = Math.max(0, Math.min(TIDE_NAMES.length - 1, Math.floor(level) - 1));
  return TIDE_NAMES[index];
}

/** The glow colour of a tide, for banners and the level-up flash. */
export function tideGlow(level) {
  const index = Math.max(0, Math.min(TIDE_GLOWS.length - 1, Math.floor(level) - 1));
  return TIDE_GLOWS[index];
}

/** The banner a level-up flies: the new tide's name, loud. */
export function levelBanner(level) {
  if (level >= TIDE_NAMES.length) return 'THE TIDE IS TAMED!';
  return `LEVEL ${level} — ${tideName(level).toUpperCase()}`;
}

/** Points a level-up pays on top of the catch that earned it: deeper tides pay more. */
export function levelBonus(level) {
  return 40 * Math.max(1, Math.floor(level));
}

/** Where the catch count sits inside the current level. */
export function progressInLevel(collected) {
  const needed = MOTES_PER_LEVEL;
  const inLevel = ((collected % needed) + needed) % needed;
  return { inLevel, needed, fraction: inLevel / needed };
}

/** The colour a mote of the attuned name glows, for bursts and floats. */
export function hexForAttuned(name) {
  const found = MOTE_COLORS.find((color) => color.name === name);
  return found ? found.hex : PALETTE.cyan;
}
