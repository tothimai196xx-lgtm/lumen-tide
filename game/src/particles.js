// Particles for Lumen Tide: the burst layer the game plays its feedback through,
// and the ambient drift that keeps the reef breathing behind everything.
//
// The burst layer is a small pool of sparks and shockwave rings. The main loop
// feeds it on events (a catch, a hit, a level-up, a power-up) and ticks it once a
// step; the renderer draws it over the world. Its sparks are seeded, so a staged
// screenshot bursts exactly the same way every time it is taken.
//
// The ambient drift is pure scenery: bubbles and glowing specks that rise through
// the water, placed once from a seeded random and positioned from the world's
// clock alone, so it needs no update call and can never desync a screenshot.
import { FIELD, PALETTE } from './config.js';
import { hexForAttuned } from './levels.js';
import { powerupColor } from './powerups.js';

const MAX_SPARKS = 240;
const MAX_RINGS = 12;

/** A pool of glowing sparks and expanding rings, fed by game events. */
export function createBurstLayer(random) {
  const sparks = [];
  const rings = [];

  function burst(x, y, hex, count, speed = 170) {
    for (let index = 0; index < count; index += 1) {
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      const angle = random.next() * Math.PI * 2;
      const push = speed * (0.35 + random.next() * 0.85);
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * push,
        vy: Math.sin(angle) * push - speed * 0.25,
        life: 0.45 + random.next() * 0.45,
        maxLife: 0.9,
        size: 2.5 + random.next() * 3.5,
        hex,
      });
    }
  }

  function ring(x, y, hex, maxRadius = 90) {
    if (rings.length >= MAX_RINGS) rings.shift();
    rings.push({ x, y, radius: 8, maxRadius, life: 0.5, maxLife: 0.5, hex });
  }

  function trail(x, y, hex) {
    if (sparks.length >= MAX_SPARKS) sparks.shift();
    sparks.push({
      x: x + (random.next() - 0.5) * 10,
      y: y + (random.next() - 0.5) * 10,
      vx: (random.next() - 0.5) * 30,
      vy: -20 - random.next() * 30,
      life: 0.35,
      maxLife: 0.35,
      size: 3 + random.next() * 2,
      hex,
    });
  }

  function update(dt) {
    for (const spark of sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 1 - 2.2 * dt;
      spark.vy = spark.vy * (1 - 2.2 * dt) - 30 * dt;
      spark.life -= dt;
    }
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      if (sparks[index].life <= 0) sparks.splice(index, 1);
    }
    for (const wave of rings) {
      wave.radius += (wave.maxRadius / wave.maxLife) * dt;
      wave.life -= dt;
    }
    for (let index = rings.length - 1; index >= 0; index -= 1) {
      if (rings[index].life <= 0) rings.splice(index, 1);
    }
  }

  function draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spark of sparks) {
      const alpha = Math.max(0, spark.life / spark.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = spark.hex;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, Math.max(0.6, spark.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    for (const wave of rings) {
      const alpha = Math.max(0, wave.life / wave.maxLife);
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = wave.hex;
      ctx.lineWidth = 3 * alpha + 1;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  return {
    burst,
    ring,
    trail,
    update,
    draw,
    count() {
      return sparks.length + rings.length;
    },
  };
}

/** A catch bursts in the attuned colour; a hot combo earns a shockwave ring. */
export function collectBurst(layer, state) {
  const hex = hexForAttuned(state.attuned);
  const player = state.player;
  if (state.lastCollectAttuned) {
    layer.burst(player.x, player.y, hex, 10 + Math.min(state.combo, 5) * 3, 190);
    if (state.combo >= 3) layer.ring(player.x, player.y, hex, 70 + state.combo * 8);
  } else {
    layer.burst(player.x, player.y, '#9fc3d8', 5, 120);
  }
}

/** A hit bursts red at the wisp and throws a wide ring. */
export function hitBurst(layer, state) {
  const player = state.player;
  layer.burst(player.x, player.y, PALETTE.danger, 22, 260);
  layer.ring(player.x, player.y, PALETTE.danger, 130);
}

/** A level-up erupts in gold around the wisp, three rings wide. */
export function levelBurst(layer, state) {
  const player = state.player;
  layer.burst(player.x, player.y, PALETTE.gold, 30, 240);
  layer.ring(player.x, player.y, PALETTE.gold, 110);
  layer.ring(player.x, player.y, PALETTE.cyan, 150);
}

/** A power-up flashes a ring in its own colour around the wisp. */
export function powerBurst(layer, state) {
  const player = state.player;
  layer.ring(player.x, player.y, powerupColor(state.lastPower), 120);
  layer.burst(player.x, player.y, powerupColor(state.lastPower), 14, 200);
}

/**
 * Ambient bubbles and glow specks. Built once from a seeded random; every mote
 * of it is placed from the world's clock, so the reef looks alive on the title
 * screen and identical in every screenshot taken at the same time.
 */
export function createAmbientDrift(random) {
  const bubbles = [];
  for (let index = 0; index < 26; index += 1) {
    bubbles.push({
      x: random.range(0, FIELD.width),
      offset: random.range(0, FIELD.height),
      radius: random.range(1.5, 6),
      rise: random.range(9, 26),
      sway: random.range(6, 22),
      phase: random.range(0, Math.PI * 2),
      alpha: random.range(0.1, 0.35),
    });
  }
  const specks = [];
  for (let index = 0; index < 40; index += 1) {
    specks.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      radius: random.range(0.8, 2.2),
      phase: random.range(0, Math.PI * 2),
      speed: random.range(0.4, 1.4),
      hex: random.pick([PALETTE.cyan, PALETTE.gold, PALETTE.magenta, '#bfe9ff']),
    });
  }

  function draw(ctx, time) {
    ctx.save();
    for (const bubble of bubbles) {
      const span = FIELD.height + 24;
      const y = FIELD.height + 12 - ((time * bubble.rise + bubble.offset) % span);
      const x = bubble.x + Math.sin(time * 0.5 + bubble.phase) * bubble.sway;
      ctx.globalAlpha = bubble.alpha;
      ctx.strokeStyle = '#bfe9ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, bubble.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = bubble.alpha * 0.7;
      ctx.fillStyle = '#eafcff';
      ctx.beginPath();
      ctx.arc(x - bubble.radius * 0.3, y - bubble.radius * 0.3, bubble.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const speck of specks) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * speck.speed + speck.phase));
      ctx.globalAlpha = 0.5 * twinkle;
      ctx.fillStyle = speck.hex;
      ctx.beginPath();
      ctx.arc(speck.x, speck.y, speck.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { draw };
}
