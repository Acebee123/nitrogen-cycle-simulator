/* Immersive nitrogen ecosystem — scene core.
   Layout, camera, gestures, hit testing and labels. Drawing lives in art.js,
   particles and effects in flows.js. Nothing here changes the science model. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function seeded(seed) { return () => { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }; }
  const rgbCache = new Map();
  function rgb(hex) {
    let v = rgbCache.get(hex);
    if (!v) { let h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; rgbCache.set(hex, v); }
    return v;
  }
  function rgba(hex, a) { const c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (Math.round(clamp(a, 0, 1) * 1000) / 1000) + ')'; }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); t = clamp(t, 0, 1); return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')).join(''); }
  const util = { TAU, clamp, lerp, smooth, seeded, rgb, rgba, mix };

  const MIN_W = 720, BASE_H = 820, MAX_ZOOM = 4;
  const { MICROBES, MICROBE_ORDER, FOCUS } = root.NitrogenContent;

  class EcosystemScene {
    constructor(canvas, model) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.model = model;
      this.reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.selected = null; this.inspectedMicrobe = null; this.elapsed = 0; this.clock = 0; this.speed = 1;
      this.insets = { top: 0, bottom: 0, left: 0, right: 0 };
      this.focusFade = 0; this.layoutVersion = 0; this.viewDisposers = [];
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.resize();
      this.reset();
    }

    /* ---------- layout ---------- */
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const priorW = this.W, priorH = this.H;
      this.width = rect.width; this.height = rect.height;
      // Cap the backing store so large screens stay smooth.
      const dprCap = rect.width * rect.height > 1.6e6 ? 1.5 : 2;
      this.dpr = Math.min(root.devicePixelRatio || 1, dprCap);
      this.canvas.width = Math.round(rect.width * this.dpr); this.canvas.height = Math.round(rect.height * this.dpr);
      let s = rect.height / BASE_H, W = rect.width / s;
      if (W < MIN_W) { W = MIN_W; s = rect.width / W; }
      this.s = s; this.W = W; this.H = rect.height / s;
      this.L = this.computeLayout();
      this.layoutVersion++;
      if (!this.camera) { this.camera = { zoom: 1, x: this.W / 2, y: this.H / 2 }; this.viewTarget = { ...this.camera }; }
      else if (priorW) {
        for (const c of [this.camera, this.viewTarget]) { c.x *= this.W / priorW; c.y *= this.H / priorH; }
      }
      this.clampCamera(this.camera); this.clampCamera(this.viewTarget);
      this.labelMetrics = null;
      if (this.buildStatic) this.buildStatic();
      if (this.onLayout) this.onLayout();
    }

    computeLayout() {
      const W = this.W, H = this.H;
      const G = H <= 1000 ? H * 0.46 : clamp(H * 0.41, 400, H * 0.46);
      const D = H - G, P = H <= 1000 ? Math.min(D * 0.8, 440) : Math.min(D * 0.7, 540);
      const L = {
        G, D, P,
        plantX: W * 0.29, cowX: W * 0.64, dungX: W * 0.8, litterX: W * 0.115, treeX: W * 0.965,
        plantK: clamp(W / 1300, 0.82, 1.06), cowK: clamp(W / 1350, 0.72, 1)
      };
      this.L = L;
      const tall = H > 1000; // portrait screens: spread the soil chemistry vertically
      L.anchors = {
        air: [W * 0.5, G * 0.4],
        ammonium: tall ? [W * 0.4, G + P * 0.24] : [W * 0.425, G + P * 0.3],
        nitrite: tall ? [W * 0.52, G + P * 0.62] : [W * 0.515, G + P * 0.55],
        nitrate: tall ? [W * 0.66, G + P * 0.38] : [W * 0.615, G + P * 0.36],
        external: [W * 0.47, G - 230]
      };
      L.microbes = {
        rhizobium: null, // set from the root geometry
        soilFixers: [W * 0.135, G + Math.max(P * 0.58, 150)],
        nostoc: [W * 0.045, G - 2],
        nitrosomonas: tall ? [W * 0.45, G + P * 0.45] : [W * 0.465, G + P * 0.44],
        nitrobacter: tall ? [W * 0.6, G + P * 0.54] : [W * 0.57, G + P * 0.5],
        denitrifiers: [W * 0.8, G + P * 0.66],
        decomposers: [L.dungX, G + Math.min(P * 0.16, 60)]
      };
      L.leafColony = [L.litterX, G + Math.min(P * 0.16, 60)];
      return L;
    }

    surface(x) {
      const L = this.L, W = this.W;
      return L.G + Math.sin(x / W * TAU * 1.3 + 0.6) * 5 + Math.sin(x / W * TAU * 3.7) * 2.2;
    }

    // Water table: low under drained soil, rising into the root zone as soil
    // waterlogs (visual only; the model uses its moisture value).
    waterTable(x, moisture = this.model.moisture) {
      const L = this.L, W = this.W, sat = clamp((moisture - 0.58) / 0.38, 0, 1);
      return lerp(L.G + L.P, L.G + L.P * 0.3, sat) + Math.sin(x / W * TAU * 1.1 + 0.4) * 6 * (1 - sat * 0.5) + (x / W - 0.5) * 12;
    }

    point(key) {
      const L = this.L;
      if (L.anchors[key]) return L.anchors[key];
      if (key === 'nodule') return this.microbeLocation('rhizobium');
      if (key === 'plant') return this.plantPoint ? this.plantPoint('canopy') : [L.plantX, L.G - 160];
      if (key === 'animal') return this.cowPoint ? this.cowPoint('mouth') : [L.cowX - 100, L.G - 40];
      if (key === 'plant-detritus') return [L.litterX, this.surface(L.litterX) - 4];
      if (key === 'animal-detritus') return [L.dungX, this.surface(L.dungX) - 6];
      if (key === 'leached') return [this.W * 0.7, (this.waterTable(this.W * 0.7) + this.H) / 2];
      return [this.W / 2, L.G];
    }

    microbeLocation(id) {
      if (id === 'rhizobium') return this.noduleCenter ? this.noduleCenter() : [this.L.plantX - 20, this.L.G + 60];
      return this.L.microbes[id];
    }
    microbeProfile(id) { return MICROBES[id] ? { id, ...MICROBES[id] } : null; }

    /* ---------- camera ---------- */
    clampCamera(c) {
      c.zoom = clamp(c.zoom, 1, MAX_ZOOM);
      const hw = this.W / (2 * c.zoom), hh = this.H / (2 * c.zoom);
      c.x = clamp(c.x, hw, this.W - hw); c.y = clamp(c.y, hh, this.H - hh);
      return c;
    }
    worldToScreen(x, y) { const c = this.camera, k = this.s * c.zoom; return [(x - c.x) * k + this.width / 2, (y - c.y) * k + this.height / 2]; }
    screenToWorld(x, y, c = this.camera) { const k = this.s * c.zoom; return [c.x + (x - this.width / 2) / k, c.y + (y - this.height / 2) / k]; }
    zoomAt(next, x = this.width / 2, y = this.height / 2) {
      const world = this.screenToWorld(x, y, this.viewTarget), z = clamp(next, 1, MAX_ZOOM), k = this.s * z;
      this.viewTarget = this.clampCamera({ zoom: z, x: world[0] - (x - this.width / 2) / k, y: world[1] - (y - this.height / 2) / k });
    }
    resetView() { this.viewTarget = { zoom: 1, x: this.W / 2, y: this.H / 2 }; }
    fitView(points, maxZoom = 2.8) {
      if (!points.length) return;
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
      const pad = 28, I = this.insets;
      const aw = Math.max(80, this.width - I.left - I.right - pad * 2), ah = Math.max(80, this.height - I.top - I.bottom - pad * 2);
      const z = clamp(Math.min(aw / ((r - l + 40) * this.s), ah / ((b - t + 40) * this.s)), 1, maxZoom), k = this.s * z;
      const cx = (I.left + this.width - I.right) / 2, cy = (I.top + this.height - I.bottom) / 2;
      this.viewTarget = this.clampCamera({ zoom: z, x: (l + r) / 2 - (cx - this.width / 2) / k, y: (t + b) / 2 - (cy - this.height / 2) / k });
    }
    inspect(view) {
      const L = this.L, g = this.plantScale ? this.plantScale() : 1;
      if (view === 'roots') this.fitView([[L.plantX - 120 * g, L.G - 20], [L.plantX + 120 * g, L.G + 230 * g]], 3);
      if (view === 'compounds') this.fitView([this.point('ammonium'), this.point('nitrite'), this.point('nitrate'), this.microbeLocation('nitrosomonas'), this.microbeLocation('nitrobacter')], 3);
      if (view === 'water') { const y = this.waterTable(this.W * 0.7); this.fitView([[this.W * 0.42, y - 50], [this.W * 0.96, Math.min(this.H - 10, y + 160)]], 3); }
      if (view === 'sky') this.fitView([[this.W * 0.05, 30], [this.W * 0.95, this.L.G + 10]], 2);
    }
    focusMicrobe(id) {
      const p = MICROBES[id], pos = this.microbeLocation(id);
      if (!p || !pos) return;
      this.inspectedMicrobe = id;
      this.fitView([[pos[0] - 70, pos[1] - 55], [pos[0] + 70, pos[1] + 55]], 3.6);
    }
    focusRoutes() {
      return (FOCUS[this.selected] || []).map(([from, to, process]) => ({ from, to, process, route: this.route({ from, to, process, guide: true }) }));
    }
    focusProcess() {
      const pts = [];
      for (const f of this.focusRoutes()) for (const p of f.route.samples) pts.push(p);
      for (const c of this.revealCircles ? this.revealCircles(this.selected) : []) pts.push([c[0] - c[2] * .6, c[1] - c[2] * .6], [c[0] + c[2] * .6, c[1] + c[2] * .6]);
      this.fitView(pts, 2.6);
    }

    /* ---------- input ---------- */
    initViewControls() {
      const on = (el, type, fn, options) => { if (!el) return; el.addEventListener(type, fn, options); this.viewDisposers.push(() => el.removeEventListener(type, fn, options)); };
      const canvas = this.canvas, local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      this.contacts = new Map();
      on(canvas, 'wheel', e => { e.preventDefault(); const [x, y] = local(e); this.zoomAt(this.viewTarget.zoom * Math.exp(-clamp(e.deltaY, -180, 180) * 0.0018), x, y); }, { passive: false });
      on(canvas, 'pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        this.contacts.set(e.pointerId, local(e)); this.gestureOrigin = local(e); this.gestureMoved = this.contacts.size > 1;
        if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
        canvas.classList.add('dragging');
      });
      on(canvas, 'pointermove', e => {
        const pos = local(e), prev = this.contacts.get(e.pointerId);
        if (!prev) { this.hover(pos); return; }
        if (this.contacts.size > 1 || Math.hypot(pos[0] - this.gestureOrigin[0], pos[1] - this.gestureOrigin[1]) > 6) this.gestureMoved = true;
        const old = [...this.contacts.values()]; this.contacts.set(e.pointerId, pos); const now = [...this.contacts.values()];
        if (now.length === 2) {
          const [a, b] = old, [n, m] = now, oldMid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], mid = [(n[0] + m[0]) / 2, (n[1] + m[1]) / 2];
          const anchor = this.screenToWorld(oldMid[0], oldMid[1], this.viewTarget), ratio = Math.hypot(n[0] - m[0], n[1] - m[1]) / Math.max(5, Math.hypot(a[0] - b[0], a[1] - b[1]));
          const z = clamp(this.viewTarget.zoom * ratio, 1, MAX_ZOOM), k = this.s * z;
          this.viewTarget = this.clampCamera({ zoom: z, x: anchor[0] - (mid[0] - this.width / 2) / k, y: anchor[1] - (mid[1] - this.height / 2) / k });
        } else if (now.length === 1 && this.gestureMoved) {
          const c = this.viewTarget, k = this.s * c.zoom; c.x -= (pos[0] - prev[0]) / k; c.y -= (pos[1] - prev[1]) / k; this.clampCamera(c);
          this.camera.x = c.x; this.camera.y = c.y; this.clampCamera(this.camera);
        }
      });
      const end = e => { this.contacts.delete(e.pointerId); if (!this.contacts.size) canvas.classList.remove('dragging'); };
      on(canvas, 'pointerup', end); on(canvas, 'pointercancel', end); on(canvas, 'lostpointercapture', end);
      on(canvas, 'click', e => {
        if (this.gestureMoved) return;
        const hit = this.hitThing(...this.screenToWorld(...local(e)));
        if (this.onInspect) this.onInspect(hit ? hit.process : null, hit ? hit.kind : null);
      });
      on(canvas, 'pointerleave', () => { this.pointerWorld = null; });
    }
    hover(pos) {
      const hit = this.hitThing(...this.screenToWorld(pos[0], pos[1]));
      this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      this.hovered = hit ? hit.kind : null;
    }

    hitThing(x, y) {
      const radius = Math.max(26, 24 / (this.s * this.camera.zoom));
      const spots = [];
      for (const id of MICROBE_ORDER) spots.push([id, MICROBES[id].process, this.microbeLocation(id), radius * (id === 'nostoc' ? 1.3 : 1)]);
      spots.push(['decomposers', 'decomposition', this.L.leafColony, radius]);
      if (this.nodulePoints) for (const p of this.nodulePoints()) spots.push(['rhizobium', 'fixation', p, Math.max(10, radius * .45)]);
      const best = spots.map(s => ({ s, d: Math.hypot(x - s[2][0], y - s[2][1]) })).filter(h => h.d < h.s[3]).sort((a, b) => a.d - b.d)[0];
      if (best) return { kind: best.s[0], process: best.s[1], microbe: true };
      // Larger things: litter, dung, plant, cow, water, sky.
      const L = this.L, near = (p, r) => Math.hypot(x - p[0], y - p[1]) < r;
      if (near(this.point('plant-detritus'), 46)) return { kind: 'leafLitter', process: 'decomposition' };
      if (near(this.point('animal-detritus'), 40)) return { kind: 'dung', process: 'decomposition' };
      if (this.cowBox) { const b = this.cowBox(); if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return { kind: 'cow', process: 'feeding' }; }
      if (this.plantBox) { const b = this.plantBox(); if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return { kind: 'plant', process: 'uptake' }; }
      if (y > this.waterTable(x)) return { kind: 'water', process: 'leaching' };
      if (y < this.surface(x) - 30 && y < L.G - 60) return { kind: 'air', process: 'fixation' };
      return null;
    }

    /* ---------- labels (DOM, positioned over the canvas) ---------- */
    attachLabels(container) { this.labelElements = container ? [...container.querySelectorAll('.tag')] : []; this.labelMetrics = null; }
    labelAnchor(kind) {
      const L = this.L, W = this.W;
      switch (kind) {
        case 'air': return [W * 0.5, Math.max(40, L.G * 0.3)];
        case 'ammonium': case 'nitrite': case 'nitrate': return this.point(kind);
        case 'nodule': return this.microbeLocation('rhizobium');
        case 'plant': return this.plantPoint ? this.plantPoint('label') : [L.plantX, L.G - 200];
        case 'cow': return this.cowPoint ? this.cowPoint('back') : [L.cowX, L.G - 140];
        case 'leafLitter': return this.point('plant-detritus');
        case 'dung': return this.point('animal-detritus');
        case 'water': return [W * 0.72, Math.min(this.H - 30, this.waterTable(W * 0.72) + 40)];
        default: return MICROBES[kind] ? this.microbeLocation(kind) : null;
      }
    }
    layoutLabels() {
      const els = this.labelElements || [];
      if (!els.length) { this.labelPlacements = []; return; }
      this.labelMetrics = this.labelMetrics || new Map(els.map(el => [el, { w: el.offsetWidth || Math.min(150, (el.textContent || '').length * 7 + 22), h: el.offsetHeight || 26 }]));
      const related = this.relatedThings ? this.relatedThings(this.selected) : [];
      const I = this.insets, top = I.top + 6, bottom = this.height - I.bottom - 6, placed = [], placements = [];
      const items = els.map((el, index) => {
        const kind = el.dataset.thing, microbe = !!MICROBES[kind];
        const targeted = microbe && kind === this.inspectedMicrobe;
        let show;
        if (microbe) show = targeted; // names appear only for the organism you tapped
        else if (this.selected) show = related.includes(kind);
        else show = el.classList.contains('always');
        return { el, kind, index, show, targeted, rank: targeted ? 0 : related.includes(kind) ? 1 : 2 };
      }).sort((a, b) => a.rank - b.rank || a.index - b.index);
      const overlaps = (a, b) => a.x < b.x + b.w + 6 && a.x + a.w + 6 > b.x && a.y < b.y + b.h + 6 && a.y + a.h + 6 > b.y;
      for (const it of items) {
        let found = null;
        const anchor = it.show && this.labelAnchor(it.kind);
        if (anchor) {
          const [a, b] = this.worldToScreen(anchor[0], anchor[1]), { w, h } = this.labelMetrics.get(it.el);
          if (a > -20 && a < this.width + 20 && b > top - 40 && b < bottom + 40) {
            const ds = [14, 30, 52, 80, 112];
            const cands = [];
            for (const d of ds) cands.push([a - w / 2, b - d - h], [a + d, b - h / 2], [a - d - w, b - h / 2], [a - w / 2, b + d], [a + d * .7, b - d * .7 - h], [a - d * .7 - w, b - d * .7 - h], [a + d * .7, b + d * .7], [a - d * .7 - w, b + d * .7]);
            for (const [x, y] of cands) {
              const r = { x, y, w, h };
              if (x < I.left + 8 || x + w > this.width - I.right - 8 || y < top || y + h > bottom) continue;
              if (placed.some(p => overlaps(r, p))) continue;
              found = r; break;
            }
            if (found) { placed.push(found); placements.push({ kind: it.kind, ...found, anchor: [a, b], selected: it.rank < 2 }); }
          }
        }
        const el = it.el;
        el.style.opacity = found ? '1' : '0'; el.style.visibility = found ? 'visible' : 'hidden'; el.style.pointerEvents = found ? 'auto' : 'none';
        el.setAttribute('aria-hidden', String(!found)); el.tabIndex = found ? 0 : -1;
        if (found) el.style.transform = 'translate(' + Math.round(found.x) + 'px,' + Math.round(found.y) + 'px)';
      }
      this.labelPlacements = placements;
    }

    viewStats() {
      return {
        camera: { ...this.camera }, target: { ...this.viewTarget },
        labels: (this.labelPlacements || []).map(p => ({ ...p })),
        microbe: this.inspectedMicrobe || null,
        microbeSites: MICROBE_ORDER.map(id => ({ id, kind: id, point: this.microbeLocation(id) })),
        organicSites: { ...this.detritusSites }, worldWidth: this.W, worldHeight: this.H, scale: this.s,
        width: this.width, height: this.height, renderer: '2.5d', ready: true
      };
    }

    destroy() {
      this.resizeObserver.disconnect();
      for (const dispose of this.viewDisposers) dispose();
    }
  }
  EcosystemScene.util = util;
  root.EcosystemScene = EcosystemScene;
})(globalThis);
