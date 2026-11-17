// Game feel for Lumen Tide: floating score text and screen shake.
//
// The main loop feeds this on events — a catch floats its points above the wisp,
// a hit shakes the frame — and ticks it once a step. The renderer asks it to
// shift the world while it draws, then draws the floats over the top, so a good
// catch reads the instant it happens and a bad hit feels like one.
//
// The shake is driven by the feedback clock, not by Math.random, so a staged
// scene shakes exactly the same way every time it is taken.
import { FIELD } from './config.js';

const MAX_FLOATS = 12;

/** Floating texts and a decaying screen shake, fed by game events. */
export function createFeedback() {
  const floats = [];
  let shakeAmp = 0;
  let clock = 0;

  /** Float a short label up from a point: score text, a combo callout, a warning. */
  function float(x, y, text, hex, big = false) {
    if (floats.length >= MAX_FLOATS) floats.shift();
    floats.push({
      x: Math.max(60, Math.min(FIELD.width - 60, x)),
      y: Math.max(90, y),
      text,
      hex,
      big,
      age: 0,
      life: 1.1,
    });
  }

  /** Kick the frame. Stronger kicks replace weaker ones; kicks never stack wild. */
  function shake(amount) {
    shakeAmp = Math.max(shakeAmp, amount);
  }

  function update(dt) {
    clock += dt;
    if (shakeAmp > 0) shakeAmp = Math.max(0, shakeAmp - dt * 42);
    for (const item of floats) item.age += dt;
    for (let index = floats.length - 1; index >= 0; index -= 1) {
      if (floats[index].age >= floats[index].life) floats.splice(index, 1);
    }
  }

  function offsetX() {
    if (shakeAmp <= 0.1) return 0;
    return Math.sin(clock * 61) * shakeAmp * 0.6 + Math.sin(clock * 127) * shakeAmp * 0.4;
  }

  function offsetY() {
    if (shakeAmp <= 0.1) return 0;
    return Math.cos(clock * 53) * shakeAmp * 0.6 + Math.sin(clock * 97) * shakeAmp * 0.4;
  }

  /** Shift the canvas for the world pass; pair with release() after it. */
  function apply(ctx) {
    ctx.save();
    ctx.translate(offsetX(), offsetY());
  }

  /** Undo apply(). */
  function release(ctx) {
    ctx.restore();
  }

  function draw(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const item of floats) {
      const progress = item.age / item.life;
      const alpha = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
      const rise = progress * 46;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = item.big
        ? 'bold 30px system-ui, sans-serif'
        : 'bold 22px system-ui, sans-serif';
      ctx.shadowColor = item.hex;
      ctx.shadowBlur = 14;
      ctx.fillStyle = item.hex;
      ctx.fillText(item.text, item.x, item.y - rise);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = item.big
        ? 'bold 30px system-ui, sans-serif'
        : 'bold 22px system-ui, sans-serif';
      ctx.globalAlpha = Math.max(0, alpha) * 0.85;
      ctx.fillText(item.text, item.x, item.y - rise - 1);
    }
    ctx.restore();
  }

  return {
    float,
    shake,
    update,
    apply,
    release,
    draw,
    count() {
      return floats.length;
    },
  };
}

/** The float a catch earns: its points, or a combo callout once the chain is hot. */
export function catchFloat(feedback, state, points) {
  const player = state.player;
  if (state.lastCollectAttuned && state.combo >= 3) {
    feedback.float(player.x, player.y - 44, `COMBO ×${Math.min(state.combo, 5)}`, '#ffd166', true);
  } else if (state.lastCollectAttuned) {
    feedback.float(player.x, player.y - 40, `+${points}`, '#eafcff', false);
  }
}
