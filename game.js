// Camp Maze — a tiny Pac-Man style game, safe for GitHub Pages.
// Percy-Jackson-inspired mood without using copyrighted names/characters.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const msgEl = document.getElementById("msg");
const soundBtn = document.getElementById("soundBtn");
const restartBtn = document.getElementById("restartBtn");

// ---- Sound (WebAudio; no external files needed) ----
let audioOn = true;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function ensureAudio() {
  if (!actx) actx = new AudioCtx();
}
function beep(type = "sine", freq = 440, dur = 0.08, vol = 0.06) {
  if (!audioOn) return;
  ensureAudio();
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g);
  g.connect(actx.destination);
  o.start();
  o.stop(actx.currentTime + dur);
}
function blipUp() { beep("triangle", 660, 0.07, 0.06); beep("triangle", 880, 0.06, 0.05); }
function pelletSound() { beep("sine", 740, 0.05, 0.05); }
function powerSound() { beep("square", 220, 0.09, 0.06); beep("square", 330, 0.10, 0.05); }
function bonkSound() { beep("sawtooth", 140, 0.12, 0.07); }
function winJingle() { blipUp(); setTimeout(() => beep("triangle", 990, 0.10, 0.05), 90); setTimeout(() => beep("triangle", 1320, 0.12, 0.05), 190); }

// ---- Grid + Level ----
const TILE = 28; // 20x20 grid -> 560 canvas
const W = 20, H = 20;

const level = [
  "####################",
  "#........##........#",
  "#.####...##...####.#",
  "#o#..#........#..#o#",
  "#.####.######.####.#",
  "#..................#",
  "###.##.######.##.###",
  "#......#....#......#",
  "#.####.#.##.#.####.#",
  "#......#....#......#",
  "###.##.######.##.###",
  "#..................#",
  "#.####.######.####.#",
  "#o#..#........#..#o#",
  "#.####...##...####.#",
  "#........##........#",
  "#.######.##.######.#",
  "#..................#",
  "#........##........#",
  "####################"
];

function isWall(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  return level[y][x] === "#";
}

// Pellets + power-ups:
let pellets = new Set();
let powers = new Set();

function resetDots() {
  pellets.clear();
  powers.clear();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = level[y][x];
      if (c === ".") pellets.add(`${x},${y}`);
      if (c === "o") powers.add(`${x},${y}`);
    }
  }
}

// ---- Player + Monsters ----
let score = 0;
let lives = 3;

const player = {
  x: 1, y: 1,
  dx: 0, dy: 0,
  nextDx: 0, nextDy: 0,
};

const monsters = [
  { x: 18, y: 1,  color: "#ff6a9f", dx: -1, dy: 0, scared: 0 },
  { x: 18, y: 18, color: "#6ae4ff", dx: 0,  dy: -1, scared: 0 },
  { x: 1,  y: 18, color: "#64ffb3", dx: 1,  dy: 0, scared: 0 },
];

let tick = 0;
let gameOver = false;
let win = false;

function setMessage(text) {
  msgEl.textContent = text || "";
}

function resetAll() {
  score = 0;
  lives = 3;
  player.x = 1; player.y = 1;
  player.dx = 0; player.dy = 0;
  player.nextDx = 0; player.nextDy = 0;

  monsters[0].x = 18; monsters[0].y = 1;  monsters[0].dx = -1; monsters[0].dy = 0; monsters[0].scared = 0;
  monsters[1].x = 18; monsters[1].y = 18; monsters[1].dx = 0;  monsters[1].dy = -1; monsters[1].scared = 0;
  monsters[2].x = 1;  monsters[2].y = 18; monsters[2].dx = 1;  monsters[2].dy = 0; monsters[2].scared = 0;

  resetDots();
  tick = 0;
  gameOver = false;
  win = false;
  setMessage("✨ Tip: Grab a trident power-up (🔱) to scare monsters!");
  updateHud();
}
function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
}

// ---- Controls ----
function dirFromKey(k) {
  if (k === "ArrowUp" || k === "w" || k === "W") return [0, -1];
  if (k === "ArrowDown" || k === "s" || k === "S") return [0, 1];
  if (k === "ArrowLeft" || k === "a" || k === "A") return [-1, 0];
  if (k === "ArrowRight" || k === "d" || k === "D") return [1, 0];
  return null;
}
window.addEventListener("keydown", (e) => {
  const d = dirFromKey(e.key);
  if (!d) return;
  // Resume audio only after user gesture (browser policy)
  if (actx && actx.state === "suspended") actx.resume();
  player.nextDx = d[0];
  player.nextDy = d[1];
});

soundBtn.addEventListener("click", () => {
  audioOn = !audioOn;
  soundBtn.textContent = audioOn ? "🔊 Sound: On" : "🔇 Sound: Off";
  if (audioOn) {
    ensureAudio();
    if (actx.state === "suspended") actx.resume();
    blipUp();
  }
});

restartBtn.addEventListener("click", () => {
  resetAll();
});

// ---- Movement helpers ----
function tryApplyNextDir() {
  const nx = player.x + player.nextDx;
  const ny = player.y + player.nextDy;
  if (!isWall(nx, ny)) {
    player.dx = player.nextDx;
    player.dy = player.nextDy;
  }
}
function moveEntity(ent) {
  const nx = ent.x + ent.dx;
  const ny = ent.y + ent.dy;
  if (!isWall(nx, ny)) {
    ent.x = nx; ent.y = ny;
    return true;
  }
  return false;
}

function neighbors(x, y) {
  const dirs = [
    [1,0],[-1,0],[0,1],[0,-1]
  ];
  return dirs
    .map(([dx,dy]) => ({dx,dy, x:x+dx, y:y+dy}))
    .filter(p => !isWall(p.x, p.y));
}

function chooseMonsterDir(m) {
  const options = neighbors(m.x, m.y);
  // prevent immediate backtracking when possible
  const back = { dx: -m.dx, dy: -m.dy };
  const filtered = options.filter(o => !(o.dx === back.dx && o.dy === back.dy));
  const opts = filtered.length ? filtered : options;

  // Simple "chase / flee" logic
  const target = { x: player.x, y: player.y };
  const scoreFn = (o) => {
    const d = Math.abs(o.x - target.x) + Math.abs(o.y - target.y);
    return m.scared > 0 ? d : -d; // scared: maximize distance; normal: minimize distance
  };

  // Slight randomness to keep it playful
  opts.sort((a,b) => scoreFn(b) - scoreFn(a) + (Math.random()-0.5)*0.4);
  m.dx = opts[0].dx;
  m.dy = opts[0].dy;
}

// ---- Game rules ----
function checkPellets() {
  const key = `${player.x},${player.y}`;
  if (pellets.has(key)) {
    pellets.delete(key);
    score += 10;
    pelletSound();
    updateHud();
  }
  if (powers.has(key)) {
    powers.delete(key);
    score += 50;
    powerSound();
    monsters.forEach(m => m.scared = 80); // ~4 seconds (80 ticks at 50ms => 4s)
    setMessage("🔱 Power-up! Monsters are scared!");
    updateHud();
  }
  if (pellets.size === 0 && powers.size === 0) {
    win = true;
    gameOver = true;
    setMessage("🏆 You did it! Camp Maze champion!");
    winJingle();
  }
}

function checkCollisions() {
  for (const m of monsters) {
    if (m.x === player.x && m.y === player.y) {
      if (m.scared > 0) {
        // "bop" monster back to corner
        score += 200;
        beep("triangle", 520, 0.08, 0.06);
        m.x = 18; m.y = 18;
        m.scared = 0;
        updateHud();
        setMessage("😄 Monster bonked! Nice!");
      } else {
        lives -= 1;
        bonkSound();
        updateHud();
        if (lives <= 0) {
          gameOver = true;
          setMessage("💤 Game over — want to try again?");
        } else {
          // reset positions, keep dots
          player.x = 1; player.y = 1;
          player.dx = 0; player.dy = 0;
          monsters[0].x = 18; monsters[0].y = 1;  monsters[0].dx = -1; monsters[0].dy = 0;
          monsters[1].x = 18; monsters[1].y = 18; monsters[1].dx = 0;  monsters[1].dy = -1;
          monsters[2].x = 1;  monsters[2].y = 18; monsters[2].dx = 1;  monsters[2].dy = 0;
          setMessage("💫 Oops! You’re okay — keep going!");
        }
        return;
      }
    }
  }
}

// ---- Drawing ----
function drawTile(x, y, kind) {
  const px = x * TILE, py = y * TILE;
  if (kind === "#") {
    ctx.fillStyle = "rgba(106,228,255,0.12)";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = "rgba(106,228,255,0.28)";
    ctx.strokeRect(px+1, py+1, TILE-2, TILE-2);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background glow
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // walls
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (level[y][x] === "#") drawTile(x, y, "#");
    }
  }

  // pellets
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (const key of pellets) {
    const [x,y] = key.split(",").map(Number);
    ctx.beginPath();
    ctx.arc(x*TILE + TILE/2, y*TILE + TILE/2, 3.2, 0, Math.PI*2);
    ctx.fill();
  }

  // power-ups (tridents)
  for (const key of powers) {
    const [x,y] = key.split(",").map(Number);
    ctx.font = "18px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔱", x*TILE + TILE/2, y*TILE + TILE/2 + 1);
  }

  // player
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 215, 90, 0.98)";
  ctx.arc(player.x*TILE + TILE/2, player.y*TILE + TILE/2, TILE*0.36, 0, Math.PI*2);
  ctx.fill();

  // monsters
  for (const m of monsters) {
    ctx.beginPath();
    const scared = m.scared > 0;
    ctx.fillStyle = scared ? "rgba(170,190,255,0.95)" : m.color;
    ctx.roundRect(m.x*TILE + TILE*0.18, m.y*TILE + TILE*0.18, TILE*0.64, TILE*0.64, 10);
    ctx.fill();

    // eyes
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.arc(m.x*TILE + TILE*0.40, m.y*TILE + TILE*0.42, 3.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x*TILE + TILE*0.60, m.y*TILE + TILE*0.42, 3.2, 0, Math.PI*2); ctx.fill();
  }
}

// Canvas rounded rect helper
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const min = Math.min(w, h) / 2;
    r = Math.min(r, min);
    this.beginPath();
    this.moveTo(x+r, y);
    this.arcTo(x+w, y, x+w, y+h, r);
    this.arcTo(x+w, y+h, x, y+h, r);
    this.arcTo(x, y+h, x, y, r);
    this.arcTo(x, y, x+w, y, r);
    this.closePath();
    return this;
  };
}

// ---- Loop ----
function step() {
  if (gameOver) {
    draw();
    return;
  }

  tick++;

  // player direction change
  tryApplyNextDir();

  // move player every tick
  if (player.dx !== 0 || player.dy !== 0) {
    const nx = player.x + player.dx;
    const ny = player.y + player.dy;
    if (!isWall(nx, ny)) {
      player.x = nx; player.y = ny;
    }
  }

  // monsters move slightly slower for kid-friendliness
  if (tick % 2 === 0) {
    for (const m of monsters) {
      if (m.scared > 0) m.scared--;
      // choose new direction at intersections or if blocked
      const moved = moveEntity(m);
      const opts = neighbors(m.x, m.y);
      const isIntersection = opts.length >= 3;
      if (!moved || isIntersection) chooseMonsterDir(m);
    }
  }

  checkPellets();
  checkCollisions();
  draw();
}

resetAll();
setInterval(step, 70);
