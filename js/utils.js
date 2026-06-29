// === Simplex-like noise for terrain generation ===
class SimpleNoise {
  constructor(seed = 0) {
    this.seed = seed;
    this.perm = this._generatePermutation();
  }

  _generatePermutation() {
    const p = new Array(512);
    const base = new Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this._seededRandom() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    return p;
  }

  _seededRandom() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  noise2D(x, y) {
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y) => {
      const s = (h & 1) ? -x : x + ((h & 2) ? -y : y);
      return s;
    };
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = this.perm[X] + Y, B = this.perm[X + 1] + Y;
    return lerp(
      lerp(grad(this.perm[A], x, y), grad(this.perm[B], x - 1, y), u),
      lerp(grad(this.perm[A + 1], x, y - 1), grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  fbm(x, y, octaves = 4) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      val += this.noise2D(x * freq, y * freq) * amp;
      max += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return val / max;
  }
}

// === Color utilities ===
function lerpColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

// === Bangkok color palette ===
const COLORS = {
  water:       [0, 100, 160],
  waterDeep:   [0, 60, 120],
  flood:       [255, 80, 60],
  ground:      [60, 80, 60],
  groundDry:   [90, 100, 70],
  building:    [140, 160, 180],
  buildingNew: [80, 200, 180],
  green:       [40, 140, 60],
  greenDark:   [20, 100, 40],
  road:        [60, 60, 70],
  rail:        [255, 100, 50],
  park:        [50, 180, 80],
  sky:         [10, 14, 23],
  highlight:   [0, 212, 170],
  warning:     [255, 167, 38],
  danger:      [239, 83, 80],
};

// === Easing ===
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
