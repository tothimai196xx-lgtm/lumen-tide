// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between five screens: title, play, paused, game over and win.
//
// ?seed=N fixes the tide's pattern. ?shot=start|play|end|win (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot. window.__lumen exposes the live screen and score for automated tests.
import { BEST_KEY, LIVES, MOTE, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import { createWorld, EVENT_COLLECT, EVENT_HIT, EVENT_LEVEL, EVENT_OVER, EVENT_POWER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createReefBackdrop } from './background.js';
import { collectBurst, createAmbientDrift, createBurstLayer, hitBurst, levelBurst, powerBurst } from './particles.js';
import { catchFloat, createFeedback } from './feedback.js';
import { makePowerupItem } from './powerups.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const bursts = createBurstLayer(createRandom((seed ^ 0x51f15e) >>> 0));
const feedback = createFeedback();
const fx = {
  backdrop: createReefBackdrop(createRandom((seed ^ 0xbedd) >>> 0)),
  drift: createAmbientDrift(createRandom((seed ^ 0xd817) >>> 0)),
  bursts,
  feedback,
};
const renderer = createRenderer(canvas, fx);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Stage the new feel on top of the simulated scene, so the screenshots show
  // the game at its best: a frenzy pickup drifting in, a burst and a combo
  // callout mid-play, and gold bursting around the wisp on the win screen.
  const player = world.state.player;
  if (name === 'play') {
    const frenzyX = Math.max(120, Math.min(1160, player.x + 230));
    const frenzyY = Math.max(150, Math.min(620, player.y + 40));
    world.state.items.push(makePowerupItem('frenzy', frenzyX, frenzyY));
    bursts.burst(player.x, player.y, '#4de8ff', 18, 190);
    bursts.ring(player.x, player.y, '#ffd166', 120);
    feedback.float(player.x, player.y - 60, 'COMBO ×3', '#ffd166', true);
    feedback.update(0.3);
  } else if (name === 'win') {
    bursts.burst(player.x, player.y, '#ffd166', 30, 240);
    bursts.ring(player.x, player.y, '#ffd166', 150);
  }
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  window.__lumen = {
    get screen() {
      return screen;
    },
    get score() {
      return world.state.score;
    },
    get lives() {
      return world.state.lives;
    },
    get level() {
      return world.state.level;
    },
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.unlock();
    announce(`Playing. ${LIVES} lives. Catch the attuned colour.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    sound.over();
    world.state.bannerTime = 0;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    sound.win();
    world.state.bannerTime = 0;
    announce(`You tamed the tide! Score ${world.state.score}. Press Space to keep playing.`);
  }

  let dashQueued = false;

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      sound.setMuted(!sound.muted);
      announce(sound.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      sound.unlock();
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) {
      sound.unlock();
      screen = SCREEN_PLAY;
      announce('Playing on. Endless tide.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, mouse: false, dash: false }, true);
      bursts.update(STEP);
      feedback.update(STEP);
      return;
    }
    const steering = input.steering();
    const dash = dashQueued;
    dashQueued = false;
    const events = world.step(STEP, {
      dx: steering.dx,
      dy: steering.dy,
      mouse: steering.mouse,
      dash,
    }, false);
    bursts.update(STEP);
    feedback.update(STEP);
    if (events & EVENT_COLLECT) {
      if (world.state.lastCollectAttuned) sound.collect(world.state.combo);
      else sound.offCollect();
      const frenzy = world.state.frenzyTime > 0 ? 2 : 1;
      const gained = world.state.lastCollectAttuned
        ? MOTE.basePoints * Math.min(world.state.combo, MOTE.maxCombo) * frenzy
        : MOTE.offPoints;
      collectBurst(bursts, world.state);
      catchFloat(feedback, world.state, gained);
    }
    if (events & EVENT_POWER) {
      sound.power();
      powerBurst(bursts, world.state);
    }
    if (events & EVENT_LEVEL) {
      sound.levelUp();
      levelBurst(bursts, world.state);
    }
    if (events & EVENT_HIT) {
      sound.hit();
      hitBurst(bursts, world.state);
      feedback.shake(16);
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_WIN) winGame();
    else if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions(input.takeActions());
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, sound.muted);
  }

  // Leaving the tab pauses a running game rather than letting urchins fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Tide. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
