/* Immersive nitrogen ecosystem — nitrogen in motion.
   Every moving particle is emitted by a real transfer in the model; resident ions
   show the size of each soil pool. Conversions happen where the microbes live. */
(function (root) {
  'use strict';
  const P = root.EcosystemScene.prototype;
  const { TAU, clamp, lerp, seeded, rgba } = root.EcosystemScene.util;
  const { COLORS, FORMULAS } = root.NitrogenContent;

  const EMIT = 8, MAX_PARTICLES = 240, SPEED = 95;
  const TYPICAL = { fixation: .4, decomposition: .6, nitri1: 1.2, nitri2: 1.2, uptake: .7, feeding: .25, litter: .3, denitrification: .5, leaching: .8, lightning: 2.3, fertilizer: 1, leaves: 1 };
  const LIVE_ROUTES = new Set(['uptake', 'feeding', 'litter']);

  /* ---------- state ---------- */
  P.reset = function () {
    this.particles = []; this.carry = {}; this.effects = []; this.fallingLeaves = []; this.bolt = null;
    this.flash = 0; this.shake = 0; this.storm = this.model.rain > 0 ? 1 : 0; this.plantGlow = 0; this.vascular = 0;
    this.smoothRates = {}; this.ions = null; this.inputPulse = null;
    this.detritusSites = { plant: this.model.n.organic * .5, animal: this.model.n.organic * .5 };
  };
  P.activity = function (process) { return this.smoothRates[process] || 0; };

  /* ---------- paths ---------- */
  function catmull(p0, p1, p2, p3, u) {
    const u2 = u * u, u3 = u2 * u;
    return [.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
      .5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)];
  }
  function buildPath(wps, seg = 10) {
    const samples = [], n = wps.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = wps[Math.max(i - 1, 0)], p1 = wps[i], p2 = wps[i + 1], p3 = wps[Math.min(i + 2, n - 1)];
      for (let j = 0; j < seg; j++) samples.push(catmull(p0, p1, p2, p3, j / seg));
    }
    samples.push(wps[n - 1].slice());
    const cum = [0];
    for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
    const total = Math.max(1, cum[cum.length - 1]);
    return { samples, cum, total, wpT: wps.map((_, i) => cum[Math.min(i * seg, cum.length - 1)] / total) };
  }
  function pointAt(path, t) {
    const d = clamp(t, 0, 1) * path.total, cum = path.cum;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid; else hi = mid; }
    const span = cum[hi] - cum[lo] || 1, u = (d - cum[lo]) / span, a = path.samples[lo], b = path.samples[hi];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }
  P.pointAt = pointAt;
  P.buildPath = buildPath;

  // Waypoints for one transfer. `stations` mark where the compound changes.
  P.waypoints = function (f) {
    const L = this.L, W = this.W, rand = seeded((f.seed || 1) * 7919 + 13), j = (p, r) => [p[0] + (rand() - .5) * r, p[1] + (rand() - .5) * r * .7];
    const am = this.point('ammonium'), ni = this.point('nitrite'), na = this.point('nitrate'), M = id => this.microbeLocation(id);
    const sky = (x) => [x, L.G * (.22 + rand() * .3)];
    const leaf = () => { const lf = this.plantGeo.leaves[f.guide ? 5 : 2 + Math.floor(rand() * 7)], q = lf.q; return this.plantToWorld([q * 30 * lf.side + lf.side * 40, -262 * q - 10]); };
    switch (f.process) {
      case 'fixation': {
        const r = f.guide ? 0 : rand();
        if (r < .12) { const s = M('nostoc'); return { wp: [sky(s[0] + 60 + rand() * 80), [s[0] + 30, L.G - 50], s, [s[0] + 50, L.G + 40], j(am, 50)], stations: [[2, 'NH₄⁺']], start: 'N₂', via: 'nostoc' }; }
        if (r < .3) { const s = M('soilFixers'); return { wp: [sky(s[0] + 40 + rand() * 120), [s[0] + 50, L.G - 30], [s[0] + 30, L.G + 30], s, j(am, 50)], stations: [[3, 'NH₄⁺']], start: 'N₂', via: 'soilFixers' }; }
        const nods = this.nodulePoints(), nd = f.guide ? this.noduleCenter() : nods[Math.floor(rand() * nods.length)];
        return { wp: [f.guide ? this.point('air') : sky(L.plantX + 60 + rand() * 200), [L.plantX + 120, L.G - 70], [L.plantX + 50, L.G + 20], nd, j([lerp(nd[0], am[0], .5), lerp(nd[1], am[1], .4) + 20], 20), j(am, 40)], stations: [[3, 'NH₄⁺']], start: 'N₂', via: 'rhizobium' };
      }
      case 'nitri1': { const s = M('nitrosomonas'); return { wp: [j(am, 60), j(s, 14), j(ni, 30)], stations: [[1, 'NO₂⁻']], start: 'NH₄⁺' }; }
      case 'nitri2': { const s = M('nitrobacter'); return { wp: [j(ni, 30), j(s, 14), j(na, 50)], stations: [[1, 'NO₃⁻']], start: 'NO₂⁻' }; }
      case 'uptake': {
        const tips = this.rootGeo.hairs, tip = this.rootToWorld(tips[f.guide ? 4 : Math.floor(rand() * tips.length)]);
        const base = this.rootToWorld([0, 18]);
        return { wp: [j(na, 70), tip, [lerp(tip[0], base[0], .6), lerp(tip[1], base[1], .6)], base, this.stemWorld(.08), this.stemWorld(.35), this.stemWorld(.62), leaf()], stations: [[7, 'Protein N']], start: 'NO₃⁻', inside: 3 };
      }
      case 'feeding': { const s = leaf(), m = this.cowPoint('mouth'); return { wp: [s, [lerp(s[0], m[0], .5), Math.min(s[1], m[1]) - 50 - rand() * 30], m], stations: [], start: 'Protein N' }; }
      case 'litter': {
        if (f.from === 'animal') { const r0 = this.cowPoint('rear'), d = this.point('animal-detritus'); return { wp: [r0, [r0[0] + 10, lerp(r0[1], d[1], .5)], j(d, 16)], stations: [[2, 'Organic N']], start: 'Protein N' }; }
        const s = leaf(), d = this.point('plant-detritus');
        return { wp: [s, [lerp(s[0], d[0], .4) + 20, lerp(s[1], d[1], .4)], [lerp(s[0], d[0], .75) - 10, lerp(s[1], d[1], .8)], j(d, 24)], stations: [[3, 'Organic N']], start: 'Protein N' };
      }
      case 'decomposition': {
        const site = f.from === 'animal-detritus' ? this.point('animal-detritus') : this.point('plant-detritus');
        const col = f.from === 'animal-detritus' ? M('decomposers') : L.leafColony;
        return { wp: [j(site, 18), j(col, 16), j([lerp(col[0], am[0], .5), lerp(col[1], am[1], .5) + 25], 30), j(am, 50)], stations: [[1, 'NH₄⁺']], start: 'Organic N' };
      }
      case 'denitrification': {
        const s = M('denitrifiers'), x = s[0] + (rand() - .5) * 40;
        return { wp: [j(na, 60), j(s, 12), [x, lerp(s[1], this.surface(x), .5)], [x + 4, this.surface(x) - 4], [x + 20, L.G * .7], [x + 40 + rand() * 40, L.G * .35]], stations: [[1, 'N₂']], start: 'NO₃⁻', bubble: [1, 3] };
      }
      case 'leaching': {
        const x = na[0] + (rand() - .5) * 140, wt = this.waterTable(x), deep = wt + 18 + rand() * Math.max(20, Math.min(this.H - wt - 30, 160));
        return { wp: [j(na, 40), [x, lerp(na[1], wt, .6)], [x + 10, wt + 8], [x + 50, deep], [x + 120 + rand() * 120, deep + (rand() - .5) * 20]], stations: [], start: 'NO₃⁻' };
      }
      case 'lightning': {
        const pts = this.bolt ? this.bolt.main : null, p = pts ? pts[Math.floor((.15 + rand() * .55) * (pts.length - 1))] : [W * .17 + (rand() - .5) * 30, L.G * (.2 + rand() * .4)];
        const gx = p[0] + 20 + rand() * 60;
        return { wp: [p, [p[0] + 10, p[1] + 20], [gx, this.surface(gx) - 2], [gx + 20, L.G + 40], j(na, 60)], stations: [[1, 'NO₃⁻']], start: 'N₂', rain: 2 };
      }
      case 'fertilizer': {
        const x = W * (.36 + rand() * .26), dest = f.to === 'nitrate' ? na : am;
        return { wp: [[x - 30, L.G - 220 - rand() * 60], [x - 8, L.G - 90], [x, this.surface(x) - 1], [lerp(x, dest[0], .5), lerp(L.G, dest[1], .5)], j(dest, 50)], stations: [[2, f.to === 'nitrate' ? 'NO₃⁻' : 'NH₄⁺']], start: 'Pellet' };
      }
      case 'leaves': { const d = this.point('plant-detritus'); return { wp: [[d[0] + 40 + (rand() - .5) * 80, L.G - 250], [d[0] - 20 + rand() * 40, L.G - 130], [d[0] + 20, L.G - 50], j(d, 20)], stations: [], start: 'Organic N' }; }
      default: return { wp: [this.point(f.from), this.point(f.to)], stations: [], start: f.compound || 'Organic N' };
    }
  };
  P.route = function (f) {
    const w = this.waypoints(f), path = buildPath(w.wp);
    path.stages = [{ t: 0, c: w.start }].concat(w.stations.map(([i, c]) => ({ t: path.wpT[i], c, burst: true })));
    path.via = w.via; path.inside = w.inside !== undefined ? [path.wpT[w.inside], path.wpT[w.wp.length - 1]] : null;
    path.bubble = w.bubble ? [path.wpT[w.bubble[0]], path.wpT[w.bubble[1]]] : null;
    path.rain = w.rain !== undefined ? path.wpT[w.rain] : null;
    path.pellet = f.process === 'fertilizer' ? path.wpT[2] : null;
    path.layout = this.layoutVersion;
    return path;
  };

  /* ---------- ingesting model transfers ---------- */
  P.ingest = function (flows) {
    if (!this.detritusSites) this.detritusSites = { plant: this.model.n.organic * .5, animal: this.model.n.organic * .5 };
    const visual = [];
    for (const f of flows) {
      if (f.from === 'organic' && f.process === 'decomposition') {
        const total = this.detritusSites.plant + this.detritusSites.animal, part = total > 0 ? this.detritusSites.plant / total : .5;
        for (const [site, amount] of [['plant', f.amount * part], ['animal', f.amount * (1 - part)]]) {
          this.detritusSites[site] = Math.max(0, this.detritusSites[site] - amount);
          if (amount > 0) visual.push({ ...f, from: site + '-detritus', amount });
        }
      } else {
        if (f.to === 'organic') this.detritusSites[f.from === 'animal' ? 'animal' : 'plant'] += f.amount;
        visual.push(f);
      }
    }
    for (const f of visual) {
      const key = f.process + f.from + f.to;
      this.carry[key] = (this.carry[key] || 0) + f.amount * EMIT * (this.formulaParticles ? .6 : 1); // words need more room than dots
      let count = Math.floor(this.carry[key]); this.carry[key] -= count;
      count = Math.min(count, f.process === 'fertilizer' ? 26 : 16);
      for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
        const seed = Math.floor(Math.random() * 1e6) + 1, recipe = { process: f.process, from: f.from, to: f.to === 'organic' ? (f.from === 'animal' ? 'animal-detritus' : 'plant-detritus') : f.to, compound: f.compound, seed };
        const route = this.route(recipe), dur = clamp(route.total / SPEED, 1.8, f.process === 'leaching' ? 7 : 5.5);
        this.particles.push({ recipe, route, dur, progress: -i * (f.process === 'fertilizer' ? .035 : .09) - Math.random() * .05, stage: 0 });
        if (f.process === 'litter' && f.from === 'plant' && Math.random() < .35) this.dropLeaf(false);
      }
    }
  };

  /* ---------- actions ---------- */
  P.lightning = function () {
    const W = this.W, L = this.L, rand = seeded(Math.floor(Math.random() * 1e6));
    const x0 = W * (.15 + rand() * .06), y0 = L.G * .16, x1 = x0 + (rand() - .5) * 60, y1 = this.surface(x1);
    const jag = (a, b, depth, disp) => { if (depth === 0) return [a, b]; const m = [(a[0] + b[0]) / 2 + (rand() - .5) * disp, (a[1] + b[1]) / 2 + (rand() - .5) * disp * .3]; return jag(a, m, depth - 1, disp / 2).concat(jag(m, b, depth - 1, disp / 2).slice(1)); };
    const main = jag([x0, y0], [x1, y1], 6, 90), branches = [];
    for (let i = 0; i < 4; i++) { const s = main[6 + Math.floor(rand() * 30)], e = [s[0] + (rand() - .4) * 120, s[1] + 40 + rand() * 80]; branches.push(jag(s, e, 4, 40)); }
    this.bolt = { main, branches, t: 0, life: 1.1 };
    this.flash = 1; this.shake = this.reduced ? 0 : .35; this.stormKick = 1.2;
    this.effects.push({ type: 'nox', x: x0, y: (y0 + y1) / 2, t: 0, dur: 3.5 });
  };
  P.leaves = function () { for (let i = 0; i < 12; i++) this.dropLeaf(true); };
  P.dropLeaf = function (added) {
    const L = this.L, d = this.point('plant-detritus');
    const start = added ? [d[0] + (Math.random() - .5) * 140, L.G - 260 - Math.random() * 80] : this.plantToWorld([(Math.random() - .5) * 100, -60 - Math.random() * 150]);
    this.fallingLeaves.push({ x: start[0], y: start[1], tx: d[0] + (Math.random() - .5) * 50, rot: Math.random() * TAU, phase: Math.random() * TAU, age: 0, landed: false, fade: 1, color: added ? ['#c58a3c', '#d9a443', '#a8622f'][Math.floor(Math.random() * 3)] : '#b8b34a' });
    if (this.fallingLeaves.length > 40) this.fallingLeaves.shift();
  };
  P.fertilizerPulse = function (amount) {
    this.inputPulse = { amount, remaining: 4 };
    const L = this.L; this.fitView([[this.W * .34, L.G - 140], [this.W * .66, L.G - 140], this.point('ammonium'), this.point('nitrate')], 1.9);
  };
  P.growPulse = function () { this.plantGlow = 1; for (let i = 0; i < 26; i++) this.effects.push({ type: 'spark', x: this.L.plantX + (Math.random() - .5) * 160, y: this.L.G - Math.random() * 240, t: -Math.random() * .8, dur: 1.6, color: '#c9ff8a' }); };

  /* ---------- resident ions (pool sizes) ---------- */
  P.ionZone = function (key, rand) {
    const L = this.L, W = this.W;
    if (key === 'air') return [rand() * W, 30 + rand() * (L.G - 110)];
    if (key === 'leached') { const x = rand() * W; const wt = this.waterTable(x); return [x, wt + 10 + rand() * Math.max(10, Math.min(this.H - wt - 20, 220))]; }
    const c = key === 'ammonium' ? this.point('ammonium') : key === 'nitrite' ? this.point('nitrite') : [this.point('nitrate')[0] - W * .03, L.G + L.P * .45];
    const rx = key === 'ammonium' ? W * .15 : key === 'nitrite' ? W * .05 : W * .25, ry = key === 'ammonium' ? L.P * .2 : key === 'nitrite' ? L.P * .09 : L.P * .3;
    const a = rand() * TAU, r = Math.sqrt(rand());
    return [c[0] + Math.cos(a) * rx * r, Math.max(L.G + 10, c[1] + Math.sin(a) * ry * r)];
  };
  P.updateIons = function (dt, playing) {
    const n = this.model.n;
    const targets = { air: 34, ammonium: Math.min(120, Math.round(n.ammonium * 1.5)), nitrite: Math.min(40, Math.round(n.nitrite * 3)), nitrate: Math.min(140, Math.round(n.nitrate * 1.4)), leached: Math.min(110, Math.round(n.leached * 1.6)) };
    if (!this.ions || this.ions.version !== this.layoutVersion) {
      const rand = seeded(this.layoutVersion * 31 + 5);
      this.ions = { version: this.layoutVersion, pools: {} };
      for (const key of Object.keys(targets)) this.ions.pools[key] = Array.from({ length: targets[key] }, () => { const p = this.ionZone(key, rand); return { x: p[0], y: p[1], vx: 0, vy: 0, a: 1, dying: false, ph: rand() * TAU }; });
    }
    for (const key of Object.keys(targets)) {
      const list = this.ions.pools[key], alive = list.filter(i => !i.dying).length;
      if (alive < targets[key] && playing) for (let k = 0; k < Math.min(3, targets[key] - alive); k++) { const p = this.ionZone(key, Math.random); list.push({ x: p[0], y: p[1], vx: 0, vy: 0, a: 0, dying: false, ph: Math.random() * TAU }); }
      if (alive > targets[key] && playing) { let extra = Math.min(3, alive - targets[key]); for (const ion of list) { if (extra <= 0) break; if (!ion.dying) { ion.dying = true; extra--; } } }
      if (!playing) continue;
      const step = dt * this.speed;
      for (const ion of list) {
        ion.a = clamp(ion.a + (ion.dying ? -step * 1.5 : step * 1.2), 0, 1);
        ion.vx += (Math.random() - .5) * 18 * step; ion.vy += (Math.random() - .5) * 18 * step;
        ion.vx *= .94; ion.vy *= .94;
        if (key === 'leached') ion.vx += 2.2 * step;
        if (key === 'air') ion.vx += 1.2 * step;
        ion.x += ion.vx * step; ion.y += ion.vy * step;
        if (key === 'leached') { if (ion.x > this.W + 4) { ion.x = -4; } const wt = this.waterTable(ion.x); if (ion.y < wt + 6) ion.vy += 6 * step; if (ion.y > this.H - 6) ion.vy -= 6 * step; }
        else if (key === 'air') { if (ion.x > this.W + 5) ion.x = -5; if (ion.y > this.L.G - 70) ion.vy -= 4 * step; if (ion.y < 20) ion.vy += 4 * step; }
        else { const s = this.surface(ion.x); if (ion.y < s + 8) ion.vy += 10 * step; const wt = this.waterTable(ion.x); if (key !== 'nitrate' && ion.y > wt) ion.vy -= 6 * step; }
      }
      this.ions.pools[key] = list.filter(i => !(i.dying && i.a <= 0));
    }
  };

  /* ---------- sprites ---------- */
  P.glowSprite = function (color) {
    this.sprites = this.sprites || new Map();
    const key = 'g' + color; if (this.sprites.has(key)) return this.sprites.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, rgba(color, .9)); g.addColorStop(.18, rgba(color, .75)); g.addColorStop(.28, rgba(color, .32)); g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(14,22,20,.55)'; x.beginPath(); x.arc(32, 32, 7.5, 0, TAU); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc(32, 32, 6, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(30, 30, 2, 0, TAU); x.fill();
    this.sprites.set(key, c); return c;
  };
  // Ball-and-stick molecules for the close-up "particle view".
  P.moleculeSprite = function (compound) {
    this.sprites = this.sprites || new Map();
    const key = 'm' + compound; if (this.sprites.has(key)) return this.sprites.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), halo = COLORS[compound] || COLORS['Organic N'];
    const g = x.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, rgba(halo, .55)); g.addColorStop(1, rgba(halo, 0)); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const atom = (ax, ay, r, col) => { const ag = x.createRadialGradient(ax - r * .35, ay - r * .4, r * .1, ax, ay, r); ag.addColorStop(0, '#ffffff'); ag.addColorStop(.35, col); ag.addColorStop(1, '#10141a'); x.fillStyle = ag; x.beginPath(); x.arc(ax, ay, r, 0, TAU); x.fill(); };
    const bond = (a, b, n = 1) => { x.strokeStyle = '#d6dbe2'; x.lineWidth = n > 1 ? 2.2 : 4; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ox = -dy / l, oy = dx / l; for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 5; x.beginPath(); x.moveTo(a[0] + ox * o, a[1] + oy * o); x.lineTo(b[0] + ox * o, b[1] + oy * o); x.stroke(); } };
    const N = '#3f6cf2', O = '#f0453d', H = '#eef1f5', C = '#5c6370';
    const charge = s => { x.fillStyle = '#fff'; x.font = 'bold 20px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText(s, 106, 30); };
    if (compound === 'N₂') { bond([48, 64], [80, 64], 3); atom(46, 64, 15, N); atom(82, 64, 15, N); }
    else if (compound === 'NH₄⁺') { const hs = [[64, 30], [96, 78], [34, 80], [70, 84]]; hs.slice(0, 3).forEach(h => bond([64, 64], h)); atom(64, 64, 16, N); hs.slice(0, 3).forEach(h => atom(h[0], h[1], 9, H)); atom(76, 52, 7, H); charge('+'); }
    else if (compound === 'NO₂⁻') { bond([64, 58], [36, 80], 2); bond([64, 58], [92, 80]); atom(64, 58, 15, N); atom(34, 82, 14, O); atom(94, 82, 14, O); charge('−'); }
    else if (compound === 'NO₃⁻') { bond([64, 66], [64, 30], 2); bond([64, 66], [32, 86]); bond([64, 66], [96, 86]); atom(64, 66, 15, N); atom(64, 28, 13, O); atom(30, 88, 13, O); atom(98, 88, 13, O); charge('−'); }
    else if (compound === 'Pellet') { const pg = x.createRadialGradient(56, 56, 4, 64, 64, 24); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#bdb6a2'); x.fillStyle = pg; x.beginPath(); x.arc(64, 64, 22, 0, TAU); x.fill(); }
    else { const pts = [[26, 74], [46, 56], [66, 74], [86, 56], [104, 74]]; for (let i = 0; i < 4; i++) bond(pts[i], pts[i + 1]); bond([86, 56], [86, 30], 2); pts.forEach((p, i) => atom(p[0], p[1], i === 0 || i === 3 ? 12 : 11, i === 0 ? N : C)); atom(86, 28, 11, O); atom(14, 84, 6, H); }
    this.sprites.set(key, c); return c;
  };

  // Formula text sprites ("NH₄⁺", "NO₃⁻", …) used when particles show formulas.
  P.textSprite = function (text, color) {
    this.sprites = this.sprites || new Map();
    const key = 't' + text + color; if (this.sprites.has(key)) return this.sprites.get(key);
    const fs = 44, font = '800 ' + fs + "px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif", c = document.createElement('canvas');
    let x = c.getContext('2d'); x.font = font;
    const w = Math.ceil(Math.max(fs, (x.measureText(text).width || text.length * fs * .6)) + 28), h = Math.ceil(fs * 1.45 + 16);
    c.width = w; c.height = h; x = c.getContext('2d');
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.shadowColor = color; x.shadowBlur = 16; x.lineWidth = 10; x.strokeStyle = 'rgba(6,14,12,.88)'; x.strokeText(text, w / 2, h / 2 + 2);
    x.shadowBlur = 0; x.fillStyle = color; x.fillText(text, w / 2, h / 2 + 2);
    const sprite = { img: c, w, h, fs }; this.sprites.set(key, sprite); return sprite;
  };
  P.drawFormula = function (ctx, compound, color, x, y, fontPx) {
    const text = FORMULAS[compound] || compound, spr = this.textSprite(text, color), px = this.s * this.camera.zoom;
    const h = fontPx * spr.h / spr.fs / px, w = h * spr.w / spr.h;
    ctx.drawImage(spr.img, x - w / 2, y - h / 2, w, h);
  };

  /* ---------- drawing particles and effects ---------- */
  P.stageOf = function (route, t) { let s = route.stages[0]; for (const st of route.stages) if (t >= st.t) s = st; return s; };
  P.particleColor = function (compound) { return COLORS[compound] || COLORS['Organic N']; };
  P.drawParticle = function (ctx, p, bright) {
    const t = clamp(p.progress, 0, 1), route = p.route, pos = pointAt(route, t), stage = this.stageOf(route, t), c = stage.c, color = this.particleColor(c);
    const px = this.s * this.camera.zoom, molecule = px > 1.75, r = Math.max(3.2, 2.7 / px);
    const fadeIn = clamp(t / .05, 0, 1), fadeOut = clamp((1 - t) / .08, 0, 1);
    ctx.globalAlpha = Math.min(fadeIn, fadeOut) * (bright ? 1 : .95);
    const bubble = route.bubble && t > route.bubble[0] && t < route.bubble[1];
    if (bubble && this.formulaParticles) { this.drawFormula(ctx, 'N₂', color, pos[0], pos[1], 12); ctx.globalAlpha = 1; return; }
    if (bubble) { // N₂ gas bubble rising through wet soil
      const br = r * 1.7 + Math.sin(t * 40 + p.recipe.seed) * .4;
      ctx.strokeStyle = rgba(color, .9); ctx.lineWidth = Math.max(.7, 1 / px); ctx.fillStyle = rgba(color, .18);
      ctx.beginPath(); ctx.arc(pos[0], pos[1], br, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(pos[0] - br * .35, pos[1] - br * .35, br * .25, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; return;
    }
    // short tapered trail
    ctx.lineCap = 'round'; ctx.strokeStyle = rgba(color, this.formulaParticles ? .3 : .5);
    let prev = pos;
    for (let i = 1; i <= 4; i++) { const q = pointAt(route, Math.max(0, t - i * .012)); ctx.lineWidth = r * (1.3 - i * .25); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); prev = q; }
    if (route.rain !== null && t > route.stages[1].t && t < route.rain) { ctx.strokeStyle = 'rgba(220,240,255,.6)'; ctx.lineWidth = r * .5; ctx.beginPath(); ctx.moveTo(pos[0], pos[1] - r * 3); ctx.lineTo(pos[0], pos[1] - r * 7); ctx.stroke(); }
    if (this.formulaParticles && c !== 'Pellet') this.drawFormula(ctx, c, color, pos[0], pos[1], clamp((this.width < 700 ? 11 : 14) * Math.pow(this.camera.zoom, .35), 11, 20));
    else if (molecule || c === 'Pellet') { const size = c === 'Pellet' && !molecule ? r * 3.2 : Math.max(14 / px, 9); ctx.drawImage(this.moleculeSprite(c), pos[0] - size, pos[1] - size, size * 2, size * 2); }
    else { const size = r * 4.2; ctx.drawImage(this.glowSprite(color), pos[0] - size, pos[1] - size, size * 2, size * 2); }
    ctx.globalAlpha = 1;
  };

  P.drawIons = function (ctx, keys) {
    if (!this.ions) return;
    const px = this.s * this.camera.zoom, r = Math.max(2.1, 1.8 / px), molecule = px > 2.4;
    for (const key of keys) {
      const list = this.ions.pools[key], compound = key === 'air' ? 'N₂' : key === 'ammonium' ? 'NH₄⁺' : key === 'nitrite' ? 'NO₂⁻' : 'NO₃⁻';
      const color = COLORS[compound], sprite = molecule ? this.moleculeSprite(compound) : this.glowSprite(color);
      const base = (key === 'air' ? .4 : key === 'leached' ? .55 : .62) * (this.journey ? .45 : 1);
      const every = this.formulaParticles ? (key === 'air' ? 2 : 3) : 1; // fewer words, same proportions
      for (let i = 0; i < list.length; i += every) {
        const ion = list[i];
        ctx.globalAlpha = ion.a * base;
        if (this.formulaParticles) this.drawFormula(ctx, compound, color, ion.x, ion.y, key === 'air' ? 10.5 : (this.width < 700 ? 9.5 : 10.5) * Math.min(1.5, Math.pow(this.camera.zoom, .3)));
        else if (molecule) { const s = Math.max(10 / px, 6); ctx.drawImage(sprite, ion.x - s, ion.y - s, s * 2, s * 2); }
        else if (key === 'air') { const s = r * 3; ctx.drawImage(sprite, ion.x - s - r * .8, ion.y - s, s * 2, s * 2); ctx.drawImage(sprite, ion.x - s + r * .8, ion.y - s, s * 2, s * 2); }
        else { const s = r * 3.2; ctx.drawImage(sprite, ion.x - s, ion.y - s, s * 2, s * 2); }
      }
    }
    ctx.globalAlpha = 1;
  };

  P.drawEffects = function (ctx, t, onlyBright) {
    const px = this.s * this.camera.zoom;
    for (const e of this.effects) {
      if (e.t < 0 || (onlyBright && !e.bright)) continue;
      const u = clamp(e.t / e.dur, 0, 1);
      if (e.type === 'burst') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const rr = (3 + u * 11) * Math.max(1, 1 / px);
        ctx.strokeStyle = rgba(e.color, (1 - u) * .75); ctx.lineWidth = Math.max(.8, 1.2 / px) * (1 - u * .5);
        ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, TAU); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + e.seed; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * rr * .5, e.y + Math.sin(a) * rr * .5); ctx.lineTo(e.x + Math.cos(a) * rr * 1.25, e.y + Math.sin(a) * rr * 1.25); ctx.stroke(); }
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr * 1.2); g.addColorStop(0, rgba(e.color, (1 - u) * .4)); g.addColorStop(1, rgba(e.color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, rr * 1.2, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (e.type === 'ripple') { // arrival rings spreading from the station
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const lag of [0, .22, .44]) { const v = clamp((u - lag) / (1 - lag), 0, 1); if (v <= 0) continue; ctx.strokeStyle = rgba(e.color, (1 - v) * .7); ctx.lineWidth = Math.max(1, 2 / px) * (1 - v * .6); ctx.beginPath(); ctx.ellipse(e.x, e.y, (8 + v * 46) / px * 1.4, (8 + v * 46) / px, 0, 0, TAU); ctx.stroke(); }
        ctx.restore();
      } else if (e.type === 'spark') {
        ctx.fillStyle = rgba(e.color, Math.sin(u * Math.PI) * .9); ctx.beginPath(); ctx.arc(e.x + Math.sin(u * 6 + e.x) * 4, e.y - u * 40, 1.6 + (1 - u), 0, TAU); ctx.fill();
      } else if (e.type === 'nox') { // brownish nitrogen oxides around the bolt
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 90 + u * 60); g.addColorStop(0, rgba('#d98a4a', .32 * (1 - u))); g.addColorStop(1, rgba('#d98a4a', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, 90 + u * 60, 150 + u * 60, 0, 0, TAU); ctx.fill();
      }
    }
  };

  P.drawFallingLeaves = function (ctx) {
    for (const l of this.fallingLeaves) { ctx.globalAlpha = l.fade; this.smallLeaf(ctx, l.x, l.y, 7, l.rot, l.color); }
    ctx.globalAlpha = 1;
  };

  P.drawBolt = function (ctx) {
    const b = this.bolt; if (!b) return;
    const u = b.t / b.life, flick = this.reduced ? 1 - u : (u < .5 ? (Math.sin(b.t * 60) > -.3 ? 1 : .35) : 1 - (u - .5) * 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    for (const [w, a] of [[16, .12], [7, .3], [2.6, .95]]) { ctx.strokeStyle = rgba(w < 3 ? '#ffffff' : '#bcd4ff', a * flick); ctx.lineWidth = w; path(b.main); ctx.lineWidth = w * .5; b.branches.forEach(path); }
    const end = b.main[b.main.length - 1], g = ctx.createRadialGradient(end[0], end[1], 0, end[0], end[1], 60);
    g.addColorStop(0, rgba('#fff3c4', .8 * flick)); g.addColorStop(1, rgba('#fff3c4', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(end[0], end[1], 60, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* ---------- focus spotlight ---------- */
  P.relatedThings = function (id) {
    return ({ fixation: ['air', 'nodule', 'ammonium'], nitrification: ['ammonium', 'nitrite', 'nitrate'], nitri1: ['ammonium', 'nitrite'], nitri2: ['nitrite', 'nitrate'], uptake: ['nitrate', 'plant'], feeding: ['plant', 'cow'], litter: ['plant', 'cow', 'leafLitter', 'dung'], decomposition: ['leafLitter', 'dung', 'ammonium'], denitrification: ['nitrate', 'air'], leaching: ['nitrate', 'water'], lightning: ['air', 'nitrate'], fertilizer: ['ammonium', 'nitrate'], leaves: ['leafLitter'] })[id] || [];
  };
  P.revealCircles = function (id) {
    const L = this.L, M = k => this.microbeLocation(k), pt = k => this.point(k), c = (p, r) => [p[0], p[1], r];
    const plant = c(this.plantPoint('canopy'), 150), roots = c([L.plantX, L.G + 80], 140), cow = c(this.cowPoint('center'), 170);
    switch (id) {
      case 'fixation': return [c(M('rhizobium'), 90), c(M('soilFixers'), 55), c(M('nostoc'), 55), c(pt('ammonium'), 70), roots];
      case 'nitrification': return [c(pt('ammonium'), 60), c(M('nitrosomonas'), 50), c(pt('nitrite'), 50), c(M('nitrobacter'), 50), c(pt('nitrate'), 60)];
      case 'nitri1': return [c(pt('ammonium'), 60), c(M('nitrosomonas'), 55), c(pt('nitrite'), 50)];
      case 'nitri2': return [c(pt('nitrite'), 50), c(M('nitrobacter'), 55), c(pt('nitrate'), 60)];
      case 'uptake': return [c(pt('nitrate'), 70), roots, plant];
      case 'feeding': return [plant, cow];
      case 'litter': return [plant, cow, c(pt('plant-detritus'), 70), c(pt('animal-detritus'), 70)];
      case 'decomposition': return [c(pt('plant-detritus'), 80), c(pt('animal-detritus'), 80), c(L.leafColony, 55), c(M('decomposers'), 55), c(pt('ammonium'), 70)];
      case 'denitrification': return [c(pt('nitrate'), 60), c(M('denitrifiers'), 70), c([M('denitrifiers')[0], L.G - 60], 90)];
      case 'leaching': return [c(pt('nitrate'), 60), c([this.W * .68, this.waterTable(this.W * .68) + 60], 190)];
      case 'lightning': return [c([this.bolt ? this.bolt.main[0][0] : this.W * .18, L.G * .5], 170), c(pt('nitrate'), 70)];
      case 'fertilizer': return [c([this.W * .47, L.G - 60], 150), c(pt('ammonium'), 70), c(pt('nitrate'), 70)];
      case 'leaves': return [c(pt('plant-detritus'), 90)];
      default: return [];
    }
  };
  P.processMatch = function (process) {
    const s = this.selected; if (!s) return false;
    return s === process || (s === 'nitrification' && (process === 'nitri1' || process === 'nitri2')) || (s === 'leaves' && process === 'leaves');
  };
  P.drawSpotlight = function (ctx, worldTransform, t) {
    if (this.focusFade <= .01) return;
    // The dimming mask is drawn at half resolution with a reusable soft "hole"
    // sprite: the edges are soft anyway, and this keeps phones smooth.
    const c = this.canvas, mw = Math.ceil(c.width / 2), mh = Math.ceil(c.height / 2);
    if (!this.mask || this.mask.width !== mw || this.mask.height !== mh) { this.mask = document.createElement('canvas'); this.mask.width = mw; this.mask.height = mh; }
    if (!this.holeSprite) {
      const h = document.createElement('canvas'); h.width = h.height = 128; const hx = h.getContext('2d');
      const g = hx.createRadialGradient(64, 64, 22, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      hx.fillStyle = g; hx.fillRect(0, 0, 128, 128); this.holeSprite = h;
    }
    const m = this.mask.getContext('2d');
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, mw, mh);
    m.fillStyle = 'rgba(3,10,9,.66)'; m.fillRect(0, 0, mw, mh);
    const [a, , , d, e, f] = worldTransform; m.setTransform(a / 2, 0, 0, d / 2, e / 2, f / 2); m.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => m.drawImage(this.holeSprite, x - r, y - r, r * 2, r * 2);
    const circles = this.journey ? this.journey.reveal : this.revealCircles(this.selected);
    const routes = this.journey ? (this.journey.route ? [{ route: this.journey.route }] : []) : (this.focusCache || []);
    for (const [x, y, r] of circles) hole(x, y, r);
    for (const fr of routes) { const pts = fr.route.samples; for (let i = 0; i < pts.length; i += 5) hole(pts[i][0], pts[i][1], 44); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = this.focusFade; ctx.drawImage(this.mask, 0, 0, c.width, c.height); ctx.restore();
    void t;
  };
  P.drawGuides = function (ctx, t) {
    const px = this.s * this.camera.zoom;
    for (const f of this.focusCache || []) {
      const path = f.route, color = this.particleColor(path.stages[path.stages.length - 1].c);
      ctx.save(); ctx.globalAlpha = this.focusFade; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); path.samples.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.strokeStyle = rgba('#000000', .35); ctx.lineWidth = 6 / px; ctx.stroke();
      ctx.strokeStyle = rgba(color, .35); ctx.lineWidth = 4 / px; ctx.stroke();
      ctx.setLineDash([2 / px, 12 / px]); ctx.lineDashOffset = this.reduced ? 0 : -t * 40 / px; ctx.strokeStyle = rgba('#ffffff', .85); ctx.lineWidth = 2.4 / px; ctx.stroke(); ctx.setLineDash([]);
      for (const st of path.stages.slice(1)) { const p = pointAt(path, st.t), col = this.particleColor(st.c); ctx.fillStyle = rgba(col, .3); ctx.beginPath(); ctx.arc(p[0], p[1], 13 / px + 6, 0, TAU); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5 / px; ctx.stroke(); }
      for (const u of [.3, .62, .9]) { // chevrons show direction
        const a = pointAt(path, u - .015), b = pointAt(path, u); ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); ctx.scale(1 / px, 1 / px);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
  };

  /* ---------- frame ---------- */
  P.render = function (dt, playing) {
    if (!this.camera || !this.soilLayer || !this.canvas.width) return;
    const m = this.model, simDt = playing ? dt * this.speed : 0;
    this.clock += this.reduced ? 0 : dt;
    // camera easing
    const c = this.camera, target = this.viewTarget, k = this.reduced ? 1 : 1 - Math.exp(-dt * 8);
    for (const key of ['zoom', 'x', 'y']) c[key] += (target[key] - c[key]) * k;
    this.clampCamera(c);
    // eased visual state
    for (const key of Object.keys(TYPICAL)) { const want = (m.rates[key] || 0) / TYPICAL[key]; const cur = this.smoothRates[key] || 0; this.smoothRates[key] = cur + (want - cur) * (1 - Math.exp(-dt * 3)); }
    this.stormKick = Math.max(0, (this.stormKick || 0) - dt);
    const stormTarget = m.rain > 0 || (this.journey && this.journey.storm) ? 1 : this.stormKick > 0 ? .7 : 0;
    this.wetLevel = (this.wetLevel || 0) + ((this.journey && this.journey.wet ? 1 : 0) - (this.wetLevel || 0)) * (1 - Math.exp(-dt * 1.4));
    this.storm += (stormTarget - this.storm) * (1 - Math.exp(-dt * 1.5));
    this.focusFade += ((this.selected || this.journey ? 1 : 0) - this.focusFade) * (1 - Math.exp(-dt * 6));
    this.flash = Math.max(0, this.flash - dt * 2.6); this.shake = Math.max(0, this.shake - dt);
    this.plantGlow = Math.max(0, this.plantGlow - dt * .5);
    this.plantJolt = Math.max(0, (this.plantJolt || 0) - dt * 1.4);
    if (!this.cowStamp) this.updateCow(dt); // journey mode may already have moved the cow this frame
    this.cowStamp = false;
    if (this.inputPulse) this.inputPulse.remaining = Math.max(0, this.inputPulse.remaining - dt);
    if (this.bolt) { this.bolt.t += dt; if (this.bolt.t > this.bolt.life) this.bolt = null; }
    this.journeyClock = (this.journeyClock || 0) + dt;

    // particles advance with simulation time; fertilizer also animates while paused
    let inStem = 0;
    for (const p of this.particles) {
      if (playing || p.recipe.process === 'fertilizer') p.progress += (playing ? simDt : dt) / p.dur;
      if (LIVE_ROUTES.has(p.recipe.process) || p.route.layout !== this.layoutVersion) p.route = this.route(p.recipe);
      const t = clamp(p.progress, 0, 1), stages = p.route.stages;
      while (p.stage + 1 < stages.length && t >= stages[p.stage + 1].t) {
        p.stage++;
        if (stages[p.stage].burst && this.effects.length < 80 && (this.processMatch(p.recipe.process) || Math.random() < .4)) { const pos = pointAt(p.route, stages[p.stage].t); this.effects.push({ type: 'burst', x: pos[0], y: pos[1], color: this.particleColor(stages[p.stage].c), t: 0, dur: .7, seed: Math.random() * 6, bright: this.processMatch(p.recipe.process) }); }
      }
      if (p.route.inside && t > p.route.inside[0] && t < p.route.inside[1]) inStem++;
    }
    this.particles = this.particles.filter(p => p.progress < 1);
    this.vascular += ((inStem ? 1 : 0) - this.vascular) * (1 - Math.exp(-dt * 4));
    for (const e of this.effects) e.t += playing ? simDt : (e.type === 'nox' && !this.journey ? 0 : dt);
    this.effects = this.effects.filter(e => e.t < e.dur);
    for (const l of this.fallingLeaves) {
      if (!playing) break;
      l.age += simDt;
      const ground = this.surface(l.x) - 2;
      if (!l.landed) { l.y += simDt * 42; l.x += (Math.sin(l.age * 2.4 + l.phase) * 26 + (l.tx - l.x) * .5) * simDt; l.rot += simDt * 1.6 * Math.sin(l.age + l.phase); if (l.y >= ground) { l.y = ground; l.landed = true; } }
      else l.fade -= simDt * .25;
    }
    this.fallingLeaves = this.fallingLeaves.filter(l => l.fade > 0);
    this.updateIons(dt, playing);
    this.focusCache = this.selected ? this.focusRoutes() : null;

    // world transform
    const z = c.zoom * this.s, d = this.dpr;
    const sx = this.shake > 0 ? (Math.random() - .5) * 10 * this.shake : 0, sy = this.shake > 0 ? (Math.random() - .5) * 10 * this.shake : 0;
    const wt = [d * z, 0, 0, d * z, d * (this.width / 2 - c.x * z) + sx, d * (this.height / 2 - c.y * z) + sy];
    const ctx = this.ctx, t = this.clock;
    ctx.setTransform(...wt);
    this.drawSky(ctx, t);
    this.drawClouds(ctx, t, false); this.drawClouds(ctx, t, true);
    this.drawIons(ctx, ['air']);
    this.drawLayer(ctx, this.hillLayer);
    this.drawTree(ctx, t);
    this.drawGrass(ctx, t, true);
    this.drawSoil(ctx, t);
    this.drawHyphae(ctx, t);
    this.drawRoots(ctx, t);
    this.drawWorm(ctx, t);
    for (const id of ['soilFixers', 'nitrosomonas', 'nitrobacter', 'denitrifiers', 'decomposers', 'nostoc', 'rhizobium']) this.drawColony(ctx, id, ...this.microbeLocation(id), t, this.inspectedMicrobe === id ? 1 : 0);
    this.drawColony(ctx, 'decomposers', ...this.L.leafColony, t, 0);
    this.drawIons(ctx, ['ammonium', 'nitrite', 'nitrate', 'leached']);
    if (this.inputPulse && this.inputPulse.remaining > 0) this.drawInputPulse(ctx);
    this.drawLitter(ctx, t);
    // the cow passes in front of the plant when it walks up to browse it
    const browsing = this.L.cowX + this.cowDX() - 205 * this.L.cowK < this.L.plantX + 118 * this.plantScale() + 24;
    if (!browsing) this.drawCow(ctx, t);
    this.drawPlant(ctx, t);
    if (browsing) this.drawCow(ctx, t);
    this.drawGrass(ctx, t, false);
    this.drawFreshDung(ctx, t); // on top of the grass, so the drop and the fresh pat are easy to see
    this.drawFallingLeaves(ctx);
    if (!this.journey) for (const p of this.particles) if (p.progress >= 0 && !(this.focusFade > .05 && this.processMatch(p.recipe.process))) this.drawParticle(ctx, p, false);
    this.drawEffects(ctx, t, false);
    this.drawRain(ctx, t, this.storm);
    this.drawBolt(ctx);
    if (this.inspectedMicrobe) {
      const [x, y] = this.microbeLocation(this.inspectedMicrobe), px = this.s * c.zoom;
      ctx.strokeStyle = 'rgba(255,248,220,.9)'; ctx.lineWidth = 1.5 / px; ctx.setLineDash([4 / px, 5 / px]);
      ctx.beginPath(); ctx.arc(x, y, 34 + (this.reduced ? 0 : Math.sin(t * 2) * 2), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    if (this.focusFade > .01) {
      this.drawSpotlight(ctx, wt, t);
      ctx.setTransform(...wt);
      if (this.journey) { this.drawCowLabels(ctx); this.drawJourney(ctx, this.journeyClock); this.drawEffects(ctx, t, true); }
      else this.drawGuides(ctx, t);
      for (const p of this.particles) if (p.progress >= 0 && this.processMatch(p.recipe.process)) this.drawParticle(ctx, p, true);
      this.drawEffects(ctx, t, true);
    }
    // screen-space finish: lightning flash and a gentle vignette
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (this.flash > 0 && !this.reduced) { ctx.fillStyle = rgba('#f4f1ff', this.flash * .55); ctx.fillRect(0, 0, this.width, this.height); }
    const v = ctx.createRadialGradient(this.width / 2, this.height * .45, Math.min(this.width, this.height) * .35, this.width / 2, this.height * .5, Math.max(this.width, this.height) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(4,12,10,.38)'); ctx.fillStyle = v; ctx.fillRect(0, 0, this.width, this.height);
    this.layoutLabels();
    // leader lines from labels to the exact thing they name
    ctx.strokeStyle = 'rgba(255,250,235,.55)'; ctx.lineWidth = .8;
    for (const r of this.labelPlacements || []) {
      const x = clamp(r.anchor[0], r.x, r.x + r.w), y = clamp(r.anchor[1], r.y, r.y + r.h);
      if (Math.hypot(x - r.anchor[0], y - r.anchor[1]) < 4) continue;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(r.anchor[0], r.anchor[1]); ctx.stroke();
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(r.anchor[0], r.anchor[1], 2, 0, TAU); ctx.fill();
    }
  };


  /* ---------- journey: the travelling atom ---------- */
  P.drawJourney = function (ctx, t) {
    const j = this.journey; if (!j || !j.pos) return;
    const px = this.s * this.camera.zoom, color = this.particleColor(j.compound), [x, y] = j.pos;
    ctx.save(); ctx.lineCap = 'round';
    if (j.next) { // a gentle beacon on the next stop
      const r = (16 + (this.reduced ? 0 : (t * 1.2 % 1) * 12)) / px; ctx.globalAlpha = .7 * (1 - (this.reduced ? 0 : t * 1.2 % 1));
      ctx.strokeStyle = '#ffe9a3'; ctx.lineWidth = 2 / px; ctx.beginPath(); ctx.arc(j.next[0], j.next[1], r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = j.fade;
    const pop = j.pop || 1, pulse = (this.reduced ? 1 : 1 + Math.sin(t * 4) * .1) * pop, halo = 30 / px * pulse;
    // a faint wake of light right behind the gliding atom (no line, just a soft glow)
    if (j.speed > .05 && !this.reduced) for (let k = 1; k <= 4; k++) { const d = k * 7 / px * j.speed, gx = x - Math.cos(j.heading) * d, gy = y - Math.sin(j.heading) * d, gr = (16 - k * 2.5) / px; const gw = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); gw.addColorStop(0, rgba(color, .28 * (1 - k / 5))); gw.addColorStop(1, rgba(color, 0)); ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(x, y, 0, x, y, halo); g.addColorStop(0, 'rgba(255,220,110,.8)'); g.addColorStop(.45, 'rgba(255,214,90,.28)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, halo, 0, Math.PI * 2); ctx.fill();
    if (px > 1.75 && !this.formulaParticles) { // molecule sprite turns with its motion
      const s = 18 / px * pop; ctx.save(); ctx.translate(x, y); ctx.rotate(this.reduced ? 0 : t * .6 + (j.heading || 0) * .3); ctx.drawImage(this.moleculeSprite(j.compound), -s, -s, s * 2, s * 2); ctx.restore();
    } else { const s = 9 / px * 4.2 / 2 * pop; ctx.drawImage(this.glowSprite(color), x - s * 2, y - s * 2, s * 4, s * 4); }
    ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 2.2 / px; ctx.beginPath(); ctx.arc(x, y, 13 / px * pop, 0, Math.PI * 2); ctx.stroke();
    if (!this.reduced) { ctx.strokeStyle = 'rgba(255,214,90,.5)'; ctx.lineWidth = 1.2 / px; ctx.beginPath(); ctx.arc(x, y, 19 / px * pop, t * 2, t * 2 + 1.4); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 19 / px * pop, t * 2 + Math.PI, t * 2 + Math.PI + 1.4); ctx.stroke(); }
    this.drawFormula(ctx, j.compound, color, x, y - 30 / px * pop, 16);
    ctx.restore();
  };

  P.drawInputPulse = function (ctx) {
    const pulse = this.inputPulse, fade = Math.min(1, pulse.remaining), phase = 4 - pulse.remaining;
    for (const [key, color] of [['ammonium', COLORS['NH₄⁺']], ['nitrate', COLORS['NO₃⁻']]]) {
      const [x, y] = this.point(key), r = 56 + Math.sin(phase * 3) * 8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, .4 * fade)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  };
})(globalThis);
