// The screenshot scenes behind ?shot=start|play|end|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// chases the nearest attuned mote, keeps clear of urchins and dashes out of trouble, so the
// frame is what a real game looks like and the same seed always gives the same frame. The
// end scene's pilot is careless (no dash, short lookahead), so it is caught out as a hurried
// player would be.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 900;
const SAMPLE = 1 / 30;

/** Steer toward the nearest attuned mote, with a push away from close urchins. */
function autopilot(state, careful) {
  const player = state.player;
  let target = null;
  let targetDistance = Infinity;
  for (const item of state.items) {
    if (!item.active || item.kind !== 'mote') continue;
    if (careful && !item.attuned) continue;
    const distance = Math.hypot(item.x - player.x, item.y - player.y);
    if (distance < targetDistance) {
      targetDistance = distance;
      target = item;
    }
  }
  let dx = 0;
  let dy = 0;
  if (target) {
    dx = target.x - player.x;
    dy = target.y - player.y;
  } else {
    dx = FIELD.width / 2 - player.x;
    dy = FIELD.height - 200 - player.y;
  }
  // Flee: an urchin closing in pushes the wisp away from it.
  for (const item of state.items) {
    if (!item.active || item.kind !== 'urchin') continue;
    const ox = player.x - item.x;
    const oy = player.y - item.y;
    const distance = Math.hypot(ox, oy);
    const range = careful ? 170 : 110;
    if (distance < range && distance > 1) {
      const push = (1 - distance / range) * 1.6;
      dx += (ox / distance) * push * 200;
      dy += (oy / distance) * push * 200;
    }
  }
  const length = Math.hypot(dx, dy) || 1;
  const dash = careful && player.dashCooldown <= 0 && state.items.some((item) => {
    if (!item.active || item.kind !== 'urchin') return false;
    return Math.hypot(item.x - player.x, item.y - player.y) < 90 && item.y < player.y + 40;
  });
  return { dx: dx / length, dy: dy / length, mouse: false, dash };
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dx: 0, dy: 0, mouse: false, dash: false }, true);
    }
    state.shake = 0;
    state.flash = 0;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const careful = name !== 'end';
  for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
    const seconds = index * STEP;
    if (name === 'play' && seconds >= PLAY_SECONDS) break;
    const events = world.step(STEP, autopilot(state, careful), false);
    if (name === 'win' && events & EVENT_WIN) break;
    if (events & EVENT_OVER) break;
    // A careless pilot that somehow survives the limit stops steering and is caught.
    if (name === 'end' && seconds >= 420) {
      world.step(STEP, { dx: 0, dy: 0, mouse: false, dash: false }, false);
      if (state.lives === 0) break;
    }
  }
  state.shake = 0;
  state.flash = 0;
  state.bannerTime = 0;
  if (name === 'win' && state.won) return { screen: SCREEN_WIN, best: state.score };
  if (state.lives === 0) return { screen: SCREEN_OVER, best: state.score };
  return { screen: SCREEN_PLAY, best: state.score };
}

export { PLAYER };
