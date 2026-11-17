// Keyboard and mouse: arrows or WASD to swim, mouse to steer toward the cursor, Space to
// dash, P or Escape to pause, M to mute, Enter or click to confirm. Keys report as edges
// (pressed since the last read) so a held key never double-fires a menu action.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseSeenAt = 0;
  let mouseDown = false;

  function onKeyDown(event) {
    if (event.code in MOVE_KEYS || event.code === 'Space' || event.code.startsWith('Arrow')) {
      event.preventDefault();
    }
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') queued |= ACTION_CONFIRM | ACTION_DASH;
    else if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    else if (event.code === 'KeyM') queued |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    mouseSeenAt = performance.now();
  }

  function onPointerDown(event) {
    onPointerMove(event);
    mouseDown = true;
    queued |= ACTION_CONFIRM;
  }

  function onPointerUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    /** Actions pressed since the last call, as a bitmask. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    /** Steering for this frame: keyboard wins while a move key is held, else the mouse. */
    steering() {
      let dx = 0;
      let dy = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move) {
          dx += move[0];
          dy += move[1];
        }
      }
      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy);
        return { dx: dx / length, dy: dy / length, mouse: false };
      }
      if (mouseDown || performance.now() - mouseSeenAt < 1500) {
        return { dx: mouseX, dy: mouseY, mouse: true };
      }
      return { dx: 0, dy: 0, mouse: false };
    },
  };
}
