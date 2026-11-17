# Lumen Tide — make.fun best-game-01 entry

**Game:** Lumen Tide — a glowing reef arcade (original 2D canvas game, no library, no
network). You are a little lantern wisp swimming a neon reef.

**Bounty:** [Make the best game](https://make.fun/c/best-game-01) (`best-game-01`),
pot 1,000 USDC (1st place 400 USDC), entries close 2026-11-18 18:00 UTC. No entry fee.

## How to play

- **Goal:** catch light motes, build your combo, survive the tide. Reach **level 10 to
  win** ("You tamed the tide!") — then keep swimming endlessly for a higher score.
- **The twist:** one colour is **attuned** at a time (shown in the HUD). Catching an
  attuned mote builds a combo that multiplies its points (up to ×5); any other colour
  pays only 2 points and breaks the combo. The attuned colour changes every 12 seconds,
  so you keep choosing what to chase.
- **Hazards:** spiked urchins — one hit costs a life (3 lives). Dash through them with
  **Space** (brief invulnerability, 1.1 s cooldown).
- **Power-ups:** Shield (blocks one hit), Magnet (motes fly to you, 6 s), Slow Tide
  (everything drifts slower, 5 s).
- **Controls:** mouse or WASD / arrow keys to swim · Space to dash · P to pause ·
  M to mute. Sound is synthesised in code (WebAudio); there are no audio files.
- **Score/HUD:** score, best score, level + progress bar to the next level, attuned
  colour, combo multiplier, lives (hearts), dash readiness, active power-up timers.

## Run it locally

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in a desktop browser. No build step, no network requests:
every script is a file under `game/`.

Hand the entry in (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/game, out/screenshots, out/dossier.json
```

## Layout

| Path | Job |
| --- | --- |
| `game/index.html` | Page, canvas, footer controls |
| `game/src/config.js` | Tuning + palette (all balance numbers) |
| `game/src/random.js` | Seeded RNG (mulberry32) |
| `game/src/audio.js` | Synthesised WebAudio sound effects |
| `game/src/input.js` | Keyboard + mouse, edge-triggered actions |
| `game/src/entities.js` | Factories: motes, urchins, power-ups, particles |
| `game/src/world.js` | Rules: spawning, collisions, combo, levels, win/lose |
| `game/src/render.js` | All drawing: reef, wisp, HUD, five screens |
| `game/src/shots.js` | Screenshot scenes (`?shot=start\|play\|end\|win`) |
| `game/src/main.js` | Boot, fixed-step loop, screen state machine |
| `main.ts` | Entrypoint: copies game/+screenshots/ to /output, writes dossier.json |
| `serve.ts` | Tiny static server for local play |
| `shots.json` | The 4 screenshot scenes |
| `vendor/makefun-game.ts` | Kit library, unchanged (writes dossier.json) |
| `LICENSE` | MIT |

Screenshots are real renders of the game's own code, staged by `shots.js` (an autopilot
plays the real rules forward from a fixed seed): `1-start.jpg` (title, the cover),
`2-play.jpg` (mid-game with HUD + combo), `3-end.jpg` (game over + restart),
`4-win.jpg` (level-10 victory screen).

## Local test results

Tested 2026-11-17 ~02:11 +07 on this machine
(Node v24.22.1, Playwright chromium-headless-shell):

- **Screenshots:** all 4 scenes rendered via `?shot=…&seed=1` in headless Chromium and
  saved as 1280×720 JPEGs (41–63 KiB each, under the 256 KiB cap): `1-start.jpg`
  title screen, `2-play.jpg` mid-game (score 482, combo ×5, shield power-up on
  screen), `3-end.jpg` game over (score 1686, level 13, best combo ×5, restart
  prompt), `4-win.jpg` victory (level 10 reached, score 5300). Visually checked:
  HUD readable, player never under the HUD bar, no duplicate banner on the win
  screen.
- **Interactive play test (keyboard + mouse, real game, no `?shot=`):** title →
  Space starts play → ArrowRight moves → Space dashes → P pauses → P resumes →
  mouse steers. Screen states verified live via `window.__lumen`. **Zero console
  errors, zero page errors, zero failed requests** across all runs.
- **Bugs found & fixed during testing:** (1) `player.radius` was missing from the
  world state, so the wisp's position went NaN on the first step and the canvas
  threw on `createRadialGradient` — fixed by adding `radius: PLAYER.radius`;
  (2) a `takeActions()` double-read swallowed the Dash key — fixed by queuing the
  dash once per frame; (3) the wisp could swim under the HUD bar — clamped to
  below the HUD; (4) the win banner duplicated the win panel title — banner is
  cleared on win/game-over.
- **Determinism:** `MAKEFUN_OUTPUT_DIR=/tmp/out1 node main.ts` and the same into
  `/tmp/out2` produce **byte-identical trees** (`diff -r` clean) — the grader's
  two runs will match.
- **Gate caps:** game/ = 10 files, 48,301 bytes (caps: 993 files, 48 MiB);
  index.html 1,506 bytes (cap 1 MiB); screenshots 4 files, 215,868 bytes total,
  each ≤ 63 KiB (cap 256 KiB each); dossier.json 338,976 bytes (cap 1.5 MiB),
  text 49,020 bytes (cap 160 KiB). No external references in game/: every import
  is a relative `./…js` file, no `fetch`/XHR/WebSocket, no `http(s):` URL.
- **Not tested:** a full `node cli/makefun.mjs check` (needs a finished bundle +
  the coordinator's account) — see transcript note below.

## Submission profile (for the coordinator — DO NOT submit from here)

- **Payout wallet (public address only):** `7FmUHEga139oVfiTLcb7gVDtz3679kV9RVLdUqYtJbDo`
  (verified on Solscan 2026-11-17 ~09:03 +07: valid format, account does not exist
  onchain yet, 0 SOL — that does not block this bounty, which has no entry fee).
  Already written to `.makefun/owner.json`.
- **GitHub owner for the repo:** `tothimai196xx-lgtm` (verified 2026-11-17 ~09:05 +07:
  account exists, display name "tothimai"). The submission repo must belong to this
  account, be created after the bounty opened (2026-11-15T18:00:00Z), be public, and
  carry an OSI-approved license (MIT, in `LICENSE`).
- **NOT submitted.** The final submit step needs an entry signature made with the
  owner's Solana wallet. That signature must come from Đào Kim Lực himself (kit CLI
  with his own keypair, or GitHub sign-in on make.fun) — the agent never asks for,
  handles, or stores a private key or seed phrase. Steps for the coordinator:
  1. Create the repo under `tothimai196xx-lgtm` (after 2026-11-15T18:00:00Z),
     push this tree (see `.gitignore` — the kit folder stays out).
  2. Finish the transcript bundle as described under "Transcript" above.
  3. Get the entry signature from the owner, then submit with the kit CLI before
     2026-11-18 18:00 UTC.

## Blockers / transcript status

- **Transcript — BUNDLE IS POSSIBLE, but must be finished by the top-level agent:**
  `node cli/makefun.mjs bundle --dry-run` (from `best-game-01-kit/`) already finds
  the two real Muse-app sessions that built this entry (this subagent session
  `577eb334-…` and its parent `808d2dbd-…`). To produce a submittable bundle, the
  top-level agent runs, AFTER this build finishes:
  ```sh
  cd best-game-01-kit
  node cli/makefun.mjs bundle --repo ~/workspace/makefun-bounty/best-game-01 \
    --out /tmp/lumen-tide-bundle.tar.gz --mcp none \
    --harness muse-app --provider meta --model muse-spark-1.3 --effort default \
    --prompt-file <file with the user's opening prompt, word for word> \
    --prompt-origin handed-off --prompt-via "parent orchestrator subagent task" \
    --muse-usage <usage rows for the parent + this subagent, from Muse's DB>
  ```
  (Missing pieces the dry run names: the user's exact opening prompt, the agent
  facts above, `--muse-usage` rows — those rows are written only once this
  subagent's run completes, so the parent must attach them. `--mcp none`: no MCP
  server was used. No transcript was fabricated; nothing was hand-written as a
  session file.)
- **No code blockers:** game runs offline, `main.ts` exits 0, two runs produce
  identical output bytes (determinism check — see above).

## Test log

See "Local test results" above. Raw play-test script: `/tmp/pwtest/shoot.mjs`
(Playwright; rerun any time with `cd /tmp/pwtest && node shoot.mjs`).
