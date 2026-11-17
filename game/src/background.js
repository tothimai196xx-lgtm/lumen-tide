// The reef backdrop of Lumen Tide: parallax ridges, coral silhouettes, sand dunes
// and drifting light shafts, drawn behind everything the game does.
//
// Everything is placed once from a seeded random when the backdrop is built, and
// every frame is placed from the world's clock alone, so the reef is identical in
// every screenshot taken at the same time and needs no update call: the renderer
// just draws it at the start of each frame. The three ridges drift at different
// speeds, which is what sells the depth; the corals and dunes stay anchored to
// the sea floor.
import { FIELD, PALETTE } from './config.js';

const RIDGE_STEP = 16;

/** A ridge line: a base height plus a few sine waves that shape its silhouette. */
function makeRidge(random, baseY, ampA, ampB, ampC) {
  return {
    baseY,
    ampA,
    ampB,
    ampC,
    phaseA: random.range(0, Math.PI * 2),
    phaseB: random.range(0, Math.PI * 2),
    phaseC: random.range(0, Math.PI * 2),
    freqA: random.range(0.004, 0.008),
    freqB: random.range(0.011, 0.02),
    freqC: random.range(0.03, 0.05),
  };
}

/** Build the reef once from a seeded random; draw it from the clock. */
export function createReefBackdrop(random) {
  const far = makeRidge(random, 470, 42, 22, 8);
  const mid = makeRidge(random, 560, 52, 28, 10);
  const near = makeRidge(random, 650, 46, 24, 9);

  const corals = [];
  for (let index = 0; index < 9; index += 1) {
    corals.push({
      x: random.range(40, FIELD.width - 40),
      baseY: random.range(640, 700),
      height: random.range(46, 120),
      lean: random.range(-0.35, 0.35),
      branches: 2 + random.int(3),
      hex: random.pick(['#0e3a52', '#123f57', '#0d3348', '#14465e']),
    });
  }

  const shafts = [];
  for (let index = 0; index < 4; index += 1) {
    shafts.push({
      x: random.range(60, FIELD.width - 60),
      width: random.range(34, 70),
      drift: random.range(14, 42),
      phase: random.range(0, Math.PI * 2),
      speed: random.range(0.05, 0.12),
      alpha: random.range(0.03, 0.07),
    });
  }

  function ridgeHeight(ridge, x) {
    return (
      ridge.baseY +
      Math.sin(x * ridge.freqA + ridge.phaseA) * ridge.ampA +
      Math.sin(x * ridge.freqB + ridge.phaseB) * ridge.ampB +
      Math.sin(x * ridge.freqC + ridge.phaseC) * ridge.ampC
    );
  }

  function drawRidge(ctx, ridge, scroll, hex, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.moveTo(-RIDGE_STEP, FIELD.height + 4);
    for (let x = -RIDGE_STEP; x <= FIELD.width + RIDGE_STEP; x += RIDGE_STEP) {
      const wrapped = ((x + scroll) % (FIELD.width + RIDGE_STEP * 2)) - RIDGE_STEP;
      ctx.lineTo(x, ridgeHeight(ridge, wrapped));
    }
    ctx.lineTo(FIELD.width + RIDGE_STEP, FIELD.height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCoral(ctx, coral, time) {
    const sway = Math.sin(time * 0.7 + coral.x * 0.01) * 4;
    const tipX = coral.x + coral.lean * coral.height + sway;
    ctx.save();
    ctx.strokeStyle = coral.hex;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(coral.x, coral.baseY);
    ctx.quadraticCurveTo(
      coral.x + coral.lean * coral.height * 0.5,
      coral.baseY - coral.height * 0.6,
      tipX,
      coral.baseY - coral.height,
    );
    ctx.stroke();
    ctx.lineWidth = 4;
    for (let branch = 0; branch < coral.branches; branch += 1) {
      const along = 0.35 + (branch / Math.max(1, coral.branches)) * 0.5;
      const bx = coral.x + coral.lean * coral.height * along;
      const by = coral.baseY - coral.height * along;
      const side = branch % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(
        bx + side * 22,
        by - 18,
        bx + side * 34,
        by - 34 - branch * 4,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ctx, time) {
    ctx.save();
    // Light shafts from the surface, drifting slowly side to side.
    for (const shaft of shafts) {
      const x = shaft.x + Math.sin(time * shaft.speed + shaft.phase) * shaft.drift;
      ctx.save();
      ctx.globalAlpha = shaft.alpha;
      ctx.fillStyle = '#bfe9ff';
      ctx.translate(x, 0);
      ctx.rotate(0.1);
      ctx.fillRect(-shaft.width / 2, -40, shaft.width, 620);
      ctx.restore();
    }
    // Three ridges, each nearer one drifting faster: the parallax.
    drawRidge(ctx, far, time * 7, PALETTE.reefFar, 0.85);
    drawRidge(ctx, mid, time * 16, PALETTE.reefNear, 0.95);
    for (const coral of corals) drawCoral(ctx, coral, time);
    drawRidge(ctx, near, time * 30, '#06202f', 1);
    // Sand dunes along the very bottom.
    ctx.fillStyle = PALETTE.sand;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    for (let x = 0; x <= FIELD.width; x += 32) {
      ctx.lineTo(x, FIELD.height - 12 - Math.sin(x * 0.008 + 1.2) * 8);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { draw };
}
