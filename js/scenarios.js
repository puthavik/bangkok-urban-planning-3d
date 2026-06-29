// === Scenario Visualization Engine ===

class ScenarioRenderer {
  constructor(scene, cityModel) {
    this.scene = scene;
    this.model = cityModel;
    this.groups = {
      terrain: new THREE.Group(),
      buildings: new THREE.Group(),
      river: new THREE.Group(),
      flood: new THREE.Group(),
      transit: new THREE.Group(),
      green: new THREE.Group(),
      overlay: new THREE.Group(),
    };

    Object.values(this.groups).forEach(g => {
      g.renderOrder = 1;
      scene.add(g);
    });

    this.currentView = 'overview';
    this.transitionProgress = 1;
    this.targetGreen = 15;
    this.targetTransit = 25;
    this.targetFlood = 70;
    this.timePeriod = 0;
  }

  build() {
    this._buildTerrain();
    this._buildRiver();
    this._buildBuildings();
    this._buildFloodOverlay();
    this._buildTransit();
    this._buildGreen();
  }

  _buildTerrain() {
    const g = this.groups.terrain;
    g.clear();

    const segs = GRID_SIZE;
    const geo = new THREE.PlaneGeometry(GRID_SIZE * CELL, GRID_SIZE * CELL, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let x = 0; x < segs; x++) {
      for (let y = 0; y < segs; y++) {
        const idx = y * segs + x;
        const cell = this.model.terrain[x]?.[y];
        const elev = cell ? cell.elevation : 0;
        pos.setY(idx, Math.max(-0.5, elev * 0.5));

        // Color based on elevation
        const t = clamp(elev / 3, 0, 1);
        const c = lerpColor(COLORS.ground, COLORS.groundDry, t);
        colors[idx * 3] = c[0] / 255;
        colors[idx * 3 + 1] = c[1] / 255;
        colors[idx * 3 + 2] = c[2] / 255;
      }
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.attributes.position.needsUpdate = true;

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    g.add(new THREE.Mesh(geo, mat));
  }

  _buildRiver() {
    const g = this.groups.river;
    g.clear();

    // Chao Phraya River
    for (let i = 0; i < this.model.riverPath.length - 1; i++) {
      const a = this.model.riverPath[i];
      const b = this.model.riverPath[i + 1];

      const geo = new THREE.BoxGeometry(4.5, 0.15, CELL);
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(...COLORS.water),
        transparent: true,
        opacity: 0.7,
        shininess: 200,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(a.x, -0.3, a.y);
      mesh.rotation.y = Math.atan2(b.x - a.x, b.y - a.y);
      g.add(mesh);
    }
  }

  _buildBuildings() {
    const g = this.groups.buildings;
    g.clear();

    this.model.buildings.forEach(b => {
      const geo = new THREE.BoxGeometry(CELL * 0.8, b.height, CELL * 0.8);
      const c = new THREE.Color(b.color[0]/255, b.color[1]/255, b.color[2]/255);
      const mat = new THREE.MeshPhongMaterial({ color: c, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.height / 2, b.y);
      mesh.userData = { type: 'building', name: b.isCommercial ? 'Commercial Building' : 'Residential', data: b };
      g.add(mesh);
    });

    // Parks
    this.model.parks.forEach(p => {
      const geo = new THREE.CylinderGeometry(CELL * 0.4, CELL * 0.5, p.height, 8);
      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(COLORS.park[0]/255, COLORS.park[1]/255, COLORS.park[2]/255),
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.height / 2, p.y);
      mesh.userData = { type: 'park', name: 'Existing Park' };
      g.add(mesh);
    });
  }

  _buildFloodOverlay() {
    this.groups.flood.clear();
    this._updateFloodOverlay();
  }

  _updateFloodOverlay() {
    const g = this.groups.flood;
    g.clear();
    const intensity = this.targetFlood / 100;

    this.model.floodZones.forEach(z => {
      const alpha = z.risk * intensity * 0.6;
      const geo = new THREE.PlaneGeometry(CELL, CELL);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(...COLORS.flood),
        transparent: true,
        opacity: alpha,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(z.x, 0.1, z.y);
      g.add(mesh);
    });
  }

  _buildTransit() {
    const g = this.groups.transit;
    g.clear();

    this.model.railLines.forEach(line => {
      const c = new THREE.Color(...line.color);

      // Rail line as tube
      for (let i = 0; i < line.stations.length - 1; i++) {
        const a = line.stations[i], b = line.stations[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const geo = new THREE.CylinderGeometry(0.08, 0.08, len, 6);
        const mat = new THREE.MeshPhongMaterial({
          color: c, emissive: c.clone().multiplyScalar(0.3),
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((a.x + b.x) / 2, 2, (a.y + b.y) / 2);
        mesh.rotation.x = Math.PI / 2;
        mesh.rotation.z = -Math.atan2(dy, dx);
        g.add(mesh);
      }

      // Station markers
      line.stations.forEach(s => {
        const geo = new THREE.SphereGeometry(0.35, 8, 8);
        const mat = new THREE.MeshPhongMaterial({
          color: c, emissive: c.clone().multiplyScalar(0.5),
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(s.x, 2, s.y);
        mesh.userData = { type: 'station', name: 'Transit Station' };
        g.add(mesh);
      });
    });
  }

  _buildGreen() {
    this.groups.green.clear();
    this._updateGreenOverlay();
  }

  _updateGreenOverlay() {
    const g = this.groups.green;
    g.clear();
    const greenLevel = this.targetGreen / 100;

    // Proposed new green spaces
    this.model.proposedParks.forEach((p, i) => {
      const show = i / this.model.proposedParks.length <= greenLevel;
      if (!show) return;

      for (let dx = 0; dx < p.size; dx++) {
        for (let dy = 0; dy < p.size; dy++) {
          const geo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 8);
          const mat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(...COLORS.green),
            transparent: true,
            opacity: 0.75,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(p.x + dx, 0.4, p.y + dy);
          mesh.userData = { type: 'proposed-park', name: 'Proposed Green Space' };
          g.add(mesh);
        }
      }
    });

    // Green corridor along river
    if (greenLevel > 0.3) {
      for (let i = 0; i < this.model.riverPath.length; i += 3) {
        const rp = this.model.riverPath[i];
        const geo = new THREE.CylinderGeometry(0.3, 0.35, 0.6, 8);
        const mat = new THREE.MeshLambertMaterial({
          color: new THREE.Color(...COLORS.greenDark),
          transparent: true,
          opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(rp.x + 3, 0.3, rp.y);
        g.add(mesh);
      }
    }
  }

  // === View switching ===
  setView(view) {
    this.currentView = view;
    switch (view) {
      case 'overview':
        this.groups.flood.visible = false;
        this.groups.green.visible = false;
        this.groups.transit.visible = false;
        this.groups.buildings.visible = true;
        this.groups.terrain.visible = true;
        this.groups.river.visible = true;
        break;
      case 'flooding':
        this.groups.flood.visible = true;
        this.groups.green.visible = false;
        this.groups.transit.visible = false;
        this.groups.buildings.visible = true;
        this.groups.terrain.visible = true;
        this.groups.river.visible = true;
        this._updateFloodOverlay();
        break;
      case 'transit':
        this.groups.flood.visible = false;
        this.groups.green.visible = false;
        this.groups.transit.visible = true;
        this.groups.buildings.visible = true;
        this.groups.terrain.visible = true;
        this.groups.river.visible = true;
        break;
      case 'green':
        this.groups.flood.visible = false;
        this.groups.green.visible = true;
        this.groups.transit.visible = false;
        this.groups.buildings.visible = true;
        this.groups.terrain.visible = true;
        this.groups.river.visible = true;
        this._updateGreenOverlay();
        break;
      case '15min':
        this.groups.flood.visible = false;
        this.groups.green.visible = true;
        this.groups.transit.visible = true;
        this.groups.buildings.visible = true;
        this.groups.terrain.visible = true;
        this.groups.river.visible = true;
        this._updateGreenOverlay();
        break;
      case 'air':
        this.groups.flood.visible = false;
        this.groups.green.visible = true;
        this.groups.transit.visible = true;
        this.groups.buildings.visible = true;
        this.groups.terrain.visible = true;
        this.groups.river.visible = true;
        this._updateGreenOverlay();
        // Add air quality overlay
        this._addAirOverlay();
        break;
    }
  }

  _addAirOverlay() {
    // PM2.5 visualization as semi-transparent dome
    const geo = new THREE.SphereGeometry(GRID_SIZE * 0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(200, 120, 50),
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(GRID_SIZE / 2, 5, GRID_SIZE / 2);
    this.groups.overlay.clear();
    this.groups.overlay.add(mesh);
  }

  // === Slider-driven updates ===
  updateGreen(val) { this.targetGreen = val; this._updateGreenOverlay(); }
  updateTransit(val) { this.targetTransit = val; }
  updateTime(val) { this.timePeriod = val; }
  updateFlood(val) { this.targetFlood = val; this._updateFloodOverlay(); }
}
