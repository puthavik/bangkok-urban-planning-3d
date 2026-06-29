// === Main Application ===

const canvas = document.getElementById('main-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(...COLORS.sky);
scene.fog = new THREE.FogExp2(...[...COLORS.sky].map(c => c / 255), 0.015);

// Camera
const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
camera.position.set(0, 40, 50);
camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// Lights
const ambient = new THREE.AmbientLight(0x8899bb, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
sun.position.set(30, 50, 20);
sun.castShadow = true;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x4488cc, 0.3);
fill.position.set(-20, 20, -10);
scene.add(fill);

// Camera orbit state
let orbitTheta = Math.PI / 4;
let orbitPhi = Math.PI / 4;
let orbitRadius = 55;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

// City model
const city = new CityModel();
const renderer_app = new ScenarioRenderer(scene, city);
renderer_app.build();

// === UI State ===
const infoPanel = document.getElementById('info-panel');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const infoStats = document.getElementById('info-stats');
const tooltip = document.getElementById('tooltip');

const bangkokInfo = {
  flooding: {
    title: '🌊 Flood Resilience',
    desc: 'Bangkok faces severe flooding — the 2011 disaster caused $45B in damages. The city sinks 2-3 cm/year due to groundwater extraction and heavy building loads. Only 30% of the metro area is above the 1.5m flood threshold.',
    stats: [
      ['Annual sinking rate', '2-3 cm'],
      ['Flood-prone area', '70%'],
      ['2011 flood damage', '$45 billion'],
      ['Solution: Sponge City', 'Permeable surfaces, retention basins, elevated infrastructure'],
    ],
  },
  transit: {
    title: '🚇 Transit Expansion',
    desc: 'Bangkok has only ~25km of rail for 10M+ people. The proposed expansion to 433km by 2032 would transform mobility. Current car dependency causes 4-6 hour daily commutes.',
    stats: [
      ['Current rail', '~25 km'],
      ['Target by 2032', '433 km'],
      ['Population', '10.5M+'],
      ['Solution: BRT + Rail', 'Integrated multimodal network with feeder BRT routes'],
    ],
  },
  green: {
    title: '🌳 Green Space Expansion',
    desc: 'Bangkok averages 5.6 sqm of green space per capita — far below the WHO recommendation of 25 sqm. The proposed "Green Bangkok 2030" plan targets 27 sqm per capita with 1,000+ parks.',
    stats: [
      ['Current green/capita', '5.6 sqm'],
      ['WHO recommendation', '25 sqm'],
      ['Target 2030', '27 sqm'],
      ['Solution: Pocket parks', 'Rooftop gardens, river corridors, school yards'],
    ],
  },
  air: {
    title: '💨 Air Quality',
    desc: 'Bangkok\'s PM2.5 levels exceed WHO safe limits for 6+ months annually. Vehicle emissions and regional burning contribute. Green corridors and electric transit can reduce PM2.5 by 30-40%.',
    stats: [
      ['Avg AQI', '85 (Unhealthy)'],
      ['Safe months/year', '~6'],
      ['Vehicle contribution', '40% of PM2.5'],
      ['Solution: Green corridors', '30-40% PM2.5 reduction projected'],
    ],
  },
};

// === Nav buttons ===
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderer_app.setView(btn.dataset.view);
  });
});

// === Challenge list ===
document.querySelectorAll('.challenge').forEach(ch => {
  ch.addEventListener('click', () => {
    const type = ch.dataset.type;
    const info = bangkokInfo[type];
    if (!info) return;

    infoTitle.textContent = info.title;
    infoDesc.textContent = info.desc;
    infoStats.innerHTML = info.stats.map(([label, value]) =>
      `<div class="info-stat"><span class="label">${label}</span><span class="value">${value}</span></div>`
    ).join('');

    infoPanel.classList.remove('hidden');

    // Switch to relevant view
    const navBtn = document.querySelector(`.nav-btn[data-view="${type}"]`);
    if (navBtn) {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      navBtn.classList.add('active');
      renderer_app.setView(type);
    }
  });
});

document.getElementById('close-info').addEventListener('click', () => {
  infoPanel.classList.add('hidden');
});

// === Sliders ===
const timeSlider = document.getElementById('time-slider');
const greenSlider = document.getElementById('green-slider');
const transitSlider = document.getElementById('transit-slider');
const floodSlider = document.getElementById('flood-slider');

greenSlider.addEventListener('input', () => {
  const v = parseInt(greenSlider.value);
  document.getElementById('green-value').textContent = v + '%';
  renderer_app.updateGreen(v);
  updateStats();
});

transitSlider.addEventListener('input', () => {
  const v = parseInt(transitSlider.value);
  document.getElementById('transit-value').textContent = v + '%';
  renderer_app.updateTransit(v);
  updateStats();
});

floodSlider.addEventListener('input', () => {
  const v = parseInt(floodSlider.value);
  const labels = ['None', 'Low', 'Medium', 'High', 'Extreme'];
  document.getElementById('flood-value').textContent = labels[Math.floor(v / 25)] || 'High';
  renderer_app.updateFlood(v);
  updateStats();
});

timeSlider.addEventListener('input', () => {
  const v = parseInt(timeSlider.value);
  renderer_app.updateTime(v);
  updateStats();
});

function updateStats() {
  const t = parseInt(timeSlider.value) / 100;
  const green = parseInt(greenSlider.value);
  const transit = parseInt(transitSlider.value);
  const flood = parseInt(floodSlider.value);

  document.getElementById('stat-green').textContent = (5.6 + t * 21.4).toFixed(1);
  document.getElementById('stat-rail').textContent = Math.round(25 + t * 408);
  document.getElementById('stat-flood').textContent = Math.round(flood * (1 - t * 0.5)) + '%';
  document.getElementById('stat-pm25').textContent = Math.round(85 - t * 40 - green * 0.2);
}

// === Orbit Controls ===
canvas.addEventListener('mousedown', e => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  orbitTheta -= dx * 0.005;
  orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitPhi - dy * 0.005));
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  orbitRadius = Math.max(20, Math.min(100, orbitRadius + e.deltaY * 0.05));
});

// Touch support
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    isDragging = true;
    lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - lastMouse.x;
  const dy = e.touches[0].clientY - lastMouse.y;
  orbitTheta -= dx * 0.005;
  orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitPhi - dy * 0.005));
  lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});

canvas.addEventListener('touchend', () => isDragging = false);

// === Resize ===
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// === Raycaster for click interaction ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const allMeshes = [];
  scene.traverse(obj => { if (obj.isMesh) allMeshes.push(obj); });
  const hits = raycaster.intersectObjects(allMeshes);

  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj.userData.type) {
      infoTitle.textContent = obj.userData.name || 'Object';
      infoDesc.textContent = `Type: ${obj.userData.type}`;
      infoStats.innerHTML = '';
      infoPanel.classList.remove('hidden');
    }
  }
});

// === Animation loop ===
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  // Camera orbit
  const cx = GRID_SIZE / 2, cz = GRID_SIZE / 2;
  camera.position.set(
    cx + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta),
    orbitRadius * Math.cos(orbitPhi),
    cz + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta),
  );
  camera.lookAt(cx, 0, cz);

  // Animate river
  renderer_app.groups.river.children.forEach((seg, i) => {
    seg.position.y = -0.3 + Math.sin(time * 2 + i * 0.1) * 0.05;
  });

  // Animate flood overlay
  renderer_app.groups.flood.children.forEach((m, i) => {
    m.position.y = 0.1 + Math.sin(time * 1.5 + i * 0.05) * 0.05;
  });

  // Pulse transit stations
  renderer_app.groups.transit.children.forEach(m => {
    if (m.geometry?.type === 'SphereGeometry') {
      const pulse = 0.35 + Math.sin(time * 3) * 0.05;
      m.scale.setScalar(pulse / 0.35);
    }
  });

  renderer.render(scene, camera);
}

animate();
