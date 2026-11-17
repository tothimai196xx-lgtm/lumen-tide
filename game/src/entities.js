// Factories for everything that drifts, falls or bursts in the tide. Entities are plain
// data; the world moves them and the renderer draws them, so neither owns the other.
import { FIELD, MOTE, MOTE_COLORS, POWERUPS, URCHIN } from './config.js';

export const KIND_MOTE = 'mote';
export const KIND_URCHIN = 'urchin';
export const KIND_POWERUP = 'powerup';

export function createMote(random, level, attuned) {
  const color = random.pick(MOTE_COLORS);
  return {
    kind: KIND_MOTE,
    color: color.name,
    hex: color.hex,
    x: random.range(30, FIELD.width - 30),
    y: -20,
    radius: MOTE.radius,
    fall: random.range(MOTE.fallMin, MOTE.fallMax) * (1 + (level - 1) * 0.09),
    swayPhase: random.range(0, Math.PI * 2),
    swaySpeed: random.range(1.1, 2.1),
    active: true,
    attuned: color.name === attuned,
  };
}

export function createUrchin(random, level) {
  return {
    kind: KIND_URCHIN,
    x: random.range(40, FIELD.width - 40),
    y: -30,
    radius: URCHIN.radius,
    fall: random.range(URCHIN.fallMin, URCHIN.fallMax) * (1 + (level - 1) * 0.11),
    swayPhase: random.range(0, Math.PI * 2),
    swaySpeed: random.range(0.7, 1.3),
    spin: random.range(-1.2, 1.2),
    angle: 0,
    active: true,
  };
}

export function createPowerup(random, kind) {
  const def = POWERUPS[kind];
  return {
    kind: KIND_POWERUP,
    power: kind,
    name: def.name,
    hex: def.color,
    x: random.range(60, FIELD.width - 60),
    y: -24,
    radius: 18,
    fall: 70,
    swayPhase: random.range(0, Math.PI * 2),
    swaySpeed: 1.4,
    active: true,
  };
}

export function createParticle(x, y, hex, speed, life, size) {
  const angle = Math.random() * Math.PI * 2;
  const velocity = speed * (0.4 + Math.random() * 0.8);
  return {
    x,
    y,
    vx: Math.cos(angle) * velocity,
    vy: Math.sin(angle) * velocity - speed * 0.3,
    life,
    maxLife: life,
    size: size * (0.6 + Math.random() * 0.8),
    hex,
  };
}

/** A short-lived burst of glowing sparks, e.g. when a mote is caught. */
export function burst(particles, x, y, hex, count, speed = 160) {
  for (let index = 0; index < count; index += 1) {
    particles.push(createParticle(x, y, hex, speed, 0.5 + Math.random() * 0.4, 3.5));
  }
  if (particles.length > 320) particles.splice(0, particles.length - 320);
}
