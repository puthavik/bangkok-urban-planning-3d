// === City Model Generator - Bangkok-inspired layout ===
// GRID_SIZE and CELL defined in main.js (60, 1)

class CityModel {
  constructor() {
    this.noise = new SimpleNoise(42);
    this.chaoPrayaNoise = new SimpleNoise(99);
    this.buildings = [];
    this.parks = [];
    this.railStations = [];
    this.floodZones = [];
    this.greenCorridors = [];
    this.generate();
  }

  generate() {
    this.terrain = [];
    this.buildings = [];
    this.parks = [];
    this.railStations = [];
    this.floodZones = [];
    this.greenCorridors = [];

    // Chao Phraya River path (roughly N-S through eastern part)
    this.riverPath = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const riverX = 38 + this.chaoPrayaNoise.noise2D(y * 0.05, 0) * 6;
      this.riverPath.push({ x: riverX, y });
    }

    // Generate terrain
    for (let x = 0; x < GRID_SIZE; x++) {
      this.terrain[x] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        // Bangkok is flat and low-lying
        const baseElev = this.noise.fbm(x * 0.03, y * 0.03, 3) * 2 + 1;
        // Distance to river affects elevation (river banks are slightly higher)
        const distToRiver = this._distToRiver(x, y);
        let elevation = baseElev;

        // River cells are below water level
        if (distToRiver < 2.5) {
          elevation = -0.5 + this.noise.noise2D(x * 0.1, y * 0.1) * 0.3;
        }

        // Some areas are more flood-prone (low elevation)
        const floodRisk = elevation < 0.5 ? 0.8 : elevation < 1 ? 0.5 : 0.2;

        this.terrain[x][y] = {
          elevation,
          floodRisk,
          isRiver: distToRiver < 2.5,
          distToRiver,
        };

        // Track flood zones
        if (floodRisk > 0.6) {
          this.floodZones.push({ x, y, risk: floodRisk });
        }
      }
    }

    // Generate buildings (skip river cells)
    for (let x = 3; x < GRID_SIZE - 3; x += 2) {
      for (let y = 3; y < GRID_SIZE - 3; y += 2) {
        const cell = this.terrain[x]?.[y];
        if (!cell || cell.isRiver) continue;

        // Density: higher near center and rail
        const cx = GRID_SIZE / 2, cy = GRID_SIZE / 2;
        const distCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const density = Math.max(0.1, 1 - distCenter / (GRID_SIZE * 0.4));

        if (Math.random() > density) continue;

        const height = 1 + Math.random() * 6 * density + this.noise.noise2D(x * 0.1, y * 0.1) * 2;
        const isCommercial = distCenter < 15;

        this.buildings.push({
          x, y,
          height: Math.max(0.5, height),
          isCommercial,
          color: isCommercial
            ? lerpColor(COLORS.building, COLORS.buildingNew, Math.random() * 0.3)
            : lerpColor(COLORS.building, COLORS.ground, 0.3 + Math.random() * 0.2),
        });
      }
    }

    // Generate parks (existing limited green spaces)
    const parkLocations = [
      { x: 20, y: 25, size: 4 }, // Lumphini-like
      { x: 30, y: 35, size: 3 }, // Benjakitti-like
      { x: 15, y: 40, size: 3 },
      { x: 45, y: 20, size: 2 },
      { x: 25, y: 15, size: 2 },
    ];

    parkLocations.forEach(p => {
      for (let dx = 0; dx < p.size; dx++) {
        for (let dy = 0; dy < p.size; dy++) {
        this.parks.push({
          x: p.x + dx,
          y: p.y + dy,
          height: 0.5 + Math.random() * 0.5,
        });
      }
    });

    // Rail lines (BTS MRT simplified)
    this.railLines = this._generateRailLines();

    // Future green corridors (proposed)
    this.proposedParks = this._generateProposedGreen();
  }

  _distToRiver(x, y) {
    let minD = Infinity;
    for (const rp of this.riverPath) {
      const d = Math.sqrt((x - rp.x) ** 2 + (y - rp.y) ** 2);
      if (d < minD) minD = d;
    }
    return minD;
  }

  _generateRailLines() {
    // Simplified BTS Skytrain (Silom + Sukhumvit lines) and MRT
    const lines = [
      // Silom Line (roughly W-E)
      { stations: [], color: [255, 100, 50] },
      // Sukhumvit Line (N-S)
      { stations: [], color: [50, 150, 255] },
      // MRT Blue Line (N-S western)
      { stations: [], color: [100, 200, 100] },
    ];

    // Silom
    for (let x = 10; x <= 35; x += 3) {
      lines[0].stations.push({ x, y: 28 + Math.sin(x * 0.2) * 3 });
    }
    // Sukhumvit
    for (let y = 10; y <= 50; y += 3) {
      lines[1].stations.push({ x: 32 + Math.sin(y * 0.15) * 2, y });
    }
    // MRT Blue
    for (let y = 8; y <= 52; y += 3) {
      lines[2].stations.push({ x: 22 + Math.sin(y * 0.1) * 2, y });
    }

    this.railStations = lines.flatMap(l => l.stations);
    return lines;
  }

  _generateProposedGreen() {
    // Proposed new parks and green corridors
    const proposed = [];
    for (let i = 0; i < 15; i++) {
      const x = 5 + Math.floor(Math.random() * (GRID_SIZE - 10));
      const y = 5 + Math.floor(Math.random() * (GRID_SIZE - 10));
      const cell = this.terrain[x]?.[y];
      if (!cell || cell.isRiver) continue;
      proposed.push({ x, y, size: 2 + Math.floor(Math.random() * 3) });
    }
    return proposed;
  }
}
