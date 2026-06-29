// === Bangkok Urban Planning 3D — Complete Application ===

// --- Simplex Noise ---
class SimpleNoise {
  constructor(seed = 0) { this.seed = seed; this.perm = this._genPerm(); }
  _genPerm() {
    const p = new Array(512), base = new Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(this._rand() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
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
  fbm(x, y, oct = 4) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < oct; i++) { val += this.noise2D(x * freq, y * freq) * amp; max += amp; amp *= 0.5; freq *= 2; }
    return val / max;
  }
}

// --- Constants ---
const GRID = 120, CELL = 1;
const C = {
  water: [0, 120, 180], waterDeep: [0, 70, 140],
  flood: [255, 80, 60], ground: [55, 75, 55], groundDry: [85, 95, 65],
  building: [130, 150, 170], buildingHigh: [80, 200, 180],
  green: [40, 160, 70], greenDark: [20, 120, 50],
  road: [50, 50, 55], rail: [255, 100, 50], park: [50, 200, 90],
  sky: [200, 215, 235], highlight: [0, 212, 170],
  warning: [255, 167, 38], danger: [239, 83, 80],
  commercial: [100, 180, 220], residential: [160, 140, 120],
};
function lerp(a, b, t) { return a + t * (b - a); }
function lerpColor(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// --- Bangkok Districts ---
const DISTRICTS = [
  { name: "Sukhumvit", cx: 65, cy: 40, rx: 25, ry: 30, minH: 4, maxH: 18, density: 0.7, type: "commercial" },
  { name: "Silom", cx: 50, cy: 55, rx: 15, ry: 20, minH: 3, maxH: 14, density: 0.65, type: "commercial" },
  { name: "Sathorn", cx: 45, cy: 50, rx: 10, ry: 15, minH: 5, maxH: 20, density: 0.6, type: "commercial" },
  { name: "Thong Lor", cx: 70, cy: 35, rx: 12, ry: 10, minH: 3, maxH: 12, density: 0.7, type: "commercial" },
  { name: "Old Town", cx: 30, cy: 65, rx: 20, ry: 18, minH: 1, maxH: 4, density: 0.5, type: "residential" },
  { name: "Chatuchak", cx: 80, cy: 55, rx: 15, ry: 12, minH: 2, maxH: 8, density: 0.55, type: "mixed" },
  { name: "Bang Kapi", cx: 85, cy: 40, rx: 12, ry: 15, minH: 2, maxH: 10, density: 0.5, type: "residential" },
  { name: "On Nut", cx: 75, cy: 30, rx: 10, ry: 12, minH: 2, maxH: 8, density: 0.55, type: "mixed" },
  { name: "Phra Nakhon", cx: 35, cy: 70, rx: 15, ry: 12, minH: 1, maxH: 5, density: 0.45, type: "residential" },
  { name: "Bang Khae", cx: 25, cy: 45, rx: 18, ry: 20, minH: 1, maxH: 4, density: 0.4, type: "residential" },
  { name: "Lat Phrao", cx: 90, cy: 65, rx: 15, ry: 15, minH: 2, maxH: 7, density: 0.45, type: "residential" },
  { name: "Huai Khwang", cx: 75, cy: 60, rx: 12, ry: 12, minH: 2, maxH: 8, density: 0.5, type: "mixed" },
  { name: "Min Buri", cx: 95, cy: 45, rx: 12, ry: 15, minH: 1, maxH: 5, density: 0.35, type: "residential" },
  { name: "Don Mueang", cx: 55, cy: 20, rx: 20, ry: 18, minH: 1, maxH: 4, density: 0.3, type: "residential" },
  { name: "Ratchada", cx: 60, cy: 45, rx: 10, ry: 15, minH: 3, maxH: 12, density: 0.6, type: "mixed" },
];

// --- City Model ---
class CityModel {
  constructor() {
    this.n1 = new SimpleNoise(42);
    this.n2 = new SimpleNoise(99);
    this.n3 = new SimpleNoise(77);
    this.buildings = []; this.parks = []; this.railStations = [];
    this.floodZones = []; this.generate();
  }
  generate() {
    this.terrain = []; this.buildings = []; this.parks = [];
    this.railStations = []; this.floodZones = [];
    this._genRiver();
    this._genTerrain();
    this._genBuildings();
    this._genParks();
    this._genRail();
    this._genProposedGreen();
  }

  _genRiver() {
    this.riverPath = [];
    for (let y = 0; y < GRID; y++) {
      const rx = 75 + this.n2.noise2D(y * 0.02, 0) * 10 + this.n2.noise2D(y * 0.05, 1) * 5;
      this.riverPath.push({ x: rx, y });
    }
    // Khlong San canal
    this.canals = [];
    for (let x = 30; x < 80; x += 2) {
      this.canals.push({ x, y: 55 + this.n3.noise2D(x * 0.03, 5) * 3 });
    }
  }

  _genTerrain() {
    for (let x = 0; x < GRID; x++) {
      this.terrain[x] = [];
      for (let y = 0; y < GRID; y++) {
        const base = this.n1.fbm(x * 0.02, y * 0.02, 3) * 2 + 1;
        const dtr = this._distToRiver(x, y);
        let elev = base;
        if (dtr < 2) elev = -0.3 + this.n1.noise2D(x * 0.1, y * 0.1) * 0.2;
        const fr = elev < 0.3 ? 0.85 : elev < 0.8 ? 0.55 : 0.2;
        this.terrain[x][y] = { elevation: elev, floodRisk: fr, isRiver: dtr < 2, distToRiver: dtr };
        if (fr > 0.6) this.floodZones.push({ x, y, risk: fr });
      }
    }
  }

  _distToRiver(x, y) {
    let m = Infinity;
    for (const r of this.riverPath) { const d = Math.hypot(x - r.x, y - r.y); if (d < m) m = d; }
    return m;
  }

  _genBuildings() {
    for (let x = 2; x < GRID - 2; x += 1.5) {
      for (let y = 2; y < GRID - 2; y += 1.5) {
        const c = this.terrain[Math.floor(x)]?.[Math.floor(y)];
        if (!c || c.isRiver) continue;
        let dist = Infinity, district = null;
        for (const d of DISTRICTS) {
          const dx = (x - d.cx) / d.rx, dy = (y - d.cy) / d.ry;
          const dd = dx * dx + dy * dy;
          if (dd < dist) { dist = dd; district = d; }
        }
        if (!district || dist > 1.5) continue;
        const falloff = 1 - Math.min(1, (dist - 0.5) / 1);
        if (Math.random() > district.density * falloff) continue;
        const h = district.minH + Math.random() * (district.maxH - district.minH) * falloff;
        const isComm = district.type === "commercial" || (district.type === "mixed" && Math.random() > 0.5);
        const col = isComm
          ? lerpColor(C.commercial, C.buildingHigh, Math.random() * 0.4)
          : lerpColor(C.residential, C.ground, 0.2 + Math.random() * 0.2);
        this.buildings.push({ x, y, height: Math.max(0.8, h), isCommercial: isComm, color: col, district: district.name });
      }
    }
  }

  _genParks() {
    const parks = [
      { x: 40, y: 48, size: 5 }, { x: 55, y: 52, size: 4 },
      { x: 30, y: 60, size: 3 }, { x: 70, y: 38, size: 3 },
      { x: 85, y: 55, size: 4 }, { x: 20, y: 40, size: 3 },
      { x: 95, y: 65, size: 3 }, { x: 50, y: 30, size: 4 },
    ];
    parks.forEach(p => {
      for (let dx = 0; dx < p.size; dx++) for (let dy = 0; dy < p.size; dy++)
        this.parks.push({ x: p.x + dx, y: p.y + dy, height: 0.4 + Math.random() * 0.6 });
    });
  }

  _genRail() {
    this.railLines = [
      { name: "Silom Line", color: [255, 80, 50], stations: [] },
      { name: "Sukhumvit Line", color: [50, 130, 255], stations: [] },
      { name: "MRT Blue", color: [80, 200, 100], stations: [] },
      { name: "MRT Purple", color: [180, 80, 200], stations: [] },
      { name: "BTS Pink", color: [255, 180, 50], stations: [] },
    ];
    for (let x = 35; x <= 60; x += 2.5) this.railLines[0].stations.push({ x, y: 52 + Math.sin(x * 0.15) * 4 });
    for (let y = 25; y <= 55; y += 2.5) this.railLines[1].stations.push({ x: 65 + Math.sin(y * 0.12) * 3, y });
    for (let y = 35; y <= 75; y += 2.5) this.railLines[2].stations.push({ x: 28 + Math.sin(y * 0.1) * 2, y });
    for (let y = 15; y <= 45; y += 2.5) this.railLines[3].stations.push({ x: 50 + Math.sin(y * 0.08) * 3, y });
    for (let x = 60; x <= 95; x += 2.5) this.railLines[4].stations.push({ x, y: 42 + Math.sin(x * 0.1) * 3 });
    this.railStations = this.railLines.flatMap(l => l.stations);
  }

  _genProposedGreen() {
    const ps = [];
    for (let i = 0; i < 30; i++) {
      const x = 5 + Math.floor(Math.random() * (GRID - 10));
      const y = 5 + Math.floor(Math.random() * (GRID - 10));
      const c = this.terrain[x]?.[y];
      if (!c || c.isRiver) continue;
      ps.push({ x, y, size: 2 + Math.floor(Math.random() * 4) });
    }
    return ps;
  }
}

// --- Renderer ---
class Renderer {
  constructor(scene, city) {
    this.scene = scene; this.city = city;
    this.g = {};
    ['terrain', 'buildings', 'river', 'flood', 'transit', 'green', 'overlay'].forEach(n => {
      this.g[n] = new THREE.Group(); this.g[n].renderOrder = 1; scene.add(this.g[n]);
    });
    this.targetGreen = 15; this.targetTransit = 25; this.targetFlood = 70;
    this.currentView = 'overview';
  }

  build() { this._terrain(); this._river(); this._buildings(); this._flood(); this._transit(); this._green(); }

  _terrain() {
    const g = this.g.terrain; g.clear();
    const segs = GRID;
    const geo = new THREE.PlaneGeometry(GRID * CELL, GRID * CELL, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let x = 0; x < segs; x++) for (let y = 0; y < segs; y++) {
      const idx = y * segs + x;
      const c = this.city.terrain[x]?.[y];
      const e = c ? c.elevation : 0;
      pos.setY(idx, Math.max(-0.3, e * 0.3));
      const t = clamp(e / 3, 0, 1);
      const col = lerpColor(C.ground, C.groundDry, t);
      cols[idx * 3] = col[0] / 255; cols[idx * 3 + 1] = col[1] / 255; cols[idx * 3 + 2] = col[2] / 255;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.attributes.position.needsUpdate = true;
    g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
  }

  _river() {
    const g = this.g.river; g.clear();
    for (let i = 0; i < this.city.riverPath.length - 1; i++) {
      const a = this.city.riverPath[i], b = this.city.riverPath[i + 1];
      const ang = Math.atan2(b.x - a.x, b.y - a.y);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.12, CELL),
        new THREE.MeshPhongMaterial({ color: new THREE.Color(...C.water), transparent: true, opacity: 0.65, shininess: 200 })
      );
      m.position.set(a.x, -0.2, a.y); m.rotation.y = ang; g.add(m);
    }
    this.city.canals.forEach(c => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.08, CELL),
        new THREE.MeshPhongMaterial({ color: new THREE.Color(...C.waterDeep), transparent: true, opacity: 0.5 })
      );
      m.position.set(c.x, -0.15, c.y); g.add(m);
    });
  }

  _buildings() {
    const g = this.g.buildings; g.clear();
    this.city.buildings.forEach(b => {
      const geo = new THREE.BoxGeometry(CELL * 0.7, b.height, CELL * 0.7);
      const col = new THREE.Color(b.color[0] / 255, b.color[1] / 255, b.color[2] / 255);
      const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: col, transparent: true, opacity: 0.88 }));
      m.position.set(b.x, b.height / 2, b.y);
      m.userData = { type: 'building', name: b.district + ' Building', district: b.district, height: b.height.toFixed(1) };
      g.add(m);
    });
    this.city.parks.forEach(p => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(CELL * 0.35, CELL * 0.45, p.height, 8),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(...C.park), transparent: true, opacity: 0.85 })
      );
      m.position.set(p.x, p.height / 2, p.y);
      m.userData = { type: 'park', name: 'Existing Park' };
      g.add(m);
    });
  }

  _flood() { this.g.flood.clear(); this._updateFlood(); }
  _updateFlood() {
    const g = this.g.flood; g.clear();
    const intensity = this.targetFlood / 100;
    this.city.floodZones.forEach(z => {
      const alpha = z.risk * intensity * 0.5;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(CELL, CELL),
        new THREE.MeshPhongMaterial({ color: new THREE.Color(...C.flood), transparent: true, opacity: alpha })
      );
      m.rotation.x = -Math.PI / 2; m.position.set(z.x, 0.08, z.y); g.add(m);
    });
  }

  _transit() {
    const g = this.g.transit; g.clear();
    this.city.railLines.forEach(line => {
      const col = new THREE.Color(...line.color);
      for (let i = 0; i < line.stations.length - 1; i++) {
        const a = line.stations[i], b = line.stations[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, len, 6),
          new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.3) })
        );
        m.position.set((a.x + b.x) / 2, 1.5, (a.y + b.y) / 2);
        m.rotation.x = Math.PI / 2; m.rotation.z = -Math.atan2(dy, dx);
        g.add(m);
      }
      line.stations.forEach(s => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.5) })
        );
        m.position.set(s.x, 1.5, s.y);
        m.userData = { type: 'station', name: 'Transit Station' };
        g.add(m);
      });
    });
  }

  _green() { this.g.green.clear(); this._updateGreen(); }
  _updateGreen() {
    const g = this.g.green; g.clear();
    const gl = this.targetGreen / 100;
    this.city.proposedParks.forEach((p, i) => {
      if (i / this.city.proposedParks.length > gl) return;
      for (let dx = 0; dx < p.size; dx++) for (let dy = 0; dy < p.size; dy++) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, 0.7, 8),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(...C.green), transparent: true, opacity: 0.7 })
        );
        m.position.set(p.x + dx, 0.35, p.y + dy);
        m.userData = { type: 'proposed-park', name: 'Proposed Green Space' };
        g.add(m);
      }
    });
    if (gl > 0.3) for (let i = 0; i < this.city.riverPath.length; i += 2) {
      const rp = this.city.riverPath[i];
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(...C.greenDark), transparent: true, opacity: 0.55 })
      );
      m.position.set(rp.x + 3, 0.25, rp.y); g.add(m);
    }
  }

  setView(v) {
    this.currentView = v;
    Object.values(this.g).forEach(gr => gr.visible = true);
    if (v === 'overview') { this.g.flood.visible = false; this.g.green.visible = false; this.g.transit.visible = false; }
    else if (v === 'flooding') { this.g.green.visible = false; this.g.transit.visible = false; this._updateFlood(); }
    else if (v === 'transit') { this.g.flood.visible = false; this.g.green.visible = false; }
    else if (v === 'green') { this.g.flood.visible = false; this.g.transit.visible = false; this._updateGreen(); }
    else if (v === '15min') { this.g.flood.visible = false; this._updateGreen(); }
    else if (v === 'air') { this.g.flood.visible = false; this._updateGreen(); this._airOverlay(); }
  }
  _airOverlay() {
    this.g.overlay.clear();
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(GRID * 0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhongMaterial({ color: new THREE.Color(200, 120, 50), transparent: true, opacity: 0.12, side: THREE.DoubleSide })
    );
    m.position.set(GRID / 2, 5, GRID / 2);
    this.g.overlay.add(m);
  }
  updateGreen(v) { this.targetGreen = v; this._updateGreen(); }
  updateTransit(v) { this.targetTransit = v; }
  updateFlood(v) { this.targetFlood = v; this._updateFlood(); }
}

// === Main ===
const canvas = document.getElementById('main-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0.75, 0.82, 0.9);
scene.fog = new THREE.FogExp2(0.75, 0.006);

const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.5, 400);
camera.position.set(GRID / 2, 50, GRID + 20);
camera.lookAt(new THREE.Vector3(GRID / 2, 0, GRID / 2));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

const amb = new THREE.AmbientLight(0xffffff, 0.55); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(40, 60, 30); scene.add(sun);
const fill = new THREE.DirectionalLight(0x8899bb, 0.35); fill.position.set(-30, 30, -20); scene.add(fill);

const city = new CityModel();
const viz = new Renderer(scene, city);
viz.build();

// --- Orbit ---
let oT = Math.PI / 6, oP = Math.PI / 5, oR = 90;
let drag = false, lm = { x: 0, y: 0 };
canvas.addEventListener('mousedown', e => { drag = true; lm = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('mousemove', e => { if (!drag) return;
  oT -= (e.clientX - lm.x) * 0.005;
  oP = clamp(oP - (e.clientY - lm.y) * 0.005, 0.1, Math.PI / 2 - 0.05);
  lm = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('mouseup', () => drag = false);
canvas.addEventListener('mouseleave', () => drag = false);
canvas.addEventListener('wheel', e => { e.preventDefault(); oR = clamp(oR + e.deltaY * 0.08, 30, 180); });
canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) { drag = true; lm = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } });
canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!drag || e.touches.length !== 1) return;
  oT -= (e.touches[0].clientX - lm.x) * 0.005;
  oP = clamp(oP - (e.touches[0].clientY - lm.y) * 0.005, 0.1, Math.PI / 2 - 0.05);
  lm = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});
canvas.addEventListener('touchend', () => drag = false);

// --- UI ---
const info = {
  flooding: { title: 'Flood Resilience', desc: 'Bangkok faces severe flooding — the 2011 disaster caused $45B in damages. The city sinks 2–3 cm/year due to groundwater extraction.', stats: [['Annual sinking', '2–3 cm'], ['Flood-prone', '70%'], ['2011 damage', '$45B'], ['Solution', 'Sponge City']] },
  transit: { title: 'Transit Expansion', desc: 'Bangkok has only ~25 km of rail for 10M+ people. Expansion to 433 km by 2032 would transform mobility.', stats: [['Current rail', '~25 km'], ['Target 2032', '433 km'], ['Population', '10.5M+'], ['Solution', 'BRT + Rail']] },
  green: { title: 'Green Space', desc: 'Bangkok averages 5.6 sqm green space per capita vs WHO target of 25 sqm.', stats: [['Current/capita', '5.6 sqm'], ['WHO target', '25 sqm'], ['Target 2030', '27 sqm'], ['Solution', 'Pocket parks']] },
  air: { title: 'Air Quality', desc: 'PM2.5 exceeds WHO limits 6+ months/year. Green corridors can reduce PM2.5 by 30–40%.', stats: [['Avg AQI', '85'], ['Safe months', '~6'], ['Vehicle share', '40% PM2.5'], ['Solution', 'Green corridors']] },
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); viz.setView(btn.dataset.view);
  });
});

document.querySelectorAll('.challenge').forEach(ch => {
  ch.addEventListener('click', () => {
    const t = ch.dataset.type, d = info[t]; if (!d) return;
    document.getElementById('overlay-title').textContent = d.title;
    document.getElementById('overlay-desc').textContent = d.desc;
    document.getElementById('overlay-stats').innerHTML = d.stats.map(([l, v]) =>
      '<div class="overlay-stat"><span class="label">' + l + '</span><span class="value">' + v + '</span></div>').join('');
    document.getElementById('overlay-info').classList.remove('hidden');
    const nb = document.querySelector('.nav-btn[data-view="' + t + '"]');
    if (nb) { document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); nb.classList.add('active'); viz.setView(t); }
  });
});
document.getElementById('close-overlay').addEventListener('click', () => document.getElementById('overlay-info').classList.add('hidden'));

const timeS = document.getElementById('time-slider');
const greenS = document.getElementById('green-slider');
const transitS = document.getElementById('transit-slider');
const floodS = document.getElementById('flood-slider');

greenS.addEventListener('input', () => { document.getElementById('green-value').textContent = greenS.value + '%'; viz.updateGreen(parseInt(greenS.value)); _stats(); });
transitS.addEventListener('input', () => { document.getElementById('transit-value').textContent = transitS.value + '%'; viz.updateTransit(parseInt(transitS.value)); _stats(); });
floodS.addEventListener('input', () => {
  const v = parseInt(floodS.value);
  document.getElementById('flood-value').textContent = ['None', 'Low', 'Medium', 'High', 'Extreme'][Math.floor(v / 25)] || 'High';
  viz.updateFlood(v); _stats();
});
timeS.addEventListener('input', _stats);

function _stats() {
  const t = parseInt(timeS.value) / 100, g = parseInt(greenS.value);
  document.getElementById('stat-green').textContent = (5.6 + t * 21.4).toFixed(1);
  document.getElementById('stat-rail').textContent = Math.round(25 + t * 408);
  document.getElementById('stat-flood').textContent = Math.round(parseInt(floodS.value) * (1 - t * 0.5)) + '%';
  document.getElementById('stat-pm25').textContent = Math.round(85 - t * 40 - g * 0.2);
}

// --- Raycaster ---
const rc = new THREE.Raycaster(), mv = new THREE.Vector2();
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  mv.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mv.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  rc.setFromCamera(mv, camera);
  const ms = []; scene.traverse(o => { if (o.isMesh) ms.push(o); });
  const hits = rc.intersectObjects(ms);
  if (hits.length > 0 && hits[0].object.userData.type) {
    const d = hits[0].object.userData;
    document.getElementById('overlay-title').textContent = d.name || 'Object';
    let desc = 'Type: ' + d.type;
    if (d.district) desc += ' · District: ' + d.district;
    if (d.height) desc += ' · Height: ' + d.height + 'm';
    document.getElementById('overlay-desc').textContent = desc;
    document.getElementById('overlay-stats').innerHTML = '';
    document.getElementById('overlay-info').classList.remove('hidden');
  }
});

// --- Resize ---
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
}
window.addEventListener('resize', resize); resize();

// --- Animate ---
let t = 0;
function animate() {
  requestAnimationFrame(animate); t += 0.016;
  const cx = GRID / 2, cz = GRID / 2;
  camera.position.set(cx + oR * Math.sin(oP) * Math.cos(oT), oR * Math.cos(oP), cz + oR * Math.sin(oP) * Math.sin(oT));
  camera.lookAt(new THREE.Vector3(cx, 0, cz));
  viz.g.river.children.forEach((s, i) => s.position.y = -0.2 + Math.sin(t * 2 + i * 0.08) * 0.04);
  viz.g.flood.children.forEach((m, i) => m.position.y = 0.08 + Math.sin(t * 1.5 + i * 0.04) * 0.03);
  viz.g.transit.children.forEach(m => {
    if (m.geometry && m.geometry.type === 'SphereGeometry') m.scale.setScalar(0.3 + Math.sin(t * 3) * 0.04);
  });
  renderer.render(scene, camera);
}
animate();
