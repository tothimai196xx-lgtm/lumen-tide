// Everything the eye sees: the reef, the wisp, the motes, the HUD and every screen. All art
// is drawn in code (gradients, glows, shapes), so the game ships no image files at all.
import { FIELD, MOTE_COLORS, PALETTE, PLAYER } from './config.js';
import { KIND_MOTE, KIND_POWERUP, KIND_URCHIN } from './entities.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function glowCircle(ctx, x, y, radius, hex, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(hex, alpha));
  gradient.addColorStop(0.45, rgba(hex, alpha * 0.45));
  gradient.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5);
  ctx.bezierCurveTo(5, -10, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff6b81' : 'rgba(255,107,129,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,107,129,0.7)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function attunedHex(state) {
  const found = MOTE_COLORS.find((color) => color.name === state.attuned);
  return found ? found.hex : PALETTE.gold;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  ctx.scale(dpr, dpr);

  function drawSea(state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.seaTop);
    gradient.addColorStop(0.55, PALETTE.seaMid);
    gradient.addColorStop(1, PALETTE.seaBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Slow god-rays from the surface.
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#bfe9ff';
    for (let index = 0; index < 3; index += 1) {
      const x = 260 + index * 380 + Math.sin(state.time * 0.12 + index * 1.7) * 40;
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(0.12);
      ctx.fillRect(-23, -40, 46, 560);
      ctx.restore();
    }
    ctx.restore();

    for (const dot of state.plankton) {
      ctx.fillStyle = `rgba(190,230,255,${0.25 + 0.2 * Math.sin(state.time + dot.phase)})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Two reef ridges along the bottom.
    ctx.fillStyle = PALETTE.reefFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    for (let x = 0; x <= FIELD.width; x += 40) {
      ctx.lineTo(x, FIELD.height - 66 - Math.sin(x * 0.011 + 1.3) * 26 - Math.sin(x * 0.004) * 14);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.reefNear;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    for (let x = 0; x <= FIELD.width; x += 40) {
      ctx.lineTo(x, FIELD.height - 34 - Math.sin(x * 0.017 + 4) * 16);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.closePath();
    ctx.fill();
    // Little coral fans on the near ridge.
    ctx.strokeStyle = 'rgba(77,232,255,0.35)';
    ctx.lineWidth = 3;
    for (let index = 0; index < 9; index += 1) {
      const x = 60 + index * 140;
      const y = FIELD.height - 30 - Math.sin(x * 0.017 + 4) * 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 12, y - 26, x - 22, y - 34);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 4, y - 30, x + 2, y - 42);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 14, y - 24, x + 24, y - 30);
      ctx.stroke();
    }
  }

  function drawMote(item, state) {
    const pulse = 1 + 0.12 * Math.sin(state.time * 4 + item.swayPhase);
    if (item.attuned) {
      glowCircle(ctx, item.x, item.y, item.radius * 3.4 * pulse, item.hex, 0.55);
      ctx.strokeStyle = rgba(item.hex, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius + 7 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      glowCircle(ctx, item.x, item.y, item.radius * 2.2, item.hex, 0.35);
    }
    ctx.fillStyle = item.hex;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(item.x - 4, item.y - 4, item.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawUrchin(item) {
    glowCircle(ctx, item.x, item.y, item.radius * 2.4, '#7a3fd1', 0.3);
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    ctx.strokeStyle = '#b06ee8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * item.radius * 0.7, Math.sin(angle) * item.radius * 0.7);
      ctx.lineTo(Math.cos(angle) * (item.radius + 10), Math.sin(angle) * (item.radius + 10));
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#2a1245';
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath();
    ctx.arc(item.x - 7, item.y - 3, 3.2, 0, Math.PI * 2);
    ctx.arc(item.x + 7, item.y - 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPowerup(item, state) {
    const bob = Math.sin(state.time * 3 + item.swayPhase) * 3;
    glowCircle(ctx, item.x, item.y + bob, 44, item.hex, 0.5);
    ctx.fillStyle = 'rgba(6,20,34,0.9)';
    ctx.strokeStyle = item.hex;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = item.hex;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = item.power === 'shield' ? '◈' : item.power === 'magnet' ? 'U' : '◷';
    ctx.fillText(glyph, item.x, item.y + bob + 1);
  }

  function drawPlayer(state) {
    const player = state.player;
    const blink = player.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    glowCircle(ctx, player.x, player.y, 74, '#4de8ff', player.dashTime > 0 ? 0.75 : 0.45);
    if (player.shield) {
      ctx.strokeStyle = 'rgba(125,255,178,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Tail fin, waving with the swim.
    const wave = Math.sin(state.time * 10) * 6;
    ctx.fillStyle = '#2fb9d8';
    ctx.beginPath();
    ctx.moveTo(player.x - 16, player.y);
    ctx.lineTo(player.x - 38, player.y - 12 + wave);
    ctx.lineTo(player.x - 30, player.y);
    ctx.lineTo(player.x - 38, player.y + 12 - wave);
    ctx.closePath();
    ctx.fill();
    // Body: a little lantern wisp.
    const body = ctx.createRadialGradient(player.x - 6, player.y - 8, 2, player.x, player.y, player.radius + 4);
    body.addColorStop(0, '#eafcff');
    body.addColorStop(0.5, '#4de8ff');
    body.addColorStop(1, '#1b7fa8');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, player.radius, player.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye, looking where it swims.
    const lookX = Math.cos(player.angle) * 4;
    const lookY = Math.sin(player.angle) * 4;
    ctx.fillStyle = '#06222e';
    ctx.beginPath();
    ctx.arc(player.x + 7 + lookX, player.y - 3 + lookY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x + 8.5 + lookX, player.y - 4.5 + lookY, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = rgba(particle.hex, alpha);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(state, best, muted) {
    const attuned = attunedHex(state);
    ctx.save();
    // Top bar.
    ctx.fillStyle = 'rgba(4,16,30,0.55)';
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE ${state.score}`, 24, 33);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 24, 54);
    // Tide progress to the next level.
    const inLevel = state.collected % 20;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(300, 24, 220, 10);
    ctx.fillStyle = attuned;
    ctx.fillRect(300, 24, 220 * (inLevel / 20), 10);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${state.level}  ·  ${inLevel}/20 TO NEXT`, 300, 52);
    // Attuned colour.
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('ATTUNED', 640, 22);
    glowCircle(ctx, 640, 44, 16, attuned, 0.7);
    ctx.fillStyle = attuned;
    ctx.beginPath();
    ctx.arc(640, 44, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(state.attuned, 640, 58);
    // Combo.
    if (state.combo >= 2) {
      ctx.font = `bold ${26 + Math.min(state.combo, 5) * 2}px system-ui, sans-serif`;
      ctx.fillStyle = state.combo >= 4 ? '#ffd166' : '#eaf6ff';
      ctx.textAlign = 'right';
      ctx.fillText(`COMBO ×${Math.min(state.combo, 5)}`, 1010, 34);
    }
    // Lives.
    for (let index = 0; index < 3; index += 1) {
      drawHeart(ctx, 1060 + index * 34, 32, 22, index < state.lives);
    }
    // Dash cooldown + active power-ups.
    ctx.textAlign = 'right';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    const dashReady = state.player.dashCooldown <= 0;
    ctx.fillText(dashReady ? 'DASH READY [SPACE]' : 'DASH…', 1248, 56);
    let powerLine = '';
    if (state.magnetTime > 0) powerLine += `MAGNET ${Math.ceil(state.magnetTime)}s  `;
    if (state.slowTime > 0) powerLine += `SLOW ${Math.ceil(state.slowTime)}s  `;
    if (state.player.shield) powerLine += 'SHIELD  ';
    if (powerLine) {
      ctx.fillStyle = PALETTE.good;
      ctx.fillText(powerLine.trim(), 1248, 34);
    }
    if (muted) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.textAlign = 'left';
      ctx.fillText('MUTED [M]', 24, 84);
    }
    // Centre banner.
    if (state.bannerTime > 0 && state.banner) {
      ctx.globalAlpha = Math.min(1, state.bannerTime);
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = attuned;
      ctx.shadowBlur = 24;
      ctx.fillText(state.banner, FIELD.width / 2, 130);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function panel(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,16,30,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.fillText(title, FIELD.width / 2, 218);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    lines.forEach((line, index) => {
      ctx.font = line.big ? 'bold 30px system-ui, sans-serif' : '21px system-ui, sans-serif';
      ctx.fillStyle = line.dim ? PALETTE.textDim : PALETTE.text;
      ctx.fillText(line.text, FIELD.width / 2, 292 + index * 40);
    });
    ctx.restore();
  }

  function draw(state, screen, best, muted) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawSea(state);
    for (const item of state.items) {
      if (item.kind === KIND_MOTE) drawMote(item, state);
      else if (item.kind === KIND_URCHIN) drawUrchin(item);
      else if (item.kind === KIND_POWERUP) drawPowerup(item, state);
    }
    drawParticles(state);
    if (screen !== SCREEN_TITLE) drawPlayer(state);
    else drawPlayer(state);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${state.flash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, best, muted);
      if (screen === SCREEN_PAUSED) {
        panel('PAUSED', [
          { text: 'Take a breath. The tide waits.', dim: true },
          { text: 'Press P or SPACE to keep swimming', big: true },
        ], PALETTE.cyan);
      }
    } else if (screen === SCREEN_TITLE) {
      ctx.save();
      ctx.fillStyle = 'rgba(4,16,30,0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eafcff';
      ctx.font = 'bold 92px system-ui, sans-serif';
      ctx.shadowColor = '#4de8ff';
      ctx.shadowBlur = 42;
      ctx.fillText('LUMEN TIDE', FIELD.width / 2, 210);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText('a glowing reef arcade', FIELD.width / 2, 258);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText('Catch the ATTUNED colour to build your combo — other colours pay little and break it.', FIELD.width / 2, 330);
      ctx.fillText('Dodge the spiked urchins. Dash through danger with SPACE. Tame the tide at LEVEL 10.', FIELD.width / 2, 364);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '19px system-ui, sans-serif';
      ctx.fillText('Move: mouse or WASD / arrows  ·  Dash: SPACE  ·  Pause: P  ·  Mute: M', FIELD.width / 2, 420);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px system-ui, sans-serif';
      const blink = Math.sin(state.time * 4) > -0.2;
      if (blink) ctx.fillText('PRESS SPACE OR CLICK TO PLAY', FIELD.width / 2, 490);
      if (best > 0) {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 540);
      }
      ctx.restore();
    } else if (screen === SCREEN_OVER) {
      drawHud(state, best, muted);
      panel('THE TIDE TOOK YOU', [
        { text: `SCORE ${state.score}   ·   LEVEL ${state.level}   ·   BEST COMBO ×${state.bestCombo}`, big: true },
        { text: best > 0 ? `BEST ${Math.max(best, state.score)}` : '', dim: true },
        { text: 'PRESS SPACE OR CLICK TO SWIM AGAIN', big: true },
      ], '#ff6b81');
    } else if (screen === SCREEN_WIN) {
      drawHud(state, best, muted);
      panel('YOU TAMED THE TIDE!', [
        { text: `LEVEL 10 REACHED  ·  SCORE ${state.score}`, big: true },
        { text: 'The reef is yours. Keep swimming for a higher score?', dim: true },
        { text: 'PRESS SPACE TO KEEP PLAYING', big: true },
      ], PALETTE.gold);
    }
  }

  return { draw };
}

export { PLAYER };
