/* Immersive nitrogen ecosystem — artwork.
   Everything is drawn procedurally in world units, so it stays sharp when zoomed. */
(function (root) {
  'use strict';
  const P = root.EcosystemScene.prototype;
  const { TAU, clamp, lerp, smooth, seeded, rgba, mix } = root.EcosystemScene.util;
  const { MICROBES } = root.NitrogenContent;

  /* ---------- prerendered layers ---------- */
  P.makeLayer = function (x0, y0, w, h, draw) {
    let r = clamp(this.s * this.dpr * 1.25, 0.6, 3);
    r = Math.min(r, 4096 / w, 4096 / h);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * r)); c.height = Math.max(1, Math.ceil(h * r));
    const ctx = c.getContext('2d');
    ctx.setTransform(r, 0, 0, r, -x0 * r, -y0 * r);
    draw(ctx);
    return { canvas: c, x0, y0, w, h };
  };
  P.drawLayer = function (ctx, layer) { if (layer && layer.canvas.width) ctx.drawImage(layer.canvas, layer.x0, layer.y0, layer.w, layer.h); };

  P.buildStatic = function () {
    if (!this.plantGeo) this.plantGeo = buildPlant();
    if (!this.rootGeo) this.rootGeo = buildRoots();
    const L = this.L, W = this.W, H = this.H;
    this.hillLayer = this.makeLayer(0, L.G - 270, W, 290, ctx => this.paintHills(ctx));
    this.soilLayer = this.makeLayer(0, L.G - 16, W, H - L.G + 16, ctx => this.paintSoil(ctx));
    this.cloudSprites = this.cloudSprites || [0, 1, 2].map(i => makeCloud(i, false));
    this.stormSprites = this.stormSprites || [0, 1, 2].map(i => makeCloud(i, true));
    // Grass blades, flowers and hyphae depend on the layout.
    const rand = seeded(77), grass = [];
    const n = Math.round(W * 0.9);
    for (let i = 0; i < n; i++) {
      const x = rand() * W;
      grass.push({ x, h: 8 + rand() * 16 + (rand() < .12 ? 10 : 0), lean: (rand() - .5) * 7, tone: rand() < .45 ? 0 : rand() < .6 ? 1 : 2, phase: rand() * TAU });
    }
    this.grass = grass;
    this.flowers = Array.from({ length: Math.round(W / 55) }, () => { const x = rand() * W; return { x, h: 12 + rand() * 12, c: ['#fff6e0', '#f5d36a', '#cdb6f2'][Math.floor(rand() * 3)], phase: rand() * TAU }; })
      .filter(f => Math.abs(f.x - L.plantX) > 40 && Math.abs(f.x - L.cowX) > 60);
    this.hyphae = [L.leafColony, L.microbes.decomposers].map((c, i) => buildHyphae(c[0], c[1] - 14, 68, 300 + i));
    this.rainDrops = Array.from({ length: 220 }, () => ({ x: rand(), y: rand(), z: .5 + rand() * .5, l: .6 + rand() * .6 }));
  };

  function makeCloud(seed, storm) {
    const c = document.createElement('canvas'); c.width = 420; c.height = 170;
    const ctx = c.getContext('2d'), rand = seeded(91 + seed * 17);
    const puffs = [];
    for (let i = 0; i < 16; i++) { const u = i / 15; puffs.push([60 + u * 300 + (rand() - .5) * 30, 112 - Math.sin(u * Math.PI) * (34 + rand() * 26) + rand() * 10, 26 + Math.sin(u * Math.PI) * 30 + rand() * 14]); }
    for (const [x, y, r] of puffs) { // shadowed underside
      const g = ctx.createRadialGradient(x, y + r * .35, r * .2, x, y + r * .2, r * 1.15);
      g.addColorStop(0, storm ? 'rgba(52,62,74,.95)' : 'rgba(176,195,214,.9)'); g.addColorStop(1, storm ? 'rgba(52,62,74,0)' : 'rgba(176,195,214,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + r * .2, r * 1.15, 0, TAU); ctx.fill();
    }
    for (const [x, y, r] of puffs) { // lit tops
      const g = ctx.createRadialGradient(x + r * .25, y - r * .35, r * .1, x, y, r);
      g.addColorStop(0, storm ? 'rgba(138,150,160,.95)' : 'rgba(255,255,255,1)'); g.addColorStop(.7, storm ? 'rgba(98,110,122,.85)' : 'rgba(244,247,250,.92)'); g.addColorStop(1, storm ? 'rgba(98,110,122,0)' : 'rgba(244,247,250,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    return c;
  }

  function buildHyphae(cx, cy, radius, seed) {
    const rand = seeded(seed), lines = [];
    const grow = (x, y, a, len, depth) => {
      const pts = [[x, y]];
      for (let i = 0; i < 7; i++) { a += (rand() - .5) * .7; x += Math.cos(a) * len / 7; y += Math.sin(a) * len / 7 * .7; pts.push([x, y]); }
      lines.push({ pts, w: depth === 0 ? .9 : .55, phase: rand() });
      if (depth < 2) for (let k = 0; k < 2; k++) { const j = 2 + Math.floor(rand() * 4); grow(pts[j][0], pts[j][1], a + (rand() < .5 ? -1 : 1) * (.5 + rand() * .7), len * .55, depth + 1); }
    };
    for (let i = 0; i < 6; i++) grow(cx + (rand() - .5) * 20, cy + rand() * 10, i / 6 * TAU + rand() * .5, radius * (.6 + rand() * .4), 0);
    return lines;
  }

  /* ---------- sky, hills and weather ---------- */
  P.paintHills = function (ctx) {
    const W = this.W, G = this.L.G, rand = seeded(43);
    const ridge = (base, amp, f1, f2, ph) => x => base + Math.sin(x / W * f1 + ph) * amp + Math.sin(x / W * f2 + ph * 2) * amp * .35;
    const layers = [
      { y: ridge(G - 150, 34, 6.5, 17, .3), top: '#9ebfcb', bot: '#b8cfc6' },
      { y: ridge(G - 108, 26, 8, 21, 1.4), top: '#8db3a0', bot: '#a9c4a6' },
      { y: ridge(G - 72, 20, 10, 26, 2.2), top: '#7aa77d', bot: '#93b682' }
    ];
    layers.forEach((Lr, i) => {
      const g = ctx.createLinearGradient(0, G - 190 + i * 40, 0, G + 10);
      g.addColorStop(0, Lr.top); g.addColorStop(1, Lr.bot); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, G + 20); for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, Lr.y(x)); ctx.lineTo(W, G + 20); ctx.fill();
      // tree clumps with a sunlit right side
      const count = [0, 26, 34][i];
      for (let k = 0; k < count * W / 1400; k++) {
        const x = rand() * W, y = Lr.y(x) + 2, s = (i === 1 ? 6 : 9) + rand() * (i === 1 ? 6 : 9);
        const dark = i === 1 ? '#6e9a83' : '#5b8a5a', light = i === 1 ? '#9cc0a0' : '#8fbb73';
        ctx.fillStyle = dark; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + (j - 1.5) * s * .45, y - s * (.8 + (j % 2) * .35), s * .62, 0, TAU); ctx.fill(); }
        ctx.fillStyle = rgba(light, .7); ctx.beginPath(); ctx.arc(x + s * .35, y - s * 1.15, s * .42, 0, TAU); ctx.fill();
      }
    });
    // distant farmhouse
    const bx = W * 0.86, by = layers[1].y(W * 0.86) + 4;
    ctx.fillStyle = '#b4644a'; ctx.fillRect(bx, by - 9, 14, 9); ctx.fillStyle = '#8c4a38'; ctx.beginPath(); ctx.moveTo(bx - 2, by - 9); ctx.lineTo(bx + 7, by - 15); ctx.lineTo(bx + 16, by - 9); ctx.fill();
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(bx + 18, by - 13, 4, 13);
    // meadow in front of the cross-section
    const m = ctx.createLinearGradient(0, G - 46, 0, G + 6);
    m.addColorStop(0, '#93b85d'); m.addColorStop(1, '#6f9744'); ctx.fillStyle = m;
    ctx.beginPath(); ctx.moveTo(0, G + 10);
    for (let x = 0; x <= W + 8; x += 10) ctx.lineTo(x, G - 40 + Math.sin(x / W * 5 + 1) * 6);
    ctx.lineTo(W, G + 10); ctx.fill();
    ctx.strokeStyle = 'rgba(214,226,150,.22)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(W * .35, G - 34 + i * 6); ctx.quadraticCurveTo(W * .6, G - 30 + i * 6.5, W * 1.02, G - 28 + i * 7); ctx.stroke(); }
    // fence
    ctx.strokeStyle = 'rgba(230,222,196,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W * .5, G - 33); ctx.lineTo(W * .98, G - 24); ctx.moveTo(W * .5, G - 28); ctx.lineTo(W * .98, G - 19); ctx.stroke();
    for (let i = 0; i < 13; i++) { const x = W * (.5 + i * .04), y = G - 33 + i * .75; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 10); ctx.stroke(); }
  };

  P.drawSky = function (ctx, t) {
    const W = this.W, G = this.L.G, st = this.storm;
    const sky = ctx.createLinearGradient(0, 0, 0, G);
    sky.addColorStop(0, mix('#5d9cc4', '#2f3c48', st)); sky.addColorStop(.55, mix('#a6d0dc', '#5d6f78', st)); sky.addColorStop(1, mix('#f6e7bf', '#8d958a', st));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, G + 20);
    const sx = W * .8, sy = G * .26;
    if (st < .98) {
      const a = 1 - st;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .5);
      glow.addColorStop(0, rgba('#fff6d2', .85 * a)); glow.addColorStop(.12, rgba('#fff0c0', .35 * a)); glow.addColorStop(1, rgba('#fff0c0', 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, G + 20);
      ctx.fillStyle = rgba('#fffbe8', a); ctx.beginPath(); ctx.arc(sx, sy, 22, 0, TAU); ctx.fill();
      if (!this.reduced) { // soft light shafts
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const ang = 2.05 + i * .17 + Math.sin(t * .1 + i) * .02, len = W * .9;
          const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
          g.addColorStop(0, rgba('#fff3c8', .07 * a)); g.addColorStop(1, rgba('#fff3c8', 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(ang - .035) * len, sy + Math.sin(ang - .035) * len); ctx.lineTo(sx + Math.cos(ang + .035) * len, sy + Math.sin(ang + .035) * len); ctx.fill();
        }
        ctx.restore();
      }
    }
  };

  P.drawClouds = function (ctx, t, front) {
    const W = this.W, G = this.L.G, st = this.storm;
    const set = front ? [[.15, .22, 1.1], [.62, .14, 1.3]] : [[0, .1, .7], [.35, .2, .8], [.72, .08, .65], [.9, .25, .75]];
    set.forEach(([ox, oy, sc], i) => {
      const speed = (front ? 5 : 2.5) * (1 + st * 1.5), span = W + 500;
      const x = ((ox * span + t * speed) % span) - 380, y = G * oy + 10;
      const w = 420 * sc, h = 170 * sc;
      ctx.globalAlpha = front ? .9 : .75;
      ctx.drawImage(this.cloudSprites[i % 3], x, y, w, h);
      if (st > .02) { ctx.globalAlpha = st * (front ? .95 : .85); ctx.drawImage(this.stormSprites[i % 3], x - 20, y + 4, w * 1.1, h * 1.1); }
    });
    if (front && st > .05) { // a heavy storm deck across the top
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = st * .9; ctx.drawImage(this.stormSprites[i % 3], i * W / 5 - 140 + Math.sin(t * .05 + i) * 30, -40 + (i % 2) * 18, 520, 200); }
    }
    ctx.globalAlpha = 1;
  };

  P.drawRain = function (ctx, t, amount) {
    if (amount <= 0) return;
    const W = this.W, G = this.L.G;
    ctx.save(); ctx.lineCap = 'round';
    for (const d of this.rainDrops) {
      if (d.z > .5 + amount * .5 + .02) continue;
      const fall = (d.y + t * (1.3 + d.z * .7)) % 1, x = ((d.x * W + fall * 60 * d.z) % W), y = -20 + fall * (G + 30);
      ctx.strokeStyle = rgba('#e6f1ff', .25 + d.z * .35); ctx.lineWidth = .6 + d.z * .9;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 * d.z, y + 16 * d.l * d.z); ctx.stroke();
      if (fall > .965) { const sy = this.surface(x); ctx.strokeStyle = rgba('#e6f1ff', .5); ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(x, sy - 1, 4 * d.z, 1.3, 0, Math.PI, TAU); ctx.stroke(); }
    }
    ctx.restore();
  };

  /* ---------- ground, soil and water ---------- */
  P.paintSoil = function (ctx) {
    const W = this.W, H = this.H, L = this.L, G = L.G, P_ = L.P, rand = seeded(1108);
    const surfacePath = () => { ctx.beginPath(); ctx.moveTo(-2, this.surface(0)); for (let x = 0; x <= W + 6; x += 6) ctx.lineTo(x, this.surface(x)); ctx.lineTo(W + 2, H + 2); ctx.lineTo(-2, H + 2); ctx.closePath(); };
    surfacePath(); ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(0, G, 0, H);
    const d = y => (y - G) / (H - G);
    g.addColorStop(0, '#2a1d14'); g.addColorStop(d(G + 16), '#3d2a1c'); g.addColorStop(d(G + P_ * .38), '#553a26');
    g.addColorStop(d(G + P_ * .42), '#6e4a30'); g.addColorStop(d(G + P_ * .85), '#7d5a3c'); g.addColorStop(Math.min(.99, d(G + P_ * .95)), '#6c6150'); g.addColorStop(1, '#5a5348');
    ctx.fillStyle = g; ctx.fillRect(0, G - 20, W, H - G + 30);
    // wavy horizon boundaries
    const band = (y0, amp, color, thick) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, y0); for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, y0 + Math.sin(x / 70 + y0) * amp + Math.sin(x / 23) * amp * .3); for (let x = W + 10; x >= 0; x -= 10) ctx.lineTo(x, y0 + thick + Math.sin(x / 90 + y0 * 2) * amp); ctx.closePath(); ctx.fill(); };
    band(G + P_ * .37, 7, 'rgba(120,80,48,.35)', 14);
    band(G + P_ * .9, 9, 'rgba(150,140,120,.25)', 18);
    // speckle texture
    const area = W * (H - G) / 1000;
    for (let i = 0; i < area * 9; i++) {
      const x = rand() * W, y = G + rand() * (H - G), r = .3 + rand() * 1.5;
      ctx.fillStyle = rand() < .5 ? 'rgba(230,200,150,.08)' : 'rgba(10,6,4,.16)';
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (.5 + rand() * .5), rand() * 3, 0, TAU); ctx.fill();
    }
    // fibrous grass roots just under the surface
    ctx.strokeStyle = 'rgba(214,190,150,.18)'; ctx.lineWidth = .6;
    for (let i = 0; i < W / 3; i++) { const x = rand() * W, y = this.surface(x); ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x + (rand() - .5) * 8, y + 8, x + (rand() - .5) * 10, y + 8 + rand() * 18); ctx.stroke(); }
    // old root channels
    ctx.strokeStyle = 'rgba(20,12,8,.22)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < W / 120; i++) { let x = rand() * W, y = G + 30 + rand() * P_ * .7; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rand() - .5) * 26; y += 8 + rand() * 12; ctx.lineTo(x, y); } ctx.stroke(); }
    // stones, more of them deeper
    for (let i = 0; i < W / 9; i++) {
      const depth = Math.pow(rand(), .6), x = rand() * W, y = G + 18 + depth * (H - G - 18), r = 2 + rand() * (4 + depth * 9);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rand() * 3);
      const sg = ctx.createLinearGradient(-r, -r, r, r);
      const base = depth > .8 ? '#8a8476' : depth > .4 ? '#8c6c4e' : '#5e4734';
      sg.addColorStop(0, mix(base, '#e8dcc4', .35)); sg.addColorStop(1, mix(base, '#120c08', .35));
      ctx.fillStyle = sg; ctx.beginPath();
      const k = 5 + Math.floor(rand() * 3); for (let j = 0; j < k; j++) { const a = j / k * TAU, rr = r * (.75 + rand() * .3); j ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .75) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * .75); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // humus near the litter and dung
    for (const x of [L.litterX, L.dungX]) { const hg = ctx.createRadialGradient(x, G + 4, 4, x, G + 10, 70); hg.addColorStop(0, 'rgba(18,10,6,.55)'); hg.addColorStop(1, 'rgba(18,10,6,0)'); ctx.fillStyle = hg; ctx.fillRect(x - 80, G - 10, 160, 90); }
    ctx.restore();
    // lit cut edge
    ctx.strokeStyle = 'rgba(255,236,190,.16)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let x = 0; x <= W; x += 6) x ? ctx.lineTo(x, this.surface(x) + 1.5) : ctx.moveTo(x, this.surface(x) + 1.5); ctx.stroke();
  };

  P.drawSoil = function (ctx, t) {
    const W = this.W, H = this.H, m = this.visualMoisture(), L = this.L;
    this.drawLayer(ctx, this.soilLayer);
    // wet soil darkens
    ctx.fillStyle = rgba('#0b1622', clamp((m - .35) * .45, 0, .3));
    ctx.beginPath(); ctx.moveTo(0, this.surface(0)); for (let x = 0; x <= W + 6; x += 12) ctx.lineTo(x, this.surface(x)); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // saturated zone below the water table
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, this.waterTable(0));
    for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, this.waterTable(x) + (this.reduced ? 0 : Math.sin(x / 40 + t * 1.2) * 1.2));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const wt0 = this.waterTable(W * .3), g = ctx.createLinearGradient(0, wt0, 0, H);
    g.addColorStop(0, 'rgba(70,150,180,.42)'); g.addColorStop(1, 'rgba(22,70,104,.7)');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    // groundwater drifting slowly downslope
    ctx.strokeStyle = 'rgba(190,235,255,.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const y = wt0 + 10 + ((i * 37) % 100) / 100 * (H - wt0 - 10), x = ((i * 113 + t * 14) % (W + 60)) - 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y - 1); ctx.stroke();
    }
    ctx.restore();
    // water table line
    ctx.strokeStyle = 'rgba(170,230,255,.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.beginPath();
    for (let x = 0; x <= W + 8; x += 8) { const y = this.waterTable(x) + (this.reduced ? 0 : Math.sin(x / 40 + t * 1.2) * 1.2); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
  };

  // A framing tree at the right edge, partly out of view.
  P.drawTree = function (ctx, t) {
    const L = this.L, x = L.treeX, y = this.surface(x), k = clamp(L.G / 380, .9, 1.25), sway = this.reduced ? 0 : Math.sin(t * .7) * 3 * (1 + this.storm * 2);
    const tg = ctx.createLinearGradient(x - 14, 0, x + 14, 0); tg.addColorStop(0, '#3b2b1e'); tg.addColorStop(.6, '#6b5038'); tg.addColorStop(1, '#3b2b1e');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(x - 16 * k, y + 2); ctx.bezierCurveTo(x - 9 * k, y - 80 * k, x - 12 * k, y - 150 * k, x - 4 * k, y - 210 * k); ctx.lineTo(x + 6 * k, y - 210 * k); ctx.bezierCurveTo(x + 10 * k, y - 140 * k, x + 9 * k, y - 70 * k, x + 18 * k, y + 2); ctx.fill();
    ctx.strokeStyle = '#4a3726'; ctx.lineWidth = 5 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 150 * k); ctx.quadraticCurveTo(x - 30 * k, y - 190 * k, x - 52 * k + sway * .3, y - 215 * k); ctx.stroke();
    if (!this.treeBlobs) { // leaf clusters, lit from the upper right
      const rand = seeded(222), list = [];
      for (let i = 0; i < 70; i++) {
        const a = rand() * TAU, r = Math.sqrt(rand()), cx = -30 + Math.cos(a) * 95 * r, cy = -255 + Math.sin(a) * 80 * r;
        const light = clamp(.5 + (cx + 30) / 190 - (cy + 255) / 160, 0, 1);
        list.push([cx, cy, 16 + rand() * 18, light, rand()]);
      }
      list.sort((p, q) => p[3] - q[3]);
      this.treeBlobs = list;
    }
    ctx.fillStyle = '#21452a';
    for (const [dx, dy, r] of [[-30, -250, 92], [-90, -220, 56], [30, -230, 60], [-30, -320, 60]]) { ctx.beginPath(); ctx.arc(x + (dx + sway * (-dy / 300)) * k, y + dy * k, r * k, 0, TAU); ctx.fill(); }
    for (const [dx, dy, r, light, j] of this.treeBlobs) {
      const bx = x + (dx + sway * (-dy / 300)) * k, by = y + dy * k;
      ctx.fillStyle = mix(mix('#24502c', '#4f8f3e', light), '#9cc965', Math.max(0, light - .6) * 1.6 * (.6 + j * .4));
      ctx.beginPath(); ctx.arc(bx, by, r * k, 0, TAU); ctx.fill();
      if (light > .55) { ctx.fillStyle = rgba('#d7f0a0', (light - .55) * .5); ctx.beginPath(); ctx.arc(bx + r * .3 * k, by - r * .35 * k, r * .38 * k, 0, TAU); ctx.fill(); }
    }
  };

  P.drawGrass = function (ctx, t, back) {
    const tones = ['#5f8a3a', '#86ab4c', '#3f6a33'], wind = this.reduced ? 0 : 1 + this.storm * 2.5;
    ctx.lineCap = 'round';
    for (let tone = 0; tone < 3; tone++) {
      ctx.strokeStyle = tones[tone]; ctx.lineWidth = tone === 1 ? .9 : 1.1; ctx.beginPath();
      for (let i = back ? 0 : 1; i < this.grass.length; i += 2) {
        const b = this.grass[i]; if (b.tone !== tone) continue;
        const y = this.surface(b.x), sway = Math.sin(t * 1.4 + b.phase + b.x * .01) * 2.2 * wind;
        ctx.moveTo(b.x, y + 1); ctx.quadraticCurveTo(b.x + b.lean * .4, y - b.h * .55, b.x + b.lean + sway, y - b.h);
      }
      ctx.stroke();
    }
    if (!back) for (const f of this.flowers) {
      const y = this.surface(f.x), sway = this.reduced ? 0 : Math.sin(t * 1.3 + f.phase) * 2;
      ctx.strokeStyle = '#557d38'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(f.x, y); ctx.lineTo(f.x + sway, y - f.h); ctx.stroke();
      ctx.fillStyle = f.c; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.arc(f.x + sway + Math.cos(a) * 2, y - f.h + Math.sin(a) * 2, 1.5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#e9b93f'; ctx.beginPath(); ctx.arc(f.x + sway, y - f.h, 1, 0, TAU); ctx.fill();
    }
  };

  /* ---------- bean plant ---------- */
  function stemAt(q) { // cubic stem in plant space (scale 1), base at origin
    const u = 1 - q, p0 = [0, 0], p1 = [12, -78], p2 = [-14, -176], p3 = [6, -262];
    return [u * u * u * p0[0] + 3 * u * u * q * p1[0] + 3 * u * q * q * p2[0] + q * q * q * p3[0], u * u * u * p0[1] + 3 * u * u * q * p1[1] + 3 * u * q * q * p2[1] + q * q * q * p3[1]];
  }
  function buildPlant() {
    const nodes = [.11, .22, .33, .44, .55, .65, .75, .84, .92, .98];
    const leaves = nodes.map((q, i) => {
      const side = i % 2 ? 1 : -1, len = [58, 64, 66, 64, 60, 56, 50, 42, 34, 24][i], up = [.32, .4, .48, .56, .62, .7, .78, .86, .95, 1.1][i];
      return { q, side, len, up, size: [42, 48, 52, 52, 50, 46, 41, 35, 28, 20][i], back: i % 3 === 1, i, phase: i * 1.7 };
    });
    const pods = [2, 3, 4, 5].map((n, k) => ({ q: nodes[n] + .02, side: n % 2 ? -1 : 1, len: 44 + k * 4, k }));
    const flowers = [6, 7, 8].map(n => ({ q: nodes[n] + .015, side: n % 2 ? -1 : 1 }));
    return { leaves, pods, flowers };
  }
  P.plantScale = function () { return this.L.plantK * clamp(.7 + this.model.n.plant / 85, .74, 1.3); };
  P.plantStatus = function () { return clamp((this.model.n.plant - 8) / 42, 0, 1); };
  P.plantSway = function () {
    const jolt = (this.plantJolt || 0) * Math.sin(this.clock * 15) * .07; // shakes when the cow tears a leaf off
    return (this.reduced ? 0 : Math.sin(this.clock * 1.1) * .018 * (1 + this.storm * 2) + Math.sin(this.clock * .63) * .01) + jolt;
  };
  P.plantToWorld = function (p, sway) {
    const g = this.plantScale(), a = sway === undefined ? this.plantSway() : sway, x0 = this.L.plantX, y0 = this.surface(x0);
    return [x0 + (p[0] * Math.cos(a) - p[1] * Math.sin(a)) * g, y0 + (p[0] * Math.sin(a) + p[1] * Math.cos(a)) * g];
  };
  P.stemWorld = function (q) { return this.plantToWorld(stemAt(q)); };
  P.plantPoint = function (which) {
    if (which === 'canopy') return this.plantToWorld([8, -170]);
    if (which === 'label') return this.plantToWorld([0, -275]);
    if (which === 'leaf') return this.plantToWorld([-40, -120]);
    if (which === 'bite') return this.biteLeaf().centre;
    return this.plantToWorld([0, -150]);
  };
  // Leaf geometry in the world (no wind), for the leaf the cow eats.
  function leafShape(lf) {
    const base = stemAt(lf.q), ang = -Math.PI / 2 + lf.side * (Math.PI / 2 - lf.up);
    const tip = [base[0] + Math.cos(ang) * lf.len, base[1] + Math.sin(ang) * lf.len];
    const mid = [base[0] + Math.cos(ang) * lf.len * .55, base[1] + Math.sin(ang) * lf.len * .55 - 6];
    const dir = Math.atan2(tip[1] - mid[1], tip[0] - mid[0]) + lf.side * .192;
    return { base, tip, mid, dir };
  }
  P.leafGeom = function (i, still) {
    const lf = this.plantGeo.leaves[i], s = leafShape(lf), w = p => this.plantToWorld(p, still ? 0 : undefined);
    const at = f => [s.tip[0] + Math.cos(s.dir) * lf.size * f, s.tip[1] + Math.sin(s.dir) * lf.size * f];
    return { i, tip: w(s.tip), centre: w(at(.5)), bite: w(at(.22)) };
  };
  // The cow browses the leaf on its side of the plant that is nearest a comfortable mouth height.
  P.biteLeafIndex = function () {
    const g = this.plantScale(), want = 100 * this.L.cowK / g;
    let best = 1, d0 = Infinity;
    for (const i of [1, 3, 5]) { const s = leafShape(this.plantGeo.leaves[i]), h = -(s.tip[1] + Math.sin(s.dir) * this.plantGeo.leaves[i].size * .22), d = Math.abs(h - want); if (d < d0) { d0 = d; best = i; } }
    return best;
  };
  P.biteLeaf = function (still) { return this.leafGeom(this.biteLeafIndex(), still); };
  P.plantBox = function () { const g = this.plantScale(), x = this.L.plantX, y = this.surface(x); return [x - 105 * g, y - 275 * g, x + 105 * g, y]; };

  function leafletPath(ctx, l) {
    const w = l * .38;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(l * .12, -w * 1.15, l * .62, -w * 1.2, l * .86, -w * .32);
    ctx.quadraticCurveTo(l * .95, -w * .08, l * 1.04, 0);
    ctx.quadraticCurveTo(l * .95, w * .08, l * .86, w * .32);
    ctx.bezierCurveTo(l * .62, w * 1.2, l * .12, w * 1.15, 0, 0);
    ctx.closePath();
  }
  function drawLeaflet(ctx, x, y, angle, l, color, alpha, glow) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const w = l * .38;
    leafletPath(ctx, l);
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, mix(color, '#f4f7c8', .32)); g.addColorStop(.45, color); g.addColorStop(1, mix(color, '#0d2610', .42));
    ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fill();
    if (glow > 0) { ctx.fillStyle = rgba('#d6ff9a', glow * .45); ctx.fill(); }
    ctx.strokeStyle = rgba('#173a16', .35); ctx.lineWidth = .6; ctx.stroke();
    ctx.strokeStyle = rgba(mix(color, '#f7f3c0', .6), .75); ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * .5, -w * .06, l * .98, 0); ctx.stroke();
    ctx.lineWidth = .45; ctx.strokeStyle = rgba(mix(color, '#f7f3c0', .5), .45); ctx.beginPath();
    for (let i = 1; i <= 4; i++) { const u = i / 5.2; ctx.moveTo(l * u, -w * .02); ctx.quadraticCurveTo(l * (u + .08), -w * .5, l * (u + .16), -w * .8 * Math.sin((u + .1) * Math.PI)); ctx.moveTo(l * u, w * .02); ctx.quadraticCurveTo(l * (u + .08), w * .5, l * (u + .16), w * .8 * Math.sin((u + .1) * Math.PI)); }
    ctx.stroke();
    ctx.restore();
  }
  P.drawPlant = function (ctx, t) {
    const geo = this.plantGeo, g = this.plantScale(), status = this.plantStatus(), x0 = this.L.plantX, y0 = this.surface(x0), sway = this.plantSway();
    const glow = this.plantGlow || 0;
    ctx.save(); ctx.translate(x0, y0); ctx.scale(g, g); ctx.rotate(sway);
    const leafColor = i => { const s = clamp(status * 1.35 - (1 - i / 9) * .45 + .1, 0, 1); return mix(mix('#cdbb4f', '#8fae45', clamp(s * 2, 0, 1)), '#3e8a37', clamp(s * 1.4 - .4, 0, 1)); };
    const rig = this.cowRig;
    const drawLeaf = (lf, back) => {
      const base = stemAt(lf.q), wind = this.reduced ? 0 : Math.sin(t * 1.6 + lf.phase) * .05 * (1 + this.storm * 2.5);
      const ang = -Math.PI / 2 + lf.side * (Math.PI / 2 - lf.up) + wind;
      const tip = [base[0] + Math.cos(ang) * lf.len, base[1] + Math.sin(ang) * lf.len];
      const mid = [base[0] + Math.cos(ang) * lf.len * .55, base[1] + Math.sin(ang) * lf.len * .55 - 6];
      const gone = rig && rig.leafI === lf.i ? rig.leafGone : 0;
      ctx.strokeStyle = back ? '#4f7232' : '#6f9440'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      if (gone > .985) { // bitten off: a torn stalk is all that is left
        const e = [lerp(base[0], mid[0], .8), lerp(base[1], mid[1], .8)];
        ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
        ctx.fillStyle = mix(leafColor(lf.i), '#5a4a20', .35); ctx.beginPath(); ctx.moveTo(e[0] - 2, e[1] - 1); ctx.lineTo(e[0] + 3, e[1] - 4); ctx.lineTo(e[0] + 2, e[1] - 1); ctx.lineTo(e[0] + 5, e[1] + 1); ctx.lineTo(e[0], e[1] + 2); ctx.closePath(); ctx.fill();
        return;
      }
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]); ctx.stroke();
      const col = back ? mix(leafColor(lf.i), '#16351a', .3) : leafColor(lf.i), droop = .32 * lf.side;
      const dir = Math.atan2(tip[1] - mid[1], tip[0] - mid[0]), grow = 1 - gone; // regrows after the cow has eaten it
      // two side leaflets, then the terminal leaflet
      drawLeaflet(ctx, tip[0], tip[1], dir - lf.side * 1.05 + droop + wind, lf.size * .82 * grow, col, 1, glow);
      drawLeaflet(ctx, tip[0], tip[1], dir + lf.side * .95 + droop + wind, lf.size * .8 * grow, mix(col, '#1c3c1d', .12), 1, glow);
      drawLeaflet(ctx, tip[0] + Math.cos(dir) * 5 * grow, tip[1] + Math.sin(dir) * 5 * grow, dir + droop * .6 + wind * 1.2, lf.size * grow, col, 1, glow);
      ctx.fillStyle = '#a7c46a'; ctx.beginPath(); ctx.arc(tip[0], tip[1], 1.8, 0, TAU); ctx.fill();
    };
    for (const lf of geo.leaves) if (lf.back) drawLeaf(lf, true);
    // stem: tapered with a lit edge
    const left = [], right = [];
    for (let i = 0; i <= 24; i++) { const q = i / 24, p = stemAt(q), n = stemAt(Math.min(1, q + .01)), d = stemAt(Math.max(0, q - .01)), a = Math.atan2(n[1] - d[1], n[0] - d[0]) + Math.PI / 2, w = lerp(3.4, 1.1, q); left.push([p[0] + Math.cos(a) * w, p[1] + Math.sin(a) * w]); right.push([p[0] - Math.cos(a) * w, p[1] - Math.sin(a) * w]); }
    ctx.beginPath(); left.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]); ctx.closePath();
    const sg = ctx.createLinearGradient(-4, 0, 4, 0); sg.addColorStop(0, '#3f6a2c'); sg.addColorStop(.55, '#9cbf5d'); sg.addColorStop(1, '#4d7a33');
    ctx.fillStyle = sg; ctx.fill();
    if (this.vascular > 0) { // xylem glow while nitrate travels up
      ctx.strokeStyle = rgba('#7cf3ee', this.vascular * .55); ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const p = stemAt(i / 20 * .9); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
    }
    // pods appear with plenty of nitrogen
    const podCount = Math.round(clamp((this.model.n.plant - 14) / 12, 0, 4));
    for (const pd of geo.pods.slice(0, podCount)) {
      const b = stemAt(pd.q), sw = this.reduced ? 0 : Math.sin(t * 1.2 + pd.k) * .06;
      ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(pd.side * .35 + sw);
      ctx.strokeStyle = '#6d8f3c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(pd.side * 4, 6); ctx.stroke();
      ctx.translate(pd.side * 4, 6);
      const pg = ctx.createLinearGradient(-4, 0, 4, 0); pg.addColorStop(0, '#5f8f34'); pg.addColorStop(.5, '#a7cf5f'); pg.addColorStop(1, '#5f8f34');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-2, 0);
      ctx.bezierCurveTo(-5, pd.len * .3, -4 + pd.side * 4, pd.len * .7, pd.side * 6, pd.len); ctx.bezierCurveTo(pd.side * 6 + 2, pd.len * .7, 5, pd.len * .3, 2, 0); ctx.fill();
      ctx.fillStyle = 'rgba(220,240,160,.35)'; for (let s = 0; s < 4; s++) { ctx.beginPath(); ctx.ellipse(pd.side * s * 1.2, pd.len * (.2 + s * .2), 1.6, 3.4, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    for (const lf of geo.leaves) if (!lf.back) drawLeaf(lf, false);
    for (const fl of geo.flowers) {
      const b = stemAt(fl.q); ctx.save(); ctx.translate(b[0] + fl.side * 7, b[1] - 2);
      ctx.fillStyle = '#f7f0fa'; ctx.beginPath(); ctx.ellipse(0, -3, 4.2, 3.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9c2ef'; ctx.beginPath(); ctx.ellipse(fl.side * 2.2, 0, 2.6, 2, fl.side * .5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9dbf5c'; ctx.beginPath(); ctx.arc(0, 2, 1.4, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- roots and nodules ---------- */
  function buildRoots() {
    const rand = seeded(712), lines = [], nodules = [], hairs = [];
    const tap = []; for (let i = 0; i <= 16; i++) tap.push([Math.sin(i * .7) * 3.5 + i * .3, i * 13.5]);
    lines.push({ pts: tap, w0: 4.2, w1: 1, depth: 0 });
    const depths = [10, 22, 36, 52, 70, 92, 116, 142, 170, 196];
    depths.forEach((d, k) => {
      for (const side of k < 4 ? [-1, 1] : [k % 2 ? -1 : 1]) {
        const i0 = Math.min(tap.length - 1, Math.round(d / 13.5)); let [x, y] = tap[i0];
        let a = side < 0 ? Math.PI - (.28 + k * .07) : (.28 + k * .07), len = (128 - d * .38) * (.8 + rand() * .3);
        const pts = [[x, y]];
        for (let s = 0; s < 12; s++) { a += (Math.PI / 2 - a) * .06 * side * side + (rand() - .5) * .25; x += Math.cos(a) * len / 12; y += Math.sin(a) * len / 12 * .9 + 1.2; pts.push([x, y]); }
        lines.push({ pts, w0: 2.4 - k * .12, w1: .5, depth: 1 });
        for (let j = 3; j < 11; j += 3 + Math.floor(rand() * 2)) {
          let [sx, sy] = pts[j], b = a + (rand() < .5 ? -1 : 1) * (.6 + rand() * .5); const sub = [[sx, sy]], sl = 18 + rand() * 22;
          for (let s = 0; s < 6; s++) { b += (Math.PI / 2 - b) * .08 + (rand() - .5) * .3; sx += Math.cos(b) * sl / 6; sy += Math.sin(b) * sl / 6 + .6; sub.push([sx, sy]); }
          lines.push({ pts: sub, w0: .9, w1: .3, depth: 2 });
          hairs.push(sub[sub.length - 1]);
        }
        hairs.push(pts[pts.length - 1]);
        if (d < 100) { const n = d < 50 ? 2 : 1; for (let q = 0; q < n; q++) { const j = 3 + Math.floor(rand() * 6), p = pts[j]; nodules.push({ x: p[0] + (rand() - .5) * 2, y: p[1] + 2.5, r: 3.2 + rand() * 2.6, phase: rand() * TAU }); } }
      }
    });
    return { lines, nodules, hairs };
  }
  P.rootToWorld = function (p) { const g = this.plantScale(), x0 = this.L.plantX, y0 = this.surface(x0); return [x0 + p[0] * g, y0 + p[1] * g]; };
  P.nodulePoints = function () { return this.rootGeo.nodules.map(n => this.rootToWorld([n.x, n.y])); };
  P.noduleCenter = function () { const pts = this.nodulePoints(); return [pts.reduce((v, p) => v + p[0], 0) / pts.length, pts.reduce((v, p) => v + p[1], 0) / pts.length]; };
  P.drawRoots = function (ctx, t) {
    const geo = this.rootGeo, g = this.plantScale(), x0 = this.L.plantX, y0 = this.surface(x0);
    const fix = this.activity('fixation'), zoomPx = this.s * this.camera.zoom * g;
    ctx.save(); ctx.translate(x0, y0); ctx.scale(g, g); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // rhizosphere halo
    const halo = ctx.createRadialGradient(0, 80, 10, 0, 90, 150); halo.addColorStop(0, 'rgba(255,214,150,.07)'); halo.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.ellipse(0, 90, 150, 130, 0, 0, TAU); ctx.fill();
    // Each root is drawn in three tapered chunks per pass (shadow, body, highlight).
    if (!geo.chunks) geo.chunks = geo.lines.flatMap(ln => { const n = ln.pts.length, k = Math.max(1, Math.min(3, Math.floor((n - 1) / 3))), out = []; for (let c = 0; c < k; c++) { const i0 = Math.floor(c * (n - 1) / k), i1 = Math.floor((c + 1) * (n - 1) / k); out.push({ pts: ln.pts.slice(i0, i1 + 1), w: lerp(ln.w0, ln.w1, (i0 + i1) / 2 / (n - 1)), color: mix('#f2e4c4', '#c4a77a', ln.pts[i1][1] / 240) }); } return out; });
    for (const pass of [0, 1, 2]) for (const ch of geo.chunks) {
      ctx.lineWidth = pass === 0 ? ch.w + 1.6 : pass === 1 ? ch.w : ch.w * .35;
      ctx.strokeStyle = pass === 0 ? 'rgba(20,10,4,.35)' : pass === 1 ? ch.color : 'rgba(255,250,230,.45)';
      const dx = pass === 2 ? -.3 : 0;
      ctx.beginPath(); ch.pts.forEach((p, i) => i ? ctx.lineTo(p[0] + dx, p[1]) : ctx.moveTo(p[0] + dx, p[1])); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(240,226,196,.22)'; ctx.lineWidth = .25; ctx.beginPath();
    for (const [hx, hy] of geo.hairs) for (let k = 0; k < 5; k++) { const a = .5 + k * .5; ctx.moveTo(hx - Math.cos(a) * 3, hy - Math.sin(a) * 1); ctx.lineTo(hx + Math.cos(a) * 2.6, hy + Math.sin(a) * 2.6); }
    ctx.stroke();
    for (const nd of geo.nodules) {
      const pulse = this.reduced ? 0 : (Math.sin(t * 3 + nd.phase) * .5 + .5);
      if (fix > 0) { const r = nd.r * (2.1 + pulse * .8); const gl = ctx.createRadialGradient(nd.x, nd.y, nd.r * .5, nd.x, nd.y, r); gl.addColorStop(0, rgba('#ff9fb6', .5 * fix)); gl.addColorStop(1, rgba('#ff9fb6', 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(nd.x, nd.y, r, 0, TAU); ctx.fill(); }
      const ng = ctx.createRadialGradient(nd.x - nd.r * .35, nd.y - nd.r * .4, nd.r * .1, nd.x, nd.y, nd.r);
      ng.addColorStop(0, '#ffd2da'); ng.addColorStop(.5, '#e2768c'); ng.addColorStop(1, '#8e3249');
      ctx.fillStyle = ng; ctx.beginPath(); ctx.ellipse(nd.x, nd.y, nd.r, nd.r * 1.12, 0, 0, TAU); ctx.fill();
      if (zoomPx * nd.r > 12) { // cut-away view: bacteroids inside the nodule
        ctx.fillStyle = 'rgba(120,30,50,.55)'; ctx.beginPath(); ctx.ellipse(nd.x, nd.y, nd.r * .72, nd.r * .8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ffb3c4'; ctx.lineWidth = .55;
        for (let k = 0; k < 7; k++) { const a = k * 2.4 + nd.phase, rr = nd.r * .45 * ((k % 3) / 3 + .3), bx = nd.x + Math.cos(a) * rr, by = nd.y + Math.sin(a) * rr; ctx.beginPath(); ctx.moveTo(bx - .7, by - .3); ctx.lineTo(bx + .7, by + .3); ctx.stroke(); }
      }
    }
    ctx.restore();
  };

  /* ---------- cow (drawn facing right, mirrored to face the plant) ---------- */
  // Journey mode sets cowAnim (where to stand, how to hold the head, what is happening);
  // cowRig turns it into smooth motion, so the cow walks rather than jumps unless a
  // scene cut asks for a snap.
  const ORGANS = { rumen: [-6, -112], liver: [64, -124], anus: [-116, -124] };
  P.cowDX = function () { return this.cowRig ? this.cowRig.dx : 0; };
  P.updateCow = function (dt) {
    const A = this.cowAnim, rig = this.cowRig || (this.cowRig = { dx: 0, gait: 0, amp: 0, xray: 0, leafI: -1, leafGone: 0, fresh: 0, poopT: null });
    const target = A ? A.dx || 0 : 0, before = rig.dx;
    if (A && (A.exact || A.snap)) rig.dx = target;
    else { const d = target - rig.dx; rig.dx += Math.sign(d) * Math.min(Math.abs(d), dt * 90); }
    const moved = A && A.snap ? 0 : rig.dx - before, speed = dt > 0 ? Math.abs(moved) / dt : 0;
    rig.gait -= moved / (88 * this.L.cowK) * TAU; // stepping forward (toward the head) advances the gait
    rig.amp = A && A.snap ? 0 : rig.amp + ((this.reduced ? 0 : clamp(speed / 45, 0, 1)) - rig.amp) * (1 - Math.exp(-dt * 10));
    rig.xray += ((A && A.xray ? 1 : 0) - rig.xray) * (1 - Math.exp(-dt * 5));
    if (A && A.leafGone) { rig.leafI = this.biteLeafIndex(); rig.leafGone = 1; } else rig.leafGone = Math.max(0, rig.leafGone - dt * .7);
    rig.fresh = A && A.fresh ? 1 : Math.max(0, rig.fresh - dt * .35);
    rig.poopT = A && A.poopT !== undefined ? A.poopT : null;
  };
  P.cowPose = function () {
    const t = this.clock, A = this.cowAnim || {}, rig = this.cowRig || { amp: 0, gait: 0, xray: 0 }, feeding = this.activity('feeding') > .05;
    const cycle = this.reduced ? 0 : (t % 12) / 12;
    // grazes most of the time and lifts its head to look around now and then; walking lifts it too
    const lift = Math.max(feeding ? smooth((cycle - .7) / .07) * (1 - smooth((cycle - .9) / .07)) : 1, rig.amp), jaw = A.chew !== undefined;
    const chew = this.reduced ? 0 : Math.sin(t * (jaw ? 9.5 : 8)) * (jaw ? A.chew : lift < .5 ? 1 : .3);
    return {
      graze: 1 - lift, chew,
      tail: this.reduced ? 0 : Math.sin(t * 1.5) * .5 + Math.sin(t * .37) * .3,
      ear: this.reduced ? 0 : Math.max(0, Math.sin(t * 2.1) - .9) * 6,
      breathe: this.reduced ? 0 : Math.sin(t * 1.4),
      gait: rig.gait, amp: rig.amp, xray: rig.xray, organ: A.organ || null, tailLift: A.tailLift || 0,
      head: A.head || null, headW: A.headW || 0, biteHead: A.bite ? headForMouth(this.worldToCow(A.bite)) : null, biteW: A.biteW || 0,
      mouth: Math.max(A.open || 0, jaw ? Math.max(0, chew) * .45 : 0), leaf: A.leaf || 0, bolus: A.bolus === undefined ? -1 : A.bolus
    };
  };
  // Head angle that puts the mouth on a target: level for high leaves, nose-down for grass.
  function headForMouth(m) {
    const a = lerp(1.32, .1, clamp((-m[1] - 4) / 150, 0, 1));
    return { x: m[0] - (Math.cos(a) * 62 - Math.sin(a) * 8), y: m[1] - (Math.sin(a) * 62 + Math.cos(a) * 8), a };
  }
  function cowHead(pose) { // poll position and head angle in cow space
    const g = pose.graze; let h = { x: lerp(120, 136, g), y: lerp(-150, -66, g), a: lerp(.55, 1.32, g) };
    if (pose.amp) h.y += Math.sin((pose.gait || 0) * 2) * 2.2 * pose.amp; // nods as it walks
    for (const [o, w] of [[pose.head, pose.headW], [pose.biteHead, pose.biteW]]) if (o && w > 0) h = { x: lerp(h.x, o.x, w), y: lerp(h.y, o.y, w), a: lerp(h.a, o.a, w) };
    h.y += pose.chew * .5;
    return h;
  }
  const headPt = (h, px, py) => [h.x + Math.cos(h.a) * px - Math.sin(h.a) * py, h.y + Math.sin(h.a) * px + Math.cos(h.a) * py];
  // The food pipe, from the throat down the neck into the rumen (cow space).
  const gulletPts = h => [headPt(h, 4, 14), headPt(h, -14, 19), [100, -108], [74, -114], [44, -115], [18, -114], ORGANS.rumen];
  const GUT = [ORGANS.liver, [44, -98], [24, -78], [0, -72], [-20, -80], [-34, -70], [-50, -82], [-64, -70], [-80, -84], [-94, -74], [-104, -94], [-110, -112], ORGANS.anus];
  function polyAt(pts, u) {
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let d = clamp(u, 0, 1) * total;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const f = seg[i] ? clamp(d / seg[i], 0, 1) : 0; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; } d -= seg[i]; }
    return pts[pts.length - 1].slice();
  }
  P.cowToWorld = function (p) { const k = this.L.cowK, x = this.L.cowX + this.cowDX(), y = this.surface(x) - 1; return [x - p[0] * k, y + p[1] * k]; };
  P.worldToCow = function (w) { const k = this.L.cowK, x = this.L.cowX + this.cowDX(), y = this.surface(x) - 1; return [(x - w[0]) / k, (w[1] - y) / k]; };
  P.cowPoint = function (which) {
    const h = cowHead(this.cowPose());
    if (which === 'mouth') return this.cowToWorld(headPt(h, 62, 8));
    if (which === 'back') return this.cowToWorld([-10, -162]);
    if (which === 'rear') return this.cowToWorld([-114, -86]);
    if (ORGANS[which]) return this.cowToWorld(ORGANS[which]);
    return this.cowToWorld([0, -105]);
  };
  P.gulletPoint = function (u) { return this.cowToWorld(polyAt(gulletPts(cowHead(this.cowPose())), u)); };
  P.gutPoint = function (u) { return this.cowToWorld(polyAt(GUT, u)); };
  P.cowBox = function () { const k = this.L.cowK, x = this.L.cowX + this.cowDX(), y = this.surface(x); return [x - 200 * k, y - 170 * k, x + 125 * k, y + 4]; };

  function cowBody(ctx) {
    ctx.beginPath(); ctx.moveTo(52, -147);
    ctx.bezierCurveTo(28, -151, -2, -143, -30, -146);
    ctx.bezierCurveTo(-48, -148, -62, -154, -78, -151);
    ctx.bezierCurveTo(-92, -149, -104, -147, -111, -139);
    ctx.bezierCurveTo(-119, -128, -119, -106, -111, -94);
    ctx.bezierCurveTo(-105, -84, -97, -76, -86, -70);
    ctx.bezierCurveTo(-62, -58, -22, -52, 16, -56);
    ctx.bezierCurveTo(46, -59, 72, -66, 88, -80);
    ctx.bezierCurveTo(99, -90, 104, -108, 99, -124);
    ctx.bezierCurveTo(94, -137, 78, -146, 52, -147);
    ctx.closePath();
  }
  function frontLeg(ctx, fx) {
    ctx.beginPath(); ctx.moveTo(fx - 13, -104);
    ctx.bezierCurveTo(fx - 13, -80, fx - 11, -60, fx - 8, -46);
    ctx.bezierCurveTo(fx - 7, -42, fx - 7, -40, fx - 6, -36);
    ctx.lineTo(fx - 5, -15); ctx.bezierCurveTo(fx - 5, -11, fx - 6, -8, fx - 7, -6);
    ctx.lineTo(fx + 7, -6); ctx.bezierCurveTo(fx + 6, -8, fx + 5, -11, fx + 5, -15);
    ctx.lineTo(fx + 5, -36); ctx.bezierCurveTo(fx + 8, -40, fx + 9, -46, fx + 8, -50);
    ctx.bezierCurveTo(fx + 11, -64, fx + 15, -82, fx + 15, -104); ctx.closePath();
  }
  function rearLeg(ctx, rx) {
    ctx.beginPath(); ctx.moveTo(rx + 18, -96);
    ctx.bezierCurveTo(rx + 16, -80, rx + 9, -66, rx + 5, -54);
    ctx.bezierCurveTo(rx + 3, -48, rx + 3, -42, rx + 4, -36);
    ctx.lineTo(rx + 5, -15); ctx.bezierCurveTo(rx + 5, -11, rx + 6, -8, rx + 7, -6);
    ctx.lineTo(rx - 8, -6); ctx.bezierCurveTo(rx - 7, -9, rx - 6, -12, rx - 6, -16);
    ctx.lineTo(rx - 7, -38); ctx.bezierCurveTo(rx - 9, -44, rx - 12, -48, rx - 15, -52);
    ctx.bezierCurveTo(rx - 20, -62, rx - 24, -78, rx - 26, -96);
    ctx.bezierCurveTo(rx - 27, -106, rx - 24, -114, rx - 18, -118); ctx.closePath();
  }
  function hoof(ctx, x, dark) {
    const g = ctx.createLinearGradient(0, -8, 0, 0); g.addColorStop(0, dark ? '#2a241e' : '#3d342c'); g.addColorStop(1, '#16120f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 8, 0); ctx.bezierCurveTo(x - 8, -4, x - 7, -7, x - 6, -8); ctx.lineTo(x + 6, -8); ctx.bezierCurveTo(x + 8, -6, x + 9, -3, x + 10, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x + 2, -7.5); ctx.lineTo(x + 2.5, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x - 6, -7.6, 12, 1.1);
  }
  function legPaint(ctx, x0, dark) {
    const g = ctx.createLinearGradient(x0 - 15, 0, x0 + 15, 0);
    if (dark) { g.addColorStop(0, '#9e978a'); g.addColorStop(.5, '#c7c0b3'); g.addColorStop(1, '#a8a194'); }
    else { g.addColorStop(0, '#c4bdb0'); g.addColorStop(.45, '#fbf8f2'); g.addColorStop(1, '#d9d2c5'); }
    return g;
  }

  P.drawCow = function (ctx, t) {
    const k = this.L.cowK, x = this.L.cowX + this.cowDX(), y = this.surface(x) - 1, pose = this.cowPose(), h = cowHead(pose);
    const black = '#22201d', amp = pose.amp, ph = pose.gait, swing = .26 * amp, bob = Math.sin(ph * 2) * 1.4 * amp;
    // a walking leg swings from the hip and lifts its hoof while it moves forward
    const leg = (lx, top, p) => { const lift = Math.max(0, -Math.cos(p)) * 7 * amp; ctx.translate(lx, top - lift); ctx.rotate(swing * Math.sin(p)); ctx.translate(-lx, -top); };
    ctx.save(); ctx.translate(x, y); ctx.scale(-k, k); ctx.lineJoin = 'round';
    const sh = ctx.createRadialGradient(-6, 1, 10, -6, 1, 135); sh.addColorStop(0, 'rgba(20,30,15,.45)'); sh.addColorStop(1, 'rgba(20,30,15,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(-6, 1, 135, 11, 0, 0, TAU); ctx.fill();
    // far legs, in shade
    for (const [fn, lx, top, p] of [[frontLeg, 60, -104, ph + Math.PI], [rearLeg, -70, -110, ph]]) { ctx.save(); leg(lx, top, p); ctx.fillStyle = legPaint(ctx, lx, true); fn(ctx, lx); ctx.fill(); hoof(ctx, lx, true); ctx.restore(); }
    // tail hugs the buttock and swings below; it lifts in an arch when the cow drops dung
    ctx.save(); ctx.translate(0, bob);
    // raised, it arches back and away from the body in a wide curve, the tuft hanging clear
    const sw = Math.sin(pose.tail), L = pose.tailLift, tipX = lerp(-119 - sw * 16, -178 - sw * 2, L), tipY = lerp(-40 + Math.abs(sw) * 4, -118, L);
    ctx.strokeStyle = '#ece6da'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-108, -142); ctx.bezierCurveTo(lerp(-120, -120, L), lerp(-126, -166, L), lerp(-121, -166, L), lerp(-90, -160, L), tipX, tipY + 6); ctx.stroke();
    ctx.fillStyle = black; ctx.beginPath(); ctx.moveTo(tipX - 1, tipY - 6); ctx.bezierCurveTo(tipX - 7, tipY + 2, tipX - 6, tipY + 14, tipX, tipY + 18); ctx.bezierCurveTo(tipX + 6, tipY + 14, tipX + 6, tipY + 2, tipX + 1, tipY - 6); ctx.fill();
    ctx.restore();
    // near legs (their tops tuck under the body)
    for (const [fn, lx, patch, top, p] of [[frontLeg, 74, false, -104, ph], [rearLeg, -84, true, -110, ph + Math.PI]]) {
      ctx.save(); leg(lx, top, p);
      ctx.fillStyle = legPaint(ctx, lx, false); fn(ctx, lx); ctx.fill();
      ctx.save(); fn(ctx, lx); ctx.clip();
      const ao = ctx.createLinearGradient(0, -74, 0, -46); ao.addColorStop(0, 'rgba(60,50,40,.45)'); ao.addColorStop(1, 'rgba(60,50,40,0)'); ctx.fillStyle = ao; ctx.fillRect(lx - 30, -80, 60, 36);
      if (patch) { ctx.fillStyle = black; ctx.beginPath(); ctx.moveTo(lx - 30, -120); ctx.bezierCurveTo(lx - 4, -112, lx + 4, -92, lx - 6, -78); ctx.bezierCurveTo(lx - 14, -70, lx - 26, -76, lx - 30, -88); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(70,60,50,.28)'; ctx.lineWidth = .9; fn(ctx, lx); ctx.stroke();
      hoof(ctx, lx, false);
      ctx.restore();
    }
    ctx.save(); ctx.translate(0, bob);
    // shared coat gradient keeps body and neck seamless
    const coat = ctx.createLinearGradient(0, -160, 0, -50); coat.addColorStop(0, '#fffdf9'); coat.addColorStop(.55, '#f4f0e8'); coat.addColorStop(1, '#cdc6b8');
    // neck from shoulder to the head
    const top = headPt(h, 2, -12), bot = headPt(h, 6, 18), c2 = headPt(h, -18, -16), c3 = headPt(h, -10, 26);
    const neck = () => { ctx.beginPath(); ctx.moveTo(36, -149); ctx.bezierCurveTo(78, -153, c2[0], c2[1], top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.bezierCurveTo(c3[0], c3[1], 106, -96, 96, -100); ctx.lineTo(62, -104); ctx.closePath(); };
    neck(); ctx.fillStyle = coat; ctx.fill();
    ctx.save(); neck(); ctx.clip();
    ctx.fillStyle = black; const nb = headPt(h, -14, 4); ctx.beginPath(); ctx.ellipse(nb[0], nb[1], 30, 24, h.a, 0, TAU); ctx.fill();
    const dewl = ctx.createLinearGradient(bot[0], bot[1], 96, -100); dewl.addColorStop(0, 'rgba(60,50,40,0)'); dewl.addColorStop(1, 'rgba(60,50,40,.18)'); ctx.fillStyle = dewl; ctx.fillRect(40, -170, 140, 180);
    if (pose.xray > .02) { ctx.fillStyle = rgba('#0b1d24', .62 * pose.xray); ctx.fillRect(20, -240, 220, 240); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,60,50,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(52, -150); ctx.bezierCurveTo(78, -153, c2[0], c2[1], top[0], top[1]); ctx.moveTo(bot[0], bot[1]); ctx.bezierCurveTo(c3[0], c3[1], 106, -96, 96, -100); ctx.stroke();
    ctx.save(); ctx.translate(0, -50); ctx.scale(1, 1 + pose.breathe * .006); ctx.translate(0, 50);
    cowBody(ctx); ctx.fillStyle = coat; ctx.fill();
    ctx.save(); ctx.clip();
    const pg = ctx.createLinearGradient(0, -160, 0, -50); pg.addColorStop(0, '#34312d'); pg.addColorStop(1, '#171614'); ctx.fillStyle = pg;
    ctx.beginPath(); ctx.moveTo(30, -152); ctx.bezierCurveTo(50, -140, 66, -150, 80, -140); ctx.bezierCurveTo(92, -130, 86, -112, 72, -110); ctx.bezierCurveTo(58, -108, 54, -122, 40, -120); ctx.bezierCurveTo(26, -118, 20, -136, 30, -152); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20, -150); ctx.bezierCurveTo(-2, -150, 6, -132, -2, -118); ctx.bezierCurveTo(-8, -104, 4, -90, -14, -84); ctx.bezierCurveTo(-34, -78, -46, -96, -44, -112); ctx.bezierCurveTo(-42, -126, -52, -138, -40, -148); ctx.bezierCurveTo(-34, -152, -26, -151, -20, -150); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-80, -156); ctx.bezierCurveTo(-66, -150, -70, -130, -82, -122); ctx.bezierCurveTo(-94, -114, -104, -124, -114, -118); ctx.lineTo(-124, -142); ctx.bezierCurveTo(-112, -154, -96, -158, -80, -156); ctx.fill();
    ctx.beginPath(); ctx.moveTo(26, -74); ctx.bezierCurveTo(40, -80, 56, -74, 54, -64); ctx.bezierCurveTo(48, -56, 30, -58, 24, -64); ctx.bezierCurveTo(20, -68, 21, -72, 26, -74); ctx.fill();
    // volume: barrel highlight and underside shade
    const hl = ctx.createRadialGradient(-6, -128, 6, -6, -118, 90); hl.addColorStop(0, 'rgba(255,255,255,.18)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hl; ctx.fillRect(-130, -170, 240, 130);
    const un = ctx.createLinearGradient(0, -96, 0, -52); un.addColorStop(0, 'rgba(50,40,30,0)'); un.addColorStop(1, 'rgba(50,40,30,.3)'); ctx.fillStyle = un; ctx.fillRect(-130, -100, 240, 50);
    ctx.strokeStyle = 'rgba(90,80,70,.2)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-70, -148); ctx.quadraticCurveTo(-80, -118, -98, -100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(76, -136); ctx.quadraticCurveTo(66, -108, 80, -84); ctx.stroke();
    if (pose.xray > .02) xrayOrgans(ctx, pose, t); // see-through body: where the atom is inside the cow
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,60,50,.32)'; ctx.lineWidth = 1; cowBody(ctx); ctx.stroke();
    ctx.restore();
    // udder
    const ug = ctx.createLinearGradient(0, -64, 0, -44); ug.addColorStop(0, '#f2c1b8'); ug.addColorStop(1, '#d99488');
    ctx.fillStyle = ug; ctx.beginPath(); ctx.moveTo(-64, -62); ctx.bezierCurveTo(-62, -44, -36, -42, -32, -60); ctx.fill();
    ctx.fillStyle = '#d78b80'; for (const tx of [-55, -41]) { ctx.beginPath(); ctx.ellipse(tx, -45, 2, 4.2, 0, 0, TAU); ctx.fill(); }
    if (pose.xray > .02) gullet(ctx, pose, h);
    // head
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a);
    ctx.save(); ctx.translate(4, -4); ctx.rotate(-2.25 - pose.ear * .25); // ear
    ctx.fillStyle = black; ctx.beginPath(); ctx.moveTo(0, -4); ctx.bezierCurveTo(10, -9, 22, -6, 24, 0); ctx.bezierCurveTo(22, 6, 10, 9, 0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a39a'; ctx.beginPath(); ctx.ellipse(12, 0, 8.5, 3.2, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#efe4c6'; ctx.beginPath(); ctx.moveTo(2, -12); ctx.quadraticCurveTo(-4, -20, 2, -27); ctx.quadraticCurveTo(5, -20, 9, -13); ctx.closePath(); ctx.fill(); // horn
    const head = () => { ctx.beginPath(); ctx.moveTo(-2, -12); ctx.bezierCurveTo(14, -17, 34, -15, 48, -10); ctx.bezierCurveTo(56, -7, 62, -6, 66, 0); ctx.bezierCurveTo(70, 6, 68, 15, 60, 17); ctx.bezierCurveTo(52, 19, 44, 17, 38, 16); ctx.bezierCurveTo(26, 22, 10, 22, 0, 16); ctx.bezierCurveTo(-6, 12, -6, -6, -2, -12); ctx.closePath(); };
    head(); const hg = ctx.createLinearGradient(0, -16, 0, 22); hg.addColorStop(0, '#3a3732'); hg.addColorStop(1, '#161514'); ctx.fillStyle = hg; ctx.fill();
    ctx.save(); head(); ctx.clip();
    ctx.fillStyle = '#f7f3ec'; ctx.beginPath(); ctx.moveTo(14, -18); ctx.bezierCurveTo(30, -15, 50, -11, 62, -6); ctx.lineTo(60, 0); ctx.bezierCurveTo(48, -4, 32, -6, 16, -8); ctx.closePath(); ctx.fill(); // blaze
    const mg = ctx.createRadialGradient(60, 4, 1, 61, 6, 11); mg.addColorStop(0, '#f0c2b8'); mg.addColorStop(1, '#c98f86'); ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(61, 6, 9, 11, .15, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.ellipse(24, 8, 14, 8, .1, 0, TAU); ctx.fill(); // cheek
    ctx.restore();
    ctx.fillStyle = '#5a3a35'; ctx.beginPath(); ctx.ellipse(65, 1.5, 1.7, 2.6, .5, 0, TAU); ctx.fill();
    const m = pose.mouth;
    if (m > .02) { // the jaw drops: a dark mouth, then the lower jaw swung down from its hinge
      const ja = m * .38, f = [28 + 38 * Math.cos(ja), 12 + 38 * Math.sin(ja)];
      ctx.fillStyle = '#3d1c1e'; ctx.beginPath(); ctx.moveTo(28, 12); ctx.lineTo(66, 11); ctx.lineTo(f[0], f[1]); ctx.closePath(); ctx.fill();
      if (pose.leaf > .02) leafInMouth(ctx, pose.leaf, t, [64, lerp(12, f[1], .45)]);
      ctx.save(); ctx.translate(28, 12); ctx.rotate(ja); ctx.translate(-28, -12);
      ctx.fillStyle = '#1b1a18'; ctx.beginPath(); ctx.moveTo(28, 12); ctx.lineTo(64, 12); ctx.bezierCurveTo(68, 13, 66, 18, 60, 18.5); ctx.bezierCurveTo(52, 20, 44, 18, 38, 17.5); ctx.bezierCurveTo(32, 18, 28, 16, 28, 12); ctx.fill();
      ctx.fillStyle = '#c98f86'; ctx.beginPath(); ctx.ellipse(60, 14.5, 6, 2.8, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      if (pose.leaf > .02) leafInMouth(ctx, pose.leaf, t, [64, 13]);
      ctx.strokeStyle = '#6a4842'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(54, 14 + pose.chew * .4); ctx.quadraticCurveTo(60, 16 + pose.chew * .6, 65, 13); ctx.stroke();
    }
    ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.ellipse(24, -3, 4.4, 3.3, .1, 0, TAU); ctx.fill(); // eye
    ctx.fillStyle = '#120e0c'; ctx.beginPath(); ctx.ellipse(25, -3, 3.1, 2.9, .1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(26.2, -4.2, .9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#0d0b0a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(24.5, -2.6, 5, 3.5, 5.7); ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.restore();
  };
  function smoothPath(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
  }
  // X-ray of the trunk: spine, ribs, rumen, true stomach, liver and intestines.
  function xrayOrgans(ctx, pose, t) {
    const a = pose.xray, pulse = .5 + .5 * Math.sin(t * 5), on = id => pose.organ === id ? pulse : 0;
    ctx.fillStyle = rgba('#0b1d24', .62 * a); ctx.fillRect(-140, -180, 300, 150);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#d6eef7', .13 * a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-108, -140); ctx.bezierCurveTo(-60, -150, 10, -147, 76, -146); ctx.stroke();
    ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const rx = 62 - i * 10; ctx.beginPath(); ctx.moveTo(rx, -146); ctx.quadraticCurveTo(rx - 12, -112, rx - 4, -76 + i * 1.5); ctx.stroke(); }
    const organ = (path, fill, edge, glow) => { path(); ctx.fillStyle = rgba(fill, (.36 + glow * .3) * a); ctx.fill(); ctx.strokeStyle = rgba(edge, (.7 + glow * .3) * a); ctx.lineWidth = 1.5 + glow * 1.5; ctx.stroke(); };
    // intestines wind back to the tail end
    const gl = on('gut'); smoothPath(ctx, [[40, -84]].concat(GUT.slice(2)));
    ctx.strokeStyle = rgba('#f0a6a6', (.5 + gl * .4) * a); ctx.lineWidth = 8 + gl * 2; ctx.stroke();
    ctx.strokeStyle = rgba('#ffd9d0', (.45 + gl * .4) * a); ctx.lineWidth = 2.4; ctx.stroke();
    // the rumen: a huge fermenting stomach, with plant matter churning inside
    const gr = on('rumen');
    organ(() => { ctx.beginPath(); ctx.ellipse(ORGANS.rumen[0], ORGANS.rumen[1], 44, 30, -.08, 0, TAU); }, '#8fbf5a', '#d4f5a0', gr);
    ctx.strokeStyle = rgba('#e9f7b0', .5 * a); ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const q = t * .7 + i * 1.05, cx = ORGANS.rumen[0] + Math.cos(q) * 24, cy = ORGANS.rumen[1] + Math.sin(q) * 14; ctx.beginPath(); ctx.arc(cx, cy, 5, q, q + 2); ctx.stroke(); }
    organ(() => { ctx.beginPath(); ctx.ellipse(34, -88, 16, 9, .35, 0, TAU); }, '#e7a07a', '#ffd0b0', gr * .6);
    organ(() => { ctx.beginPath(); ctx.ellipse(ORGANS.liver[0], ORGANS.liver[1], 12, 18, .35, 0, TAU); }, '#b8434a', '#ff9a9a', on('liver'));
  }
  function gullet(ctx, pose, h) {
    const a = pose.xray, pts = gulletPts(h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    smoothPath(ctx, pts); ctx.strokeStyle = rgba('#ffd9b8', .45 * a); ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = rgba('#7a3b3b', .5 * a); ctx.lineWidth = 2.6; ctx.stroke();
    if (pose.bolus >= 0 && pose.bolus <= 1) { // the chewed mouthful sliding down
      const [bx, by] = polyAt(pts, pose.bolus), g = ctx.createRadialGradient(bx, by, 0, bx, by, 12);
      g.addColorStop(0, 'rgba(216,245,154,.9)'); g.addColorStop(1, 'rgba(159,209,106,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7fb24c'; ctx.beginPath(); ctx.ellipse(bx, by, 6, 4.5, 0, 0, TAU); ctx.fill();
    }
  }
  function leafInMouth(ctx, amount, t, at) {
    const s = 18 * amount, wob = Math.sin(t * 9.5) * .16;
    ctx.save(); ctx.translate(at[0] - 3, at[1]); ctx.rotate(.4 + wob);
    ctx.strokeStyle = '#6f9440'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(s * .45, 0); ctx.stroke();
    for (const [ang, f] of [[-.75, .8], [.8, .78], [0, 1]]) {
      ctx.save(); ctx.translate(s * .45, 0); ctx.rotate(ang);
      const l = s * f, w = l * .38, g = ctx.createLinearGradient(0, -w, 0, w); g.addColorStop(0, '#a5d66e'); g.addColorStop(1, '#3e7a2c');
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(l * .15, -w, l * .7, -w, l, 0); ctx.bezierCurveTo(l * .7, w, l * .15, w, 0, 0); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // Names the organ our atom is in, drawn upright in world space.
  P.drawCowLabels = function (ctx) {
    const rig = this.cowRig, A = this.cowAnim; if (!rig || rig.xray < .35 || !A || !A.organ) return;
    const name = { rumen: 'stomach (rumen)', liver: 'liver', gut: 'intestine' }[A.organ], at = A.organ === 'gut' ? this.gutPoint(.55) : this.cowPoint(A.organ);
    const px = this.s * this.camera.zoom, k = this.L.cowK;
    // below the organ, so it never sits on the atom's formula tag (which floats above the atom)
    ctx.save(); ctx.translate(at[0], at[1] + ({ rumen: 44, liver: 32, gut: -26 }[A.organ]) * k); ctx.scale(1 / px, 1 / px); ctx.globalAlpha = clamp((rig.xray - .35) * 2, 0, 1);
    ctx.font = '700 12px system-ui, sans-serif'; const w = ctx.measureText(name).width + 18;
    ctx.fillStyle = 'rgba(8,22,26,.82)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -11, w, 22, 11) : ctx.rect(-w / 2, -11, w, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(180,235,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e8f8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, 0, .5);
    ctx.restore();
  };

  /* ---------- dung: the drop, the splat and the fresh pat ---------- */
  const DROPS = [{ s: 1.6, r: 12, dx: 0 }, { s: 2.2, r: 10, dx: 6 }, { s: 2.75, r: 8, dx: -5 }];
  // Pieces of dung at time T of the drop; also used to carry the atom down with the first one.
  P.dungDrop = function (T) {
    const k = this.L.cowK, px = this.L.dungX - 6, ay = this.cowPoint('anus')[1], base = this.surface(px) - 5 * k, g = 1500 * k, out = [];
    let stack = 0;
    for (const d of DROPS) {
      const e = T - d.s, r = d.r * k, x = px + d.dx * k; if (e < 0) break;
      const ex = .42, y0 = ay + r * 1.3, rest = base - stack - r * .5, tl = ex + Math.sqrt(Math.max(0, 2 * (rest - y0) / g));
      if (e < ex) { const len = r * 2.6 * e / ex; out.push({ x, y: ay + len / 2 - r * .2, rx: r * .72, ry: len / 2 + r * .25, state: 'hang', r }); }
      else if (e < tl) { const f = e - ex; out.push({ x, y: y0 + .5 * g * f * f, rx: r * .78, ry: r * 1.2, state: 'fall', r }); }
      else { const f = e - tl, wob = Math.exp(-f * 7) * Math.cos(f * 28); out.push({ x, y: rest, rx: r * (1.35 + .3 * wob), ry: r * (.58 - .18 * wob), state: 'land', since: f, r }); }
      stack += r * .75;
    }
    return out;
  };
  P.drawFreshDung = function (ctx, t) {
    const rig = this.cowRig; if (!rig || (rig.poopT === null && rig.fresh <= .01)) return;
    const pieces = this.dungDrop(rig.poopT !== null ? rig.poopT : 99), k = this.L.cowK;
    ctx.save(); ctx.globalAlpha = rig.poopT !== null ? 1 : rig.fresh;
    for (const p of pieces) {
      const g = ctx.createRadialGradient(p.x - p.rx * .3, p.y - p.ry * .5, 1, p.x, p.y, Math.max(p.rx, p.ry) * 1.2);
      g.addColorStop(0, '#7a5534'); g.addColorStop(.6, '#4f3520'); g.addColorStop(1, '#2e1f12'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,200,.28)'; ctx.beginPath(); ctx.ellipse(p.x - p.rx * .3, p.y - p.ry * .45, p.rx * .35, p.ry * .18, -.2, 0, TAU); ctx.fill(); // wet shine
      if (p.state === 'land' && p.since < .5) { // splat
        const f = p.since, fade = 1 - f / .5; ctx.fillStyle = rgba('#4a3220', fade);
        for (let i = 0; i < 7; i++) { const a = -Math.PI * (.12 + .76 * i / 6), v = (70 + (i % 3) * 22) * k; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * v * f, p.y + Math.sin(a) * v * f + 260 * k * f * f, 1.7 * k, 0, TAU); ctx.fill(); }
      }
    }
    // a fresh pat steams and draws a couple of flies
    const landed = pieces.filter(p => p.state === 'land'), top = landed.length ? Math.min(...landed.map(p => p.y - p.ry)) : null;
    if (top !== null && !this.reduced) {
      const px = this.L.dungX - 6;
      for (let i = 0; i < 3; i++) { const u = (t * .45 + i / 3) % 1, sx = px + (i - 1) * 6 * k + Math.sin(t * 2 + i) * 3 * k * u, sy = top - 4 - u * 30 * k; ctx.fillStyle = rgba('#f2efe6', Math.sin(u * Math.PI) * .22); ctx.beginPath(); ctx.arc(sx, sy, (3 + u * 5) * k, 0, TAU); ctx.fill(); }
      if (landed.length === DROPS.length) for (let i = 0; i < 2; i++) {
        const a = t * (3.2 + i * 1.3) + i * 2, fx = px + Math.cos(a) * 15 * k, fy = top - 12 * k + Math.sin(a * 1.4) * 6 * k, flap = Math.abs(Math.sin(t * 70 + i));
        ctx.fillStyle = 'rgba(230,240,255,.6)'; ctx.beginPath(); ctx.ellipse(fx - 1.2 * k, fy - 1.4 * k, 1.6 * k, .8 * k * flap + .2, -.5, 0, TAU); ctx.ellipse(fx + 1.2 * k, fy - 1.4 * k, 1.6 * k, .8 * k * flap + .2, .5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(fx, fy, 1.3 * k, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------- microorganisms, litter, dung ---------- */
  function capsule(ctx, x, y, len, r, a, fill, edge) {
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = edge; ctx.lineWidth = r * 2 + .9; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = r * 2; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = r * .55; ctx.beginPath(); ctx.moveTo(x - dx * .6 - .3, y - dy * .6 - r * .35); ctx.lineTo(x + dx * .6 - .3, y + dy * .6 - r * .35); ctx.stroke();
  }
  P.drawColony = function (ctx, id, x, y, t, emphasis = 0) {
    const m = MICROBES[id], act = this.activity(m.process === 'nitri1' || m.process === 'nitri2' ? m.process : m.process), wig = this.reduced ? 0 : 1;
    const level = clamp(act, 0, 1.4), pulse = wig ? Math.sin(t * 3 + x) * .5 + .5 : .5;
    const auraR = 30 + level * 10 + emphasis * 10;
    const aura = ctx.createRadialGradient(x, y, 2, x, y, auraR);
    aura.addColorStop(0, rgba(m.color, .1 + level * .22 + pulse * level * .1 + emphasis * .2)); aura.addColorStop(1, rgba(m.color, 0));
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, auraR, 0, TAU); ctx.fill();
    const rand = seeded(id.length * 97 + Math.round(x)), speed = .4 + level;
    const cells = id === 'nostoc' ? 0 : id === 'rhizobium' ? 6 : 9;
    for (let i = 0; i < cells; i++) {
      const ox = (rand() - .5) * 34, oy = (rand() - .5) * 24, ph = rand() * TAU;
      const cx = x + ox + Math.sin(t * speed + ph) * 2 * wig, cy = y + oy + Math.cos(t * speed * .8 + ph) * 1.6 * wig, ang = rand() * TAU + Math.sin(t * speed * .6 + ph) * .4 * wig;
      if (id === 'soilFixers') { // paired oval cells
        capsule(ctx, cx, cy, 2.2, 2.6, ang, '#a99cff', 'rgba(40,30,80,.6)'); capsule(ctx, cx + Math.cos(ang) * 5.6, cy + Math.sin(ang) * 5.6, 2.2, 2.6, ang, '#9a8cf2', 'rgba(40,30,80,.6)');
      } else if (id === 'nitrosomonas') capsule(ctx, cx, cy, 4, 2.3, ang, '#ffc857', 'rgba(90,60,10,.6)');
      else if (id === 'nitrobacter') { capsule(ctx, cx, cy, 3.4, 2.5, ang, '#4fd6c8', 'rgba(10,60,60,.6)'); }
      else if (id === 'denitrifiers' || id === 'rhizobium') {
        const col = id === 'rhizobium' ? '#ff8fa3' : '#c38bff';
        ctx.strokeStyle = rgba(col, .6); ctx.lineWidth = .45; ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * 4, cy - Math.sin(ang) * 4);
        for (let s = 1; s <= 6; s++) { const d = 4 + s * 2, w = Math.sin(s * 1.6 + t * 8 * wig) * 1.4; ctx.lineTo(cx - Math.cos(ang) * d - Math.sin(ang) * w, cy - Math.sin(ang) * d + Math.cos(ang) * w); }
        ctx.stroke();
        capsule(ctx, cx, cy, 5.5, 1.7, ang, col, 'rgba(50,20,60,.6)');
      } else if (id === 'decomposers') { // chains of rods
        capsule(ctx, cx, cy, 4.5, 1.5, ang, '#f0deb0', 'rgba(70,50,20,.6)'); capsule(ctx, cx + Math.cos(ang) * 6.4, cy + Math.sin(ang) * 6.4, 4.5, 1.5, ang + .1, '#e8d39f', 'rgba(70,50,20,.6)');
      }
    }
    if (id === 'nostoc') {
      ctx.fillStyle = 'rgba(46,86,38,.55)'; ctx.beginPath(); ctx.ellipse(x, y - 4, 26, 9, 0, 0, TAU); ctx.fill();
      for (let row = 0; row < 2; row++) for (let i = 0; i < 11; i++) {
        const cx = x - 22 + i * 4.4, cy = y - 6 + row * 5 + Math.sin(i * .7 + row * 2 + t * .8 * wig) * 1.6, het = i === 4 + row * 3;
        ctx.fillStyle = het ? '#f2dd9a' : '#8fdc6a'; ctx.beginPath(); ctx.arc(cx, cy, het ? 2.6 : 1.9, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(cx - .5, cy - .6, .5, 0, TAU); ctx.fill();
      }
    }
  };

  P.drawHyphae = function (ctx, t) {
    const act = clamp(this.activity('decomposition'), 0, 1.3);
    ctx.save(); ctx.lineCap = 'round';
    for (const set of this.hyphae) for (const h of set) {
      ctx.strokeStyle = rgba('#f4ead2', .22 + act * .25); ctx.lineWidth = h.w; ctx.beginPath();
      h.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      if (act > 0 && !this.reduced) { // nutrient pulses travelling along the threads
        const u = (t * .35 * (.5 + act) + h.phase) % 1, f = u * (h.pts.length - 1), i = Math.floor(f), p = h.pts[i], q = h.pts[Math.min(i + 1, h.pts.length - 1)];
        const px = lerp(p[0], q[0], f - i), py = lerp(p[1], q[1], f - i);
        ctx.fillStyle = rgba('#ffe7a8', .55 * act); ctx.beginPath(); ctx.arc(px, py, 1.4, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  function smallLeaf(ctx, x, y, s, a, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s * .2, -s * .55, s, 0); ctx.quadraticCurveTo(-s * .2, s * .55, -s, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,.35)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke(); ctx.restore();
  }
  P.smallLeaf = smallLeaf;
  P.drawLitter = function (ctx, t) {
    const L = this.L, sites = this.detritusSites || { plant: 16, animal: 16 }, rand = seeded(17);
    const lx = L.litterX, ly = this.surface(lx);
    const n = Math.round(clamp(sites.plant / 1.2, 3, 34));
    for (let i = 0; i < n; i++) {
      const u = rand(), x = lx + (rand() - .5) * (30 + n * 1.6), y = ly - 1 - rand() * Math.min(9, n * .35);
      const age = clamp(i / n + rand() * .3, 0, 1);
      smallLeaf(ctx, x, y, 6 + rand() * 4, rand() * TAU, mix(mix('#c9a34a', '#8a5a2b', age), '#4a3020', age * age));
      void u;
    }
    // mushrooms: fungi are decomposers too
    for (const [dx, h, s] of [[-26, 14, 1], [-18, 9, .7], [30, 11, .85]]) {
      const x = lx + dx, y = this.surface(x);
      ctx.fillStyle = '#efe6d2'; ctx.fillRect(x - 1.4 * s, y - h, 2.8 * s, h);
      const cg = ctx.createLinearGradient(0, y - h - 7 * s, 0, y - h + 2); cg.addColorStop(0, '#c98b56'); cg.addColorStop(1, '#8a5532');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x, y - h, 7.5 * s, 5.5 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,.7)'; ctx.beginPath(); ctx.arc(x - 2 * s, y - h - 3 * s, 1, 0, TAU); ctx.arc(x + 2.5 * s, y - h - 2 * s, .8, 0, TAU); ctx.fill();
    }
    // dung pat
    const dx = L.dungX, dy = this.surface(dx), size = clamp(.55 + sites.animal / 40, .55, 1.5);
    for (let i = 0; i < 3; i++) {
      const w = (24 - i * 6) * size, h = (5 - i * .8) * size, yy = dy - i * 3.6 * size;
      const g = ctx.createLinearGradient(0, yy - h * 1.6, 0, yy + h); g.addColorStop(0, '#7a5a3a'); g.addColorStop(1, '#3d2a1a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(dx, yy, w, h + 2, 0, Math.PI, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,230,190,.18)'; ctx.beginPath(); ctx.ellipse(dx - 5 * size, dy - 9 * size, 6 * size, 1.6, 0, 0, TAU); ctx.fill();
    void t;
  };

  P.drawWorm = function (ctx, t) {
    const L = this.L, span = (L.plantX - L.litterX) * .9, u = this.reduced ? .4 : (Math.sin(t * .07) * .5 + .5);
    const x0 = L.litterX + 20 + u * span, y0 = L.G + Math.min(L.P * .22, 80);
    ctx.save(); ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#d9958a' : 'rgba(60,20,20,.5)'; ctx.lineWidth = pass ? 3.2 : 4.4; ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const x = x0 - i * 2.6, y = y0 + Math.sin(i * .6 + t * 2.5 * (this.reduced ? 0 : 1)) * 2.4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = '#e8aa9e'; ctx.beginPath(); ctx.ellipse(x0 - 10, y0 + Math.sin(4 * .6 + t * 2.5 * (this.reduced ? 0 : 1)) * 2.4, 3, 2.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
})(globalThis);
