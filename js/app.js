// === Bangkok Urban Planner — 2D Interactive Map ===
// Accurate geography: Chao Phraya River, districts, BTS/MRT lines, canals

// --- Bangkok Geography Data ---
// Coordinates are normalized to a 0-1000 grid representing ~30km x 30km of Bangkok
// Real approximate coordinates mapped to our grid:
//   13.6°N 100.4°E (SW corner) → (0, 1000)
//   13.9°N 100.8°E (NE corner) → (1000, 0)

const BKK = {
  // Chao Phraya River - flows roughly N-S, about 15km west of city center
  river: [
    { x: 280, y: 0 },     // North - Bang Yai
    { x: 275, y: 80 },    // Bang Bua Thong
    { x: 268, y: 160 },   // Bang Khen
    { x: 260, y: 240 },   // Chatuchak area
    { x: 255, y: 320 },   // Din Daeng
    { x: 250, y: 400 },   // Pathum Wan
    { x: 248, y: 440 },   // Riverside (Silom start)
    { x: 245, y: 480 },   // Bang Rak
    { x: 248, y: 520 },   // WongWianYai
    { x: 252, y: 560 },   // Bang Kho Laem
    { x: 258, y: 620 },   // ThonBuri
    { x: 265, y: 700 },   // Wat Ket
    { x: 270, y: 780 },   // Rat Burana
    { x: 275, y: 860 },   // Bang Mod
    { x: 278, y: 940 },   // Phra Pradaeng
    { x: 280, y: 1000 },  // South
  ],
  // Khlong Saen Saep - major canal parallel to Silom
  khlongSaenSaep: [
    { x: 320, y: 300 },   // Starts near Ratchadamnoen
    { x: 330, y: 380 },   // Bang Kapi
    { x: 340, y: 460 },   // Sathorn
    { x: 345, y: 540 },   // Bang Kho Laem
    { x: 350, y: 620 },   // Wat Ket
    { x: 355, y: 700 },   // Rat Burana
  ],
  // Major roads
  roads: {
    sukhumvit: { points: [{ x: 250, y: 380 }, { x: 400, y: 370 }, { x: 550, y: 365 }, { x: 700, y: 360 }, { x: 800, y: 355 }], color: '#f59e0b' },
    silom: { points: [{ x: 248, y: 480 }, { x: 350, y: 470 }, { x: 500, y: 465 }, { x: 650, y: 460 }], color: '#f59e0b' },
    ratchadamnoen: { points: [{ x: 250, y: 340 }, { x: 300, y: 360 }, { x: 350, y: 380 }], color: '#f59e0b' },
    phahonyothin: { points: [{ x: 200, y: 200 }, { x: 250, y: 300 }, { x: 300, y: 340 }, { x: 350, y: 380 }], color: '#f59e0b' },
    latphrao: { points: [{ x: 150, y: 280 }, { x: 300, y: 270 }, { x: 500, y: 260 }, { x: 700, y: 250 }, { x: 850, y: 240 }], color: '#f59e0b' },
    kamphaengphe: { points: [{ x: 150, y: 150 }, { x: 300, y: 200 }, { x: 500, y: 220 }, { x: 700, y: 230 }, { x: 900, y: 240 }], color: '#f59e0b' },
  },
  // BTS Skytrain lines
  bts: {
    silom: { // Orange line - East-West
      stations: [
        { name: 'Bang Wa', x: 200, y: 500 },
        { name: 'Lumphini', x: 280, y: 460 },
        { name: 'Chit Lom', x: 310, y: 440 },
        { name: 'Siam', x: 340, y: 420 },
        { name: 'Nana', x: 370, y: 400 },
        { name: 'Phrom Phong', x: 400, y: 380 },
        { name: 'Thong Lor', x: 430, y: 370 },
        { name: 'Ekkamai', x: 460, y: 365 },
        { name: 'Phra Khanong', x: 490, y: 360 },
        { name: 'On Nut', x: 520, y: 355 },
        { name: 'Phra Khanong', x: 550, y: 350 },
        { name: 'Kheha', x: 580, y: 345 },
      ]
    },
    sukhumvit: { // Green line - North-South (BTS)
      stations: [
        { name: 'National Stadium', x: 300, y: 300 },
        { name: 'Huai Khwang', x: 310, y: 320 },
        { name: 'Ari', x: 320, y: 340 },
        { name: 'Queens Park', x: 330, y: 360 },
        { name: 'Maha Nak', x: 340, y: 380 },
        { name: 'Siam', x: 340, y: 420 },
        { name: 'Chit Lom', x: 310, y: 440 },
        { name: 'Lumphini', x: 280, y: 460 },
        { name: 'Silom', x: 260, y: 480 },
        { name: 'Sala Daeng', x: 250, y: 500 },
        { name: 'Bang Wa', x: 200, y: 500 },
      ]
    },
    pink: { // Pink line - East-West
      stations: [
        { name: 'Bang Sue', x: 180, y: 200 },
        { name: 'Chatuchak Park', x: 220, y: 240 },
        { name: 'Kamphaeng Phet', x: 260, y: 260 },
        { name: 'Huai Khwang', x: 310, y: 320 },
        { name: 'Sri Nakarin', x: 350, y: 340 },
        { name: 'Ratchadaphisek', x: 380, y: 360 },
        { name: 'Bang Kapi', x: 420, y: 370 },
        { name: 'Udom Suk', x: 460, y: 380 },
        { name: 'Phra Khanong', x: 500, y: 390 },
      ]
    }
  },
  // MRT lines
  mrt: {
    blue: { // Blue line - East-West
      stations: [
        { name: 'Bang Yai', x: 180, y: 100 },
        { name: 'Taling Chan', x: 200, y: 150 },
        { name: 'Wat Mangkon', x: 220, y: 200 },
        { name: 'Lak Si', x: 240, y: 250 },
        { name: 'Chatuchak Park', x: 220, y: 240 },
        { name: 'Sukhumvit', x: 300, y: 300 },
        { name: 'Lumphini', x: 280, y: 460 },
        { name: 'Silom', x: 260, y: 480 },
        { name: 'Lak Song', x: 240, y: 520 },
        { name: 'Huai Khwang', x: 310, y: 320 },
        { name: 'Phra Ram 9', x: 350, y: 340 },
        { name: 'Ratchadaphisek', x: 380, y: 360 },
        { name: 'Huai Khwang', x: 420, y: 370 },
        { name: 'Bang Chak', x: 500, y: 380 },
      ]
    },
    purple: { // Purple line - North-South
      stations: [
        { name: 'Bang Sue', x: 180, y: 200 },
        { name: 'Wat Suthiswa', x: 200, y: 250 },
        { name: 'Kamphaeng Phet', x: 220, y: 300 },
        { name: 'Saphan Pla', x: 240, y: 350 },
        { name: 'Bang Wa', x: 200, y: 500 },
        { name: 'Sala Daeng', x: 250, y: 500 },
        { name: 'Bang Khun Thian', x: 280, y: 600 },
        { name: 'Bang Phlat', x: 180, y: 100 },
      ]
    }
  },
  // Districts with approximate centers
  districts: [
    { name: 'Don Mueang', x: 200, y: 50, type: 'residential', pop: 0.3 },
    { name: 'Lat Yao', x: 300, y: 100, type: 'residential', pop: 0.2 },
    { name: 'Saen Saep', x: 350, y: 150, type: 'residential', pop: 0.2 },
    { name: 'Lak Si', x: 240, y: 250, type: 'mixed', pop: 0.4 },
    { name: 'Chatuchak', x: 280, y: 280, type: 'commercial', pop: 0.5 },
    { name: 'Din Daeng', x: 300, y: 320, type: 'mixed', pop: 0.4 },
    { name: 'Pathum Wan', x: 340, y: 380, type: 'commercial', pop: 0.6 },
    { name: 'Pom Prap', x: 300, y: 400, type: 'commercial', pop: 0.3 },
    { name: 'Wat Phra Ram', x: 280, y: 440, type: 'commercial', pop: 0.4 },
    { name: 'Sathon', x: 260, y: 480, type: 'commercial', pop: 0.5 },
    { name: 'Bang Rak', x: 240, y: 520, type: 'commercial', pop: 0.4 },
    { name: 'Bang Kho Laem', x: 260, y: 560, type: 'residential', pop: 0.3 },
    { name: 'Thon Buri', x: 280, y: 620, type: 'residential', pop: 0.3 },
    { name: 'Wat Ket', x: 300, y: 680, type: 'residential', pop: 0.3 },
    { name: 'Rat Burana', x: 320, y: 740, type: 'residential', pop: 0.3 },
    { name: 'Bang Phlat', x: 180, y: 100, type: 'residential', pop: 0.3 },
    { name: 'Taling Chan', x: 200, y: 150, type: 'residential', pop: 0.2 },
    { name: 'Bang Yai', x: 180, y: 100, type: 'residential', pop: 0.2 },
    { name: 'Khlong Toei', x: 400, y: 400, type: 'residential', pop: 0.5 },
    { name: 'Watthana', x: 450, y: 350, type: 'commercial', pop: 0.6 },
    { name: 'Saphan Sung', x: 400, y: 250, type: 'residential', pop: 0.4 },
    { name: 'Wang Thonglang', x: 450, y: 300, type: 'mixed', pop: 0.5 },
    { name: 'Khlong Sam Wa', x: 400, y: 150, type: 'residential', pop: 0.2 },
    { name: 'Lat Krabang', x: 500, y: 500, type: 'residential', pop: 0.4 },
    { name: 'Bang Na', x: 550, y: 600, type: 'residential', pop: 0.3 },
    { name: 'Phra Pradaeng', x: 280, y: 900, type: 'residential', pop: 0.2 },
    { name: 'Bang Mod', x: 300, y: 850, type: 'residential', pop: 0.2 },
    { name: 'Bang Kapi', x: 420, y: 370, type: 'mixed', pop: 0.4 },
    { name: 'Huai Khwang', x: 310, y: 320, type: 'mixed', pop: 0.5 },
    { name: 'Bang Sue', x: 180, y: 200, type: 'residential', pop: 0.3 },
    { name: 'Min Buri', x: 500, y: 250, type: 'residential', pop: 0.3 },
    { name: 'Sai Mai', x: 400, y: 100, type: 'residential', pop: 0.2 },
    { name: 'Thawi Watthana', x: 150, y: 150, type: 'residential', pop: 0.2 },
    { name: 'Ratchathewi', x: 320, y: 360, type: 'commercial', pop: 0.5 },
    { name: 'Yan Nawa', x: 260, y: 560, type: 'residential', pop: 0.3 },
    { name: 'Phra Nakhon', x: 300, y: 400, type: 'commercial', pop: 0.4 },
  ],
  // Parks and green spaces
  parks: [
    { name: 'Lumphini Park', x: 280, y: 460, size: 30 },
    { name: 'Benjakitti Park', x: 350, y: 380, size: 20 },
    { name: 'Chatuchak Park', x: 220, y: 240, size: 40 },
    { name: 'Bencharongkit Park', x: 240, y: 250, size: 15 },
    { name: 'Royal Agricultural', x: 200, y: 500, size: 25 },
    { name: 'Suan Luang', x: 500, y: 500, size: 35 },
    { name: 'Min Buri Park', x: 500, y: 250, size: 20 },
    { name: 'Rama IX', x: 320, y: 740, size: 30 },
  ],
  // Proposed green spaces
  proposedGreen: [
    { name: 'Sukhumvit Greenway', x: 400, y: 370, size: 25 },
    { name: 'Silom Green Corridor', x: 350, y: 470, size: 20 },
    { name: 'Riverfront Park', x: 250, y: 400, size: 30 },
    { name: 'Don Muang Green', x: 200, y: 50, size: 35 },
    { name: 'Lat Krabang Green', x: 500, y: 500, size: 25 },
    { name: 'Bang Na Greenway', x: 550, y: 600, size: 20 },
    { name: 'Chatuchak Extension', x: 260, y: 280, size: 25 },
    { name: 'Huai Khwang Green', x: 350, y: 320, size: 20 },
    { name: 'Saphan Sung Green', x: 400, y: 250, size: 20 },
    { name: 'Bang Kapi Greenway', x: 420, y: 370, size: 25 },
  ],
  // Flood zones (areas most vulnerable)
  floodZones: [
    { x: 250, y: 400, risk: 0.8 },
    { x: 280, y: 500, risk: 0.7 },
    { x: 300, y: 600, risk: 0.6 },
    { x: 320, y: 700, risk: 0.5 },
    { x: 200, y: 300, risk: 0.6 },
    { x: 180, y: 400, risk: 0.7 },
    { x: 150, y: 500, risk: 0.8 },
    { x: 100, y: 600, risk: 0.9 },
    { x: 150, y: 700, risk: 0.8 },
    { x: 200, y: 800, risk: 0.7 },
    { x: 250, y: 900, risk: 0.6 },
    { x: 300, y: 850, risk: 0.5 },
    { x: 350, y: 800, risk: 0.4 },
    { x: 400, y: 700, risk: 0.3 },
    { x: 500, y: 600, risk: 0.2 },
    { x: 600, y: 500, risk: 0.1 },
  ],
  // Air quality zones (PM2.5 hotspots)
  airZones: [
    { x: 300, y: 350, level: 0.9 },
    { x: 350, y: 400, level: 0.8 },
    { x: 400, y: 350, level: 0.7 },
    { x: 450, y: 300, level: 0.6 },
    { x: 500, y: 250, level: 0.5 },
    { x: 250, y: 300, level: 0.8 },
    { x: 200, y: 250, level: 0.7 },
    { x: 150, y: 200, level: 0.6 },
    { x: 100, y: 150, level: 0.5 },
    { x: 300, y: 450, level: 0.7 },
    { x: 350, y: 500, level: 0.6 },
    { x: 400, y: 550, level: 0.5 },
    { x: 450, y: 600, level: 0.4 },
    { x: 500, y: 650, level: 0.3 },
  ],
  // Proposed transit lines
  proposedTransit: [
    { name: 'Airport Rail Link', stations: [
      { x: 200, y: 50 }, { x: 220, y: 100 }, { x: 240, y: 150 }, { x: 260, y: 200 },
      { x: 280, y: 250 }, { x: 300, y: 300 }, { x: 320, y: 350 }, { x: 340, y: 400 },
    ]},
    { name: 'East-West Line', stations: [
      { x: 100, y: 400 }, { x: 200, y: 400 }, { x: 300, y: 400 }, { x: 400, y: 400 },
      { x: 500, y: 400 }, { x: 600, y: 400 }, { x: 700, y: 400 },
    ]},
    { name: 'South Extension', stations: [
      { x: 280, y: 700 }, { x: 290, y: 750 }, { x: 300, y: 800 }, { x: 310, y: 850 },
      { x: 320, y: 900 }, { x: 330, y: 950 },
    ]},
  ]
};

// --- Renderer ---
class MapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { x: 0, y: 0, zoom: 1 };
    this.dragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.viewStart = { x: 0, y: 0 };
    this.hovered = null;
    this.currentView = 'overview';
    this.sliders = { time: 0, green: 15, transit: 25, flood: 70 };
    this.setupEvents();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this.dragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.viewStart = { ...this.view };
    });

    this.canvas.addEventListener('mousemove', e => {
      if (this.dragging) {
        this.view.x = this.viewStart.x - (e.clientX - this.dragStart.x);
        this.view.y = this.viewStart.y - (e.clientY - this.dragStart.y);
        this.render();
      }
      this.checkHover(e);
    });

    this.canvas.addEventListener('mouseup', () => this.dragging = false);
    this.canvas.addEventListener('mouseleave', () => this.dragging = false);

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.view.zoom = Math.max(0.3, Math.min(5, this.view.zoom * delta));
      this.render();
    });

    document.getElementById('zoom-in').addEventListener('click', () => {
      this.view.zoom = Math.min(5, this.view.zoom * 1.2);
      this.render();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
      this.view.zoom = Math.max(0.3, this.view.zoom / 1.2);
      this.render();
    });

    document.getElementById('reset-view').addEventListener('click', () => {
      this.view = { x: 0, y: 0, zoom: 1 };
      this.render();
    });
  }

  checkHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left + this.view.x) / this.view.zoom;
    const my = (e.clientY - rect.top + this.view.y) / this.view.zoom;

    this.hovered = null;
    // Check districts
    for (const d of BKK.districts) {
      if (Math.hypot(mx - d.x, my - d.y) < 20) {
        this.hovered = { type: 'district', data: d };
        break;
      }
    }
    // Check parks
    if (!this.hovered) {
      for (const p of BKK.parks) {
        if (Math.hypot(mx - p.x, my - p.y) < p.size) {
          this.hovered = { type: 'park', data: p };
          break;
        }
      }
    }
    // Check BTS stations
    if (!this.hovered) {
      for (const line of Object.values(BKK.bts)) {
        for (const s of line.stations) {
          if (Math.hypot(mx - s.x, my - s.y) < 8) {
            this.hovered = { type: 'station', data: s, line: line.name };
            break;
          }
        }
        if (this.hovered) break;
      }
    }
    this.canvas.style.cursor = this.hovered ? 'pointer' : 'grab';
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.view.x, this.view.y);
    ctx.scale(this.view.zoom, this.view.zoom);

    // Draw background grid
    this.drawGrid(ctx);

    // Draw flood zones
    if (this.currentView === 'flooding' || this.currentView === 'overview') {
      this.drawFloodZones(ctx);
    }

    // Draw river
    this.drawRiver(ctx);

    // Draw canals
    this.drawCanals(ctx);

    // Draw roads
    this.drawRoads(ctx);

    // Draw districts
    this.drawDistricts(ctx);

    // Draw parks
    this.drawParks(ctx);

    // Draw proposed green
    if (this.currentView === 'green' || this.currentView === 'overview') {
      this.drawProposedGreen(ctx);
    }

    // Draw BTS
    this.drawBTS(ctx);

    // Draw MRT
    this.drawMRT(ctx);

    // Draw proposed transit
    if (this.currentView === 'transit' || this.currentView === 'overview') {
      this.drawProposedTransit(ctx);
    }

    // Draw air quality overlay
    if (this.currentView === 'air') {
      this.drawAirQuality(ctx);
    }

    // Draw 15-minute circles
    if (this.currentView === '15min') {
      this.draw15MinCircles(ctx);
    }

    // Draw labels
    this.drawLabels(ctx);

    // Draw hover indicator
    if (this.hovered) {
      this.drawHover(ctx);
    }

    ctx.restore();
  }

  drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1000; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    for (let y = 0; y < 1000; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
  }

  drawRiver(ctx) {
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    BKK.river.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // River glow
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
    ctx.lineWidth = 24;
    ctx.beginPath();
    BKK.river.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // River label
    ctx.save();
    ctx.translate(230, 400);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Chao Phraya River', 0, 0);
    ctx.restore();
  }

  drawCanals(ctx) {
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    BKK.khlongSaenSaep.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Canal label
    ctx.save();
    ctx.translate(340, 460);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Khlong Saen Saep', 0, 0);
    ctx.restore();
  }

  drawRoads(ctx) {
    for (const [name, road] of Object.entries(BKK.roads)) {
      ctx.strokeStyle = road.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      road.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawDistricts(ctx) {
    for (const d of BKK.districts) {
      const radius = 15 + d.pop * 15;
      const alpha = d.type === 'commercial' ? 0.3 : 0.15;
      ctx.fillStyle = d.type === 'commercial'
        ? `rgba(249, 115, 22, ${alpha})`
        : `rgba(148, 163, 184, ${alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // District border
      ctx.strokeStyle = d.type === 'commercial'
        ? 'rgba(249, 115, 22, 0.3)'
        : 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawParks(ctx) {
    for (const p of BKK.parks) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Park label
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - p.size - 4);
    }
  }

  drawProposedGreen(ctx) {
    const greenLevel = this.sliders.green / 100;
    const count = Math.floor(BKK.proposedGreen.length * greenLevel);

    for (let i = 0; i < count; i++) {
      const p = BKK.proposedGreen[i];
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawFloodZones(ctx) {
    const floodLevel = this.sliders.flood / 100;
    for (const z of BKK.floodZones) {
      const alpha = z.risk * floodLevel * 0.4;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, 40 + z.risk * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBTS(ctx) {
    for (const [name, line] of Object.entries(BKK.bts)) {
      const color = name === 'silom' ? '#f97316' : name === 'sukhumvit' ? '#22c55e' : '#a78bfa';

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      line.stations.forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();

      // Stations
      for (const s of line.stations) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, s.x, s.y - 10);
      }
    }
  }

  drawMRT(ctx) {
    for (const [name, line] of Object.entries(BKK.mrt)) {
      const color = name === 'blue' ? '#38bdf8' : '#a78bfa';

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      line.stations.forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();

      // Stations
      for (const s of line.stations) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawProposedTransit(ctx) {
    const transitLevel = this.sliders.transit / 100;
    const count = Math.floor(BKK.proposedTransit.length * transitLevel);

    ctx.setLineDash([6, 6]);
    for (let i = 0; i < count; i++) {
      const line = BKK.proposedTransit[i];
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      line.stations.forEach((s, j) => {
        if (j === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();

      // Proposed stations
      for (const s of line.stations) {
        ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);
  }

  drawAirQuality(ctx) {
    for (const z of BKK.airZones) {
      const alpha = z.level * 0.4;
      const gradient = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, 50);
      gradient.addColorStop(0, `rgba(249, 115, 22, ${alpha})`);
      gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(z.x, z.y, 50, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw15MinCircles(ctx) {
    // Draw 15-minute walk circles from BTS stations
    for (const line of Object.values(BKK.bts)) {
      for (const s of line.stations) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 60, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
        ctx.fill();
      }
    }
  }

  drawLabels(ctx) {
    // North arrow
    ctx.save();
    ctx.translate(60, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, 0);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-5, 15);
    ctx.lineTo(5, 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Scale bar
    ctx.save();
    ctx.translate(60, 900);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('~5 km', 50, 15);
    ctx.restore();

    // District labels (only at higher zoom)
    if (this.view.zoom > 1.5) {
      for (const d of BKK.districts) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(d.name, d.x, d.y + 5);
      }
    }
  }

  drawHover(ctx) {
    const { type, data } = this.hovered;
    const x = data.x, y = data.y;

    // Highlight circle
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Tooltip
    const lines = [];
    if (type === 'district') {
      lines.push(data.name);
      lines.push(`Type: ${data.type}`);
      lines.push(`Pop: ${(data.pop * 10).toFixed(1)}M`);
    } else if (type === 'park') {
      lines.push(data.name);
      lines.push(`Size: ${data.size}ha`);
    } else if (type === 'station') {
      lines.push(data.name);
      lines.push(`Line: ${data.line}`);
    }

    const tw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    const th = lines.length * 18 + 12;
    const tx = x + 25;
    const ty = y - th / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    lines.forEach((l, i) => {
      ctx.fillText(l, tx + 8, ty + 16 + i * 18);
    });
  }

  setView(view) {
    this.currentView = view;
    this.render();
  }

  updateSliders(sliders) {
    this.sliders = sliders;
    this.render();
  }
}

// === Main App ===
function init() {
  const canvas = document.getElementById('map-canvas');
  const renderer = new MapRenderer(canvas);

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    renderer.render();
  }
  window.addEventListener('resize', resize);
  resize();

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderer.setView(btn.dataset.view);
    });
  });

  // Challenge cards
  const bangkokInfo = {
    flooding: {
      title: 'Flood Resilience',
      desc: 'Bangkok faces severe flooding — the 2011 disaster caused $45B in damages. The city sinks 2–3 cm/year due to groundwater extraction. Only 30% of the metro area is above the 1.5m flood threshold.',
      stats: [['Annual sinking', '2–3 cm'], ['Flood-prone area', '70%'], ['2011 damage', '$45B'], ['Solution', 'Sponge City']]
    },
    transit: {
      title: 'Transit Expansion',
      desc: 'Bangkok has only ~25km of rail for 10M+ people. The proposed expansion to 433km by 2032 would transform mobility. Current car dependency causes 4–6 hour daily commutes.',
      stats: [['Current rail', '~25 km'], ['Target by 2032', '433 km'], ['Population', '10.5M+'], ['Solution', 'BRT + Rail']]
    },
    green: {
      title: 'Green Space',
      desc: 'Bangkok averages 5.6 sqm of green space per capita — far below the WHO recommendation of 25 sqm. Green Bangkok 2030 targets 27 sqm per capita with 1,000+ parks.',
      stats: [['Current/capita', '5.6 sqm'], ['WHO recommendation', '25 sqm'], ['Target 2030', '27 sqm'], ['Solution', 'Pocket parks']]
    },
    air: {
      title: 'Air Quality',
      desc: "Bangkok's PM2.5 levels exceed WHO safe limits for 6+ months annually. Vehicle emissions and regional burning contribute. Green corridors can reduce PM2.5 by 30–40%.",
      stats: [['Avg AQI', '85'], ['Safe months/year', '~6'], ['Vehicle contribution', '40% of PM2.5'], ['Solution', 'Green corridors']]
    },
  };

  document.querySelectorAll('.challenge').forEach(ch => {
    ch.addEventListener('click', () => {
      const type = ch.dataset.type;
      const info = bangkokInfo[type];
      if (!info) return;

      document.getElementById('overlay-title').textContent = info.title;
      document.getElementById('overlay-desc').textContent = info.desc;
      document.getElementById('overlay-stats').innerHTML = info.stats.map(([l, v]) =>
        `<div class="info-stat"><span class="label">${l}</span><span class="value">${v}</span></div>`
      ).join('');
      document.getElementById('map-overlay').classList.remove('hidden');

      const navBtn = document.querySelector(`.nav-btn[data-view="${type}"]`);
      if (navBtn) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        navBtn.classList.add('active');
        renderer.setView(type);
      }
    });
  });

  document.getElementById('close-overlay').addEventListener('click', () => {
    document.getElementById('map-overlay').classList.add('hidden');
  });

  // Sliders
  const timeSlider = document.getElementById('time-slider');
  const greenSlider = document.getElementById('green-slider');
  const transitSlider = document.getElementById('transit-slider');
  const floodSlider = document.getElementById('flood-slider');

  greenSlider.addEventListener('input', () => {
    document.getElementById('green-value').textContent = greenSlider.value + '%';
    updateSliders();
  });

  transitSlider.addEventListener('input', () => {
    document.getElementById('transit-value').textContent = transitSlider.value + '%';
    updateSliders();
  });

  floodSlider.addEventListener('input', () => {
    const v = parseInt(floodSlider.value);
    const labels = ['None', 'Low', 'Medium', 'High', 'Extreme'];
    document.getElementById('flood-value').textContent = labels[Math.floor(v / 25)] || 'High';
    updateSliders();
  });

  timeSlider.addEventListener('input', updateSliders);

  function updateSliders() {
    const sliders = {
      time: parseInt(timeSlider.value),
      green: parseInt(greenSlider.value),
      transit: parseInt(transitSlider.value),
      flood: parseInt(floodSlider.value),
    };
    renderer.updateSliders(sliders);

    // Update stats
    const t = sliders.time / 100;
    document.getElementById('stat-green').textContent = (5.6 + t * 21.4).toFixed(1);
    document.getElementById('stat-rail').textContent = Math.round(25 + t * 408);
    document.getElementById('stat-flood').textContent = Math.round(sliders.flood * (1 - t * 0.5)) + '%';
    document.getElementById('stat-pm25').textContent = Math.round(85 - t * 40 - sliders.green * 0.2);
  }

  // Initial render
  renderer.render();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
