// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between five screens: title, play, paused, game over and win.
//
// ?seed=N fixes the tide's pattern. ?shot=start|play|end|win (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot. window.__lumen exposes the live screen and score for automated tests.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import { createWorld, EVENT_COLLECT, EVENT_HIT, EVENT_LEVEL, EVENT_OVER, EVENT_POWER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
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
const renderer = createRenderer(canvas);
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
    if (events & EVENT_COLLECT) {
      if (world.state.lastCollectAttuned) sound.collect(world.state.combo);
      else sound.offCollect();
    }
    if (events & EVENT_POWER) sound.power();
    if (events & EVENT_LEVEL) sound.levelUp();
    if (events & EVENT_HIT) {
      sound.hit();
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
