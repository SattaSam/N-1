(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = {
  crystals: document.getElementById('crystals'),
  scrap: document.getElementById('scrap'),
  mission: document.getElementById('missionText'),
  message: document.getElementById('message')
};

const WORLD = { w: 2400, h: 1800 };
const keys = new Set();
let dpr = 1;
let last = performance.now();
let camera = { x: WORLD.w / 2, y: WORLD.h / 2 };
let messageTimer = 0;

const saveKey = 'bluefox-odyssey-v013';
const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');

const player = {
  x: saved?.x ?? WORLD.w / 2,
  y: saved?.y ?? WORLD.h / 2,
  r: 22,
  speed: 235,
  crystals: saved?.crystals ?? 0,
  scrap: saved?.scrap ?? 0,
  facing: 1,
  bob: 0
};

const rng = mulberry32(1307);
const rocks = Array.from({length: 58}, () => ({
  x: 80 + rng() * (WORLD.w - 160),
  y: 80 + rng() * (WORLD.h - 160),
  r: 18 + rng() * 34
}));

const crystals = Array.from({length: 16}, (_, i) => ({
  id: i,
  x: 120 + rng() * (WORLD.w - 240),
  y: 120 + rng() * (WORLD.h - 240),
  collected: saved?.collected?.includes(i) ?? false,
  phase: rng() * Math.PI * 2
}));

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function showMessage(text) {
  ui.message.textContent = text;
  ui.message.classList.add('show');
  messageTimer = 2.2;
}

function save() {
  localStorage.setItem(saveKey, JSON.stringify({
    x: Math.round(player.x),
    y: Math.round(player.y),
    crystals: player.crystals,
    scrap: player.scrap,
    collected: crystals.filter(c => c.collected).map(c => c.id)
  }));
}

function updateUI() {
  ui.crystals.textContent = player.crystals;
  ui.scrap.textContent = player.scrap;
  if (player.crystals >= 5) {
    ui.mission.textContent = 'Mission accomplie — explore la zone.';
  }
}

function inputVector() {
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('KeyQ') || keys.has('left')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD') || keys.has('right')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW') || keys.has('KeyZ') || keys.has('up')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS') || keys.has('down')) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, moving: x !== 0 || y !== 0 };
}

addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));

document.querySelectorAll('[data-dir]').forEach(btn => {
  const dir = btn.dataset.dir;
  const down = e => { e.preventDefault(); keys.add(dir); };
  const up = e => { e.preventDefault(); keys.delete(dir); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', up);
});

document.getElementById('resetCamera').addEventListener('click', () => {
  camera.x = player.x;
  camera.y = player.y;
  showMessage('Caméra recentrée');
});

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const worldX = e.clientX - innerWidth / 2 + camera.x;
  const worldY = e.clientY - innerHeight / 2 + camera.y;
  const dx = worldX - player.x;
  const dy = worldY - player.y;
  const len = Math.hypot(dx, dy);
  if (len > 10) {
    player.clickTarget = { x: worldX, y: worldY };
  }
});

function collide(nx, ny) {
  for (const r of rocks) {
    const dx = nx - r.x, dy = ny - r.y;
    if (Math.hypot(dx, dy) < player.r + r.r * .72) return true;
  }
  return false;
}

function update(dt) {
  const v = inputVector();
  let vx = v.x, vy = v.y;
  let moving = v.moving;

  if (!moving && player.clickTarget) {
    const dx = player.clickTarget.x - player.x;
    const dy = player.clickTarget.y - player.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) player.clickTarget = null;
    else { vx = dx / len; vy = dy / len; moving = true; }
  } else if (moving) {
    player.clickTarget = null;
  }

  if (moving) {
    player.facing = vx < -0.05 ? -1 : vx > 0.05 ? 1 : player.facing;
    player.bob += dt * 9;
    const nx = Math.max(35, Math.min(WORLD.w - 35, player.x + vx * player.speed * dt));
    const ny = Math.max(35, Math.min(WORLD.h - 35, player.y + vy * player.speed * dt));
    if (!collide(nx, player.y)) player.x = nx;
    if (!collide(player.x, ny)) player.y = ny;
  }

  for (const c of crystals) {
    if (!c.collected && Math.hypot(player.x - c.x, player.y - c.y) < 42) {
      c.collected = true;
      player.crystals += 1;
      showMessage(player.crystals >= 5 ? 'Mission accomplie !' : 'Cristal collecté');
      updateUI();
      save();
    }
  }

  camera.x += (player.x - camera.x) * Math.min(1, dt * 4.5);
  camera.y += (player.y - camera.y) * Math.min(1, dt * 4.5);

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) ui.message.classList.remove('show');
  }
}

function screen(x, y) {
  return { x: x - camera.x + innerWidth / 2, y: y - camera.y + innerHeight / 2 };
}

function drawGround() {
  ctx.fillStyle = '#152436';
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  const spacing = 90;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(109,181,208,.08)';
  const startX = ((-camera.x + innerWidth/2) % spacing + spacing) % spacing;
  const startY = ((-camera.y + innerHeight/2) % spacing + spacing) % spacing;
  for (let x = startX; x < innerWidth; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, innerHeight); ctx.stroke();
  }
  for (let y = startY; y < innerHeight; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(innerWidth, y); ctx.stroke();
  }

  const tl = screen(0, 0);
  ctx.strokeStyle = 'rgba(115,214,255,.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(tl.x, tl.y, WORLD.w, WORLD.h);
}

function drawRock(r) {
  const p = screen(r.x, r.y);
  if (p.x < -80 || p.y < -80 || p.x > innerWidth + 80 || p.y > innerHeight + 80) return;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(p.x+6,p.y+10,r.r*.9,r.r*.42,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3f5667';
  ctx.beginPath();
  ctx.moveTo(p.x-r.r*.8,p.y+r.r*.35);
  ctx.lineTo(p.x-r.r*.48,p.y-r.r*.55);
  ctx.lineTo(p.x+r.r*.18,p.y-r.r*.75);
  ctx.lineTo(p.x+r.r*.82,p.y-r.r*.05);
  ctx.lineTo(p.x+r.r*.52,p.y+r.r*.45);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6b8594'; ctx.lineWidth = 2; ctx.stroke();
}

function drawCrystal(c, t) {
  if (c.collected) return;
  const p = screen(c.x, c.y);
  const bob = Math.sin(t*2.8 + c.phase)*5;
  ctx.fillStyle = 'rgba(55,217,255,.16)';
  ctx.beginPath(); ctx.arc(p.x,p.y+bob,24,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#65e4ff';
  ctx.beginPath();
  ctx.moveTo(p.x,p.y-18+bob);
  ctx.lineTo(p.x+11,p.y-2+bob);
  ctx.lineTo(p.x+6,p.y+18+bob);
  ctx.lineTo(p.x-8,p.y+12+bob);
  ctx.lineTo(p.x-12,p.y-4+bob);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d7fbff'; ctx.stroke();
}

function drawFox() {
  const p = screen(player.x, player.y);
  const bob = Math.sin(player.bob) * 2;

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(player.facing, 1);

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0,22,25,10,0,0,Math.PI*2); ctx.fill();

  // queue
  ctx.strokeStyle = '#1f82d0';
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13,11); ctx.quadraticCurveTo(-37,5,-35,-18); ctx.stroke();
  ctx.strokeStyle = '#eef9ff'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-34,-12); ctx.lineTo(-35,-20); ctx.stroke();

  // combinaison
  ctx.fillStyle = '#e8f5fb';
  ctx.beginPath(); ctx.roundRect(-17,-3,34,39,12); ctx.fill();
  ctx.strokeStyle = '#6ba6c2'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#173d63';
  ctx.fillRect(-9,9,18,10);

  // tête
  ctx.fillStyle = '#1f82d0';
  ctx.beginPath(); ctx.arc(0,-19,24,0,Math.PI*2); ctx.fill();

  // oreilles
  ctx.beginPath();
  ctx.moveTo(-18,-34); ctx.lineTo(-13,-57); ctx.lineTo(-2,-38); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18,-34); ctx.lineTo(13,-57); ctx.lineTo(2,-38); ctx.fill();

  // museau
  ctx.fillStyle = '#eff8fb';
  ctx.beginPath(); ctx.ellipse(5,-12,15,12,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#071426';
  ctx.beginPath(); ctx.arc(16,-15,4,0,Math.PI*2); ctx.fill();

  // visière
  ctx.strokeStyle = '#9beaff';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0,-20,28,Math.PI*1.05,Math.PI*1.95); ctx.stroke();

  // oeil
  ctx.fillStyle = '#071426';
  ctx.beginPath(); ctx.arc(8,-24,3,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

function render(t) {
  drawGround();
  rocks.sort((a,b)=>a.y-b.y).forEach(drawRock);
  crystals.forEach(c => drawCrystal(c, t));
  drawFox();
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}

updateUI();
showMessage('Flèches / ZQSD / clic pour se déplacer');
requestAnimationFrame(frame);
setInterval(save, 5000);
addEventListener('beforeunload', save);
})();