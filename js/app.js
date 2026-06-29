// === Bangkok Urban Planning 3D - Single Application File ===

// --- Noise ---
class SimpleNoise {
  constructor(seed = 0) { this.seed = seed; this.perm = this._genPerm(); }
  _genPerm() {
    const p = new Array(512), base = new Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this._rand() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    return p;
  }
  _rand() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  noise2D(x, y) {
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y) => { const s = (h & 1) ? -x : x + ((h & 2) ? -y : y); return s; };
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = this.perm[X] + Y, B = this.perm[X + 1] + Y;
    return lerp(lerp(grad(this.perm[A], x, y), grad(this.perm[B], x - 1, y), u),
                lerp(grad(this.perm[A + 1], x, y - 1), grad(this.perm[B + 1], x - 1, y - 1), v), v);
  }
  fbm(x, y, octaves = 4) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) { val += this.noise2D(x * freq, y * freq) * amp; max += amp; amp *= 0.5; freq *= 2; }
    return val / max;
  }
}

// --- Constants ---
const GRID_SIZE = 60;
const CELL = 1;
const COLORS = {
  water: [0, 100, 160], waterDeep: [0, 60, 120],
  flood: [255, 80, 60], ground: [60, 80, 60], groundDry: [90, 100, 70],
  building: [140, 160, 180], buildingNew: [80, 200, 180],
  green: [40, 140, 60], greenDark: [20, 100, 40],
  road: [60, 60, 70], rail: [255, 100, 50], park: [50, 180, 80],
  sky: [10, 14, 23], highlight: [0, 212, 170],
  warning: [255, 167, 38], danger: [239, 83, 80],
};

function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// --- City Model ---
class CityModel {
  constructor() {
    this.noise = new SimpleNoise(42);
    this.chaoPrayaNoise = new SimpleNoise(99);
    this.buildings = []; this.parks = []; this.railStations = [];
    this.floodZones = []; this.generate();
  }
  generate() {
    this.terrain = []; this.buildings = []; this.parks = [];
    this.railStations = []; this.floodZones = [];
    this.riverPath = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.riverPath.push({ x: 38 + this.chaoPrayaNoise.noise2D(y * 0.05, 0) * 6, y });
    }
    for (let x = 0; x < GRID_SIZE; x++) {
      this.terrain[x] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        const baseElev = this.noise.fbm(x * 0.03, y * 0.03, 3) * 2 + 1;
        const dtr = this._distToRiver(x, y);
        let elev = baseElev;
        if (dtr < 2.5) elev = -0.5 + this.noise.noise2D(x * 0.1, y * 0.1) * 0.3;
        const fr = elev < 0.5 ? 0.8 : elev < 1 ? 0.5 : 0.2;
        this.terrain[x][y] = { elevation: elev, floodRisk: fr, isRiver: dtr < 2.5, distToRiver: dtr };
        if (fr > 0.6) this.floodZones.push({ x, y, risk: fr });
      }
    }
    for (let x = 3; x < GRID_SIZE - 3; x += 2) {
      for (let y = 3; y < GRID_SIZE - 3; y += 2) {
        const c = this.terrain[x] && this.terrain[x][y];
        if (!c || c.isRiver) continue;
        const cx = GRID_SIZE / 2, cy = GRID_SIZE / 2;
        const dc = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const den = Math.max(0.1, 1 - dc / (GRID_SIZE * 0.4));
        if (Math.random() > den) continue;
        const h = Math.max(0.5, 1 + Math.random() * 6 * den + this.noise.noise2D(x * 0.1, y * 0.1) * 2);
        const ic = dc < 15;
        this.buildings.push({ x, y, height: h, isCommercial: ic,
          color: ic ? lerpColor(COLORS.building, COLORS.buildingNew, Math.random() * 0.3)
                     : lerpColor(COLORS.building, COLORS.ground, 0.3 + Math.random() * 0.2) });
      }
    }
    const pl = [{ x: 20, y: 25, size: 4 }, { x: 30, y: 35, size: 3 }, { x: 15, y: 40, size: 3 },
                { x: 45, y: 20, size: 2 }, { x: 25, y: 15, size: 2 }];
    pl.forEach(p => { for (let dx = 0; dx < p.size; dx++) for (let dy = 0; dy < p.size; dy++)
      this.parks.push({ x: p.x + dx, y: p.y + dy, height: 0.5 + Math.random() * 0.5 }); });
    this.railLines = this._railLines();
    this.railStations = this.railLines.flatMap(l => l.stations);
    this.proposedParks = this._proposedGreen();
  }
  _distToRiver(x, y) {
    let m = Infinity;
    for (const r of this.riverPath) { const d = Math.sqrt((x - r.x) ** 2 + (y - r.y) ** 2); if (d < m) m = d; }
    return m;
  }
  _railLines() {
    const ls = [{ stations: [], color: [255, 100, 50] }, { stations: [], color: [50, 150, 255] }, { stations: [], color: [100, 200, 100] }];
    for (let x = 10; x <= 35; x += 3) ls[0].stations.push({ x, y: 28 + Math.sin(x * 0.2) * 3 });
    for (let y = 10; y <= 50; y += 3) ls[1].stations.push({ x: 32 + Math.sin(y * 0.15) * 2, y });
    for (let y = 8; y <= 52; y += 3) ls[2].stations.push({ x: 22 + Math.sin(y * 0.1) * 2, y });
    return ls;
  }
  _proposedGreen() {
    const ps = [];
    for (let i = 0; i < 15; i++) {
      const x = 5 + Math.floor(Math.random() * (GRID_SIZE - 10));
      const y = 5 + Math.floor(Math.random() * (GRID_SIZE - 10));
      const c = this.terrain[x] && this.terrain[x][y];
      if (!c || c.isRiver) continue;
      ps.push({ x, y, size: 2 + Math.floor(Math.random() * 3) });
    }
    return ps;
  }
}

// --- Renderer ---
class ScenarioRenderer {
  constructor(scene, city) {
    this.scene = scene; this.city = city;
    this.groups = {};
    ['terrain', 'buildings', 'river', 'flood', 'transit', 'green', 'overlay'].forEach(n => {
      this.groups[n] = new THREE.Group(); this.groups[n].renderOrder = 1; scene.add(this.groups[n]);
    });
    this.targetGreen = 15; this.targetTransit = 25; this.targetFlood = 70; this.timePeriod = 0;
  }
  build() { this._terrain(); this._river(); this._buildings(); this._flood(); this._transit(); this._green(); }

  _terrain() {
    const g = this.groups.terrain; g.clear();
    const segs = GRID_SIZE;
    const geo = new THREE.PlaneGeometry(GRID_SIZE * CELL, GRID_SIZE * CELL, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let x = 0; x < segs; x++) for (let y = 0; y < segs; y++) {
      const idx = y * segs + x;
      const c = this.city.terrain[x] && this.city.terrain[x][y];
      const e = c ? c.elevation : 0;
      pos.setY(idx, Math.max(-0.5, e * 0.5));
      const t = clamp(e / 3, 0, 1);
      const col = lerpColor(COLORS.ground, COLORS.groundDry, t);
      colors[idx * 3] = col[0] / 255; colors[idx * 3 + 1] = col[1] / 255; colors[idx * 3 + 2] = col[2] / 255;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.attributes.position.needsUpdate = true;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
    g.add(new THREE.Mesh(geo, mat));
  }

  _river() {
    const g = this.groups.river; g.clear();
    for (let i = 0; i < this.city.riverPath.length - 1; i++) {
      const a = this.city.riverPath[i], b = this.city.riverPath[i + 1];
      const geo = new THREE.BoxGeometry(4.5, 0.15, CELL);
      const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(...COLORS.water), transparent: true, opacity: 0.7, shininess: 200 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(a.x, -0.3, a.y);
      m.rotation.y = Math.atan2(b.x - a.x, b.y - a.y);
      g.add(m);
    }
  }

  _buildings() {
    const g = this.groups.buildings; g.clear();
    this.city.buildings.forEach(b => {
      const geo = new THREE.BoxGeometry(CELL * 0.8, b.height, CELL * 0.8);
      const c = new THREE.Color(b.color[0] / 255, b.color[1] / 255, b.color[2] / 255);
      const mat = new THREE.MeshPhongMaterial({ color: c, transparent: true, opacity: 0.9 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(b.x, b.height / 2, b.y);
      m.userData = { type: 'building', name: b.isCommercial ? 'Commercial Building' : 'Residential', data: b };
      g.add(m);
    });
    this.city.parks.forEach(p => {
      const geo = new THREE.CylinderGeometry(CELL * 0.4, CELL * 0.5, p.height, 8);
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(...COLORS.park), transparent: true, opacity: 0.85 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.x, p.height / 2, p.y);
      m.userData = { type: 'park', name: 'Existing Park' };
      g.add(m);
    });
  }

  _flood() { this.groups.flood.clear(); this._updateFlood(); }
  _updateFlood() {
    const g = this.groups.flood; g.clear();
    const intensity = this.targetFlood / 100;
    this.city.floodZones.forEach(z => {
      const alpha = z.risk * intensity * 0.6;
      const geo = new THREE.PlaneGeometry(CELL, CELL); geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(...COLORS.flood), transparent: true, opacity: alpha });
      const m = new THREE.Mesh(geo, mat); m.position.set(z.x, 0.1, z.y); g.add(m);
    });
  }

  _transit() {
    const g = this.groups.transit; g.clear();
    this.city.railLines.forEach(line => {
      const c = new THREE.Color(...line.color);
      for (let i = 0; i < line.stations.length - 1; i++) {
        const a = line.stations[i], b = line.stations[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const geo = new THREE.CylinderGeometry(0.08, 0.08, len, 6);
        const mat = new THREE.MeshPhongMaterial({ color: c, emissive: c.clone().multiplyScalar(0.3) });
        const m = new THREE.Mesh(geo, mat);
        m.position.set((a.x + b.x) / 2, 2, (a.y + b.y) / 2);
        m.rotation.x = Math.PI / 2; m.rotation.z = -Math.atan2(dy, dx);
        g.add(m);
      }
      line.stations.forEach(s => {
        const geo = new THREE.SphereGeometry(0.35, 8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: c, emissive: c.clone().multiplyScalar(0.5) });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(s.x, 2, s.y);
        m.userData = { type: 'station', name: 'Transit Station' };
        g.add(m);
      });
    });
  }

  _green() { this.groups.green.clear(); this._updateGreen(); }
  _updateGreen() {
    const g = this.groups.green; g.clear();
    const gl = this.targetGreen / 100;
    this.city.proposedParks.forEach((p, i) => {
      if (i / this.city.proposedParks.length > gl) return;
      for (let dx = 0; dx < p.size; dx++) for (let dy = 0; dy < p.size; dy++) {
        const geo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 8);
        const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(...COLORS.green), transparent: true, opacity: 0.75 });
        const m = new THREE.Mesh(geo, mat); m.position.set(p.x + dx, 0.4, p.y + dy);
        m.userData = { type: 'proposed-park', name: 'Proposed Green Space' };
        g.add(m);
      }
    });
    if (gl > 0.3) for (let i = 0; i < this.city.riverPath.length; i += 3) {
      const rp = this.city.riverPath[i];
      const geo = new THREE.CylinderGeometry(0.3, 0.35, 0.6, 8);
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(...COLORS.greenDark), transparent: true, opacity: 0.6 });
      const m = new THREE.Mesh(geo, mat); m.position.set(rp.x + 3, 0.3, rp.y); g.add(m);
    }
  }

  setView(v) {
    this.currentView = v;
    // Default: show everything
    Object.values(this.groups).forEach(g => g.visible = true);
    // Hide overlays based on view
    if (v === 'overview') { this.groups.flood.visible = false; this.groups.green.visible = false; this.groups.transit.visible = false; }
    else if (v === 'flooding') { this.groups.green.visible = false; this.groups.transit.visible = false; this._updateFlood(); }
    else if (v === 'transit') { this.groups.flood.visible = false; this.groups.green.visible = false; }
    else if (v === 'green') { this.groups.flood.visible = false; this.groups.transit.visible = false; this._updateGreen(); }
    else if (v === '15min') { this.groups.flood.visible = false; this._updateGreen(); }
    else if (v === 'air') { this.groups.flood.visible = false; this._updateGreen(); this._airOverlay(); }
  }
  _airOverlay() {
    this.groups.overlay.clear();
    const geo = new THREE.SphereGeometry(GRID_SIZE * 0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(200, 120, 50), transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat); m.position.set(GRID_SIZE / 2, 5, GRID_SIZE / 2);
    this.groups.overlay.add(m);
  }
  updateGreen(v) { this.targetGreen = v; this._updateGreen(); }
  updateTransit(v) { this.targetTransit = v; }
  updateTime(v) { this.timePeriod = v; }
  updateFlood(v) { this.targetFlood = v; this._updateFlood(); }
}

// === Main App ===
const canvas = document.getElementById('main-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(...COLORS.sky);
scene.fog = new THREE.FogExp2(new THREE.Color(COLORS.sky[0] / 255, COLORS.sky[1] / 255, COLORS.sky[2] / 255), 0.015);

const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
camera.position.set(0, 40, 50);
camera.lookAt(new THREE.Vector3(GRID_SIZE / 2, 0, GRID_SIZE / 2));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const ambient = new THREE.AmbientLight(0x8899bb, 0.5); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffeedd, 1.0); sun.position.set(30, 50, 20); sun.castShadow = true; scene.add(sun);
const fill = new THREE.DirectionalLight(0x4488cc, 0.3); fill.position.set(-20, 20, -10); scene.add(fill);

let orbitTheta = Math.PI / 4, orbitPhi = Math.PI / 4, orbitRadius = 55;
let isDragging = false, lastMouse = { x: 0, y: 0 };

const city = new CityModel();
const viz = new ScenarioRenderer(scene, city);
viz.build();

// --- UI ---
const bangkokInfo = {
  flooding: { title: 'Flood Resilience', desc: 'Bangkok faces severe flooding — the 2011 disaster caused $45B in damages. The city sinks 2-3 cm/year due to groundwater extraction. Only 30% of the metro area is above the 1.5m flood threshold.', stats: [['Annual sinking', '2-3 cm'], ['Flood-prone', '70%'], ['2011 damage', '$45B'], ['Solution', 'Sponge City']] },
  transit: { title: 'Transit Expansion', desc: 'Bangkok has only ~25km of rail for 10M+ people. Expansion to 433km by 2032 would transform mobility.', stats: [['Current rail', '~25 km'], ['Target 2032', '433 km'], ['Population', '10.5M+'], ['Solution', 'BRT + Rail']] },
  green: { title: 'Green Space', desc: 'Bangkok averages 5.6 sqm green space per capita vs WHO target of 25 sqm. Green Bangkok 2030 targets 27 sqm.', stats: [['Current/capita', '5.6 sqm'], ['WHO target', '25 sqm'], ['Target 2030', '27 sqm'], ['Solution', 'Pocket parks']] },
  air: { title: 'Air Quality', desc: 'PM2.5 exceeds WHO limits 6+ months/year. Green corridors can reduce PM2.5 by 30-40%.', stats: [['Avg AQI', '85'], ['Safe months', '~6'], ['Vehicle share', '40% PM2.5'], ['Solution', 'Green corridors']] },
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); viz.setView(btn.dataset.view);
  });
});

document.querySelectorAll('.challenge').forEach(ch => {
  ch.addEventListener('click', () => {
    const t = ch.dataset.type, info = bangkokInfo[t]; if (!info) return;
    document.getElementById('info-title').textContent = info.title;
    document.getElementById('info-desc').textContent = info.desc;
    document.getElementById('info-stats').innerHTML = info.stats.map(([l, v]) =>
      '<div class="info-stat"><span class="label">' + l + '</span><span class="value">' + v + '</span></div>').join('');
    document.getElementById('info-panel').classList.remove('hidden');
    const nb = document.querySelector('.nav-btn[data-view="' + t + '"]');
    if (nb) { document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); nb.classList.add('active'); viz.setView(t); }
  });
});
document.getElementById('close-info').addEventListener('click', () => document.getElementById('info-panel').classList.add('hidden'));

const timeSlider = document.getElementById('time-slider');
const greenSlider = document.getElementById('green-slider');
const transitSlider = document.getElementById('transit-slider');
const floodSlider = document.getElementById('flood-slider');

greenSlider.addEventListener('input', () => { document.getElementById('green-value').textContent = greenSlider.value + '%'; viz.updateGreen(parseInt(greenSlider.value)); updateStats(); });
transitSlider.addEventListener('input', () => { document.getElementById('transit-value').textContent = transitSlider.value + '%'; viz.updateTransit(parseInt(transitSlider.value)); updateStats(); });
floodSlider.addEventListener('input', () => {
  const v = parseInt(floodSlider.value);
  document.getElementById('flood-value').textContent = ['None', 'Low', 'Medium', 'High', 'Extreme'][Math.floor(v / 25)] || 'High';
  viz.updateFlood(v); updateStats();
});
timeSlider.addEventListener('input', () => { viz.updateTime(parseInt(timeSlider.value)); updateStats(); });

function updateStats() {
  const t = parseInt(timeSlider.value) / 100, g = parseInt(greenSlider.value);
  document.getElementById('stat-green').textContent = (5.6 + t * 21.4).toFixed(1);
  document.getElementById('stat-rail').textContent = Math.round(25 + t * 408);
  document.getElementById('stat-flood').textContent = Math.round(parseInt(floodSlider.value) * (1 - t * 0.5)) + '%';
  document.getElementById('stat-pm25').textContent = Math.round(85 - t * 40 - g * 0.2);
}

// --- Orbit ---
canvas.addEventListener('mousedown', e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
  orbitTheta -= dx * 0.005;
  orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitPhi - dy * 0.005));
  lastMouse = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);
canvas.addEventListener('wheel', e => { e.preventDefault(); orbitRadius = Math.max(20, Math.min(100, orbitRadius + e.deltaY * 0.05)); });
canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) { isDragging = true; lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } });
canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - lastMouse.x, dy = e.touches[0].clientY - lastMouse.y;
  orbitTheta -= dx * 0.005; orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitPhi - dy * 0.005));
  lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});
canvas.addEventListener('touchend', () => isDragging = false);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
}
window.addEventListener('resize', resize); resize();

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  mouseVec.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouseVec.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);
  const meshes = []; scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0 && hits[0].object.userData.type) {
    document.getElementById('info-title').textContent = hits[0].object.userData.name || 'Object';
    document.getElementById('info-desc').textContent = 'Type: ' + hits[0].object.userData.type;
    document.getElementById('info-stats').innerHTML = '';
    document.getElementById('info-panel').classList.remove('hidden');
  }
});

// --- Animate ---
let time = 0;
function animate() {
  requestAnimationFrame(animate); time += 0.016;
  const cx = GRID_SIZE / 2, cz = GRID_SIZE / 2;
  camera.position.set(cx + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta),
                      orbitRadius * Math.cos(orbitPhi),
                      cz + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta));
  camera.lookAt(new THREE.Vector3(cx, 0, cz));
  viz.groups.river.children.forEach((s, i) => s.position.y = -0.3 + Math.sin(time * 2 + i * 0.1) * 0.05);
  viz.groups.flood.children.forEach((m, i) => m.position.y = 0.1 + Math.sin(time * 1.5 + i * 0.05) * 0.05);
  viz.groups.transit.children.forEach(m => {
    if (m.geometry && m.geometry.type === 'SphereGeometry') m.scale.setScalar(0.35 + Math.sin(time * 3) * 0.05);
  });
  renderer.render(scene, camera);
}
animate();
