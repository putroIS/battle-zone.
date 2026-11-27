const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const healthEl = document.getElementById("health");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const pauseLabel = document.getElementById("pauseLabel");

const W = 960, H = 540;
canvas.width = W; canvas.height = H;

let player, enemies, shots, particles, score, wave, running, paused, lastTime, spawnTimer;
const keys = {};
const touchDirs = { up: false, down: false, left: false, right: false };

function resetGame() {
  player = { x: W / 2, y: H / 2, r: 15, speed: 245, hp: 100, cooldown: 0, invuln: 0 };
  enemies = []; shots = []; particles = [];
  score = 0; wave = 1; spawnTimer = 0; lastTime = 0;
  updateHUD();
}
function updateHUD() {
  scoreEl.textContent = score;
  waveEl.textContent = wave;
  healthEl.textContent = Math.max(0, Math.ceil(player.hp));
}
function startGame() {
  resetGame();
  running = true; paused = false;
  startOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  pauseLabel.classList.add("hidden");
  requestAnimationFrame(loop);
}
function endGame() {
  running = false;
  document.getElementById("finalScore").textContent = score;
  gameOverOverlay.classList.remove("hidden");
}
function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseLabel.classList.toggle("hidden", !paused);
  if (!paused) { lastTime = 0; requestAnimationFrame(loop); }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = side === 0 ? -20 : side === 1 ? W + 20 : Math.random() * W;
  let y = side === 2 ? -20 : side === 3 ? H + 20 : Math.random() * H;
  const tough = Math.random() < Math.min(.12 + wave * .025, .4);
  enemies.push({ x, y, r: tough ? 18 : 13, hp: tough ? 3 : 1, speed: (tough ? 58 : 78) + wave * 5, tough, hit: 0 });
}
function nearestEnemy() {
  let nearest = null, best = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < best) { best = d; nearest = e; }
  }
  return nearest;
}
function shoot() {
  const target = nearestEnemy();
  if (!target) return;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 470, vy: Math.sin(angle) * 470, life: 1.3 });
}
function burst(x, y, color, amount = 8) {
  for (let i = 0; i < amount; i++) {
    const a = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 150;
    particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .35 + Math.random() * .4, color });
  }
}
function update(dt) {
  let dx = (keys.ArrowRight || keys.d || touchDirs.right ? 1 : 0) - (keys.ArrowLeft || keys.a || touchDirs.left ? 1 : 0);
  let dy = (keys.ArrowDown || keys.s || touchDirs.down ? 1 : 0) - (keys.ArrowUp || keys.w || touchDirs.up ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  player.x = Math.max(player.r, Math.min(W - player.r, player.x + dx / len * player.speed * dt));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y + dy / len * player.speed * dt));
  player.cooldown -= dt;
  player.invuln = Math.max(0, player.invuln - dt);
  if (player.cooldown <= 0 && enemies.length) { shoot(); player.cooldown = .32; }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(.32, 1.15 - wave * .055);
  }
  for (const e of enemies) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    e.hit = Math.max(0, e.hit - dt);
    if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r && player.invuln <= 0) {
      player.hp -= 12; player.invuln = .65;
      burst(player.x, player.y, "#ff667a", 10);
      updateHUD();
      if (player.hp <= 0) { endGame(); return; }
    }
  }
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    for (const e of enemies) {
      if (e.hp > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r + 5) {
        e.hp -= 1; s.life = 0; e.hit = .12;
        burst(s.x, s.y, "#55f2e5", 3);
        if (e.hp <= 0) { score += e.tough ? 25 : 10; burst(e.x, e.y, e.tough ? "#ffb454" : "#ff667a", 12); }
        break;
      }
    }
  }
  shots = shots.filter(s => s.life > 0 && s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10);
  enemies = enemies.filter(e => e.hp > 0);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= .96; p.vy *= .96; }
  particles = particles.filter(p => p.life > 0);
  const nextWave = 1 + Math.floor(score / 120);
  if (nextWave > wave) wave = nextWave;
  updateHUD();
}

function drawGrid() {
  ctx.fillStyle = "#091626"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(77, 128, 164, .12)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}
function draw() {
  drawGrid();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const s of shots) {
    ctx.fillStyle = "#7ffff2"; ctx.shadowBlur = 14; ctx.shadowColor = "#42e8dc";
    ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  for (const e of enemies) {
    ctx.fillStyle = e.hit > 0 ? "#ffffff" : (e.tough ? "#ffb454" : "#ff647c");
    ctx.shadowBlur = 16; ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#182338"; ctx.beginPath(); ctx.arc(e.x - 4, e.y - 2, 2.5, 0, Math.PI * 2); ctx.arc(e.x + 4, e.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Player
  ctx.save(); ctx.translate(player.x, player.y);
  ctx.fillStyle = player.invuln > 0 && Math.floor(performance.now() / 80) % 2 ? "#ffffff" : "#42e8dc";
  ctx.shadowBlur = 22; ctx.shadowColor = "#42e8dc";
  ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "#102337"; ctx.beginPath(); ctx.arc(5, -4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Health bar
  ctx.fillStyle = "#263c53"; ctx.fillRect(18, 18, 150, 8);
  ctx.fillStyle = player.hp > 35 ? "#42e8dc" : "#ff647c";
  ctx.fillRect(18, 18, 150 * Math.max(0, player.hp / 100), 8);
}
function loop(timestamp) {
  if (!running || paused) return;
  const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, .035);
  lastTime = timestamp;
  update(dt); draw();
  if (running) requestAnimationFrame(loop);
}

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (e.code === "Space" && !e.repeat) togglePause();
});
document.addEventListener("keyup", e => { keys[e.key] = false; });
document.querySelectorAll("[data-dir]").forEach(btn => {
  const dir = btn.dataset.dir;
  const down = e => { e.preventDefault(); touchDirs[dir] = true; };
  const up = e => { e.preventDefault(); touchDirs[dir] = false; };
  btn.addEventListener("pointerdown", down);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, up));
});
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", startGame);
document.getElementById("pauseBtn").addEventListener("click", togglePause);

resetGame();
draw();
