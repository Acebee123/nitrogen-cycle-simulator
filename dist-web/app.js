(() => {
  'use strict';
  const { NitrogenModel } = NitrogenScience;
  const { COLORS, NAMES, FORMULAS, PROCESSES, CYCLE, MICROBES, RATE_KEYS } = NitrogenContent;
  const $ = id => document.getElementById(id);
  const all = sel => [...document.querySelectorAll(sel)];
  const model = new NitrogenModel();
  const scene = new EcosystemScene($('landscape'), model);
  scene.initViewControls();
  scene.attachLabels($('scene-labels'));

  let playing = true, speed = 1, accumulator = 0, previous = 0, uiClock = 0, raf = 0, toastTimer = 0;
  let formulaParticles = false;
  try { formulaParticles = localStorage.getItem('nitrogen-particles') === 'formula'; } catch (err) { /* storage unavailable */ }
  let selected = null, openPanelName = null, sound = false, audio = null, scenario = 'healthy', appliedFertilizer = 0;
  const disposers = [];
  const on = (el, type, fn, opts) => { if (!el) return; el.addEventListener(type, fn, opts); disposers.push(() => el.removeEventListener(type, fn, opts)); };
  const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

  /* ---------- small helpers ---------- */
  function announce(text) {
    clearTimeout(toastTimer); const t = $('toast'); t.textContent = text; t.classList.add('visible');
    toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
  }
  const ICONS = {
    fix: '<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M11 10h2M11 12h2M11 14h2"/>',
    nit: '<circle cx="7" cy="15" r="3"/><circle cx="16" cy="8" r="3"/><path d="M9.5 13 13.5 10"/><path d="M16 15h5m-2-2 2 2-2 2"/>',
    up: '<path d="M12 21V9"/><path d="M8 13l4-4 4 4"/><path d="M12 9c0-4 3-6 7-6 0 4-3 6-7 6zM12 9C12 5 9 3 5 3c0 4 3 6 7 6z"/>',
    feed: '<path d="M5 9c0-2 2-4 7-4s7 2 7 4v4a7 7 0 0 1-14 0z"/><path d="M5 9 2 7m17 2 3-2M9 12h.01M15 12h.01M10 16h4"/>',
    litter: '<path d="M6 4c6 0 9 3 9 8-6 0-9-3-9-8z"/><path d="M6 4l9 8M4 20h16M9 17l1 3m5-4 1 4"/>',
    decay: '<path d="M4 12a8 6 0 0 1 16 0z"/><path d="M10 12v7h4v-7M3 21h18"/>',
    denit: '<circle cx="8" cy="16" r="3"/><circle cx="15" cy="10" r="2.5"/><circle cx="11" cy="5" r="1.8"/><path d="M19 20v-6m-2 2 2-2 2 2"/>',
    leach: '<path d="M12 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9z"/><path d="M12 21v-4m-2 2 2 2 2-2"/>',
    bolt: '<path d="m13 2-8 12h6l-1 8 9-13h-7z"/>',
    fert: '<path d="M7 7h10l2 13H5z"/><path d="M8 7c0-2 1-3 4-3s4 1 4 3"/><path d="M12 11v6m-3-3h6"/>',
    leaf: '<path d="M5 19c8 0 14-6 14-14C11 5 5 10 5 19z"/><path d="M5 19 14 10"/>',
    drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    microbes: '<rect x="4" y="8" width="13" height="8" rx="4"/><path d="M17 12c2 0 2-3 4-3M8 11h.01M12 13h.01"/>',
    soak: '<path d="M2 10c3 0 3-2 5-2s2 2 5 2 3-2 5-2 2 2 5 2M2 16c3 0 3-2 5-2s2 2 5 2 3-2 5-2 2 2 5 2"/>',
    plant: '<path d="M12 21v-9"/><path d="M12 12c-5 0-7-3-7-7 4 0 7 3 7 7zM12 10c0-4 3-7 7-7 0 4-3 7-7 7z"/>',
    cow: '<path d="M5 9c0-2 2-4 7-4s7 2 7 4v4a7 7 0 0 1-14 0z"/><path d="M5 9 2 7m17 2 3-2M10 16h4"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    rain: '<path d="M7 14a4.5 4.5 0 1 1 1.2-8.8A6 6 0 0 1 19 7.5a3.3 3.3 0 0 1-.5 6.5"/><path d="M8 17l-1 3m5-3-1 3m5-3-1 3"/>',
    dry: '<circle cx="12" cy="8" r="3.5"/><path d="M3 20h18M6 20l2-4 2 2 2-4 2 3 2-2 2 5"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    rich: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    off: '<rect x="4" y="8" width="13" height="8" rx="4"/><path d="M3 3l18 18"/>'
  };
  const svg = (name, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${ICONS[name] || ''}</svg>`;
  const WORD_COLORS = { groundwater: '#6cc4e8', root: '#4fe3e1', 'algae bloom': '#9fe870', 'plant protein': '#9fe870', 'amino acids': '#9fe870', 'cow protein': '#9fe870', urea: '#d9a066', dung: '#d9a066', 'NH₃': '#ffc857', NO: '#e9a487', 'N₂O': '#c9a8ff', 'NO₂': '#d98a4a', 'HNO₃': '#4fe3e1', 'H₂': '#eef1f5', 'O₂': '#ff9b8f', 'NH₄NO₃': '#f4f1e6', N: '#c9a8ff', O: '#ff9b8f', H: '#eef1f5' };
  const tokenColor = tok => COLORS[tok] || WORD_COLORS[tok] || '#d9a066';
  const NEEDS = { oxygen: ['O₂', 'Needs oxygen'], water: [null, 'Needs moisture', 'drop'], microbes: [null, 'Needs active microbes', 'microbes'], waterlogged: [null, 'Happens in waterlogged soil', 'soak'], light: [null, 'Needs sunlight', 'sun'] };
  const needsHTML = list => list.map(n => `<span title="${NEEDS[n][1]}" aria-label="${NEEDS[n][1]}">${NEEDS[n][0] || svg(NEEDS[n][2], 16)}</span>`).join('');
  // A coloured chip with the chemical formula. Organic nitrogen (R–NH₂) gets a
  // one-word hint so living protein and dead matter stay distinguishable.
  const HINT = { 'Protein N': 'protein', 'Organic N': 'dead', groundwater: 'groundwater' };
  function chem(tok, icon) {
    const formula = tok in FORMULAS ? FORMULAS[tok] : tok, lead = icon ? svg(icon, 16) : tok === 'Pellet' ? svg('fert', 16) : '';
    return `<span class="chem" style="--c:${tokenColor(tok)}" title="${NAMES[tok] || tok}">${lead}${formula ? `<b>${formula}</b>` : ''}${HINT[tok] && !icon ? `<small>${HINT[tok]}</small>` : ''}</span>`;
  }
  function equationHTML(p) {
    let k = 0;
    return p.eq.map(tok => tok === '→' || tok === '+' ? `<span class="arrow">${tok}</span>` : chem(tok, p.labels ? p.labels[k++] : null)).join('');
  }

  /* ---------- layout insets so the camera frames around floating UI ---------- */
  function updateInsets() {
    const H = scene.height || 600, W = scene.width || 800, I = { top: 0, bottom: 0, left: 0, right: 0 };
    const box = el => (el && !el.hidden && el.getBoundingClientRect) ? el.getBoundingClientRect() : null;
    const hud = box($('hud')); if (hud && hud.height > 0 && hud.bottom < H * .4) I.top = hud.bottom + 6;
    let bottomEdge = H;
    for (const el of [document.querySelector('.tabbar'), $('sheet'), $('explanation'), $('journey-card')]) {
      const r = box(el); if (!r || r.height <= 0 || (el.classList.contains('tabbar') && document.querySelector('.app').classList.contains('journey-on') && W < 700)) continue;
      const card = el.id === 'explanation' || el.id === 'journey-card';
      if (r.top > H * .45) bottomEdge = Math.min(bottomEdge, r.top);
      else if (card && r.left > W * .45) I.right = Math.max(I.right, W - r.left + 6);
      else if (card) I.top = Math.max(I.top, r.bottom + 6);
    }
    I.bottom = H - bottomEdge + 6;
    scene.insets = I;
  }
  scene.onLayout = () => { updateInsets(); if (typeof journey !== 'undefined' && journey.active) journey.frameCamera(); };

  /* ---------- panels ---------- */
  function openPanel(name) {
    if (journey.active && name && openPanelName !== name) exitJourney();
    openPanelName = openPanelName === name ? null : name;
    $('sheet').hidden = !openPanelName;
    for (const p of ['cycle', 'act', 'soil', 'microbes', 'view']) $('panel-' + p).hidden = p !== openPanelName;
    all('.tab[data-panel]').forEach(t => t.setAttribute('aria-expanded', String(t.dataset.panel === openPanelName)));
    document.querySelector('.app').classList.toggle('sheet-open', !!openPanelName);
    if (openPanelName === 'cycle') updateMap();
    updateInsets();
  }
  all('.tab[data-panel]').forEach(t => on(t, 'click', () => openPanel(t.dataset.panel)));

  /* ---------- focus a process ---------- */
  function setSelected(id) {
    selected = id; scene.selected = id;
    all('[data-info]').forEach(el => el.classList.toggle('selected', !!id && (el.dataset.info === id || (id === 'nitrification' && ['nitri1', 'nitri2'].includes(el.dataset.info)))));
    $('cycle-map').classList.toggle('focused', !!id);
    updateMap();
  }
  function whole() {
    setSelected(null); scene.inspectedMicrobe = null; scene.resetView();
    $('explanation').hidden = true; updateInsets();
  }
  function focus(id, opts = {}) {
    const p = PROCESSES[id]; if (!p) return;
    setSelected(id);
    if (!opts.keepMicrobe) scene.inspectedMicrobe = null;
    $('info-icon').innerHTML = svg(p.icon, 20);
    $('info-name').textContent = p.title;
    $('info-eq').innerHTML = equationHTML(p); $('info-eq').dataset.proc = id;
    $('info-description').textContent = p.line;
    $('info-needs').innerHTML = needsHTML(p.needs);
    $('info-agents').innerHTML = p.agents.map(a => `<button data-agent="${a}" aria-label="${MICROBES[a].name}" title="${MICROBES[a].name}"><span class="thumb" data-image="${MICROBES[a].image}"></span></button>`).join('');
    $('info-agents').querySelectorAll ? $('info-agents').querySelectorAll('[data-agent]').forEach(b => b.addEventListener('click', () => showMicrobe(b.dataset.agent))) : 0;
    const idx = CYCLE.indexOf(id === 'nitri1' || id === 'nitri2' ? 'nitrification' : id === 'leaves' ? 'litter' : id);
    $('step-count').textContent = (idx + 1) + ' / ' + CYCLE.length;
    $('explanation').hidden = false;
    if (openPanelName) openPanel(openPanelName); // keep the focused process in view
    updateInsets();
    if (!opts.noCamera) scene.focusProcess();
    updateUI();
  }
  function step(dir) {
    const cur = selected === 'nitri1' || selected === 'nitri2' ? 'nitrification' : selected === 'leaves' ? 'litter' : selected;
    const i = CYCLE.indexOf(cur), next = CYCLE[(i + dir + CYCLE.length) % CYCLE.length];
    focus(next);
  }
  on($('prev-process'), 'click', () => step(-1));
  on($('next-process'), 'click', () => step(1));
  on($('close-info'), 'click', whole);
  all('[data-info]').forEach(el => on(el, 'click', () => { if (el.dataset.microbe) showMicrobe(el.dataset.microbe); else focus(el.dataset.info); }));
  scene.onInspect = (process, kind) => {
    if (journey.active) { if (kind === 'traveller') journey.next(); else if (kind === 'lens') journey.replay(); else if (MICROBES[kind]) showMicrobe(kind); return; }
    if (!process) { if (openPanelName) openPanel(openPanelName); else if (selected) whole(); return; }
    if (MICROBES[kind]) showMicrobe(kind); else focus(process);
  };

  /* ---------- microbes ---------- */
  function showMicrobe(id) {
    const m = MICROBES[id]; if (!m) return;
    if (!journey.active) { focus(m.process, { keepMicrobe: true, noCamera: true }); scene.inspectedMicrobe = id; }
    $('microbe-name').textContent = m.name; $('microbe-group').textContent = m.role; $('microbe-description').textContent = m.description;
    $('microbe-habitat').textContent = m.habitat; $('microbe-note').textContent = m.note;
    $('microbe-reaction').innerHTML = chem(m.input) + '<span class="arrow">→</span>' + chem(m.output);
    const pic = $('microbe-picture'); pic.dataset.image = m.image; pic.dataset.profile = id; pic.setAttribute('aria-label', 'Illustration: ' + m.name);
    $('microbe-reference').setAttribute('href', m.source);
    all('[data-pick]').forEach(b => b.setAttribute('aria-current', String(b.dataset.pick === id)));
    if (!journey.active) scene.focusMicrobe(id);
    if (!$('microbe-dialog').open) $('microbe-dialog').showModal();
  }
  all('[data-microbe]').forEach(b => { if (!b.classList.contains('tag')) on(b, 'click', () => showMicrobe(b.dataset.microbe)); });
  all('[data-pick]').forEach(b => on(b, 'click', () => showMicrobe(b.dataset.pick)));
  on($('close-microbe'), 'click', () => $('microbe-dialog').close());
  on($('locate-microbe'), 'click', () => {
    const id = $('microbe-picture').dataset.profile; if (!MICROBES[id]) return;
    $('microbe-dialog').close(); if (openPanelName) openPanel(openPanelName);
    if (journey.active) exitJourney(); scene.inspectedMicrobe = id;
    scene.focusMicrobe(id); announce(MICROBES[id].name.split(' ')[0] + ' — circled in the soil');
  });
  on($('view-bacteria'), 'click', () => showMicrobe('rhizobium'));
  for (const d of ['microbe-dialog', 'about-dialog']) on($(d), 'click', e => { if (e.target !== $(d) || !e.target.getBoundingClientRect) return; const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); });
  on($('model-info'), 'click', () => $('about-dialog').showModal());
  on($('close-about'), 'click', () => $('about-dialog').close());
  on(document, 'keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('microbe-dialog').open) { $('microbe-dialog').close(); e.preventDefault(); }
    else if ($('about-dialog').open) { $('about-dialog').close(); e.preventDefault(); }
    else if (journey.active) exitJourney();
    else if (openPanelName) openPanel(openPanelName);
    else whole();
  });

  /* ---------- environment actions ---------- */
  function action(id, run, text) {
    on($(id), 'click', () => {
      run(); scene.ingest(model.drainFlows()); updateUI(); announce(typeof text === 'function' ? text() : text);
      $(id).classList.add('active'); setTimeout(() => $(id).classList.remove('active'), 700);
    });
  }
  action('lightning', () => { model.lightning(); scene.lightning(); if (sound && audio) { audio.ctx.resume(); audio.thunder(); } }, '⚡ N₂ split · nitrate rains into the soil');
  action('rain', () => model.heavyRain(), '🌧 Soil floods · leaching and denitrification rise');
  action('grow', () => { model.grow(); scene.growPulse(); }, '🌱 Roots pull nitrate faster');
  action('leaves', () => { model.addLeaves(); scene.leaves(); }, '🍂 +8 organic N for decomposers');
  function fertilizerPreview(applied) {
    const dose = Number($('fertilizer').value);
    $('fertilizer-value').textContent = String(dose);
    $('fertilizer-status').innerHTML = `<b style="--c:var(--nh4)">+${fmt(dose * .6, 0)} NH₄⁺</b><b style="--c:var(--no3)">+${fmt(dose * .4, 0)} NO₃⁻</b>`;
    $('fertilizer-status').classList.toggle('applied', !!applied);
  }
  action('add-fertilizer', () => { appliedFertilizer = Number($('fertilizer').value); model.addFertilizer(appliedFertilizer); scene.fertilizerPulse(appliedFertilizer); fertilizerPreview(true); },
    () => `+${appliedFertilizer} fertilizer → +${fmt(appliedFertilizer * .6, 0)} NH₄⁺ · +${fmt(appliedFertilizer * .4, 0)} NO₃⁻`);
  on($('fertilizer'), 'input', () => fertilizerPreview(false));
  on($('bacteria'), 'input', () => { model.activity = Number($('bacteria').value) / 100; $('bacteria-value').textContent = $('bacteria').value + '%'; updateUI(); });
  on($('moisture'), 'input', () => { model.moistureTarget = Number($('moisture').value) / 100; model.moisture = model.moistureTarget; updateUI(); });

  /* ---------- playback, speed, scenarios ---------- */
  function setPlaying(next) {
    playing = next; const b = $('play');
    b.classList.toggle('paused', !playing); b.setAttribute('aria-label', playing ? 'Pause simulation' : 'Play simulation'); b.title = playing ? 'Pause' : 'Play';
    if (audio) audio.setWeather(model.rain > 0, playing && sound);
    updateUI();
  }
  on($('play'), 'click', () => { if (journey.active) { exitJourney(true); return; } setPlaying(!playing); });
  all('[data-speed]').forEach(b => on(b, 'click', () => {
    speed = Number(b.dataset.speed); accumulator = 0;
    all('[data-speed]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  }));
  function reset() {
    model.reset(scenario); scene.reset(); scene.ingest(model.drainFlows()); accumulator = 0;
    $('fertilizer').value = 20; fertilizerPreview(false);
    $('bacteria').value = model.activity * 100; $('bacteria-value').textContent = '100%';
    $('moisture').value = Math.round(model.moisture * 100);
    whole(); updateUI();
  }
  on($('restart'), 'click', () => { reset(); announce('↺ Restarted'); });
  all('[data-scenario]').forEach(b => on(b, 'click', () => {
    scenario = b.dataset.scenario;
    all('[data-scenario]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    reset();
    announce({ healthy: '☀ Balanced ecosystem', rain: '🌧 Heavy rainfall · waterlogged soil', fertilized: '+85 fertilizer · watch nitrate pile up' }[scenario]);
  }));

  /* ---------- view controls ---------- */
  on($('reset-view'), 'click', () => scene.resetView());
  for (const [id, view] of [['view-roots', 'roots'], ['view-compounds', 'compounds'], ['view-water', 'water']]) on($(id), 'click', () => scene.inspect(view));
  on($('zoom-in'), 'click', () => scene.zoomAt(scene.viewTarget.zoom * 1.3));
  on($('zoom-out'), 'click', () => scene.zoomAt(scene.viewTarget.zoom / 1.3));

  /* ---------- live cycle map ---------- */
  // Pill nodes hold the formula (and name in Name mode); the soft glow behind
  // each pill grows with the pool. Arrow badges carry process icons.
  const NODES = {
    air: { x: 180, y: 34, c: COLORS['N₂'], f: 'N₂', name: 'Nitrogen gas' },
    organic: { x: 64, y: 104, c: COLORS['Organic N'], f: 'R–NH₂', icon: 'decay', name: 'Dead matter' },
    animal: { x: 296, y: 104, c: COLORS['Protein N'], f: 'R–NH₂', icon: 'cow', name: 'Cow' },
    ammonium: { x: 56, y: 208, c: COLORS['NH₄⁺'], f: 'NH₄⁺', name: 'Ammonium' },
    plant: { x: 304, y: 208, c: COLORS['Protein N'], f: 'R–NH₂', icon: 'plant', name: 'Plant' },
    nitrite: { x: 118, y: 294, c: COLORS['NO₂⁻'], f: 'NO₂⁻', name: 'Nitrite' },
    nitrate: { x: 224, y: 294, c: COLORS['NO₃⁻'], f: 'NO₃⁻', name: 'Nitrate' },
    leached: { x: 314, y: 312, c: '#6cc4e8', f: 'NO₃⁻', icon: 'drop', name: 'Groundwater', w: 88 },
    external: { x: 176, y: 238, c: '#f4f1e6', icon: 'fert', name: 'Fertilizer', w: 34, proc: 'fertilizer' }
  };
  const ARCS = [ // process, from, to, control point, badge?
    ['fixation', 'air', 'ammonium', [128, 120], true],
    ['lightning', 'air', 'nitrate', [180, 196], true],
    ['denitrification', 'nitrate', 'air', [262, 170], true],
    ['nitri1', 'ammonium', 'nitrite', [60, 290], true],
    ['nitri2', 'nitrite', 'nitrate', [175, 332], true],
    ['uptake', 'nitrate', 'plant', [296, 286], true],
    ['feeding', 'plant', 'animal', [352, 156], true],
    ['litter', 'animal', 'organic', [180, 78], true],
    ['litter', 'plant', 'organic', [190, 150], false],
    ['decomposition', 'organic', 'ammonium', [12, 156], true],
    ['leaching', 'nitrate', 'leached', [268, 336], true],
    ['fertilizer', 'external', 'ammonium', [100, 236], false],
    ['fertilizer', 'external', 'nitrate', [212, 268], false]
  ];
  const ARC_ICON = { fixation: 'fix', lightning: 'bolt', denitrification: 'denit', nitri1: 'nit', nitri2: 'nit', uptake: 'up', feeding: 'feed', litter: 'litter', decomposition: 'decay', leaching: 'leach', fertilizer: 'fert' };
  const TYPICAL = { fixation: .4, decomposition: .6, nitri1: 1.2, nitri2: 1.2, uptake: .7, feeding: .25, litter: .3, denitrification: .5, leaching: .8, lightning: 2.3, fertilizer: 5 };
  let mapBuilt = false;
  const quad = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
  const pillW = n => n.w || 86, PILL_H = 34;
  const inside = (n, p, pad = 3) => Math.abs(p[0] - n.x) < pillW(n) / 2 + pad && Math.abs(p[1] - n.y) < PILL_H / 2 + pad;
  function arcColor(proc) {
    return { fixation: COLORS['NH₄⁺'], lightning: COLORS['NO₃⁻'], denitrification: COLORS['N₂'], nitri1: COLORS['NO₂⁻'], nitri2: COLORS['NO₃⁻'], uptake: COLORS['Protein N'], feeding: COLORS['Protein N'], litter: COLORS['Organic N'], decomposition: COLORS['NH₄⁺'], leaching: '#6cc4e8', fertilizer: '#f4f1e6' }[proc] || '#fff';
  }
  function buildMap() {
    const map = $('cycle-map'); if (!map || mapBuilt || !map.querySelectorAll) return;
    mapBuilt = true;
    let html = '<g class="glows">' + Object.entries(NODES).map(([k, n]) => `<circle data-glow="${k}" cx="${n.x}" cy="${n.y}" r="20" fill="${n.c}"/>`).join('') + '</g>';
    ARCS.forEach(([proc, from, to, ctrl, badge]) => {
      const A = NODES[from], B = NODES[to], a = [A.x, A.y], b = [B.x, B.y];
      let t0 = 0, t1 = 1; // trim the curve where it leaves and enters the pills
      while (t0 < .5 && inside(A, quad(a, ctrl, b, t0))) t0 += .01;
      while (t1 > .5 && inside(B, quad(a, ctrl, b, t1), 6)) t1 -= .01;
      const steps = 24, pts = Array.from({ length: steps + 1 }, (_, i) => quad(a, ctrl, b, t0 + (t1 - t0) * i / steps));
      const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
      const end = pts[steps], prev = pts[steps - 2], ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180 / Math.PI;
      const mid = quad(a, ctrl, b, (t0 + t1) / 2), color = arcColor(proc), title = PROCESSES[proc].title;
      html += `<g class="arc" data-proc="${proc}" tabindex="${badge ? 0 : -1}" role="button" aria-label="${title}"><title>${title}</title><path class="hit" d="${d}"/><path class="base" d="${d}"/><path class="flow" d="${d}" stroke="${color}" stroke-width="2.5"/>` +
        `<path class="head" d="M-1 -5 L8 0 L-1 5 z" fill="${color}" transform="translate(${end[0].toFixed(1)} ${end[1].toFixed(1)}) rotate(${ang.toFixed(0)})"/>` +
        (badge ? `<g class="badge" transform="translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)})"><circle r="11" fill="#0f1f1a" stroke="${color}" stroke-width="1.6"/><g transform="translate(-7.5 -7.5) scale(.625)" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[ARC_ICON[proc]]}</g></g>` : '') + '</g>';
    });
    for (const [key, n] of Object.entries(NODES)) {
      const w = pillW(n), x0 = n.x - w / 2, y0 = n.y - PILL_H / 2, icon = n.icon ? `<g transform="translate(${n.f ? x0 + 6 : n.x - 9} ${n.y - (n.f ? 15 : 9)}) scale(.75)" fill="none" stroke="#0b1512" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[n.icon]}</g>` : '';
      const fx = n.icon && n.f ? n.x + 8 : n.x;
      html += `<g class="node${n.proc ? ' arc' : ''}" data-node="${key}"${n.proc ? ` data-proc="${n.proc}" role="button" tabindex="0" aria-label="${PROCESSES[n.proc].title}"` : ' aria-hidden="true"'}>` +
        `<rect x="${x0}" y="${y0}" width="${w}" height="${PILL_H}" rx="12" fill="${n.c}" stroke="rgba(255,255,255,.6)" stroke-width="1.2"/>${icon}` +
        (n.f ? `<text class="f" x="${fx}" y="${n.y - 5}">${n.f}</text>` : '') +
        (key === 'external' ? '' : `<text class="val" x="${n.x}" y="${n.y + 10}"></text>`) + '</g>';
    }
    map.innerHTML = html;
    map.querySelectorAll('.arc').forEach(g => {
      g.addEventListener('click', () => focus(g.dataset.proc));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focus(g.dataset.proc); } });
    });
  }
  function updateMap() {
    const map = $('cycle-map'); if (!map || !map.querySelectorAll) return;
    buildMap();
    const rates = model.rates;
    map.querySelectorAll('.arc[data-proc]').forEach(g => {
      const proc = g.dataset.proc, flow = g.querySelector('.flow');
      const isOn = !!selected && (selected === proc || (selected === 'nitrification' && (proc === 'nitri1' || proc === 'nitri2')) || (selected === 'leaves' && proc === 'litter'));
      g.classList.toggle('on', isOn);
      if (!flow) return;
      const act = proc === 'fertilizer' ? (scene.inputPulse && scene.inputPulse.remaining > 0 ? 1 : 0) : (rates[proc] || 0) / TYPICAL[proc];
      flow.setAttribute('stroke-width', (2 + Math.min(4.5, act * 2.4)).toFixed(1));
      flow.style.animationDuration = act > .02 ? Math.max(.25, 1.4 / Math.min(act, 4)) + 's' : '0s';
      flow.style.opacity = act > .02 ? '1' : '.35';
    });
    for (const [key, n] of Object.entries(NODES)) {
      const glow = map.querySelector(`[data-glow="${key}"]`), v = key === 'external' ? 0 : model.n[key];
      if (glow) glow.setAttribute('r', key === 'external' ? '0' : Math.min(44, 18 + Math.sqrt(Math.max(0, v)) * 2.4).toFixed(1));
      const val = map.querySelector(`[data-node="${key}"] .val`);
      if (val) val.textContent = n.name + ' · ' + (v >= 100 ? Math.round(v) : fmt(v, 0));
    }
  }

  /* ---------- particles as dots or as chemical formulas ---------- */
  function applyParticleMode() {
    scene.formulaParticles = formulaParticles; scene.labelMetrics = null;
    document.querySelector('.app').classList.toggle('formula-particles', formulaParticles);
    const b = $('label-mode'); b.setAttribute('aria-pressed', String(formulaParticles));
    b.setAttribute('aria-label', formulaParticles ? 'Show particles as dots' : 'Show particles as chemical formulas');
    b.title = formulaParticles ? 'Particles as dots (F)' : 'Particles as formulas (F)';
    try { localStorage.setItem('nitrogen-particles', formulaParticles ? 'formula' : 'dots'); } catch (err) { /* storage unavailable */ }
  }
  function toggleParticleMode() { formulaParticles = !formulaParticles; applyParticleMode(); announce(formulaParticles ? 'Particles show formulas · NH₄⁺ NO₂⁻ NO₃⁻' : 'Particles show as dots ●'); }
  on($('label-mode'), 'click', toggleParticleMode);
  on(document, 'keydown', e => { if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || ''))) toggleParticleMode(); });

  /* ---------- sound ---------- */
  class AmbientAudio {
    constructor() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx(); this.output = this.ctx.createGain(); this.output.gain.value = 0;
      if (this.ctx.createDynamicsCompressor) {
        const limiter = this.ctx.createDynamicsCompressor(); limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .2;
        this.output.connect(limiter); limiter.connect(this.ctx.destination);
      } else this.output.connect(this.ctx.destination);
      this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.output);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate), channel = buffer.getChannelData(0); let brown = 0;
      for (let i = 0; i < channel.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .03) / 1.03; channel[i] = brown * 3; }
      this.source = this.ctx.createBufferSource(); this.source.buffer = buffer; this.source.loop = true;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1800; this.source.connect(filter); filter.connect(this.gain); this.source.start();
      this.rumbleBuffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 4.3), this.ctx.sampleRate);
      const rumble = this.rumbleBuffer.getChannelData(0); let low = 0;
      for (let i = 0; i < rumble.length; i++) { const white = Math.random() * 2 - 1; low = (low + white * .055) / 1.018; rumble[i] = Math.max(-1, Math.min(1, low * 3 + white * .08)); }
    }
    setEnabled(enabled) { this.enabled = enabled; this.output.gain.setTargetAtTime(enabled && this.raining ? .9 : 0, this.ctx.currentTime, .025); }
    setWeather(rain, enabled) { this.raining = rain; this.gain.gain.setTargetAtTime(enabled && rain ? .13 : 0, this.ctx.currentTime, .25); this.output.gain.setTargetAtTime(this.enabled && (rain || this.ctx.currentTime < (this.thunderUntil || 0)) ? .9 : 0, this.ctx.currentTime, .025); }
    thunder() {
      const now = this.ctx.currentTime; this.thunderUntil = now + 4.3; this.output.gain.setTargetAtTime(this.enabled ? .9 : 0, now, .025);
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), tail = this.ctx.createGain();
      source.buffer = this.rumbleBuffer; filter.type = 'lowpass'; filter.frequency.setValueAtTime(650, now); filter.frequency.exponentialRampToValueAtTime(180, now + 3);
      tail.gain.setValueAtTime(.0001, now); tail.gain.exponentialRampToValueAtTime(.65, now + .12); tail.gain.exponentialRampToValueAtTime(.3, now + .5); tail.gain.exponentialRampToValueAtTime(.48, now + .9); tail.gain.exponentialRampToValueAtTime(.19, now + 1.8); tail.gain.exponentialRampToValueAtTime(.0001, now + 4.1);
      source.connect(filter); filter.connect(tail); tail.connect(this.output); source.start(now); source.stop(now + 4.2);
      source.onended = () => { source.disconnect(); filter.disconnect(); tail.disconnect(); };
    }
    destroy() { this.source.stop(); this.ctx.close(); }
  }
  on($('sound'), 'click', async () => {
    try {
      if (!audio) audio = new AmbientAudio(); await audio.ctx.resume(); sound = !sound; audio.setEnabled(sound);
      const b = $('sound'); b.setAttribute('aria-pressed', String(sound)); b.setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on'); b.title = sound ? 'Sound on' : 'Sound off';
      audio.setWeather(model.rain > 0, playing && sound);
    } catch (err) { announce('Sound is unavailable in this browser'); }
  });

  /* ---------- journey: follow one nitrogen atom, station by station ---------- */
  const { STATIONS } = NitrogenJourney;
  const journey = new NitrogenJourney.JourneyController(scene);
  journey.colors = tokenColor;
  const ORGANISM = { plant: ['plant', 'Bean plant'], cow: ['cow', 'Cow'] };
  let journeyWasPlaying = true, jStep = null, jHl = null;
  function enterJourney() {
    if (journey.active) return;
    if (openPanelName) openPanel(openPanelName);
    if ($('microbe-dialog').open) $('microbe-dialog').close();
    whole(); journeyWasPlaying = playing; setPlaying(false);
    journey.start();
    document.querySelector('.app').classList.add('journey-on'); $('journey').setAttribute('aria-pressed', 'true');
    $('journey-card').hidden = false; renderJourney(); updateInsets(); journey.frameCamera();
    announce('Follow one nitrogen atom · tap it or press →');
  }
  function exitJourney(resume) {
    if (!journey.active) return;
    journey.stop();
    document.querySelector('.app').classList.remove('journey-on'); $('journey').setAttribute('aria-pressed', 'false');
    $('journey-card').hidden = true; $('j-detail').hidden = true; $('j-detail-btn').setAttribute('aria-expanded', 'false'); updateInsets();
    setPlaying(resume === undefined ? journeyWasPlaying : resume);
  }
  function journeyEq(st, hl) {
    return st.eq.map((tok, i) => {
      const later = hl !== null && hl >= 0 && i > hl, cls = later ? ' dim' : i === hl ? ' now' : '';
      if (tok === '→' || tok === '+') return `<span class="arrow${later ? ' dim' : ''}">${tok}</span>`;
      return chem(tok).replace('class="chem"', 'class="chem' + cls + '"');
    }).join('');
  }
  function renderJourney() {
    const st = journey.station(), i = journey.index, n = journey.path.length;
    $('j-step').textContent = (i + 1) + ' / ' + n + (st.branch ? ' · side trip' : '');
    $('j-title').textContent = st.title;
    $('j-progress').innerHTML = journey.path.map((id, k) => `<i class="${k < i ? 'done' : ''}${k === i ? ' now' : ''}${STATIONS[id].branch ? ' side' : ''}"></i>`).join('');
    $('j-who').innerHTML = st.who.map(w => MICROBES[w] ? `<button data-jmicrobe="${w}" aria-label="${MICROBES[w].name}" title="${MICROBES[w].name}"><span class="thumb" data-image="${MICROBES[w].image}"></span></button>` : `<span class="org" title="${ORGANISM[w][1]}" aria-label="${ORGANISM[w][1]}">${svg(ORGANISM[w][0], 18)}</span>`).join('');
    $('j-who').querySelectorAll('[data-jmicrobe]').forEach(b => b.addEventListener('click', () => showMicrobe(b.dataset.jmicrobe)));
    $('j-needs').innerHTML = needsHTML(st.needs);
    $('j-detail').textContent = st.detail;
    let branches = '';
    if (st.finale) branches = `<button class="j-branch primary" data-jact="restart">${svg('fix', 17)}Go round again</button><button class="j-branch" data-jact="explore">${svg('sun', 17)}Explore live</button>`;
    else if (st.dead) branches = `<button class="j-branch primary" data-jact="next">↩ Back to the main path</button>`;
    else branches = journey.branchHere().map(b => `<button class="j-branch" data-branch="${b.id}" aria-label="Side trip: ${b.label}">${svg(b.icon, 17)}${b.label}</button>`).join('');
    $('j-branches').innerHTML = branches;
    $('j-branches').querySelectorAll('[data-branch]').forEach(b => b.addEventListener('click', () => journey.takeBranch(b.dataset.branch)));
    $('j-branches').querySelectorAll('[data-jact]').forEach(b => b.addEventListener('click', () => { const a = b.dataset.jact; if (a === 'restart') journey.restart(); else if (a === 'explore') exitJourney(true); else journey.next(); }));
    $('j-prev').disabled = i === 0; $('j-next').disabled = i === n - 1 && journey.phase === 'station';
    jStep = null; jHl = null;
  }
  // The reaction plays in the microscope lens on the scene; the card follows its captions.
  function updateJourneyText() {
    const st = journey.station(), travelling = journey.phase === 'travel', step = travelling ? -1 : journey.step;
    const text = travelling ? (journey.travelCaption || st.transit || 'On the way to: ' + st.title.toLowerCase() + '…') : st.captions[step] || '';
    if (step !== jStep || text !== $('j-caption').textContent) { jStep = step; $('j-caption').textContent = text; }
    const hl = travelling ? 0 : st.hl[Math.max(0, step)];
    if (hl !== jHl) { jHl = hl; $('j-eq').innerHTML = journeyEq(st, hl); }
  }
  journey.onChange = () => { renderJourney(); updateInsets(); };
  on($('journey'), 'click', () => journey.active ? exitJourney() : enterJourney());
  on($('j-exit'), 'click', () => exitJourney());
  on($('j-next'), 'click', () => journey.next());
  on($('j-prev'), 'click', () => journey.prev());
  on($('j-replay'), 'click', () => journey.replay());
  on($('j-detail-btn'), 'click', () => { const open = $('j-detail').hidden; $('j-detail').hidden = !open; $('j-detail-btn').setAttribute('aria-expanded', String(open)); });
  on(document, 'keydown', e => { // presentation clickers send arrows / Page Up / Page Down
    if (!journey.active || $('microbe-dialog').open || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || ''))) return;
    const k = e.key, onButton = e.target && e.target.tagName === 'BUTTON';
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !onButton)) { if (e.preventDefault) e.preventDefault(); journey.next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { if (e.preventDefault) e.preventDefault(); journey.prev(); }
    else if (k === 'r' || k === 'R') journey.replay();
  });

  /* ---------- live readouts ---------- */
  function weatherState() {
    if (!playing) return ['pause', 'Simulation paused'];
    if (model.rain > 0) return ['rain', 'Rainfall · wet soil'];
    if (model.moisture > .8) return ['soak', 'Waterlogged soil'];
    if (model.moisture < .25) return ['dry', 'Dry soil'];
    if (model.activity === 0) return ['off', 'Microbes inactive'];
    if (model.n.nitrate + model.n.ammonium > 85) return ['rich', 'Nutrient-rich soil'];
    return ['sun', 'Balanced conditions'];
  }
  let lastWeather = '';
  function updateUI() {
    $('day').textContent = model.time.toFixed(1).padStart(4, '0');
    const [icon, text] = weatherState();
    if (icon !== lastWeather) { lastWeather = icon; $('weather-icon').innerHTML = svg(icon, 22); $('status').title = text; }
    $('weather-label').textContent = text;
    $('moisture-value').textContent = Math.round(model.moisture * 100) + '%';
    if (document.activeElement !== $('moisture')) $('moisture').value = Math.round(model.moisture * 100);
    if (selected) {
      const ids = RATE_KEYS[selected] || [selected === 'leaves' ? 'litter' : selected];
      const rate = ids.reduce((v, k) => v + (model.rates[k] || 0), 0) / ids.length;
      $('focus-rate').textContent = fmt(rate) + ' N/day';
      const typical = ids.reduce((v, k) => v + (TYPICAL[k] || 1), 0) / ids.length;
      $('rate-fill').style.width = Math.min(100, rate / typical * 50) + '%';
    }
    if (scene.viewTarget) { $('zoom-value').textContent = Math.round(scene.camera.zoom * 100) + '%'; $('zoom-out').disabled = scene.viewTarget.zoom <= 1.001; $('zoom-in').disabled = scene.viewTarget.zoom >= 3.999; }
    if (openPanelName === 'cycle') updateMap();
    if (audio) audio.setWeather(model.rain > 0, playing && sound);
  }

  /* ---------- main loop ---------- */
  on(window, 'resize', () => { updateInsets(); updateUI(); });
  on(document, 'visibilitychange', () => { previous = 0; accumulator = 0; if (audio) audio.setWeather(model.rain > 0, sound && playing && !document.hidden); });
  function frame(now) {
    const dt = previous ? Math.min((now - previous) / 1000, .1) : 0; previous = now;
    if (playing && !document.hidden) { accumulator += dt * .5 * speed; while (accumulator >= .05 - 1e-10) { model.step(.05); accumulator -= .05; } scene.ingest(model.drainFlows()); }
    if (journey.active) { journey.update(dt); updateJourneyText(); }
    scene.speed = speed; scene.render(dt, playing && !document.hidden);
    if (journey.active) journey.drawOverlay(scene.ctx);
    uiClock += dt; if (uiClock > .2) { uiClock = 0; updateUI(); }
    raf = requestAnimationFrame(frame);
  }
  on(window, 'pagehide', e => { if (e.persisted) return; cancelAnimationFrame(raf); clearTimeout(toastTimer); scene.destroy(); if (audio) audio.destroy(); for (const dispose of disposers) dispose(); });
  fertilizerPreview(false); applyParticleMode(); updateInsets();
  scene.ingest(model.drainFlows()); updateUI(); raf = requestAnimationFrame(frame);
  setTimeout(() => announce('Tap anything · pinch or scroll to zoom'), 700);

  // Read-only diagnostics make conservation and transfer behaviour inspectable.
  Object.defineProperty(window, 'nitrogenDiagnostics', {
    value: () => ({
      time: model.time, reservoirs: { ...model.n }, inputs: model.inputs, total: model.total(), balanceError: model.balanceError(), rates: { ...model.rates },
      history: model.history.map(p => ({ ...p })), playing, speed, moisture: model.moisture, activity: model.activity, scenario,
      view: scene.viewStats(), particleCount: scene.particles.length, selected, panel: openPanelName,
      particleProcesses: [...new Set(scene.particles.map(p => p.recipe.process))],
      focusRoutes: scene.focusRoutes().map(({ from, to, process }) => ({ from, to, process })),
      ions: scene.ions ? Object.fromEntries(Object.entries(scene.ions.pools).map(([k, v]) => [k, v.length])) : {}, sound, particleStyle: formulaParticles ? 'formula' : 'dots',
      journey: journey.active ? { station: journey.path[journey.index], index: journey.index, total: journey.path.length, phase: journey.phase, compound: journey.compound, path: journey.path.slice(), animT: journey.animT, pos: scene.journey && scene.journey.pos ? scene.journey.pos.slice() : null, lens: journey.lens ? { ...journey.lens } : null, caption: $('j-caption').textContent, scene: journey.travel && journey.travel.plan ? journey.travel.plan.kind : null, dark: journey.dark || 0 } : null,
      cow: scene.cowRig ? { dx: scene.cowRig.dx, walking: scene.cowRig.amp > .05, leafEaten: scene.cowRig.leafGone > .5, freshDung: scene.cowRig.fresh > .5, xray: scene.cowRig.xray > .5, mouth: scene.cowPoint('mouth'), anus: scene.cowPoint('anus') } : null
    }), writable: false
  });
})();
