"use strict";

const P = {};

P.clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
P.lerp = (a, b, u) => a + (b - a) * u;
P.ease = {
  io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  in: (u) => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  sine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  quad: (u) => 1 - (1 - u) * (1 - u),
};

P.rgb = (r, g, b) => ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0);
P.col = (c) => (typeof c === "number" ? c : P.rgb(c[0] | 0, c[1] | 0, c[2] | 0));
P.mix = (a, b, u) => {
  u = P.clamp(u);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
};
P.ramp = (cols, u) => {
  u = P.clamp(u) * (cols.length - 1);
  const i = Math.min(cols.length - 2, Math.floor(u));
  return P.mix(cols[i], cols[i + 1], u - i);
};
P.palette = (cols, n) => Array.from({ length: n }, (_, i) => P.col(P.ramp(cols, i / (n - 1))));

P.BT = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16));
P.bt = (x, y) => P.BT[((y & 3) << 2) | (x & 3)];
P.ditherIndex = (v, n, x, y, width = 0.35) => {
  v = P.clamp(v, 0, 0.9999) * (n - 1);
  let k = Math.floor(v);
  const f = v - k;
  if ((f - (1 - width)) / width > P.bt(x, y)) k++;
  return Math.min(n - 1, k);
};

P.rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

P.hash = (a, b, s = 0) => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
P.noise = (x, y, s = 0) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = P.hash(ix, iy, s), b = P.hash(ix + 1, iy, s), c = P.hash(ix, iy + 1, s), d = P.hash(ix + 1, iy + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
P.fbm = (x, y, oct = 4, s = 0) => {
  let v = 0, amp = 0.5, f = 1, sum = 0;
  for (let i = 0; i < oct; i++) {
    v += P.noise(x * f, y * f, s + i * 17) * amp;
    sum += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / sum;
};

class Buf {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint32Array(w * h);
    this.ox = 0;
    this.oy = 0;
  }

  clear(c = 0) {
    this.px.fill(c ? P.col(c) : 0);
  }

  put(i, c) {
    this.px[i] = c;
  }

  get(x, y) {
    x = Math.round(x) - this.ox;
    y = Math.round(y) - this.oy;
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.px[y * this.w + x];
  }

  pset(x, y, c) {
    x = Math.round(x) - this.ox;
    y = Math.round(y) - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.put(y * this.w + x, P.col(c));
  }

  rect(x0, y0, x1, y1, c) {
    c = P.col(c);
    const a = Math.max(Math.round(x0) - this.ox, 0), b = Math.min(Math.round(x1) - this.ox, this.w);
    const p = Math.max(Math.round(y0) - this.oy, 0), q = Math.min(Math.round(y1) - this.oy, this.h);
    for (let y = p; y < q; y++) for (let x = a; x < b; x++) this.put(y * this.w + x, c);
  }

  blob(cx, cy, r, color, dens = 1, edge = 0, sy = 1) {
    if (r <= 0 || dens <= 0) return;
    const c = P.col(color), R = r * (1 + edge);
    const x0 = Math.max(Math.floor(cx - R) - 1, this.ox), x1 = Math.min(Math.ceil(cx + R) + 1, this.ox + this.w - 1);
    const y0 = Math.max(Math.floor(cy - R * sy) - 1, this.oy), y1 = Math.min(Math.ceil(cy + R * sy) + 1, this.oy + this.h - 1);
    const span = R - r + 1e-6, lim = R * R;
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / sy, dy2 = dy * dy;
      if (dy2 > lim) continue;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, q = dx * dx + dy2;
        if (q > lim) continue;
        const d = Math.sqrt(q);
        const den = edge > 0 ? dens * P.clamp((R - d) / span) : d <= r ? dens : 0;
        if (P.bt(x, y) < den) this.put((y - this.oy) * this.w + x - this.ox, c);
      }
    }
  }

  ring(cx, cy, r, width, color, dens = 1, sy = 1) {
    if (dens <= 0) return;
    const c = P.col(color), R = r + width;
    const x0 = Math.max(Math.floor(cx - R) - 1, this.ox), x1 = Math.min(Math.ceil(cx + R) + 1, this.ox + this.w - 1);
    const y0 = Math.max(Math.floor(cy - R * sy) - 1, this.oy), y1 = Math.min(Math.ceil(cy + R * sy) + 1, this.oy + this.h - 1);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / sy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, d = Math.sqrt(dx * dx + dy * dy);
        if (d >= r && d <= R && P.bt(x, y) < dens) this.put((y - this.oy) * this.w + x - this.ox, c);
      }
    }
  }

  line(x0, y0, x1, y1, color, width = 1) {
    const c = P.col(color), n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), h = (width - 1) / 2;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      if (width <= 1) this.pset(x, y, c);
      else this.rect(x - h, y - h, x + h + 1, y + h + 1, c);
    }
  }

  poly(pts, color) {
    const c = P.col(color);
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    y0 = Math.max(Math.floor(y0), this.oy);
    y1 = Math.min(Math.ceil(y1), this.oy + this.h - 1);
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) this.rect(Math.round(xs[i]), y, Math.round(xs[i + 1]) + 1, y + 1, c);
    }
  }

  sprite(s, x, y, flip = false) {
    for (let j = 0; j < s.h; j++)
      for (let i = 0; i < s.w; i++) {
        const c = s.px[j * s.w + (flip ? s.w - 1 - i : i)];
        if (c >>> 24) this.pset(x + i, y + j, c);
      }
  }

  field(fn, pal, width = 0.35) {
    const n = pal.length;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const wx = x + this.ox, wy = y + this.oy, v = fn(wx, wy);
        if (v == null || v <= 0) continue;
        this.put(y * this.w + x, pal[P.ditherIndex(v, n, wx, wy, width)]);
      }
  }

  dither(k, color) {
    if (k <= 0.02) return;
    const c = P.col(color);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (P.bt(x + this.ox, y + this.oy) < k) this.px[y * this.w + x] = c;
  }

  scaled(n) {
    const o = new Buf(this.w * n, this.h * n);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.px[y * o.w + x] = this.px[((y / n) | 0) * this.w + ((x / n) | 0)];
    return o;
  }

  rgba() {
    return new Uint8Array(this.px.buffer.slice(0));
  }
}
P.Buf = Buf;

P.unpack = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];

P.volley = (t0, n, opt = {}) => {
  const r = P.rng(opt.seed ?? 1), W = opt.w ?? 240, H = opt.h ?? 135, warn = opt.warn ?? 0.7, life = opt.life ?? 0.45;
  const [w0, w1] = opt.width ?? [5, 9], safe = opt.safe, out = [];
  for (let tries = 0; out.length < n && tries < 4000; tries++) {
    const a = r() * Math.PI, x = 10 + r() * (W - 20), y = 20 + r() * (H - 40), w = w0 + r() * (w1 - w0);
    if (safe && Math.abs((safe[0] - x) * Math.sin(a) - (safe[1] - y) * Math.cos(a)) < safe[2] + w) continue;
    const ts = t0 + (opt.stagger ?? 0) * out.length;
    out.push({ x, y, a, w, warn: ts, fire: ts + warn, end: ts + warn + life });
  }
  return out;
};

P.beams = (buf, list, t, cols = [[255, 255, 255], [255, 255, 255]]) => {
  const W = buf.w, H = buf.h, light = new Float32Array(W * H);
  let glow = 0, any = false;
  for (const b of list) {
    if (t < b.warn || t >= b.end + 0.2) continue;
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    if (t < b.fire) {
      const k = (t - b.warn) / (b.fire - b.warn);
      if (!(Math.floor(t * 14) % 2 === 0 || k > 0.75)) continue;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const wx = x + buf.ox, wy = y + buf.oy, d = Math.abs((wx - b.x) * sa - (wy - b.y) * ca);
          const along = (wx - b.x) * ca + (wy - b.y) * sa;
          if (d < 0.6 && (Math.floor(along / 3) % 2 === 0 || k > 0.6)) buf.put(y * W + x, P.col(P.mix(P.unpack(buf.px[y * W + x]), cols[cols.length - 1], 0.45 + 0.45 * k)));
        }
      continue;
    }
    any = true;
    const f = t - b.fire, life = b.end - b.fire;
    const grow = 1 - Math.pow(1 - Math.min(f / 0.05, 1), 3);
    const shrink = Math.max(0, 1 - Math.pow(Math.max(0, (f - life * 0.55) / (life * 0.45 + 0.2)), 2));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const wx = x + buf.ox, wy = y + buf.oy, d = Math.abs((wx - b.x) * sa - (wy - b.y) * ca);
        const along = (wx - b.x) * ca + (wy - b.y) * sa;
        const wob = 1 + 0.12 * Math.sin(along / 5 + f * 70) + 0.06 * Math.sin(along / 2.3 - f * 110);
        const w = b.w * grow * shrink * wob, o = Math.max(d - w, 0);
        const core = P.clamp(w - d + 0.5);
        const bloom = Math.exp(-o / (b.w * 0.6 + 1.5)) * grow * shrink;
        const scatter = Math.exp(-o / 22) * 0.18 * grow * shrink;
        const v = Math.max(core, bloom * 0.85, scatter), i = y * W + x;
        if (v > light[i]) light[i] = v;
      }
    glow += 0.06 * grow * shrink + (f < 0.06 ? 0.4 * (1 - f / 0.06) : 0);
  }
  if (any)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x, v = light[i];
        if (v <= 0.01) continue;
        const q = v * 4, base = Math.floor(q), fr = q - base;
        const lv = P.clamp((base + (fr > 0.6 || (fr > 0.4 && P.bt(x + buf.ox, y + buf.oy) - 0.5 / 16 > 0.5) ? 1 : 0)) / 4);
        if (lv <= 0) continue;
        const src = P.unpack(buf.px[i]), tint = P.ramp(cols, lv);
        buf.put(i, P.col(P.mix(src, tint, lv)));
      }
  if (glow > 0) {
    const k = Math.min(glow, 0.6) * 0.5;
    for (let i = 0; i < W * H; i++) buf.put(i, P.col(P.mix(P.unpack(buf.px[i]), [255, 255, 255], k)));
  }
  return glow;
};

P.novaNoise = () => {
  if (P.NOVA) return P.NOVA;
  const S = 160, a = new Float32Array(S * S), b = new Float32Array(S * S);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      a[j * S + i] = P.noise(i * 0.16, j * 0.2);
      b[j * S + i] = P.noise(i * 0.4, j * 0.45);
    }
  return (P.NOVA = { S, a, b });
};

P.SMOKE_GREEN = {
  smoke: [[6, 22, 12], [14, 48, 24], [26, 82, 36], [44, 124, 50], [76, 176, 66], [130, 226, 98], [200, 255, 168], [240, 255, 228]],
  ring: [[236, 255, 220], [130, 240, 100], [50, 170, 60]],
  core: [[245, 255, 235], [150, 245, 120], [60, 180, 64]],
  puff: [[70, 160, 66], [34, 96, 44]],
  spark: [[220, 255, 200], [100, 230, 90]],
  gather: [[60, 170, 60], [230, 255, 210], [90, 220, 80]],
};

P.novaSmoke = (buf, x, te, t, opt = {}) => {
  const C = opt.cols || P.SMOKE_GREEN, fade = opt.fade ?? 1, front = !!opt.front, S = opt.scale ?? 1;
  if (fade <= 0 || te < -0.5) return;
  const NN = P.novaNoise(), NS = NN.S, wrap = (v) => ((Math.round(v) % NS) + NS) % NS;
  if (te < 0) {
    if (front) return;
    const c = (te + 0.5) / 0.5;
    buf.blob(x, -4 * S, (2 + 8 * c) * S, P.mix(C.gather[0], C.gather[1], c), (0.4 + 0.6 * c) * fade, 0.6);
    for (let i = 0; i < 18; i++) {
      const r = P.rng(i * 19 + 7), a = -Math.PI * r(), ph = (t * 2.4 + r()) % 1, d = (1 - ph) * (30 + r() * 24) * S;
      buf.pset(x + Math.cos(a) * d, -4 * S + Math.sin(a) * d * 0.8, ph > 0.6 ? C.gather[1] : C.gather[2]);
    }
    return;
  }
  const rings = [[-2, 130], [-20, 96], [-40, 64]].map(([y, r]) => [y * S, r * S]), ringFade = 1 - P.clamp((te - 0.35) / 0.8);
  const ring = (yo, maxR) => {
    const r = maxR * P.ease.out(P.clamp(te / 0.5)), ry = r * 0.22;
    if (ringFade <= 0 || r < 2) return;
    for (let a = 0; a < Math.PI * 2; a += 0.6 / Math.max(10, r)) {
      if (Math.sin(a) > 0 !== front) continue;
      const px = x + Math.cos(a) * r, py = yo + Math.sin(a) * ry;
      if (P.bt(px, py) >= ringFade * fade) continue;
      buf.pset(px, py, C.ring[0]);
      buf.pset(px, py - 1, C.ring[1]);
      if (P.bt(px + 1, py) < ringFade * 0.6) buf.pset(px, py + 1, C.ring[2]);
    }
  };
  if (front) {
    for (const [yo, mr] of rings) ring(yo, mr);
    for (let i = 0; i < 26; i++) {
      const r = P.rng(i * 37 + 3), ph = (te * (0.25 + r() * 0.2) + r()) % 1, px = x + ((r() - 0.5) * 110 + Math.sin(t * 2 + i) * 6) * S, py = (-2 - ph * 170) * S;
      if (P.bt(px, py) < (1 - ph) * fade) buf.pset(px, py, ph < 0.3 ? C.spark[0] : C.spark[1]);
    }
    return;
  }
  const smoke = C.smoke.map(P.col);
  const spread = 240 * S * P.ease.out(P.clamp(te / 1.4));
  for (let px = Math.max(buf.ox, Math.floor(x - spread)); px < Math.min(buf.ox + buf.w, x + spread); px++) {
    const e = Math.abs(px - x) / spread, h = (60 + 16 * Math.sin((px / S) * 0.045 + t * 0.9) + 12 * Math.sin((px / S) * 0.11 - t * 1.7)) * S * (1 - e * e * e * e), ef = fade * (e > 0.85 ? (1 - e) / 0.15 : 1);
    for (let py = Math.max(buf.oy, Math.floor(-h)); py <= 1; py++) {
      const hy = -py / h;
      const n = NN.a[wrap(py / S + te * 40) * NS + wrap(px / S + te * 6)] * 0.6 + NN.b[wrap(py / S + te * 24) * NS + wrap(px / S - te * 9)] * 0.4;
      const heat = (1 - hy) * 0.95 + (n - 0.5) * 0.9 - 0.04;
      if (heat < 0.1 || P.bt(px, py) >= ef) continue;
      buf.pset(px, py, smoke[P.ditherIndex(P.clamp(heat * 0.85), smoke.length, px, py, 0.35)]);
    }
  }
  for (let i = 0; i < 34; i++) {
    const r = P.rng(i * 53 + 11), ph = (te * (0.16 + r() * 0.1) + r()) % 1;
    if (te < ph * 3) continue;
    const px = x + ((r() - 0.5) * 70 * (0.5 + ph) + Math.sin(t * 0.8 + i) * 5) * S, py = (-6 - ph * 175) * S, sz = (6 + ph * 14 + r() * 5) * S;
    buf.blob(px, py, sz, ph < 0.4 ? C.puff[0] : C.puff[1], (1 - ph) * 0.75 * fade, 0.6);
  }
  for (const [yo, mr] of rings) ring(yo, mr);
  if (te < 1.0) {
    const w = (6 * (1 - te) + 1) * S;
    for (let y = buf.oy; y < 0; y++)
      for (let dx = -Math.ceil(w + 2); dx <= Math.ceil(w + 2); dx++) {
        const d = Math.abs(dx) / w;
        if (d > 1.4 || P.bt(x + dx, y) >= (1 - te) * fade * (d < 1 ? 1 : 1.4 - d)) continue;
        buf.pset(x + dx, y, d < 0.4 ? C.core[0] : d < 1 ? C.core[1] : C.core[2]);
      }
  }
  const R = 62 * S * P.ease.out(P.clamp(te / 0.35)) * (1 + Math.min(te, 3) * 0.08), stretch = 0.74 + 0.55 * P.ease.io(P.clamp(te / 2.4));
  const ry = R * stretch, cy = -R * 0.05 - 34 * S * P.ease.io(P.clamp(te / 2.4));
  if (R > 1)
    for (let py = Math.floor(cy - ry); py <= 1; py++)
      for (let px = Math.floor(x - R); px <= Math.ceil(x + R); px++) {
        const dx = (px - x) / R, dy = (py - cy) / ry, e = dx * dx + dy * dy;
        if (e > 1) continue;
        const n = NN.a[wrap(py / S + te * 44) * NS + wrap(px / S + te * 14)] * 0.6 + NN.b[wrap(py / S + te * 26) * NS + wrap(px / S - te * 10)] * 0.4;
        const heat = (1 - e) * 0.8 + n * 0.55 - Math.min(te, 1.4) * 0.2 - 0.06 + (py > -6 * S ? 0.1 : 0);
        if (e > 0.7 && n < 0.48 && dy < 0.3) continue;
        if (dy < -0.4 && n < 0.32 + (-dy - 0.4) * 0.5) continue;
        if (P.bt(px, py) >= fade * (e > 0.9 ? 1.6 - e : 1)) continue;
        buf.pset(px, py, smoke[P.ditherIndex(P.clamp(heat), smoke.length, px, py, 0.35)]);
      }
};

P.BREATH_GOLD = [[120, 40, 12], [210, 100, 24], [255, 170, 40], [255, 214, 90], [255, 240, 170], [255, 252, 226], [255, 255, 255]];

class Breath {
  constructor(opt = {}) {
    this.LMAX = opt.length ?? 210;
    this.ROWS = Math.ceil(this.LMAX / 2);
    this.V = 96;
    this.a = new Uint8Array(this.ROWS * this.V);
    this.seed = opt.seed ?? 0x2545f491;
    this.pal = Array.from({ length: 37 }, (_, i) => P.col(P.ramp(opt.cols || P.BREATH_GOLD, i / 36)));
    this.wind = new Float32Array(this.LMAX);
  }

  step(on = true, steps = 3) {
    const a = this.a, V = this.V, ROWS = this.ROWS;
    let sd = this.seed;
    const rnd = () => {
      sd ^= sd << 13; sd ^= sd >>> 17; sd ^= sd << 5;
      return (sd >>> 0) / 4294967296;
    };
    for (let s = 0; s < steps; s++) {
      for (let v = 0; v < V; v++) {
        const e = Math.min(v - 16, V - 17 - v);
        a[v] = on && e >= 0 ? Math.max(0, Math.min(36, 22 + e * 1.4) - (rnd() < 0.15 ? 8 : 0)) : 0;
      }
      for (let k = ROWS - 1; k >= 1; k--) {
        const up = (k + s) & 1, o = k * V, ip = o - V;
        for (let q = 0; q < V; q++) {
          const v = up ? q : V - 1 - q, src = a[ip + v], r = rnd() * 3, ri = r | 0, nv = v + ri - 1;
          if (nv < 0 || nv >= V) continue;
          const dec = r - ri < 0.36 ? 1 : 0;
          a[o + nv] = src > dec ? src - dec : 0;
        }
      }
    }
    this.seed = sd;
  }

  draw(buf, hx, hy, aA, aB, t, open = 1, floor = buf.oy + buf.h) {
    const LMAX = this.LMAX, V = this.V, a = this.a, pal = this.pal;
    const mid = (aA + aB) / 2, half = ((aB - aA) / 2) * (0.25 + 0.75 * open) * (V - 1) / (V - 19), dA = (half * 2) / (V - 1), lo = mid - half, idA = 1 / dA;
    for (let k = 0; k < LMAX; k++) this.wind[k] = Math.sin(k * 0.06 - t * 7) * (1 + k * 0.02) - lo * idA;
    const I0 = Math.max(0, Math.floor(hx - LMAX) - buf.ox), I1 = Math.min(buf.w - 1, Math.ceil(hx + LMAX) - buf.ox);
    const J0 = Math.max(0, Math.floor(hy - LMAX) - buf.oy), J1 = Math.min(buf.h - 1, floor - buf.oy), TAU = Math.PI * 2;
    for (let j = J0; j <= J1; j++) {
      const dy = j + buf.oy + 0.5 - hy;
      for (let i = I0; i <= I1; i++) {
        const dx = i + buf.ox + 0.5 - hx, k = Math.sqrt(dx * dx + dy * dy) | 0;
        if (k < 2 || k >= LMAX) continue;
        let th = Math.atan2(dy, dx);
        if (lo > Math.PI / 2 && th < 0) th += TAU;
        const uu = th * idA + this.wind[k];
        if (uu < 0 || uu >= V) continue;
        const I = a[(k >> 1) * V + (uu | 0)];
        if (I >= 5) buf.px[j * buf.w + i] = pal[I];
      }
    }
  }
}
P.Breath = Breath;

P.HELL_FIRE = [[30, 6, 6], [110, 18, 8], [180, 40, 10], [222, 80, 14], [244, 124, 22], [252, 172, 40], [255, 214, 90], [255, 244, 186], [255, 255, 255]];

class HellFire {
  constructor(w, h, opt = {}) {
    this.w = w;
    this.h = h;
    this.a = new Uint8Array(w * h);
    this.seed = opt.seed ?? 0x9e3779b9;
    this.top = h;
    this.pal = Array.from({ length: 37 }, (_, i) => P.col(P.ramp(opt.cols || P.HELL_FIRE, i / 36)));
  }

  step(power = 1, cool = 1, steps = 1) {
    const W = this.w, H = this.h, a = this.a, src = Math.round(36 * P.clamp(power));
    let sd = this.seed, top = this.top;
    for (let s = 0; s < steps; s++) {
      for (let x = 0; x < W; x++) {
        sd ^= sd << 13; sd ^= sd >>> 17; sd ^= sd << 5;
        a[(H - 1) * W + x] = Math.max(0, src - ((sd >>> 0) % 100 < 15 ? 6 : 0));
      }
      let newTop = H;
      for (let y = Math.max(1, top - 1); y < H; y++) {
        const row = y * W, up = row - W;
        for (let x = 0; x < W; x++) {
          const v = a[row + x];
          if (v === 0) {
            a[up + x] = 0;
            continue;
          }
          sd ^= sd << 13; sd ^= sd >>> 17; sd ^= sd << 5;
          const rr = (sd >>> 0) % 6, r = rr % 3, dx = x + r - 1 < 0 ? 0 : x + r - 1 >= W ? W - 1 : x + r - 1;
          const nv = v - ((r & 1) + (cool > 1 && rr >= 3 ? cool - 1 : 0));
          a[up + dx] = nv > 0 ? nv : 0;
          if (nv > 0 && y - 1 < newTop) newTop = y - 1;
        }
      }
      top = newTop;
    }
    this.seed = sd;
    this.top = top;
  }

  draw(buf, x = buf.ox, ground = buf.oy + buf.h) {
    const W = this.w, H = this.h, a = this.a, bx = Math.round(x) - buf.ox, by = Math.round(ground) - H - buf.oy;
    for (let j = Math.max(0, this.top - 1, -by); j < Math.min(H, buf.h - by); j++)
      for (let i = Math.max(0, -bx); i < Math.min(W, buf.w - bx); i++) {
        const v = a[j * W + i];
        if (v > 4) buf.px[(j + by) * buf.w + i + bx] = this.pal[v];
      }
  }
}
P.HellFire = HellFire;

P.dist2 = (a, b) => {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
};
P.nearest = (pal, c) => {
  let best = 0, bd = Infinity;
  for (let k = 0; k < pal.length; k++) {
    const dr = c[0] - pal[k][0], dg = c[1] - pal[k][1], db = c[2] - pal[k][2], d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bd) (bd = d), (best = k);
  }
  return best;
};

P.unpng = (data) => {
  const zlib = require("zlib"), sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (data[i] !== sig[i]) throw new Error("not a PNG file, convert it to PNG first");
  let pos = 8, w = 0, h = 0, depth = 8, type = 6, interlace = 0, plte = null, trns = null;
  const idat = [];
  while (pos + 8 <= data.length) {
    const len = data.readUInt32BE(pos), name = data.toString("latin1", pos + 4, pos + 8), body = data.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (name === "IHDR") (w = body.readUInt32BE(0)), (h = body.readUInt32BE(4)), (depth = body[8]), (type = body[9]), (interlace = body[12]);
    else if (name === "PLTE") plte = body;
    else if (name === "tRNS") trns = body;
    else if (name === "IDAT") idat.push(body);
    else if (name === "IEND") break;
  }
  if (interlace) throw new Error("interlaced PNG, save it again without interlacing");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], bpp = Math.max(1, (ch * depth) >> 3), stride = (w * ch * depth + 7) >> 3;
  const raw = zlib.inflateSync(Buffer.concat(idat)), img = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], s = y * (stride + 1) + 1, o = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[s + x], a = x >= bpp ? img[o + x - bpp] : 0, b = y ? img[o - stride + x] : 0, c = x >= bpp && y ? img[o - stride + x - bpp] : 0;
      let p = v;
      if (f === 1) p = v + a;
      else if (f === 2) p = v + b;
      else if (f === 3) p = v + ((a + b) >> 1);
      else if (f === 4) {
        const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      img[o + x] = p & 255;
    }
  }
  const max = (1 << Math.min(depth, 8)) - 1;
  const at = (y, i) => {
    if (depth === 8) return img[y * stride + i];
    if (depth === 16) return img[y * stride + i * 2];
    const bit = i * depth;
    return (img[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & max;
  };
  const up = (v) => (depth < 8 && type !== 3 ? Math.round((v * 255) / max) : v);
  const out = new Buf(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r, g, b, a = 255;
      if (type === 0) {
        const v = at(y, x);
        r = g = b = up(v);
        if (trns && depth <= 8 && v === trns.readUInt16BE(0)) a = 0;
      } else if (type === 2) {
        (r = at(y, x * 3)), (g = at(y, x * 3 + 1)), (b = at(y, x * 3 + 2));
        if (trns && depth === 8 && r === trns.readUInt16BE(0) && g === trns.readUInt16BE(2) && b === trns.readUInt16BE(4)) a = 0;
      } else if (type === 3) {
        const k = at(y, x);
        (r = plte[k * 3]), (g = plte[k * 3 + 1]), (b = plte[k * 3 + 2]);
        if (trns && k < trns.length) a = trns[k];
      } else if (type === 4) (r = g = b = up(at(y, x * 2))), (a = at(y, x * 2 + 1));
      else (r = at(y, x * 4)), (g = at(y, x * 4 + 1)), (b = at(y, x * 4 + 2)), (a = at(y, x * 4 + 3));
      out.px[y * w + x] = a ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0 : 0;
    }
  return out;
};
P.load = (file) => P.unpng(require("fs").readFileSync(file));
P.save = (buf, file) => require("fs").writeFileSync(file, P.png(buf));

P.crop = (buf, x, y, w, h) => {
  const o = new Buf(w, h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const sx = x + i, sy = y + j;
      if (sx >= 0 && sy >= 0 && sx < buf.w && sy < buf.h) o.px[j * w + i] = buf.px[sy * buf.w + sx];
    }
  return o;
};
P.bounds = (buf) => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < buf.h; y++)
    for (let x = 0; x < buf.w; x++)
      if (buf.px[y * buf.w + x] >>> 24) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
P.trim = (buf, pad = 0) => {
  const b = P.bounds(buf);
  return b ? P.crop(buf, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2) : new Buf(1, 1);
};

P.removeBg = (buf, opt = {}) => {
  const W = buf.w, H = buf.h, src = buf.px, tol2 = (opt.tol ?? 48) ** 2, out = new Buf(W, H);
  out.px.set(src);
  let bg = opt.color;
  if (!bg) {
    const count = new Map();
    const add = (i) => {
      if (!(src[i] >>> 24)) return;
      const c = P.unpack(src[i]), k = ((c[0] >> 4) << 8) | ((c[1] >> 4) << 4) | (c[2] >> 4), e = count.get(k) || [0, 0, 0, 0];
      (e[0] += c[0]), (e[1] += c[1]), (e[2] += c[2]), e[3]++;
      count.set(k, e);
    };
    for (let x = 0; x < W; x++) add(x), add((H - 1) * W + x);
    for (let y = 1; y < H - 1; y++) add(y * W), add(y * W + W - 1);
    let top = null;
    for (const e of count.values()) if (!top || e[3] > top[3]) top = e;
    if (!top) return out;
    bg = [top[0] / top[3], top[1] / top[3], top[2] / top[3]];
  }
  const near = (i) => !(src[i] >>> 24) || P.dist2(P.unpack(src[i]), bg) <= tol2;
  if (opt.flood === false) {
    for (let i = 0; i < W * H; i++) if (near(i)) out.px[i] = 0;
    return P.erode(out, opt.erode ?? 0);
  }
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  let qh = 0, qt = 0;
  const push = (i) => {
    if (!seen[i] && near(i)) (seen[i] = 1), (q[qt++] = i);
  };
  if (opt.seeds) for (const [x, y] of opt.seeds) push(y * W + x);
  else {
    for (let x = 0; x < W; x++) push(x), push((H - 1) * W + x);
    for (let y = 1; y < H - 1; y++) push(y * W), push(y * W + W - 1);
  }
  while (qh < qt) {
    const i = q[qh++], x = i % W;
    out.px[i] = 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (i >= W) push(i - W);
    if (i < W * (H - 1)) push(i + W);
  }
  return P.erode(out, opt.erode ?? 0);
};

P.erode = (buf, n = 1) => {
  const W = buf.w, H = buf.h;
  let cur = buf;
  for (let k = 0; k < (n | 0); k++) {
    const s = cur.px, out = new Buf(W, H);
    out.px.set(s);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!(s[i] >>> 24)) continue;
        if ((x > 0 && !(s[i - 1] >>> 24)) || (x < W - 1 && !(s[i + 1] >>> 24)) || (y > 0 && !(s[i - W] >>> 24)) || (y < H - 1 && !(s[i + W] >>> 24))) out.px[i] = 0;
      }
    cur = out;
  }
  return cur;
};

P.resize = (buf, w, h, opt = {}) => {
  if (h && typeof h === "object") (opt = h), (h = undefined);
  h = h ?? Math.max(1, Math.round((w * buf.h) / buf.w));
  const out = new Buf(w, h), sx = buf.w / w, sy = buf.h / h, cut = (opt.alpha ?? 0.5) * 255, votes = new Map();
  for (let y = 0; y < h; y++) {
    const y0 = Math.min(buf.h - 1, Math.floor(y * sy)), y1 = Math.min(buf.h, Math.max(y0 + 1, Math.floor((y + 1) * sy)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.min(buf.w - 1, Math.floor(x * sx)), x1 = Math.min(buf.w, Math.max(x0 + 1, Math.floor((x + 1) * sx)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      votes.clear();
      for (let j = y0; j < y1; j++)
        for (let i = x0; i < x1; i++) {
          const c = buf.px[j * buf.w + i], al = c >>> 24;
          (r += (c & 255) * al), (g += ((c >>> 8) & 255) * al), (b += ((c >>> 16) & 255) * al), (a += al), n++;
          if (opt.mode && al) votes.set(c | 0xff000000, (votes.get(c | 0xff000000) || 0) + al);
        }
      if (!(a / n >= cut && a > 0)) continue;
      if (opt.mode) {
        let top = 0, best = -1;
        for (const [c, v] of votes) if (v > best) (best = v), (top = c);
        out.px[y * w + x] = top >>> 0;
      } else out.px[y * w + x] = P.rgb(Math.round(r / a), Math.round(g / a), Math.round(b / a));
    }
  }
  return out;
};

P.quantize = (buf, n = 16, opt = {}) => {
  const count = new Map();
  for (const c of buf.px) if (c >>> 24) count.set(c, (count.get(c) || 0) + 1);
  const cols = [...count.keys()].map(P.unpack), wt = [...count.values()];
  let pal;
  if (opt.palette) pal = opt.palette.map((c) => (typeof c === "number" ? P.unpack(c) : c.slice(0, 3)));
  else if (cols.length <= n) pal = cols.map((c) => c.slice());
  else {
    let first = 0;
    for (let i = 1; i < cols.length; i++) if (wt[i] > wt[first]) first = i;
    pal = [cols[first].slice()];
    const dmin = cols.map((c) => P.dist2(c, pal[0]));
    while (pal.length < n) {
      let pick = 0, best = -1;
      for (let i = 0; i < cols.length; i++) {
        const score = dmin[i] * Math.sqrt(wt[i]);
        if (score > best) (best = score), (pick = i);
      }
      pal.push(cols[pick].slice());
      for (let i = 0; i < cols.length; i++) dmin[i] = Math.min(dmin[i], P.dist2(cols[i], cols[pick]));
    }
    for (let it = 0; it < 12; it++) {
      const sum = pal.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < cols.length; i++) {
        const k = P.nearest(pal, cols[i]), s = sum[k];
        (s[0] += cols[i][0] * wt[i]), (s[1] += cols[i][1] * wt[i]), (s[2] += cols[i][2] * wt[i]), (s[3] += wt[i]);
      }
      sum.forEach((s, k) => s[3] && (pal[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]));
    }
  }
  pal = pal.map((c) => c.map(Math.round));
  const map = new Map(), out = new Buf(buf.w, buf.h);
  for (let i = 0; i < buf.px.length; i++) {
    const c = buf.px[i];
    if (!(c >>> 24)) continue;
    let k = map.get(c);
    if (k === undefined) map.set(c, (k = P.nearest(pal, P.unpack(c))));
    out.px[i] = P.col(pal[k]);
  }
  return { buf: out, palette: pal };
};

P.cleanup = (buf, opt = {}) => {
  const W = buf.w, H = buf.h, s = buf.px, out = new Buf(W, H), tol2 = (opt.tol ?? 60) ** 2;
  out.px.set(s);
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : s[y * W + x]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = s[y * W + x];
      if (!(c >>> 24)) continue;
      const n4 = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)], solid = n4.filter((v) => v >>> 24);
      if (!solid.length) {
        if (!opt.keepLone) out.px[y * W + x] = 0;
        continue;
      }
      if (n4.includes(c) || [get(x - 1, y - 1), get(x + 1, y - 1), get(x - 1, y + 1), get(x + 1, y + 1)].includes(c)) continue;
      const votes = new Map();
      for (const v of solid) votes.set(v, (votes.get(v) || 0) + 1);
      let top = solid[0];
      for (const [v, k] of votes) if (k > votes.get(top)) top = v;
      if (P.dist2(P.unpack(c), P.unpack(top)) <= tol2) out.px[y * W + x] = top;
    }
  return out;
};

P.outline = (buf, color, opt = {}) => {
  const c = P.col(color), W = buf.w + 2, H = buf.h + 2, out = new Buf(W, H);
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) out.px[(y + 1) * W + x + 1] = buf.px[y * buf.w + x];
  const src = out.px.slice(), d = opt.corners ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] : [[0, -1], [-1, 0], [1, 0], [0, 1]];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (src[y * W + x] >>> 24) continue;
      for (const [dx, dy] of d) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && src[ny * W + nx] >>> 24) {
          out.px[y * W + x] = c;
          break;
        }
      }
    }
  return out;
};

P.segDist2 = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? P.clamp(((px - ax) * dx + (py - ay) * dy) / l) : 0;
  const x = ax + dx * t - px, y = ay + dy * t - py;
  return x * x + y * y;
};
P.inPoly = (x, y, pts) => {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
};

P.BONE_COLS = [[255, 70, 70], [70, 190, 255], [255, 220, 50], [110, 230, 80], [200, 100, 255], [255, 140, 30], [40, 230, 200], [255, 100, 200], [150, 150, 255], [240, 240, 240]];

class Rig {
  constructor(src) {
    this.src = src;
    this.bones = [];
    this.owner = null;
  }

  index(name) {
    const i = this.bones.findIndex((b) => b.name === name);
    if (i < 0) throw new Error("no bone named " + name);
    return i;
  }

  bone(name, parent, x, y, ex = x, ey = y, z = 0) {
    this.bones.push({ name, parent: parent == null ? -1 : this.index(parent), x, y, ex, ey, z });
    this.owner = null;
    return this;
  }

  bind(opt = {}) {
    const { w, h, px } = this.src, own = new Int16Array(w * h).fill(-1), joint = new Uint8Array(w * h), J = opt.joint ?? 2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!(px[y * w + x] >>> 24)) continue;
        let best = -1, bd = Infinity;
        this.bones.forEach((b, k) => {
          const d = P.segDist2(x + 0.5, y + 0.5, b.x, b.y, b.ex, b.ey);
          if (d < bd) (bd = d), (best = k);
        });
        own[y * w + x] = best;
      }
    for (const [name, poly] of Object.entries(opt.paint || {})) {
      const k = this.index(name);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x] >>> 24 && P.inPoly(x + 0.5, y + 0.5, poly)) own[y * w + x] = k;
    }
    this.box = this.bones.map(() => null);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = own[y * w + x];
        if (k < 0) continue;
        const b = this.bones[k], hit = [k];
        if (b.parent >= 0) {
          let near = false;
          for (let j = Math.max(0, y - J); j <= Math.min(h - 1, y + J) && !near; j++)
            for (let i = Math.max(0, x - J); i <= Math.min(w - 1, x + J); i++)
              if (own[j * w + i] >= 0 && own[j * w + i] !== k) {
                near = true;
                break;
              }
          if (near) (joint[y * w + x] = 1), hit.push(b.parent);
        }
        for (const m of hit) {
          const bb = this.box[m] || (this.box[m] = { x0: x, y0: y, x1: x, y1: y });
          (bb.x0 = Math.min(bb.x0, x)), (bb.y0 = Math.min(bb.y0, y)), (bb.x1 = Math.max(bb.x1, x)), (bb.y1 = Math.max(bb.y1, y));
        }
      }
    this.owner = own;
    this.joint = joint;
    return this;
  }

  pose(p = {}) {
    const T = [];
    this.bones.forEach((b, i) => {
      const v = p[b.name] ?? 0, o = typeof v === "number" ? { a: v } : v;
      let x = b.x, y = b.y, a = o.a ?? 0;
      if (b.parent >= 0) {
        const q = T[b.parent];
        [x, y] = Rig.apply(q, b.x, b.y);
        a += q.a;
      }
      T[i] = { a, c: Math.cos(a), s: Math.sin(a), x: x + (o.dx ?? 0), y: y + (o.dy ?? 0), rx: b.x, ry: b.y };
    });
    return T;
  }

  static apply(t, x, y) {
    const dx = x - t.rx, dy = y - t.ry;
    return [t.x + dx * t.c - dy * t.s, t.y + dx * t.s + dy * t.c];
  }

  draw(buf, x, y, p = {}, opt = {}) {
    if (!this.owner) this.bind();
    const T = this.pose(p), { w, h, px } = this.src, own = this.owner, joint = this.joint, flip = !!opt.flip;
    const order = this.bones.map((_, i) => i).sort((i, j) => this.bones[i].z - this.bones[j].z || i - j);
    for (const k of order) {
      const t = T[k], bb = this.box[k];
      if (!bb) continue;
      let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
      for (const [cx, cy] of [[bb.x0, bb.y0], [bb.x1 + 1, bb.y0], [bb.x0, bb.y1 + 1], [bb.x1 + 1, bb.y1 + 1]]) {
        const [qx, qy] = Rig.apply(t, cx, cy);
        (X0 = Math.min(X0, qx)), (Y0 = Math.min(Y0, qy)), (X1 = Math.max(X1, qx)), (Y1 = Math.max(Y1, qy));
      }
      for (let Y = Math.floor(Y0) - 1; Y <= Math.ceil(Y1); Y++)
        for (let X = Math.floor(X0) - 1; X <= Math.ceil(X1); X++) {
          const dx = X + 0.5 - t.x, dy = Y + 0.5 - t.y;
          const ix = Math.floor(t.rx + dx * t.c + dy * t.s), iy = Math.floor(t.ry - dx * t.s + dy * t.c);
          if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
          const i = iy * w + ix, o = own[i];
          if (o < 0 || (o !== k && !(joint[i] && this.bones[o].parent === k))) continue;
          buf.pset(flip ? x + w - 1 - X : x + X, y + Y, px[i]);
        }
    }
  }

  boneColor(name) {
    const k = typeof name === "number" ? name : this.index(name);
    return P.BONE_COLS[k % P.BONE_COLS.length];
  }

  ownerMap(opt = {}) {
    if (!this.owner) this.bind();
    const { w, h, px } = this.src, out = new Buf(w, h), k = opt.mix ?? 0.65;
    for (let i = 0; i < w * h; i++) {
      const o = this.owner[i];
      if (o >= 0) out.px[i] = P.col(P.mix(P.unpack(px[i]), this.boneColor(o), this.joint[i] ? k * 0.4 : k));
    }
    return out;
  }

  legend(scale = 2) {
    const lh = 6 * scale, out = new Buf(Math.max(...this.bones.map((b) => P.textWidth(b.name, scale))) + 6 * scale + 6, this.bones.length * lh + 3);
    out.clear([22, 22, 26]);
    this.bones.forEach((b, k) => {
      const y = 2 + k * lh;
      out.rect(2, y, 2 + 5 * scale, y + 5 * scale, this.boneColor(k));
      P.text(out, 4 + 6 * scale, y, b.name, [235, 235, 235], scale);
    });
    return out;
  }

  drawBones(buf, x, y, p = {}, opt = {}) {
    const T = this.pose(p), s = opt.scale ?? 1, w = this.src.w, flip = !!opt.flip;
    const map = ([qx, qy]) => [x + (flip ? w - qx : qx) * s, y + qy * s];
    this.bones.forEach((b, k) => {
      const [ax, ay] = map([T[k].x, T[k].y]), [bx, by] = map(Rig.apply(T[k], b.ex, b.ey));
      buf.line(ax, ay, bx, by, opt.color ?? [80, 200, 255]);
    });
    this.bones.forEach((_, k) => {
      const [ax, ay] = map([T[k].x, T[k].y]);
      buf.rect(ax - 1, ay - 1, ax + 2, ay + 2, opt.joint ?? [255, 210, 80]);
    });
  }
}
P.Rig = Rig;

P.strip = (pts, r) => {
  const n = pts.length, d = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
    d.push([dx / l, dy / l]);
  }
  const head = [pts[0][0] - d[0][0] * r, pts[0][1] - d[0][1] * r], tail = [pts[n - 1][0] + d[n - 2][0] * r, pts[n - 1][1] + d[n - 2][1] * r];
  const P2 = [head, ...pts, tail], D = [d[0], ...d, d[n - 2]], N = [];
  for (let i = 0; i < P2.length; i++) {
    const a = D[Math.max(0, i - 1)], b = D[Math.min(D.length - 1, i)];
    let nx = -(a[1] + b[1]), ny = a[0] + b[0];
    const l = Math.hypot(nx, ny) || 1;
    (nx /= l), (ny /= l);
    const m = Math.min(2, 1 / Math.max(0.5, nx * -b[1] + ny * b[0]));
    N.push([nx * m * r, ny * m * r]);
  }
  return P2.map((p, i) => [[p[0] - N[i][0], p[1] - N[i][1]], [p[0] + N[i][0], p[1] + N[i][1]]]);
};
P.invBilinear = (px, py, a, b, c, d) => {
  const ex = b[0] - a[0], ey = b[1] - a[1], fx = d[0] - a[0], fy = d[1] - a[1];
  const gx = a[0] - b[0] + c[0] - d[0], gy = a[1] - b[1] + c[1] - d[1], hx = px - a[0], hy = py - a[1];
  const k2 = gx * fy - gy * fx, k1 = ex * fy - ey * fx + hx * gy - hy * gx, k0 = hx * ey - hy * ex;
  const uOf = (v) => {
    const dx = ex + gx * v, dy = ey + gy * v;
    return Math.abs(dx) > Math.abs(dy) ? (hx - fx * v) / dx : (hy - fy * v) / dy;
  };
  if (Math.abs(k2) < 1e-9) {
    const v = -k0 / k1;
    return [uOf(v), v];
  }
  let w = k1 * k1 - 4 * k0 * k2;
  if (w < 0) return null;
  w = Math.sqrt(w);
  const v1 = (-k1 - w) / (2 * k2), u1 = uOf(v1);
  if (u1 >= 0 && u1 <= 1 && v1 >= 0 && v1 <= 1) return [u1, v1];
  const v2 = (-k1 + w) / (2 * k2);
  return [uOf(v2), v2];
};
P.bend = (buf, src, rest, pose, opt = {}) => {
  let reach = opt.reach;
  if (!reach) {
    reach = 1;
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        if (!(src.px[y * src.w + x] >>> 24)) continue;
        let d = Infinity;
        for (let i = 0; i < rest.length - 1; i++) d = Math.min(d, P.segDist2(x + 0.5, y + 0.5, rest[i][0], rest[i][1], rest[i + 1][0], rest[i + 1][1]));
        reach = Math.max(reach, Math.sqrt(d) + 1.5);
      }
  }
  const R = P.strip(rest, reach), Q = P.strip(pose, reach);
  const X0 = Math.floor(Math.min(...Q.flat().map((p) => p[0]))), X1 = Math.ceil(Math.max(...Q.flat().map((p) => p[0])));
  const Y0 = Math.floor(Math.min(...Q.flat().map((p) => p[1]))), Y1 = Math.ceil(Math.max(...Q.flat().map((p) => p[1])));
  const BW = X1 - X0 + 1, done = new Uint8Array(BW * (Y1 - Y0 + 1));
  for (let i = 0; i < Q.length - 1; i++) {
    const a = Q[i][0], b = Q[i + 1][0], c = Q[i + 1][1], d = Q[i][1];
    const ra = R[i][0], rb = R[i + 1][0], rc = R[i + 1][1], rd = R[i][1];
    const qx0 = Math.floor(Math.min(a[0], b[0], c[0], d[0])), qx1 = Math.ceil(Math.max(a[0], b[0], c[0], d[0]));
    const qy0 = Math.floor(Math.min(a[1], b[1], c[1], d[1])), qy1 = Math.ceil(Math.max(a[1], b[1], c[1], d[1]));
    for (let Y = qy0; Y <= qy1; Y++)
      for (let X = qx0; X <= qx1; X++) {
        const di = (Y - Y0) * BW + X - X0;
        if (done[di]) continue;
        const uv = P.invBilinear(X + 0.5, Y + 0.5, a, b, c, d);
        if (!uv || uv[0] < -1e-6 || uv[0] > 1 + 1e-6 || uv[1] < -1e-6 || uv[1] > 1 + 1e-6) continue;
        const [u, v] = uv, iu = 1 - u, iv = 1 - v;
        const sx = Math.floor(ra[0] * iu * iv + rb[0] * u * iv + rc[0] * u * v + rd[0] * iu * v);
        const sy = Math.floor(ra[1] * iu * iv + rb[1] * u * iv + rc[1] * u * v + rd[1] * iu * v);
        if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
        const col = src.px[sy * src.w + sx];
        if (!(col >>> 24)) continue;
        done[di] = 1;
        buf.pset(X, Y, col);
      }
  }
};
P.wave = (pts, t, amp, len, opt = {}) => {
  const n = pts.length, s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = s[n - 1] || 1, from = opt.from ?? 0;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const k = P.clamp((s[i] / L - from) / (1 - from || 1)), off = amp * k * Math.sin(Math.PI * 2 * (s[i] / len - t));
    return [p[0] - (dy / l) * off, p[1] + (dx / l) * off];
  });
};

P.FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
  4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111",
  9: "111101111001110", "-": "000000111000000", ".": "000000000000010", ":": "000010000010000", "/": "001001010100100",
  "+": "000010111010000", "(": "010100100100010", ")": "010001001001010", "#": "101111101111101",
};
P.textWidth = (str, scale = 1) => Math.max(0, String(str).length * 4 - 1) * scale;
P.text = (buf, x, y, str, color, scale = 1) => {
  const c = P.col(color);
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    const g = P.FONT[ch];
    if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === "1") buf.rect(cx + i * scale, y + j * scale, cx + (i + 1) * scale, y + (j + 1) * scale, c);
    cx += 4 * scale;
  }
  return cx - x;
};

P.sheet = (items, opt = {}) => {
  const gap = opt.gap ?? 6, ls = opt.labelScale ?? 2, fit = opt.fit;
  const cells = items.map((it) => {
    const o = it instanceof Buf ? { buf: it } : it;
    let b = o.buf;
    if (fit && b.h > fit && !o.scale) b = P.resize(b, Math.max(1, Math.round((b.w * fit) / b.h)), fit, { alpha: 0.01 });
    const s = o.scale ?? opt.scale ?? (fit ? Math.max(1, Math.floor(fit / b.h)) : 1);
    return { b, s, label: o.label == null ? "" : String(o.label), w: b.w * s, h: b.h * s };
  });
  const cols = Math.max(1, Math.min(opt.cols ?? cells.length, cells.length)), rows = Math.ceil(cells.length / cols);
  const lh = cells.some((c) => c.label) ? 5 * ls + 4 : 0, cw = Array(cols).fill(0), rh = Array(rows).fill(0);
  cells.forEach((c, i) => {
    cw[i % cols] = Math.max(cw[i % cols], c.w, P.textWidth(c.label, ls));
    rh[(i / cols) | 0] = Math.max(rh[(i / cols) | 0], c.h);
  });
  const W = gap + cw.reduce((a, v) => a + v + gap, 0), H = gap + rh.reduce((a, v) => a + v + lh + gap, 0), out = new Buf(W, H);
  out.clear(opt.bg ?? [22, 22, 26]);
  const k1 = P.col(opt.check ? opt.check[0] : [44, 44, 50]), k2 = P.col(opt.check ? opt.check[1] : [36, 36, 42]), ink = opt.ink ?? [235, 235, 235];
  let y0 = gap;
  for (let r = 0; r < rows; r++) {
    let x0 = gap;
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c];
      if (cell) {
        if (cell.label) P.text(out, x0, y0, cell.label, ink, ls);
        const top = y0 + lh, { b, s } = cell;
        for (let j = 0; j < cell.h; j++)
          for (let i = 0; i < cell.w; i++) {
            const v = b.px[((j / s) | 0) * b.w + ((i / s) | 0)];
            out.px[(top + j) * W + x0 + i] = v >>> 24 ? v : ((i >> 3) ^ (j >> 3)) & 1 ? k1 : k2;
          }
      }
      x0 += cw[c] + gap;
    }
    y0 += rh[r] + lh + gap;
  }
  return out;
};

P.pack = (frames, opt = {}) => {
  const fw = frames[0].w, fh = frames[0].h, pad = opt.pad ?? 0;
  if (frames.some((f) => f.w !== fw || f.h !== fh)) throw new Error("all frames must be the same size");
  const cols = Math.max(1, Math.min(opt.cols ?? frames.length, frames.length)), rows = Math.ceil(frames.length / cols);
  const out = new Buf(cols * (fw + pad) - pad, rows * (fh + pad) - pad);
  frames.forEach((f, i) => {
    const x0 = (i % cols) * (fw + pad), y0 = ((i / cols) | 0) * (fh + pad);
    for (let j = 0; j < fh; j++) out.px.set(f.px.subarray(j * fw, (j + 1) * fw), (y0 + j) * out.w + x0);
  });
  out.frame = { w: fw, h: fh, cols, rows, count: frames.length, pad };
  return out;
};

P.ruler = (buf, scale = 4, opt = {}) => {
  const step = opt.step ?? 8, ink = opt.ink ?? [235, 235, 235], line = opt.line ?? [255, 90, 160];
  const ml = P.textWidth(String(Math.max(buf.w, buf.h))) + 4, mt = 9, W = buf.w * scale + ml + 1, H = buf.h * scale + mt + 1, out = new Buf(W, H);
  out.clear(opt.bg ?? [22, 22, 26]);
  const k1 = P.col([44, 44, 50]), k2 = P.col([36, 36, 42]);
  for (let j = 0; j < buf.h * scale; j++)
    for (let i = 0; i < buf.w * scale; i++) {
      const v = buf.px[((j / scale) | 0) * buf.w + ((i / scale) | 0)];
      out.px[(mt + j) * W + ml + i] = v >>> 24 ? v : ((i >> 3) ^ (j >> 3)) & 1 ? k1 : k2;
    }
  const tint = (x, y) => out.put(y * W + x, P.col(P.mix(P.unpack(out.px[y * W + x]), line, 0.55)));
  for (let gx = 0; gx <= buf.w; gx += step) {
    for (let y = mt - 2; y < H; y++) tint(ml + gx * scale, y);
    P.text(out, ml + gx * scale + 2, 1, gx, ink);
  }
  for (let gy = 0; gy <= buf.h; gy += step) {
    for (let x = ml - 2; x < W; x++) tint(x, mt + gy * scale);
    P.text(out, 1, mt + gy * scale + 2, gy, ink);
  }
  out.ox = -ml;
  out.oy = -mt;
  return out;
};

P.lzw = (idx, mcs) => {
  const out = [], clear = 1 << mcs, eoi = clear + 1;
  let cur = 0, bits = 0, size = mcs + 1, next = eoi + 1, dict = new Map();
  const emit = (c) => {
    cur |= c << bits;
    bits += size;
    while (bits >= 8) out.push(cur & 255), (cur >>>= 8), (bits -= 8);
  };
  emit(clear);
  let pre = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = pre * 256 + k, v = dict.get(key);
    if (v !== undefined) {
      pre = v;
      continue;
    }
    emit(pre);
    if (next === 4096) {
      emit(clear);
      dict = new Map();
      size = mcs + 1;
      next = eoi + 1;
    } else {
      if (next >= 1 << size) size++;
      dict.set(key, next++);
    }
    pre = k;
  }
  emit(pre);
  emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
};
P.gif = (frames, opt = {}) => {
  const s = opt.scale ?? 1, fr = s > 1 ? frames.map((f) => f.scaled(s)) : frames, W = fr[0].w, H = fr[0].h;
  if (fr.some((f) => f.w !== W || f.h !== H)) throw new Error("all frames must be the same size");
  let trans = false;
  const set = new Set();
  for (const f of fr) for (const c of f.px) if (!(c >>> 24)) trans = true; else if (set.size <= 256) set.add(c);
  const room = trans ? 255 : 256, base = trans ? 1 : 0;
  let pal;
  if (set.size <= room) pal = [...set].map(P.unpack);
  else {
    const step = Math.max(1, Math.floor(fr.length / 12)), pick = fr.filter((_, i) => i % step === 0), all = new Buf(W, H * pick.length);
    pick.forEach((f, i) => all.px.set(f.px, i * W * H));
    pal = P.quantize(all, room).palette;
  }
  const map = new Map(), look = (c) => {
    let k = map.get(c);
    if (k === undefined) map.set(c, (k = P.nearest(pal, P.unpack(c)) + base));
    return k;
  };
  const bits = Math.max(1, Math.ceil(Math.log2(pal.length + base))), mcs = Math.max(2, bits), out = [];
  const w16 = (v) => out.push(v & 255, (v >> 8) & 255), str = (t) => out.push(...[...t].map((ch) => ch.charCodeAt(0)));
  str("GIF89a");
  w16(W);
  w16(H);
  out.push(0xf0 | (bits - 1), 0, 0);
  for (let i = 0; i < 1 << bits; i++) {
    const c = i >= base ? pal[i - base] : null;
    out.push(c ? c[0] : 0, c ? c[1] : 0, c ? c[2] : 0);
  }
  out.push(0x21, 0xff, 0x0b);
  str("NETSCAPE2.0");
  out.push(3, 1);
  w16(opt.loop ?? 0);
  out.push(0);
  fr.forEach((f, n) => {
    const d = Array.isArray(opt.delay) ? opt.delay[n % opt.delay.length] : opt.delay ?? 80;
    out.push(0x21, 0xf9, 4, trans ? 9 : 0);
    w16(Math.max(2, Math.round(d / 10)));
    out.push(0, 0, 0x2c);
    w16(0);
    w16(0);
    w16(W);
    w16(H);
    out.push(0, mcs);
    const idx = new Uint8Array(W * H);
    for (let i = 0; i < idx.length; i++) idx[i] = f.px[i] >>> 24 ? look(f.px[i]) : 0;
    const data = P.lzw(idx, mcs);
    for (let i = 0; i < data.length; i += 255) {
      const part = data.slice(i, i + 255);
      out.push(part.length);
      for (const v of part) out.push(v);
    }
    out.push(0);
  });
  out.push(0x3b);
  return typeof Buffer !== "undefined" ? Buffer.from(out) : new Uint8Array(out);
};

P.blit = (buf, ctx, x = 0, y = 0) => ctx.putImageData(new ImageData(new Uint8ClampedArray(buf.px.buffer.slice(0)), buf.w, buf.h), x, y);

P.crc = (() => {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    T[n] = c >>> 0;
  }
  return (b) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

P.png = (buf) => {
  const zlib = require("zlib");
  const w = buf.w, h = buf.h, raw = Buffer.alloc((w * 4 + 1) * h), rgba = buf.rgba();
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4);
    crc.writeUInt32BE(P.crc(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

if (typeof module !== "undefined") module.exports = P;
else globalThis.P = P;
