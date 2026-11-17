// The rules of Lumen Tide: a little wisp swims a glowing reef, catching light motes and
// dodging dark urchins. One colour is attuned at a time: catching it builds a combo that
// multiplies the points, any other colour pays a little and breaks the combo, and the attuned
// colour changes every few seconds, so the player keeps choosing what to chase. Levels climb
// every 20 motes, the tide gets faster, and level 10 tames the tide and wins the game.
import { FIELD, LIVES, MOTES_PER_LEVEL, MOTE, PLAYER, POWERUPS, SPAWN, URCHIN, WIN_LEVEL, MOTE_COLORS } from './config.js';
import { levelBanner, levelBonus } from './levels.js';
import { pickPowerupKind, powerupBanner } from './powerups.js';
import { KIND_MOTE, KIND_POWERUP, KIND_URCHIN, burst, createMote, createPowerup, createUrchin } from './entities.js';

export const EVENT_NONE = 0;
export const EVENT_COLLECT = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_LEVEL = 16;
export const EVENT_POWER = 32;

/** The wisp never swims under the HUD bar. */
const HUD_BOTTOM = 64;

const ATTUNE_SECONDS = 12;

function freshState(random) {
  const plankton = [];
  for (let index = 0; index < 46; index += 1) {
    plankton.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      radius: random.range(1, 3.2),
      phase: random.range(0, Math.PI * 2),
      speed: random.range(6, 20),
    });
  }
  return {
    player: {
      x: FIELD.width / 2,
      y: FIELD.height - 150,
      vx: 0,
      vy: 0,
      radius: PLAYER.radius,
      angle: 0,
      dashTime: 0,
      dashCooldown: 0,
      invuln: 0,
      shield: false,
      trailTimer: 0,
    },
    items: [],
    particles: [],
    plankton,
    score: 0,
    combo: 0,
    bestCombo: 0,
    level: 1,
    collected: 0,
    lives: LIVES,
    attuned: 'GOLD',
    attuneTimer: ATTUNE_SECONDS,
    magnetTime: 0,
    frenzyTime: 0,
    slowTime: 0,
    time: 0,
    shake: 0,
    flash: 0,
    banner: '',
    bannerTime: 0,
    lastCollectAttuned: false,
    lastPower: '',
    won: false,
    over: false,
    spawnMote: 0.4,
    spawnPowerup: SPAWN.powerupEvery,
  };
}

export function createWorld(random) {
  const state = freshState(random);

  function reset() {
    const next = freshState(random);
    for (const key of Object.keys(next)) state[key] = next[key];
  }

  function setBanner(text, seconds = 2) {
    state.banner = text;
    state.bannerTime = seconds;
  }

  function spawnMote() {
    const mote = createMote(random, state.level, state.attuned);
    mote.baseX = mote.x;
    state.items.push(mote);
    const urchinChance = Math.min(
      URCHIN.spawnMax,
      URCHIN.spawnStart + (state.level - 1) * URCHIN.spawnPerLevel,
    );
    if (random.next() < urchinChance) {
      const urchin = createUrchin(random, state.level);
      urchin.baseX = urchin.x;
      state.items.push(urchin);
    }
  }

  function collectMote(item) {
    item.active = false;
    state.collected += 1;
    burst(state.particles, item.x, item.y, item.hex, item.attuned ? 14 : 7);
    if (item.attuned) {
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const multiplier = Math.min(state.combo, MOTE.maxCombo);
      const frenzy = state.frenzyTime > 0 ? 2 : 1;
      state.score += MOTE.basePoints * multiplier * frenzy;
      state.lastCollectAttuned = true;
    } else {
      state.combo = 0;
      state.score += MOTE.offPoints;
      state.lastCollectAttuned = false;
    }
    const level = 1 + Math.floor(state.collected / MOTES_PER_LEVEL);
    if (level !== state.level) {
      state.level = level;
      state.score += levelBonus(level);
      setBanner(levelBanner(level), 2.4);
      return EVENT_LEVEL;
    }
    return EVENT_NONE;
  }

  function hitUrchin(item) {
    item.active = false;
    if (state.player.shield) {
      state.player.shield = false;
      burst(state.particles, item.x, item.y, POWERUPS.shield.color, 18);
      setBanner('SHIELD SAVED YOU!', 1.6);
      return EVENT_NONE;
    }
    state.lives -= 1;
    state.combo = 0;
    state.player.invuln = PLAYER.invulnAfterHit;
    state.shake = 14;
    state.flash = 0.35;
    burst(state.particles, state.player.x, state.player.y, '#ff5d5d', 22, 260);
    if (state.lives <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function takePowerup(item) {
    item.active = false;
    state.lastPower = item.power;
    burst(state.particles, item.x, item.y, item.hex, 16);
    if (item.power === 'shield') {
      state.player.shield = true;
      setBanner('SHIELD UP — ONE HIT BLOCKED', 1.8);
    } else if (item.power === 'magnet') {
      state.magnetTime = POWERUPS.magnet.seconds;
      setBanner('MAGNET — MOTES FLY TO YOU', 1.8);
    } else if (item.power === 'frenzy') {
      state.frenzyTime = POWERUPS.frenzy.seconds;
      setBanner(powerupBanner('frenzy'), 1.8);
    } else if (item.power === 'heart') {
      state.lives = Math.min(4, state.lives + 1);
      setBanner(powerupBanner('heart'), 1.8);
    } else if (item.power === 'nova') {
      let shattered = 0;
      for (const other of state.items) {
        if (other.kind === KIND_URCHIN && other.active) {
          other.active = false;
          burst(state.particles, other.x, other.y, '#b06ee8', 10, 200);
          shattered += 1;
        }
      }
      state.score += shattered * 15;
      setBanner(powerupBanner('nova'), 1.8);
    } else {
      state.slowTime = POWERUPS.slow.seconds;
      setBanner('SLOW TIDE — EVERYTHING DRIFTS', 1.8);
    }
    return EVENT_POWER;
  }

  /**
   * Advance the world one fixed step. `ctrl` is {dx, dy, mouse, dash}: a keyboard direction,
   * or a mouse target point when mouse is true. `demo` runs the title-screen backdrop: motes
   * still drift and the wisp still swims, but nothing can hurt it and the game never ends.
   */
  function step(dt, ctrl, demo = false) {
    let events = EVENT_NONE;
    const player = state.player;
    state.time += dt;
    if (state.bannerTime > 0) state.bannerTime -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.4);
    if (player.invuln > 0) player.invuln -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (state.magnetTime > 0) state.magnetTime -= dt;
    if (state.frenzyTime > 0) state.frenzyTime -= dt;
    if (state.slowTime > 0) state.slowTime -= dt;

    // The attuned colour changes on a timer, so the best chase keeps moving.
    state.attuneTimer -= dt;
    if (state.attuneTimer <= 0) {
      const others = MOTE_COLORS.map((color) => color.name).filter((name) => name !== state.attuned);
      state.attuned = random.pick(others);
      state.attuneTimer = ATTUNE_SECONDS;
      if (!demo) setBanner(`ATTUNED: ${state.attuned}`, 1.6);
    }

    // Steering: keyboard is a direction, the mouse is a point to chase.
    let wantX = 0;
    let wantY = 0;
    if (ctrl.mouse) {
      const dx = ctrl.dx - player.x;
      const dy = ctrl.dy - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 4) {
        const pull = Math.min(1, distance / 70);
        wantX = (dx / distance) * pull;
        wantY = (dy / distance) * pull;
      }
    } else {
      wantX = ctrl.dx;
      wantY = ctrl.dy;
    }
    if (demo && wantX === 0 && wantY === 0) {
      wantX = Math.sin(state.time * 0.5) * 0.5;
      wantY = Math.cos(state.time * 0.33) * 0.25;
    }

    if (ctrl.dash && player.dashCooldown <= 0 && player.dashTime <= 0) {
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      player.invuln = Math.max(player.invuln, 0.3);
    }
    const dashing = player.dashTime > 0;
    if (dashing) player.dashTime -= dt;
    const speed = dashing ? PLAYER.dashSpeed : PLAYER.speed;
    const targetVx = wantX * speed;
    const targetVy = wantY * speed;
    const ease = Math.min(1, dt * (dashing ? 30 : PLAYER.mouseChase));
    player.vx += (targetVx - player.vx) * ease;
    player.vy += (targetVy - player.vy) * ease;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(HUD_BOTTOM + player.radius, player.y + player.vy * dt));
    if (Math.abs(player.vx) > 20) player.angle = Math.atan2(player.vy, player.vx);
    player.trailTimer -= dt;
    if (dashing && player.trailTimer <= 0) {
      player.trailTimer = PLAYER.trailEvery;
      state.particles.push({
        x: player.x,
        y: player.y,
        vx: -player.vx * 0.08,
        vy: -player.vy * 0.08,
        life: 0.4,
        maxLife: 0.4,
        size: 9,
        hex: '#4de8ff',
      });
    }

    // Spawning: motes on a timer that quickens with the level, urchins riding along.
    state.spawnMote -= dt;
    if (state.spawnMote <= 0) {
      spawnMote();
      const every = Math.max(
        SPAWN.moteEveryMin,
        SPAWN.moteEvery + (state.level - 1) * SPAWN.moteEveryPerLevel,
      );
      state.spawnMote = every * random.range(0.75, 1.25);
    }
    state.spawnPowerup -= dt;
    if (state.spawnPowerup <= 0) {
      const power = createPowerup(random, pickPowerupKind(random, state));
      power.baseX = power.x;
      state.items.push(power);
      state.spawnPowerup = SPAWN.powerupEvery * random.range(0.85, 1.2);
    }

    const slowFactor = state.slowTime > 0 ? 0.55 : 1;
    for (const item of state.items) {
      if (!item.active) continue;
      item.y += item.fall * slowFactor * dt;
      item.x = item.baseX + Math.sin(state.time * item.swaySpeed + item.swayPhase) * 34;
      if (item.kind === KIND_URCHIN) item.angle += item.spin * dt;
      if (state.magnetTime > 0 && item.kind === KIND_MOTE) {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 260 && distance > 1) {
          item.x += (dx / distance) * 300 * dt;
          item.y += (dy / distance) * 300 * dt;
          item.baseX = item.x;
        }
      }
      if (item.y - item.radius > FIELD.height + 40) item.active = false;
    }

    // Collisions with the wisp.
    for (const item of state.items) {
      if (!item.active) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const reach = item.radius + player.radius - 4;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (item.kind === KIND_MOTE) {
        events |= EVENT_COLLECT | collectMote(item);
      } else if (item.kind === KIND_POWERUP) {
        events |= takePowerup(item);
      } else if (item.kind === KIND_URCHIN) {
        if (demo || player.invuln > 0 || dashing) {
          item.active = false;
          burst(state.particles, item.x, item.y, '#b06ee8', 10, 120);
        } else {
          events |= hitUrchin(item);
        }
      }
    }
    state.items = state.items.filter((item) => item.active);

    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy -= 26 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);

    for (const dot of state.plankton) {
      dot.y -= dot.speed * dt;
      dot.x += Math.sin(state.time * 0.6 + dot.phase) * 8 * dt;
      if (dot.y < -4) {
        dot.y = FIELD.height + 4;
        dot.x = random.range(0, FIELD.width);
      }
    }

    if (!state.won && !demo && state.level >= WIN_LEVEL) {
      state.won = true;
      setBanner('YOU TAMED THE TIDE!', 3);
      events |= EVENT_WIN;
    }
    return events;
  }

  return { state, reset, step };
}
