/* Journey mode — follow one nitrogen atom, station by station.
   A scripted teaching story layered on the same landscape. It pauses the live
   model and never changes its pools; every reaction here is an animation. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const TAU = Math.PI * 2;

  /* ---------- molecule building blocks (virtual stage 320 × 180) ---------- */
  const at = (...parts) => Object.assign({}, ...parts);
  const N2 = (x, y, a, b) => ({ [a]: [x - 13, y], [b]: [x + 13, y] });
  const O2 = (x, y, a, b) => ({ [a]: [x - 12, y], [b]: [x + 12, y] });
  const H2 = (x, y, a, b) => ({ [a]: [x - 8, y], [b]: [x + 8, y] });
  const NH4 = (x, y, n, h) => ({ [n]: [x, y], [h[0]]: [x - 17, y - 12], [h[1]]: [x, y - 21], [h[2]]: [x - 15, y + 15], [h[3]]: [x + 16, y + 13] });
  const NH3 = (x, y, n, h, flip) => { const s = flip ? -1 : 1; return { [n]: [x, y], [h[0]]: [x - 17 * s, y - 11], [h[1]]: [x + s, y - 21], [h[2]]: [x - 12 * s, y + 16] }; };
  const NO2 = (x, y, n, o) => ({ [n]: [x, y], [o[0]]: [x - 24, y + 16], [o[1]]: [x + 24, y + 16] });
  const NO3 = (x, y, n, o) => ({ [n]: [x, y], [o[0]]: [x, y - 27], [o[1]]: [x - 24, y + 15], [o[2]]: [x + 24, y + 15] });
  const WATER = (x, y, o, h) => ({ [o]: [x, y], [h[0]]: [x - 10, y + 7], [h[1]]: [x + 10, y + 7] });
  const UREA = (x, y, c, o, a, ha, b, hb) => ({ [c]: [x, y], [o]: [x, y - 27], [a]: [x - 23, y + 14], [ha[0]]: [x - 39, y + 6], [ha[1]]: [x - 23, y + 31], [b]: [x + 23, y + 14], [hb[0]]: [x + 39, y + 6], [hb[1]]: [x + 23, y + 31] });
  const bondsTo = (n, list, order = 1) => list.map(h => [n, h, order]);
  const ids = (p, n) => Array.from({ length: n }, (_, i) => p + (i + 1));

  /* ---------- stations ---------- */
  // pos(scene) is where the station sits in the landscape; via(scene, fromId)
  // gives waypoints for arriving; stages mark compound changes on the way.
  const S = {};
  S.air = {
    frame: [250, 170], title: 'Atmosphere', who: [], needs: [], in: 'N₂', out: 'N₂', outAt: 0, backdrop: 'air', duration: 5.2,
    pos: sc => [sc.L.plantX + sc.W * 0.14, sc.L.G * 0.42],
    atoms: { a: 'N*', b: 'N', c: 'N', d: 'N', e: 'N', f: 'N', o1: 'O', o2: 'O' },
    frames: [
      { t: 0, at: at(N2(110, 95, 'a', 'b'), N2(50, 45, 'c', 'd'), N2(250, 140, 'e', 'f'), O2(255, 45, 'o1', 'o2')), bonds: [['a', 'b', 3], ['c', 'd', 3], ['e', 'f', 3], ['o1', 'o2', 2]], step: 0, labels: [['N₂', 110, 124, 'N₂'], ['O₂', 255, 70, 'O']] },
      { t: 2.2, at: at(N2(150, 88, 'a', 'b'), N2(70, 55, 'c', 'd'), N2(225, 130, 'e', 'f'), O2(240, 56, 'o1', 'o2')), bonds: [['a', 'b', 3], ['c', 'd', 3], ['e', 'f', 3], ['o1', 'o2', 2]], step: 1, labels: [['N≡N', 150, 62, 'N₂']], glowBond: ['a', 'b'] },
      { t: 4.4, at: at(N2(130, 96, 'a', 'b'), N2(90, 40, 'c', 'd'), N2(240, 145, 'e', 'f'), O2(268, 40, 'o1', 'o2')), bonds: [['a', 'b', 3], ['c', 'd', 3], ['e', 'f', 3], ['o1', 'o2', 2]], step: 2, labels: [['N₂', 130, 124, 'N₂']] }
    ],
    captions: ['About 78% of the air is nitrogen gas, N₂.', 'Its two atoms share a triple bond, N≡N — very hard to break.', 'So plants and animals cannot use N₂ directly.'],
    eq: ['N₂'], hl: [0, 0, 0], detail: 'N≡N bond energy ≈ 945 kJ/mol — one of the strongest bonds in nature.'
  };
  S.fix = {
    frame: [115, 95], title: 'Nitrogen fixation', who: ['rhizobium'], needs: ['microbes', 'water'], in: 'N₂', out: 'NH₄⁺', outAt: 5.0, backdrop: 'nodule', duration: 6.4,
    pos: sc => { const p = sc.nodulePoints(); return p[3] || sc.noduleCenter(); },
    via: (sc, from, to) => [from, [sc.L.plantX + 110, sc.L.G - 70], [sc.L.plantX + 45, sc.L.G + 18], to],
    atoms: at({ a: 'N*', b: 'N' }, Object.fromEntries(ids('h', 7).map(h => [h, 'H']))),
    frames: [
      { t: 0, at: N2(60, 90, 'a', 'b'), bonds: [['a', 'b', 3]], step: 0, labels: [['N₂', 60, 120, 'N₂']] },
      { t: 1.3, at: N2(160, 92, 'a', 'b'), bonds: [['a', 'b', 3]], step: 1 },
      { t: 2.5, at: at({ a: [142, 92], b: [178, 92] }, { h1: [18, 30], h2: [18, 150], h3: [40, 12], h4: [302, 30], h5: [302, 150], h6: [282, 12] }), bonds: [], step: 2, flash: [160, 92], atp: [160, 92] },
      { t: 3.8, at: at(NH3(130, 92, 'a', ['h1', 'h2', 'h3']), NH3(190, 92, 'b', ['h4', 'h5', 'h6'], true), { h7: [22, 168] }), bonds: [...bondsTo('a', ['h1', 'h2', 'h3']), ...bondsTo('b', ['h4', 'h5', 'h6'])], step: 3, labels: [['NH₃', 130, 128, 'NH₄⁺'], ['NH₃', 190, 128, 'NH₄⁺']] },
      { t: 5.0, at: at(NH4(130, 92, 'a', ['h1', 'h2', 'h3', 'h7']), NH3(276, 56, 'b', ['h4', 'h5', 'h6'], true)), bonds: [...bondsTo('a', ['h1', 'h2', 'h3', 'h7']), ...bondsTo('b', ['h4', 'h5', 'h6'])], step: 4, charges: { a: '+' }, labels: [['NH₄⁺', 130, 132, 'NH₄⁺'], ['sugar from the plant →', 96, 30, 'Protein N']] }
    ],
    captions: ['N₂ from the soil air diffuses into a root nodule.', 'Rhizobium’s enzyme, nitrogenase, grips the N₂.', 'The triple bond breaks.', 'Hydrogen is added: two ammonia, NH₃.', 'NH₃ picks up H⁺ → ammonium, NH₄⁺. The plant pays the bacteria with sugar.'],
    eq: ['N₂', '→', 'NH₃', '→', 'NH₄⁺'], hl: [0, 0, 0, 2, 4], detail: 'N₂ + 8H⁺ + 8e⁻ + 16 ATP → 2NH₃ + H₂ + 16 ADP + 16 Pᵢ'
  };
  S.nit1 = {
    frame: [110, 80], title: 'Nitrification · step 1', who: ['nitrosomonas'], needs: ['oxygen', 'microbes'], in: 'NH₄⁺', out: 'NO₂⁻', outAt: 4.2, backdrop: 'bacterium', tint: '#ffc857', duration: 6.6,
    pos: sc => sc.microbeLocation('nitrosomonas'),
    via: (sc, from, to) => [from, sc.point('ammonium'), to],
    atoms: { a: 'N*', h1: 'H', h2: 'H', h3: 'H', h4: 'H', o1: 'O', o2: 'O' },
    frames: [
      { t: 0, at: at(NH4(24, 100, 'a', ids('h', 4)), O2(296, 30, 'o1', 'o2')), bonds: [...bondsTo('a', ids('h', 4)), ['o1', 'o2', 2]], charges: { a: '+' }, step: 0, labels: [['NH₄⁺', 26, 140, 'NH₄⁺']] },
      { t: 1.5, at: at(NH4(128, 100, 'a', ids('h', 4)), O2(200, 64, 'o1', 'o2')), bonds: [...bondsTo('a', ids('h', 4)), ['o1', 'o2', 2]], charges: { a: '+' }, step: 1, labels: [['O₂', 200, 42, 'O']] },
      { t: 2.9, at: at({ h1: [88, 18], h2: [140, 2], h3: [92, 178], h4: [214, 176] }, NO2(150, 100, 'a', ['o1', 'o2'])), bonds: [['a', 'o1', 2], ['a', 'o2', 1]], step: 2, flash: [150, 100], labels: [['H⁺', 74, 14, 'H'], ['H₂O', 236, 172, 'H']] },
      { t: 4.2, at: NO2(150, 100, 'a', ['o1', 'o2']), bonds: [['a', 'o1', 2], ['a', 'o2', 1]], charges: { a: '−' }, step: 3, energy: [150, 70], labels: [['NO₂⁻', 150, 140, 'NO₂⁻']] },
      { t: 5.6, at: NO2(250, 168, 'a', ['o1', 'o2']), bonds: [['a', 'o1', 2], ['a', 'o2', 1]], charges: { a: '−' }, step: 3, labels: [['NO₂⁻ leaves', 250, 140, 'NO₂⁻']] }
    ],
    captions: ['Ammonium enters Nitrosomonas, a soil bacterium.', 'It uses oxygen, O₂, from the air in the soil.', 'Hydrogens leave as H⁺ and water; oxygens join the nitrogen.', 'Nitrite, NO₂⁻, is released — and the bacterium gains energy (ATP).'],
    eq: ['NH₄⁺', '→', 'NO₂⁻'], hl: [0, 0, 0, 2], detail: '2NH₄⁺ + 3O₂ → 2NO₂⁻ + 4H⁺ + 2H₂O'
  };
  S.nit2 = {
    frame: [110, 80], title: 'Nitrification · step 2', who: ['nitrobacter'], needs: ['oxygen', 'microbes'], in: 'NO₂⁻', out: 'NO₃⁻', outAt: 4.0, backdrop: 'bacterium', tint: '#4fd6c8', duration: 6.4,
    pos: sc => sc.microbeLocation('nitrobacter'),
    via: (sc, from, to) => [from, sc.point('nitrite'), to],
    atoms: { a: 'N*', o1: 'O', o2: 'O', o3: 'O', o4: 'O' },
    frames: [
      { t: 0, at: at(NO2(26, 104, 'a', ['o1', 'o2']), O2(296, 30, 'o3', 'o4')), bonds: [['a', 'o1', 2], ['a', 'o2', 1], ['o3', 'o4', 2]], charges: { a: '−' }, step: 0, labels: [['NO₂⁻', 26, 142, 'NO₂⁻']] },
      { t: 1.5, at: at(NO2(140, 106, 'a', ['o1', 'o2']), O2(192, 60, 'o3', 'o4')), bonds: [['a', 'o1', 2], ['a', 'o2', 1], ['o3', 'o4', 2]], charges: { a: '−' }, step: 1, labels: [['O₂', 192, 38, 'O']] },
      { t: 2.8, at: at(NO2(146, 106, 'a', ['o1', 'o2']), { o3: [146, 79], o4: [292, 6] }), bonds: [['a', 'o1', 2], ['a', 'o2', 1], ['a', 'o3', 1]], step: 2, flash: [146, 92] },
      { t: 4.0, at: NO3(150, 104, 'a', ['o3', 'o1', 'o2']), bonds: [['a', 'o3', 2], ['a', 'o1', 1], ['a', 'o2', 1]], charges: { a: '−' }, step: 3, energy: [150, 66], labels: [['NO₃⁻', 150, 146, 'NO₃⁻']] },
      { t: 5.4, at: NO3(252, 168, 'a', ['o3', 'o1', 'o2']), bonds: [['a', 'o3', 2], ['a', 'o1', 1], ['a', 'o2', 1]], charges: { a: '−' }, step: 3, labels: [['NO₃⁻ leaves', 252, 132, 'NO₃⁻']] }
    ],
    captions: ['Nitrite enters Nitrobacter.', 'Oxygen arrives.', 'One more oxygen atom joins the nitrogen.', 'Nitrate, NO₃⁻, forms — the bacterium gains energy, and roots can absorb it.'],
    eq: ['NO₂⁻', '→', 'NO₃⁻'], hl: [0, 0, 0, 2], detail: '2NO₂⁻ + O₂ → 2NO₃⁻'
  };
  const WAT = (x, y, k) => WATER(x, y, 'w' + k, ['w' + k + 'a', 'w' + k + 'b']);
  const watBonds = k => [['w' + k, 'w' + k + 'a', 1], ['w' + k, 'w' + k + 'b', 1]];
  const watAtoms = k => ({ ['w' + k]: 'O', ['w' + k + 'a']: 'H', ['w' + k + 'b']: 'H' });
  const no3Bonds = (n, o) => [[n, o[0], 2], [n, o[1], 1], [n, o[2], 1]];
  S.abs = {
    frame: [95, 80], title: 'Absorption', who: ['plant'], needs: ['water'], in: 'NO₃⁻', out: 'NO₃⁻', outAt: 0, backdrop: 'root', duration: 5.2,
    pos: sc => sc.rootToWorld(sc.rootGeo.hairs[6] || [40, 90]),
    via: (sc, from, to) => [from, sc.point('nitrate'), to],
    atoms: at({ a: 'N*', o1: 'O', o2: 'O', o3: 'O' }, watAtoms(1), watAtoms(2), watAtoms(3)),
    frames: [
      { t: 0, at: at(NO3(60, 118, 'a', ['o1', 'o2', 'o3']), WAT(30, 60, 1), WAT(110, 156, 2), WAT(150, 40, 3)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2), ...watBonds(3)], charges: { a: '−' }, step: 0, labels: [['NO₃⁻', 60, 160, 'NO₃⁻']] },
      { t: 1.4, at: at(NO3(140, 110, 'a', ['o1', 'o2', 'o3']), WAT(92, 70, 1), WAT(168, 154, 2), WAT(175, 52, 3)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2), ...watBonds(3)], charges: { a: '−' }, step: 1 },
      { t: 2.8, at: at(NO3(205, 95, 'a', ['o1', 'o2', 'o3']), WAT(150, 80, 1), WAT(196, 150, 2), WAT(240, 60, 3)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2), ...watBonds(3)], charges: { a: '−' }, step: 2 },
      { t: 4.2, at: at(NO3(268, 56, 'a', ['o1', 'o2', 'o3']), WAT(240, 120, 1), WAT(282, 150, 2), WAT(292, 100, 3)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2), ...watBonds(3)], charges: { a: '−' }, step: 3, labels: [['↑ to the leaves', 262, 18, 'NO₃⁻']] }
    ],
    captions: ['Nitrate dissolves in soil water.', 'Water carries it to a root hair.', 'Transporter proteins in the root hair let it in.', 'It travels up the xylem with water, to the leaves.'],
    eq: ['NO₃⁻', '→', 'root'], hl: [0, 0, 2, 2], detail: 'Roots take up nitrate by active transport (it costs energy), then water carries it up the xylem.'
  };
  S.assim = {
    frame: [140, 125], title: 'Assimilation', who: ['plant'], needs: ['light'], in: 'NO₃⁻', out: 'Protein N', outAt: 5.4, backdrop: 'leaf', duration: 6.6,
    pos: sc => sc.plantPoint('bite'), // the leaf the cow will eat
    via: (sc, from, to) => [from, sc.rootToWorld([0, 18]), sc.stemWorld(0.1), sc.stemWorld(0.35), to],
    atoms: { a: 'N*', o1: 'O', o2: 'O', o3: 'O', h1: 'H', h2: 'H', h3: 'H', h4: 'H', c1: 'C', c2: 'C', o4: 'O', o5: 'O', b1: 'AA', b2: 'AA', b3: 'AA' },
    frames: [
      { t: 0, at: NO3(70, 96, 'a', ['o1', 'o2', 'o3']), bonds: no3Bonds('a', ['o1', 'o2', 'o3']), charges: { a: '−' }, step: 0, labels: [['NO₃⁻', 70, 140, 'NO₃⁻']] },
      { t: 1.3, at: { a: [100, 96], o1: [40, 26], o2: [22, 160], o3: [120, 172] }, bonds: [], step: 1, flash: [100, 96] },
      { t: 2.6, at: NH4(110, 96, 'a', ids('h', 4)), bonds: bondsTo('a', ids('h', 4)), charges: { a: '+' }, step: 2, labels: [['NH₄⁺', 110, 138, 'NH₄⁺']] },
      { t: 4.0, at: { a: [110, 96], h1: [96, 84], h2: [96, 109], c1: [134, 96], c2: [158, 96], o4: [174, 81], o5: [176, 111] }, bonds: [['a', 'h1', 1], ['a', 'h2', 1], ['a', 'c1', 1], ['c1', 'c2', 1], ['c2', 'o4', 2], ['c2', 'o5', 1]], step: 3, labels: [['amino acid', 140, 140, 'Protein N']] },
      { t: 5.4, at: { a: [96, 96], h1: [82, 84], h2: [82, 109], c1: [120, 96], c2: [144, 96], o4: [160, 81], b1: [176, 104], b2: [204, 92], b3: [232, 104] }, bonds: [['a', 'h1', 1], ['a', 'h2', 1], ['a', 'c1', 1], ['c1', 'c2', 1], ['c2', 'o4', 2], ['c2', 'b1', 1], ['b1', 'b2', 1], ['b2', 'b3', 1]], step: 4, labels: [['protein  R–NH₂', 168, 140, 'Protein N']] }
    ],
    captions: ['Nitrate reaches a leaf cell.', 'Using energy from sunlight, its oxygens are removed…', '…and hydrogens added: ammonium, NH₄⁺.', 'NH₄⁺ joins a carbon chain → an amino acid.', 'Amino acids link up into proteins.'],
    eq: ['NO₃⁻', '→', 'NH₄⁺', '→', 'Protein N'], hl: [0, 0, 2, 4, 4], detail: 'Nitrate reductase: NO₃⁻ → NO₂⁻;  nitrite reductase: NO₂⁻ → NH₄⁺;  glutamine synthetase adds NH₄⁺ to glutamate.'
  };
  const chain = (names, x0, y, dx, wave) => Object.fromEntries(names.map((n, i) => [n, [x0 + i * dx, y + (i % 2 ? -wave : wave)]]));
  const links = names => names.slice(1).map((n, i) => [names[i], n, 1]);
  S.feed = {
    frame: [185, 125], title: 'Feeding', who: ['cow'], needs: [], in: 'Protein N', out: 'Protein N', outAt: 4.4, backdrop: 'gut', duration: 5.6,
    pos: sc => sc.cowPoint('rumen'),
    script: 'eat', cow: { at: 'eat', head: 'chew', chew: .75, leafGone: 1, xray: 1, organ: 'rumen' },
    atoms: { p1: 'AA', p2: 'AA', p3: 'AA*', p4: 'AA', p5: 'AA', q1: 'AB', q2: 'AB', q3: 'AB' },
    frames: [
      { t: 0, at: chain(['p1', 'p2', 'p3', 'p4', 'p5'], 60, 95, 30, 6), bonds: links(['p1', 'p2', 'p3', 'p4', 'p5']), step: 0, labels: [['plant protein', 120, 135, 'Protein N']] },
      { t: 1.5, at: chain(['p1', 'p2', 'p3', 'p4', 'p5'], 100, 95, 30, 6), bonds: links(['p1', 'p2', 'p3', 'p4', 'p5']), step: 1 },
      { t: 2.9, at: { p1: [110, 46], p2: [140, 142], p3: [166, 92], p4: [206, 44], p5: [232, 140] }, bonds: [], step: 2, flash: [166, 92], labels: [['amino acids', 166, 170, 'Protein N']] },
      { t: 4.4, at: at(chain(['q1', 'p3', 'q2', 'p1', 'q3'], 104, 95, 30, 6), { p2: [300, 170], p4: [300, 20], p5: [20, 170] }), bonds: links(['q1', 'p3', 'q2', 'p1', 'q3']), step: 3, labels: [['cow protein', 164, 135, 'Protein N']] }
    ],
    captions: ['The bean leaf reaches the cow’s stomach.', 'There the plant protein is digested…', '…into amino acids, which pass into the blood.', 'They are rebuilt into cow protein: muscle and milk.'],
    eq: ['plant protein', '→', 'amino acids', '→', 'cow protein'], hl: [0, 0, 2, 4], detail: 'Digestion breaks peptide bonds (hydrolysis); the body joins amino acids into new proteins.'
  };
  S.waste = {
    frame: [125, 90], title: 'Waste', who: ['cow'], needs: [], in: 'Protein N', out: 'Organic N', outAt: 2.8, backdrop: 'gut', duration: 5.2,
    pos: sc => sc.cowPoint('liver'),
    script: 'later', cow: { at: 'dung', leafGone: 1, xray: 1, organ: 'liver' },
    atoms: { a: 'N*', h1: 'H', h2: 'H', c1: 'C', c2: 'C', o4: 'O', o5: 'O', c3: 'C', o6: 'O', b: 'N', h3: 'H', h4: 'H' },
    frames: [
      { t: 0, at: { a: [90, 95], h1: [76, 83], h2: [76, 108], c1: [114, 95], c2: [138, 95], o4: [154, 80], o5: [156, 110] }, bonds: [['a', 'h1', 1], ['a', 'h2', 1], ['a', 'c1', 1], ['c1', 'c2', 1], ['c2', 'o4', 2], ['c2', 'o5', 1]], step: 0, labels: [['amino acid', 115, 140, 'Protein N']] },
      { t: 1.4, at: { a: [152, 78], h1: [138, 66], h2: [138, 91], c1: [70, 120], c2: [94, 120], o4: [110, 105], o5: [112, 135] }, bonds: [['a', 'h1', 1], ['a', 'h2', 1], ['c1', 'c2', 1], ['c2', 'o4', 2], ['c2', 'o5', 1]], step: 1, flash: [125, 88], labels: [['–NH₂', 160, 104, 'NH₄⁺']] },
      { t: 2.8, at: UREA(175, 98, 'c3', 'o6', 'a', ['h1', 'h2'], 'b', ['h3', 'h4']), bonds: [['c3', 'o6', 2], ['c3', 'a', 1], ['c3', 'b', 1], ['a', 'h1', 1], ['a', 'h2', 1], ['b', 'h3', 1], ['b', 'h4', 1]], step: 2, labels: [['urea  CO(NH₂)₂', 175, 156, 'Organic N']] },
      { t: 4.2, at: UREA(175, 128, 'c3', 'o6', 'a', ['h1', 'h2'], 'b', ['h3', 'h4']), bonds: [['c3', 'o6', 2], ['c3', 'a', 1], ['c3', 'b', 1], ['a', 'h1', 1], ['a', 'h2', 1], ['b', 'h3', 1], ['b', 'h4', 1]], step: 3, labels: [['in urine & dung ↓', 175, 40, 'Organic N']] }
    ],
    captions: ['The cow breaks down amino acids it does not need.', 'The nitrogen group, –NH₂, is removed…', '…and turned into urea, CO(NH₂)₂, in the liver.', 'Urea (in urine) and undigested matter (in dung) must leave the body.'],
    eq: ['amino acids', '→', 'urea', '+', 'dung'], hl: [0, 0, 2, 4], detail: 'Amino acids → NH₃ → urea (urea cycle, liver). Dung also carries organic nitrogen.'
  };
  S.decomp = {
    frame: [110, 85], title: 'Decomposition', who: ['decomposers'], needs: ['microbes', 'water'], in: 'Organic N', out: 'NH₄⁺', outAt: 4.2, backdrop: 'soil', duration: 5.4,
    pos: sc => sc.microbeLocation('decomposers'),
    script: 'poop', cow: { at: 'dung', leafGone: 1, fresh: 1 },
    atoms: { c3: 'C', o6: 'O', a: 'N*', h1: 'H', h2: 'H', b: 'N', h3: 'H', h4: 'H', ow: 'O', owa: 'H', owb: 'H', h5: 'H' },
    frames: [
      { t: 0, at: UREA(105, 100, 'c3', 'o6', 'a', ['h1', 'h2'], 'b', ['h3', 'h4']), bonds: [['c3', 'o6', 2], ['c3', 'a', 1], ['c3', 'b', 1], ['a', 'h1', 1], ['a', 'h2', 1], ['b', 'h3', 1], ['b', 'h4', 1]], step: 0, labels: [['urea', 105, 156, 'Organic N']] },
      { t: 1.3, at: at(UREA(160, 100, 'c3', 'o6', 'a', ['h1', 'h2'], 'b', ['h3', 'h4']), WATER(160, 30, 'ow', ['owa', 'owb'])), bonds: [['c3', 'o6', 2], ['c3', 'a', 1], ['c3', 'b', 1], ['a', 'h1', 1], ['a', 'h2', 1], ['b', 'h3', 1], ['b', 'h4', 1], ['ow', 'owa', 1], ['ow', 'owb', 1]], step: 1, labels: [['H₂O', 160, 14, 'H']] },
      { t: 2.7, at: { c3: [250, 46], o6: [226, 46], ow: [274, 46], a: [128, 112], h1: [111, 102], h2: [126, 130], owa: [140, 98], b: [196, 112], h3: [213, 102], h4: [198, 130], owb: [184, 98] }, bonds: [['c3', 'o6', 2], ['c3', 'ow', 2], ['a', 'h1', 1], ['a', 'h2', 1], ['a', 'owa', 1], ['b', 'h3', 1], ['b', 'h4', 1], ['b', 'owb', 1]], step: 2, flash: [160, 100], labels: [['CO₂', 250, 72, 'H'], ['NH₃', 128, 150, 'NH₄⁺'], ['NH₃', 196, 150, 'NH₄⁺']] },
      { t: 4.2, at: at(NH4(128, 104, 'a', ['h1', 'owa', 'h2', 'h5']), { b: [286, 150], h3: [302, 142], h4: [286, 167], owb: [272, 138], c3: [300, 30], o6: [276, 30], ow: [320, 30] }), bonds: [...bondsTo('a', ['h1', 'owa', 'h2', 'h5']), ['b', 'h3', 1], ['b', 'h4', 1], ['b', 'owb', 1], ['c3', 'o6', 2], ['c3', 'ow', 2]], charges: { a: '+' }, step: 3, labels: [['NH₄⁺', 128, 146, 'NH₄⁺']] }
    ],
    captions: ['Bacteria and fungi feed on the fresh dung and urine.', 'The enzyme urease splits urea using water…', '…releasing ammonia, NH₃, and carbon dioxide.', 'In moist soil NH₃ gains H⁺ → ammonium, NH₄⁺. This is ammonification.'],
    eq: ['urea', '→', 'NH₃', '→', 'NH₄⁺'], hl: [0, 0, 2, 4], detail: 'CO(NH₂)₂ + H₂O → 2NH₃ + CO₂ (urease);  NH₃ + H⁺ → NH₄⁺'
  };
  S.denit = {
    frame: [140, 115], title: 'Denitrification', who: ['denitrifiers'], needs: ['waterlogged', 'microbes'], in: 'NO₃⁻', out: 'N₂', outAt: 4.1, backdrop: 'wet', duration: 6.2, wet: true,
    cow: { at: 'dung', leafGone: 1, fresh: 1 },
    pos: sc => sc.microbeLocation('denitrifiers'),
    via: (sc, from, to) => [from, sc.point('ammonium'), sc.microbeLocation('nitrosomonas'), sc.point('nitrite'), sc.microbeLocation('nitrobacter'), sc.point('nitrate'), to],
    stages: [[2, 'NO₂⁻'], [4, 'NO₃⁻']], transit: 'On the way it is nitrified again: NH₄⁺ → NO₂⁻ → NO₃⁻.',
    atoms: { a: 'N*', o1: 'O', o2: 'O', o3: 'O', b: 'N', o4: 'O', o5: 'O', o6: 'O' },
    frames: [
      { t: 0, at: at(NO3(80, 100, 'a', ['o1', 'o2', 'o3']), NO3(240, 100, 'b', ['o4', 'o5', 'o6'])), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...no3Bonds('b', ['o4', 'o5', 'o6'])], charges: { a: '−', b: '−' }, step: 0, labels: [['NO₃⁻', 80, 145, 'NO₃⁻'], ['NO₃⁻', 240, 145, 'NO₃⁻']] },
      { t: 1.5, at: at(NO2(104, 100, 'a', ['o2', 'o3']), NO2(216, 100, 'b', ['o5', 'o6']), { o1: [60, 18], o4: [262, 18] }), bonds: [['a', 'o2', 2], ['a', 'o3', 1], ['b', 'o5', 2], ['b', 'o6', 1]], charges: { a: '−', b: '−' }, step: 1, flash: [104, 86], labels: [['NO₂⁻', 104, 142, 'NO₂⁻'], ['NO₂⁻', 216, 142, 'NO₂⁻'], ['it breathes nitrate instead of O₂', 160, 30, 'N₂']] },
      { t: 2.8, at: { a: [148, 96], b: [174, 96], o6: [200, 96], o2: [40, 170], o3: [110, 172], o5: [272, 170] }, bonds: [['a', 'b', 2], ['b', 'o6', 1]], step: 2, flash: [160, 96], labels: [['N₂O', 174, 130, 'N₂']] },
      { t: 4.1, at: at(N2(162, 96, 'a', 'b'), { o6: [250, 36] }), bonds: [['a', 'b', 3]], step: 3, flash: [188, 96], energy: [162, 140], labels: [['N₂', 162, 122, 'N₂']] },
      { t: 5.3, at: N2(162, 36, 'a', 'b'), bonds: [['a', 'b', 3]], step: 4 }
    ],
    captions: ['Waterlogged soil has almost no oxygen.', 'Stutzerimonas takes oxygen from nitrate instead: NO₃⁻ → NO₂⁻ → NO…', '…two nitrogens pair up as N₂O (a greenhouse gas)…', '…and finally form N₂.', 'The N₂ bubbles out of the soil.'],
    eq: ['NO₃⁻', '→', 'NO₂⁻', '→', 'NO', '→', 'N₂O', '→', 'N₂'], hl: [0, 2, 6, 8, 8], detail: '2NO₃⁻ + 10e⁻ + 12H⁺ → N₂ + 6H₂O'
  };
  S.return = {
    frame: [250, 170], title: 'Back to the air', who: [], needs: [], in: 'N₂', out: 'N₂', outAt: 0, backdrop: 'air', duration: 5, finale: true,
    cow: { at: 'dung', leafGone: 1, fresh: 1 },
    pos: sc => [sc.microbeLocation('denitrifiers')[0] - sc.W * 0.2, sc.L.G * 0.4],
    via: (sc, from, to) => { const x = from[0]; return [from, [x, sc.surface(x) - 4], [x - 20, sc.L.G * 0.6], to]; },
    atoms: S.air.atoms, frames: S.air.frames.map((f, i) => ({ ...f, step: Math.min(i, 1), labels: i === 1 ? [['✓ Cycle complete', 160, 22, 'N₂']] : f.labels })),
    captions: ['The N₂ rejoins the air.', 'Cycle complete! The same atom can go round again.'],
    eq: ['N₂'], hl: [0, 0, 0], detail: 'Our atom passed through air, bacteria, a plant, a cow and the soil — and came back as N₂.'
  };

  /* ---------- side trips ---------- */
  S.bolt = {
    frame: [230, 170], title: 'Lightning', who: [], needs: [], in: 'N₂', out: 'NO', outAt: 2.6, backdrop: 'storm', duration: 4.2, storm: true, lightning: true, branch: 'lightning',
    pos: sc => [sc.W * 0.17, sc.L.G * 0.45],
    atoms: { a: 'N*', b: 'N', o1: 'O', o2: 'O' },
    frames: [
      { t: 0, at: at(N2(110, 100, 'a', 'b'), O2(210, 100, 'o1', 'o2')), bonds: [['a', 'b', 3], ['o1', 'o2', 2]], step: 0, labels: [['N₂', 110, 132, 'N₂'], ['O₂', 210, 132, 'O']] },
      { t: 1.2, at: { a: [122, 88], b: [150, 122], o1: [186, 80], o2: [214, 116] }, bonds: [], step: 1, flash: [160, 100] },
      { t: 2.6, at: { a: [132, 88], o1: [158, 88], b: [170, 124], o2: [196, 124] }, bonds: [['a', 'o1', 2], ['b', 'o2', 2]], step: 2, labels: [['NO', 145, 64, 'NO'], ['NO', 183, 152, 'NO']] }
    ],
    captions: ['N₂ and O₂ meet in a thunderstorm.', 'The bolt’s huge energy splits both molecules.', 'Nitrogen and oxygen atoms combine: nitric oxide, NO.'],
    eq: ['N₂', '+', 'O₂', '→', 'NO'], hl: [0, 0, 4], detail: 'N₂ + O₂ → 2NO (only at the very high temperature inside a lightning bolt)'
  };
  S.rain = {
    frame: [160, 120], title: 'Rain brings nitrate', who: [], needs: ['water'], in: 'NO', out: 'NO₃⁻', outAt: 3.8, backdrop: 'rain', duration: 5.6, storm: true, branch: 'lightning',
    pos: sc => [sc.W * 0.22, sc.surface(sc.W * 0.22) + 24],
    via: (sc, from, to) => [from, [to[0] - 10, sc.L.G * .7], to],
    atoms: { a: 'N*', o1: 'O', o3: 'O', o4: 'O', ow: 'O', owa: 'H', owb: 'H' },
    frames: [
      { t: 0, at: at({ a: [80, 80], o1: [106, 80] }, O2(200, 50, 'o3', 'o4')), bonds: [['a', 'o1', 2], ['o3', 'o4', 2]], step: 0, labels: [['NO', 93, 108, 'NO']] },
      { t: 1.3, at: at(NO2(130, 80, 'a', ['o1', 'o3']), { o4: [262, 24] }), bonds: [['a', 'o1', 2], ['a', 'o3', 1]], step: 1, labels: [['NO₂', 130, 124, 'NO']] },
      { t: 2.6, at: at(NO3(150, 92, 'a', ['ow', 'o1', 'o3']), { owa: [150, 46], owb: [270, 150] }), bonds: [['a', 'ow', 1], ['a', 'o1', 2], ['a', 'o3', 1], ['ow', 'owa', 1]], step: 2, labels: [['HNO₃', 150, 138, 'NO₃⁻']] },
      { t: 3.8, at: NO3(150, 92, 'a', ['ow', 'o1', 'o3']), bonds: no3Bonds('a', ['ow', 'o1', 'o3']), charges: { a: '−' }, step: 3, labels: [['NO₃⁻', 150, 138, 'NO₃⁻'], ['H⁺', 196, 40, 'H']] },
      { t: 5.0, at: NO3(150, 142, 'a', ['ow', 'o1', 'o3']), bonds: no3Bonds('a', ['ow', 'o1', 'o3']), charges: { a: '−' }, step: 4 }
    ],
    captions: ['NO meets more oxygen…', '…forming nitrogen dioxide, NO₂ (the brown gas in storms).', 'NO₂ dissolves in raindrops → nitric acid, HNO₃.', 'In water it lets go of H⁺, leaving nitrate, NO₃⁻.', 'Rain carries the nitrate into the soil.'],
    eq: ['NO', '→', 'NO₂', '→', 'HNO₃', '→', 'NO₃⁻'], hl: [0, 2, 4, 6, 6], detail: '2NO + O₂ → 2NO₂;  3NO₂ + H₂O → 2HNO₃ + NO'
  };
  S.factory = {
    frame: [220, 150], title: 'Fertilizer factory', who: [], needs: [], in: 'N₂', out: 'NH₃', outAt: 3.8, backdrop: 'factory', duration: 4.8, branch: 'fertilizer',
    pos: sc => [sc.W * 0.47, sc.L.G - 210],
    atoms: { a: 'N*', b: 'N', h1: 'H', h2: 'H', h3: 'H', h4: 'H', h5: 'H', h6: 'H' },
    frames: [
      { t: 0, at: at(N2(80, 95, 'a', 'b'), H2(210, 46, 'h1', 'h2'), H2(240, 96, 'h3', 'h4'), H2(210, 146, 'h5', 'h6')), bonds: [['a', 'b', 3], ['h1', 'h2', 1], ['h3', 'h4', 1], ['h5', 'h6', 1]], step: 0, labels: [['N₂', 80, 124, 'N₂'], ['3 H₂', 270, 150, 'H']] },
      { t: 1.3, at: at(N2(150, 100, 'a', 'b'), H2(186, 62, 'h1', 'h2'), H2(206, 100, 'h3', 'h4'), H2(186, 138, 'h5', 'h6')), bonds: [['a', 'b', 3], ['h1', 'h2', 1], ['h3', 'h4', 1], ['h5', 'h6', 1]], step: 1 },
      { t: 2.4, at: { a: [136, 100], b: [176, 100], h1: [120, 74], h2: [190, 70], h3: [210, 104], h4: [104, 112], h5: [190, 132], h6: [130, 136] }, bonds: [], step: 2, flash: [156, 100] },
      { t: 3.8, at: at(NH3(126, 100, 'a', ['h1', 'h4', 'h6']), NH3(194, 100, 'b', ['h2', 'h3', 'h5'], true)), bonds: [...bondsTo('a', ['h1', 'h4', 'h6']), ...bondsTo('b', ['h2', 'h3', 'h5'])], step: 3, labels: [['NH₃', 126, 136, 'NH₄⁺'], ['NH₃', 194, 136, 'NH₄⁺']] }
    ],
    captions: ['Factories take N₂ from the air, and H₂ made from natural gas.', 'High pressure, about 450 °C and an iron catalyst…', '…break the bonds…', '…making ammonia, NH₃ — the start of most fertilizer.'],
    eq: ['N₂', '+', 'H₂', '→', 'NH₃'], hl: [0, 0, 0, 4], detail: 'N₂ + 3H₂ ⇌ 2NH₃  (Haber–Bosch process, ~200 atm, ~450 °C, iron catalyst)'
  };
  S.pellet = {
    frame: [140, 100], title: 'Fertilizer in the soil', who: [], needs: ['water'], in: 'NH₃', out: 'NH₄⁺', outAt: 3.0, backdrop: 'soilwater', duration: 4.4, branch: 'fertilizer',
    pos: sc => [sc.W * 0.47, sc.surface(sc.W * 0.47) + 16],
    via: (sc, from, to) => [from, [to[0] - 6, sc.L.G - 70], to],
    atoms: at({ a: 'N*', h1: 'H', h2: 'H', h3: 'H', h4: 'H', b: 'N', o1: 'O', o2: 'O', o3: 'O' }, watAtoms(1), watAtoms(2)),
    frames: [
      { t: 0, at: at(NH4(130, 60, 'a', ids('h', 4)), NO3(186, 64, 'b', ['o1', 'o2', 'o3'])), bonds: [...bondsTo('a', ids('h', 4)), ...no3Bonds('b', ['o1', 'o2', 'o3'])], step: 0, labels: [['NH₄NO₃ pellet', 158, 22, 'Pellet']], box: [100, 32, 116, 60] },
      { t: 1.5, at: at(NH4(130, 100, 'a', ids('h', 4)), NO3(186, 104, 'b', ['o1', 'o2', 'o3']), WAT(70, 150, 1), WAT(250, 150, 2)), bonds: [...bondsTo('a', ids('h', 4)), ...no3Bonds('b', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2)], step: 1, box: [100, 72, 116, 60] },
      { t: 3.0, at: at(NH4(92, 116, 'a', ids('h', 4)), NO3(232, 108, 'b', ['o1', 'o2', 'o3']), WAT(160, 150, 1), WAT(160, 70, 2)), bonds: [...bondsTo('a', ids('h', 4)), ...no3Bonds('b', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2)], charges: { a: '+', b: '−' }, step: 2, labels: [['NH₄⁺', 92, 156, 'NH₄⁺'], ['NO₃⁻', 232, 150, 'NO₃⁻']] }
    ],
    captions: ['Ammonia is made into pellets such as ammonium nitrate, NH₄NO₃.', 'A farmer spreads them and rain wets the soil.', 'The pellets dissolve: NH₄⁺ and NO₃⁻ ions enter the soil water.'],
    eq: ['NH₄NO₃', '→', 'NH₄⁺', '+', 'NO₃⁻'], hl: [0, 0, 2], detail: 'Too much fertilizer is wasted: extra nitrate leaches away and some becomes N₂O.'
  };
  S.leach = {
    frame: [140, 110], title: 'Leaching', who: [], needs: ['waterlogged'], in: 'NO₃⁻', out: 'NO₃⁻', outAt: 0, backdrop: 'leach', duration: 4.4, storm: true, wet: true, branch: 'leaching',
    pos: sc => { const x = sc.point('nitrate')[0]; return [x, sc.waterTable(x, 1) + 40]; },
    via: (sc, from, to) => [from, sc.point('nitrate'), to],
    atoms: at({ a: 'N*', o1: 'O', o2: 'O', o3: 'O' }, watAtoms(1), watAtoms(2)),
    frames: [
      { t: 0, at: at(NO3(100, 44, 'a', ['o1', 'o2', 'o3']), WAT(60, 20, 1), WAT(150, 30, 2)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2)], charges: { a: '−' }, step: 0 },
      { t: 1.5, at: at(NO3(140, 92, 'a', ['o1', 'o2', 'o3']), WAT(110, 80, 1), WAT(184, 76, 2)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2)], charges: { a: '−' }, step: 1 },
      { t: 3.0, at: at(NO3(186, 140, 'a', ['o1', 'o2', 'o3']), WAT(150, 132, 1), WAT(230, 130, 2)), bonds: [...no3Bonds('a', ['o1', 'o2', 'o3']), ...watBonds(1), ...watBonds(2)], charges: { a: '−' }, step: 2, labels: [['groundwater', 250, 172, 'groundwater']] }
    ],
    captions: ['Nitrate is negative and soil particles don’t hold on to it.', 'Heavy rain washes it down past the roots…', '…into the groundwater.'],
    eq: ['NO₃⁻', '→', 'groundwater'], hl: [0, 0, 2], detail: 'Leaching wastes fertilizer and can pollute drinking water.'
  };
  S.river = {
    frame: [180, 130], title: 'Into rivers', who: [], needs: [], in: 'NO₃⁻', out: 'NO₃⁻', outAt: 0, backdrop: 'river', duration: 4.6, wet: true, branch: 'leaching', dead: true,
    pos: sc => [sc.W * 0.82, Math.min(sc.H - 40, sc.waterTable(sc.W * 0.82, 1) + 120)],
    via: (sc, from, to) => [from, [lerp(from[0], to[0], .5), Math.max(from[1], to[1]) + 30], to],
    atoms: { a: 'N*', o1: 'O', o2: 'O', o3: 'O' },
    frames: [
      { t: 0, at: NO3(60, 100, 'a', ['o1', 'o2', 'o3']), bonds: no3Bonds('a', ['o1', 'o2', 'o3']), charges: { a: '−' }, step: 0 },
      { t: 2.4, at: NO3(220, 96, 'a', ['o1', 'o2', 'o3']), bonds: no3Bonds('a', ['o1', 'o2', 'o3']), charges: { a: '−' }, step: 1, labels: [['algae bloom', 160, 24, 'Protein N']] }
    ],
    captions: ['Groundwater flows slowly toward streams and rivers.', 'Extra nitrate feeds algae, which then use up the water’s oxygen (eutrophication).'],
    eq: ['groundwater', '→', 'algae bloom'], hl: [0, 2], detail: 'This atom has left the field. Back on the main path, we follow another nitrate.'
  };

  const MAIN = ['air', 'fix', 'nit1', 'nit2', 'abs', 'assim', 'feed', 'waste', 'decomp', 'denit', 'return'];
  const BRANCHES = {
    lightning: { from: 'air', stations: ['bolt', 'rain'], rejoin: 'abs', label: 'Lightning', icon: 'bolt' },
    fertilizer: { from: 'air', stations: ['factory', 'pellet'], rejoin: 'nit1', label: 'Fertilizer', icon: 'fert' },
    leaching: { from: 'nit2', stations: ['leach', 'river'], rejoin: 'abs', label: 'Leaching', icon: 'leach' }
  };
  for (const [id, s] of Object.entries(S)) s.id = id;

  /* ---------- microscope lens: the reaction, drawn inside the landscape ---------- */
  const ATOM = {
    N: { r: 11, c: '#3f6cf2', t: 'N' }, O: { r: 10, c: '#ef4a43', t: 'O' }, H: { r: 6.5, c: '#eef1f5', t: 'H', dark: true }, C: { r: 10, c: '#59606b', t: 'C' },
    AA: { r: 10, c: '#7dcf5a', t: '' }, AB: { r: 10, c: '#e39a8e', t: '' }
  };
  const LENS = { air: 'In the air', fix: 'Inside a root nodule', nit1: 'Inside Nitrosomonas', nit2: 'Inside Nitrobacter', abs: 'At a root hair', assim: 'Inside a leaf cell', feed: 'In the cow’s gut', waste: 'In the cow’s liver', decomp: 'Decomposers at work', denit: 'Inside Stutzerimonas', return: 'In the air', bolt: 'Inside a lightning bolt', rain: 'In a raindrop', factory: 'In the factory reactor', pellet: 'Pellet in soil water', leach: 'Soil water draining', river: 'In the river' };
  // Cow head poses in cow space (see art.js): head up while walking, relaxed while chewing.
  const WALK = { x: 120, y: -150, a: .55 }, CHEW = { x: 126, y: -138, a: .8 };
  function frameState(st, T) {
    const F = st.frames; let i = 0;
    while (i < F.length - 1 && T >= F[i + 1].t - Math.min(F[i + 1].t - F[i].t, 1.2)) i++;
    // the move into keyframe i happens during its last ≤1.2 s, so captions lead the motion
    const B = F[i], A = F[Math.max(0, i - 1)], span = B.t - A.t, move = Math.min(span, 1.2);
    const u = i === 0 ? 1 : ease(clamp((T - (B.t - move)) / Math.max(.001, move), 0, 1));
    return { A, B, u, i, step: B.step !== undefined ? B.step : 0 };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; }
  const easeBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const bondKey = (p, q) => p < q ? p + '|' + q : q + '|' + p;
  // Faint molecules drifting at another depth make the lens feel like a real field of view.
  function ambient(ctx, st, T) {
    const kind = st.backdrop === 'air' || st.backdrop === 'storm' ? 'air' : st.backdrop === 'factory' ? 'h2' : st.backdrop === 'gut' ? null : 'water';
    if (!kind) return;
    ctx.save(); ctx.globalAlpha = .2;
    for (let i = 0; i < 12; i++) {
      const sp = .25 + hash('d' + i) * .5, x = ((hash('x' + i) * 400 + T * 9 * sp) % 400) - 40, y = -60 + hash('y' + i) * 300 + Math.sin(T * .6 + i) * 6, a = T * (.3 + sp) + i;
      const atom = (px, py, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); };
      if (kind === 'water') { atom(x, y, 5, '#ef4a43'); atom(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3.2, '#eef1f5'); atom(x + Math.cos(a + 1.8) * 7, y + Math.sin(a + 1.8) * 7, 3.2, '#eef1f5'); }
      else { const c = kind === 'h2' ? '#eef1f5' : i % 5 === 0 ? '#ef4a43' : '#3f6cf2', r = kind === 'h2' ? 3.5 : 5; atom(x - Math.cos(a) * 5, y - Math.sin(a) * 5, r, c); atom(x + Math.cos(a) * 5, y + Math.sin(a) * 5, r, c); }
    }
    ctx.restore();
  }
  // Draws the reaction in stage units (centre 160, 90). The caller sets the transform and clip.
  function stageContent(ctx, st, T, colors) {
    backdrop(ctx, st, T);
    ambient(ctx, st, T);
    const { A, B, i } = frameState(st, T), move = i === 0 ? 0 : Math.min(B.t - A.t, 1.2), t0 = B.t - move;
    const bA = new Map((A.bonds || []).map(([p, q, o]) => [bondKey(p, q), [p, q, o]])), bB = new Map((B.bonds || []).map(([p, q, o]) => [bondKey(p, q), [p, q, o]]));
    const forming = new Set(); for (const [k, [p, q]] of bB) if (!bA.has(k) && i > 0) { forming.add(p); forming.add(q); }
    // each atom moves on its own slightly offset clock, curving a little, and snaps into new bonds
    const atomU = id => { if (i === 0) return 1; const span = Math.max(.2, move - .24), r = clamp((T - t0 - hash(id + st.id) * .24) / span, 0, 1); return forming.has(id) ? easeBack(r) : ease(r); };
    const P = {};
    for (const id of Object.keys(st.atoms)) {
      const a = A.at[id], b = B.at[id]; if (!a && !b) continue;
      const u = atomU(id);
      if (a && b) {
        const dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.hypot(dx, dy); let x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
        if (dist > 20) { const bend = Math.sin(Math.PI * clamp(u, 0, 1)) * Math.min(18, dist * .16) * (hash(id) > .5 ? 1 : -1); x += -dy / dist * bend; y += dx / dist * bend; }
        P[id] = [x, y, 1];
      } else if (b) P[id] = [b[0], b[1], clamp(u, 0, 1)];
      else P[id] = [a[0], a[1], 1 - clamp(u, 0, 1)];
    }
    // whole molecules tumble gently about their centres; every atom jiggles with thermal motion
    const live = T > t0 + move * .5 ? bB : bA, parent = {};
    const find = x => parent[x] === undefined || parent[x] === x ? x : (parent[x] = find(parent[x]));
    for (const [, [p, q]] of live) if (P[p] && P[q]) parent[find(p)] = find(q);
    const groups = {}; for (const id of Object.keys(P)) (groups[find(id)] ||= []).push(id);
    for (const [root, list] of Object.entries(groups)) {
      if (list.length < 2) continue;
      const cx = list.reduce((v, id) => v + P[id][0], 0) / list.length, cy = list.reduce((v, id) => v + P[id][1], 0) / list.length;
      const ang = Math.sin(T * .7 + hash(root) * 6) * .08, c = Math.cos(ang), s = Math.sin(ang);
      for (const id of list) { const x = P[id][0] - cx, y = P[id][1] - cy; P[id][0] = cx + x * c - y * s; P[id][1] = cy + x * s + y * c; }
    }
    for (const id of Object.keys(P)) { const h = hash(id + 'v'); P[id][0] += Math.sin(T * 7 + h * 20) * .7; P[id][1] += Math.cos(T * 6.3 + h * 13) * .7; }
    // bonds: steady, zipping closed, or stretching until they snap
    for (const key of new Set([...bA.keys(), ...bB.keys()])) {
      const [p, q, o] = bB.get(key) || bA.get(key), p1 = P[p], q1 = P[q]; if (!p1 || !q1) continue;
      const inA = bA.has(key) || i === 0, inB = bB.has(key);
      let from = 0, to = 1, alpha = Math.min(p1[2], q1[2]), width = o > 1 ? 2 : 3.2, spark = 0;
      if (inB && !inA) { const g = clamp((T - (t0 + move * .5)) / Math.max(.05, move * .5), 0, 1); to = ease(g); if (g <= 0) continue; }
      else if (inA && !inB) { const g = clamp((T - t0) / Math.max(.05, move * .55), 0, 1); alpha *= 1 - g; width *= 1 - g * .6; spark = g > .55 && g < 1 ? 1 - Math.abs(g - .78) / .23 : 0; if (alpha <= .02 && !spark) continue; }
      const glow = B.glowBond && key === bondKey(B.glowBond[0], B.glowBond[1]);
      const dx = q1[0] - p1[0], dy = q1[1] - p1[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      ctx.globalAlpha = alpha; ctx.strokeStyle = glow || (inB && !inA) ? '#ffeeb0' : '#d4dae2'; ctx.lineWidth = width; ctx.lineCap = 'round';
      if (glow || (inB && !inA && to < 1)) { ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 10 + Math.sin(T * 6) * 4; }
      for (let j = 0; j < o; j++) { const off = (j - (o - 1) / 2) * 4.2; ctx.beginPath(); ctx.moveTo(p1[0] + nx * off + dx * from, p1[1] + ny * off + dy * from); ctx.lineTo(p1[0] + nx * off + dx * to, p1[1] + ny * off + dy * to); ctx.stroke(); }
      ctx.shadowBlur = 0;
      if (spark > 0) { const mx = p1[0] + dx / 2, my = p1[1] + dy / 2; ctx.globalAlpha = spark; ctx.strokeStyle = '#fff3c0'; ctx.lineWidth = 1.6; for (let j = 0; j < 6; j++) { const a2 = j / 6 * TAU + T * 3; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a2) * 3, my + Math.sin(a2) * 3); ctx.lineTo(mx + Math.cos(a2) * 9, my + Math.sin(a2) * 9); ctx.stroke(); } }
    }
    // atoms, with a soft shadow for depth
    for (const id of Object.keys(st.atoms)) {
      const p = P[id]; if (!p || p[2] <= .02) continue;
      const type = st.atoms[id], star = type.endsWith('*'), def = ATOM[type.replace('*', '')], [x, y] = p;
      ctx.globalAlpha = p[2] * .3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x + 2, y + def.r * .8, def.r * .9, def.r * .35, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = p[2];
      if (star) {
        const pulse = 1 + Math.sin(T * 4) * .12, g = ctx.createRadialGradient(x, y, def.r, x, y, def.r * 2.6 * pulse);
        g.addColorStop(0, 'rgba(255,214,90,.75)'); g.addColorStop(1, 'rgba(255,214,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, def.r * 2.6 * pulse, 0, TAU); ctx.fill();
      }
      const g = ctx.createRadialGradient(x - def.r * .35, y - def.r * .4, def.r * .1, x, y, def.r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.3, def.c); g.addColorStop(1, shade(def.c));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, def.r, 0, TAU); ctx.fill();
      if (star) { ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, def.r + 2.5, 0, TAU); ctx.stroke(); }
      if (def.t) { ctx.fillStyle = def.dark ? '#46505c' : '#ffffff'; ctx.font = `700 ${def.r * 1.05}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.t, x, y + .5); }
    }
    const fadeA = i === 0 ? 0 : 1 - ease(clamp((T - t0) / Math.max(.05, move * .5), 0, 1)), fadeB = i === 0 ? 1 : ease(clamp((T - t0 - move * .4) / Math.max(.05, move * .6), 0, 1));
    for (const [frame, a] of [[A, fadeA], [B, fadeB]]) for (const [id, sign] of Object.entries(frame.charges || {})) {
      const p = P[id]; if (!p || a <= .02) continue;
      ctx.globalAlpha = a * p[2]; ctx.fillStyle = '#ffffff'; ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sign, p[0] + 21, p[1] - 18);
    }
    for (const [frame, a] of [[A, fadeA], [B, fadeB]]) {
      if (a <= .02) continue;
      for (const [text, x, y, tok] of frame.labels || []) {
        const rise = (1 - a) * (frame === B ? 6 : -6);
        ctx.font = '700 12.5px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // the dark halo fades faster than the letters so a half-faded label stays crisp, not smudged
        ctx.globalAlpha = a * a; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(6,14,12,.85)'; ctx.strokeText(text, x, y + rise);
        ctx.globalAlpha = a; ctx.fillStyle = colors(tok); ctx.fillText(text, x, y + rise);
      }
      if (frame.box) { ctx.globalAlpha = a * .8; ctx.strokeStyle = '#f4f1e6'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; roundRect(ctx, ...frame.box, 14); ctx.stroke(); ctx.setLineDash([]); }
    }
    for (const f of st.frames) {
      if (f.flash && T >= f.t - .25 && T < f.t + .6) {
        const v = clamp((T - f.t + .25) / .85, 0, 1), [x, y] = f.flash;
        ctx.globalAlpha = 1 - v; ctx.strokeStyle = '#fff3c0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 6 + v * 30, 0, TAU); ctx.stroke();
        for (let j = 0; j < 8; j++) { const a2 = j / 8 * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a2) * (10 + v * 14), y + Math.sin(a2) * (10 + v * 14)); ctx.lineTo(x + Math.cos(a2) * (16 + v * 26), y + Math.sin(a2) * (16 + v * 26)); ctx.stroke(); }
      }
      if (f.energy && T >= f.t - .2 && T < f.t + 2.4) { // energy released for the microbe
        const v = clamp((T - f.t + .2) / 2.6, 0, 1), [ex, ey] = f.energy;
        for (let j = 0; j < 7; j++) { const d = (v * 1.3 - j * .05), x = ex + (j - 3) * 16 + Math.sin(j * 2 + T * 3) * 4, y = ey - d * 56; if (d < 0 || d > 1) continue; ctx.globalAlpha = (1 - d) * .95; bolt(ctx, x, y, 6); }
        ctx.globalAlpha = Math.sin(v * Math.PI); ctx.fillStyle = '#ffd65a'; ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ATP', ex, ey - 64 * v - 8);
      }
      if (f.atp && T >= f.t - 1.3 && T < f.t + .15) { // energy (ATP) spent by nitrogenase
        const v = ease(clamp((T - f.t + 1.3) / 1.3, 0, 1)), [cx, cy] = f.atp;
        for (let j = 0; j < 8; j++) { const a2 = j / 8 * TAU + .3, r = lerp(150, 14, v); ctx.globalAlpha = .9 * (1 - v * .4); bolt(ctx, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r * .7, 5); }
        ctx.globalAlpha = 1 - v; ctx.fillStyle = '#ffd65a'; ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ATP → energy', cx, cy + 50);
      }
    }
    ctx.globalAlpha = 1;
  }
  function bolt(ctx, x, y, s) { ctx.fillStyle = '#ffd65a'; ctx.beginPath(); ctx.moveTo(x + s * .2, y - s); ctx.lineTo(x - s * .5, y + s * .1); ctx.lineTo(x, y + s * .1); ctx.lineTo(x - s * .2, y + s); ctx.lineTo(x + s * .5, y - s * .1); ctx.lineTo(x, y - s * .1); ctx.closePath(); ctx.fill(); }
  function shade(hex) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) * .45, g = ((n >> 8) & 255) * .45, b = (n & 255) * .45; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function blob(ctx, x, y, rx, ry, seed, wob = .12) { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = 1 + Math.sin(a * 3 + seed) * wob + Math.sin(a * 5 + seed * 2) * wob * .5; const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
  // A living bacterial cell: double membrane, ribosomes, DNA loop and beating flagella.
  function cell(ctx, T, tint, x, y, w, h, opts = {}) {
    const r = h / 2, wob = Math.sin(T * 1.3) * 1.5;
    ctx.save();
    ctx.lineWidth = 1.6; ctx.strokeStyle = tint + 'aa';
    for (let i = 0; i < 4; i++) { const fy = y + h * (.25 + i * .17); ctx.beginPath(); ctx.moveTo(x + w - 4, fy); for (let s = 1; s <= 9; s++) ctx.lineTo(x + w - 4 + s * 7, fy + Math.sin(s * .9 - T * 9 + i) * 5); ctx.stroke(); }
    roundRect(ctx, x - 3, y - 3 - wob * .3, w + 6, h + 6 + wob * .6, r + 3); ctx.fillStyle = tint + '22'; ctx.fill(); ctx.strokeStyle = tint; ctx.lineWidth = 3; ctx.stroke();
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, r - 4); ctx.strokeStyle = tint + '88'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = tint + '55'; for (let i = 0; i < 26; i++) { const px = x + 20 + ((i * 53) % (w - 40)), py = y + 16 + ((i * 37) % (h - 32)); ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill(); }
    if (!opts.noDna) { ctx.strokeStyle = tint + '99'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let a = 0; a <= TAU + .1; a += .2) { const rr = 16 + Math.sin(a * 5 + T) * 3; const px = x + w * .78 + Math.cos(a) * rr * 1.5, py = y + h * .66 + Math.sin(a) * rr * .8; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    ctx.restore();
  }
  function o2Stream(ctx, T, x0, y0) { // oxygen drifting in from the soil air
    ctx.save(); ctx.globalAlpha = .75;
    for (let i = 0; i < 3; i++) { const u = (T * .35 + i / 3) % 1, x = x0 + u * 60, y = y0 + i * 22 + Math.sin(u * 6 + i) * 4; for (const dx of [-5, 5]) { ctx.fillStyle = '#ef4a43'; ctx.beginPath(); ctx.arc(x + dx, y, 4.5, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function backdrop(ctx, st, T) {
    const fill = (c1, c2) => { const g = ctx.createLinearGradient(0, -80, 0, 260); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(-40, -100, 400, 380); };
    const label = (text, x, y) => { ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = '600 10.5px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); };
    const grains = (list, color) => { ctx.fillStyle = color; for (const [x, y, r] of list) { blob(ctx, x, y, r, r * .8, x * .1, .15); ctx.fill(); } };
    switch (st.backdrop) {
      case 'air': fill('#5aa3cc', '#d6eef0'); ctx.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, y, r] of [[40, 170, 30], [70, 160, 34], [100, 172, 26], [250, 10, 24], [276, 4, 28]]) { ctx.beginPath(); ctx.arc(x + Math.sin(T * .3) * 4, y, r, 0, TAU); ctx.fill(); } break;
      case 'nodule': {
        fill('#4a1a25', '#2e0f17');
        ctx.fillStyle = '#7a2e40'; for (const [x, y] of [[-10, 10], [330, 170], [330, 0], [-10, 180]]) { blob(ctx, x, y, 70, 60, x, .1); ctx.fill(); }
        const g = ctx.createRadialGradient(160, 92, 10, 160, 92, 175); g.addColorStop(0, '#f6b6c3'); g.addColorStop(1, '#b4566b'); ctx.fillStyle = g; blob(ctx, 160, 92, 158, 108, 1, .04); ctx.fill();
        ctx.strokeStyle = '#7fae5a'; ctx.lineWidth = 4; blob(ctx, 160, 92, 158, 108, 1, .04); ctx.stroke();
        ctx.lineCap = 'round'; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + .2, rr = i % 2 ? .78 : .62, x = 160 + Math.cos(a) * 140 * rr, y = 92 + Math.sin(a) * 92 * rr; ctx.strokeStyle = '#a63f5c'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x - 7 + Math.sin(T + i) * 1.5, y - 3); ctx.lineTo(x + 7, y + 3); ctx.stroke(); ctx.strokeStyle = '#ffc3d2'; ctx.lineWidth = 6; ctx.stroke(); }
        ctx.fillStyle = 'rgba(110,70,150,.6)'; blob(ctx, 160, 95, 40, 30, 3 + Math.sin(T * 2) * .2, .1); ctx.fill(); label('nitrogenase', 206, 126); break;
      }
      case 'bacterium': {
        fill('#21302a', '#16231e'); grains([[-6, -20, 40], [330, -30, 46], [-10, 200, 44], [320, 210, 50]], '#5e4632');
        const c = st.tint || '#ffc857'; cell(ctx, T, c, 58, 34, 214, 120);
        if (st.id === 'nit1' || st.id === 'nit2') o2Stream(ctx, T, 250, -10);
        break;
      }
      case 'root': {
        fill('#3d2a1c', '#2b1d13'); ctx.fillStyle = 'rgba(90,170,210,.2)'; ctx.fillRect(-40, -100, 240, 380);
        grains([[30, 30, 18], [70, 165, 20], [150, 10, 16], [118, 58, 11], [16, 112, 13], [170, 150, 13], [60, -30, 22], [140, 220, 22]], '#7a5a3a');
        const g = ctx.createLinearGradient(200, 0, 360, 0); g.addColorStop(0, '#efe3c4'); g.addColorStop(1, '#c9b58b'); ctx.fillStyle = g; ctx.fillRect(204, -100, 160, 380);
        ctx.fillStyle = '#a58a5c'; ctx.fillRect(198, -100, 8, 178); ctx.fillRect(198, 112, 8, 170);
        ctx.fillStyle = '#5bb7a8'; roundRect(ctx, 192, 76, 20, 11, 4); ctx.fill(); roundRect(ctx, 192, 102, 20, 11, 4); ctx.fill();
        label('transporter', 202, 126); label('root hair', 268, 168); break;
      }
      case 'leaf': {
        fill('#1c4521', '#2f6b35'); ctx.fillStyle = 'rgba(160,220,110,.22)'; roundRect(ctx, 8, 6, 304, 168, 30); ctx.fill(); ctx.strokeStyle = 'rgba(200,240,150,.5)'; ctx.lineWidth = 3; ctx.stroke();
        for (const [x, y] of [[54, 34], [262, 148], [274, 42], [46, 150]]) { ctx.fillStyle = '#2f7d32'; ctx.beginPath(); ctx.ellipse(x, y, 28, 14, .3, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,255,160,.45)'; ctx.lineWidth = 1; for (let s = -2; s <= 2; s++) { ctx.beginPath(); ctx.moveTo(x - 20, y + s * 4); ctx.lineTo(x + 20, y + s * 4); ctx.stroke(); } }
        ctx.strokeStyle = 'rgba(255,240,160,.5)'; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(340, -30 + i * 10); ctx.lineTo(282 - i * 6, 16 + i * 12); ctx.stroke(); }
        label('chloroplast', 274, 66); break;
      }
      case 'gut': { fill('#5b2430', '#7a3341'); ctx.strokeStyle = 'rgba(255,170,180,.35)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * 36 - 4, 230); ctx.quadraticCurveTo(i * 36 + 4, 190, i * 36 - 2, 158 + Math.sin(i + T) * 4); ctx.stroke(); } break; }
      case 'soil': {
        fill('#3a281b', '#2a1c12'); grains([[-4, 10, 30], [330, 10, 34], [20, 190, 34], [300, 190, 30]], '#5a4128');
        ctx.strokeStyle = 'rgba(245,236,214,.5)'; ctx.lineWidth = 1.3; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-30, -10 + i * 28); ctx.bezierCurveTo(80, -20 + i * 30, 200, 20 + i * 22, 350, 4 + i * 26); ctx.stroke(); }
        ctx.lineCap = 'round'; for (const [x, y, a] of [[44, 40, .3], [282, 142, -.4], [270, 54, .8], [60, 140, 1.2]]) { const wx = Math.sin(T * 2 + x) * 2; ctx.strokeStyle = '#8a7650'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 9 + wx, y - Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 9 + wx, y + Math.sin(a) * 9); ctx.stroke(); ctx.strokeStyle = '#f0deb0'; ctx.lineWidth = 7; ctx.stroke(); }
        ctx.fillStyle = 'rgba(200,170,110,.38)'; blob(ctx, 160, 100, 44, 30, 2 + Math.sin(T * 2) * .2, .1); ctx.fill(); label('urease', 208, 130); label('Bacillus', 60, 166); label('fungal threads', 250, 18); break;
      }
      case 'wet': {
        fill('#174a63', '#0f3346'); grains([[-6, -10, 34], [326, 200, 40], [-8, 200, 30]], '#3a3a2c');
        ctx.fillStyle = 'rgba(255,255,255,.2)'; for (let i = 0; i < 12; i++) { const y = 200 - ((T * 30 + i * 37) % 260); ctx.beginPath(); ctx.arc(10 + i * 28, y, 3 + (i % 3), 0, TAU); ctx.fill(); }
        cell(ctx, T, '#c38bff', 30, 40, 256, 112, { noDna: true });
        ctx.fillStyle = 'rgba(6,14,12,.6)'; roundRect(ctx, 104, -14, 112, 22, 11); ctx.fill(); ctx.fillStyle = '#ff9b8f'; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O₂ ✕  no oxygen', 160, -3); break;
      }
      case 'storm': {
        fill('#1f2833', '#3e4a5a'); const f = st.frames[1], v = clamp((T - f.t + .4) / 1, 0, 1), on = T > f.t - .4 && T < f.t + .9 && Math.sin(T * 50) > -.2;
        if (on) { ctx.fillStyle = 'rgba(230,235,255,' + (.35 * (1 - v)) + ')'; ctx.fillRect(-40, -100, 400, 380); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.shadowColor = '#bcd4ff'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(150, -60); ctx.lineTo(170, 0); ctx.lineTo(150, 30); ctx.lineTo(172, 80); ctx.lineTo(156, 120); ctx.stroke(); ctx.shadowBlur = 0; }
        break;
      }
      case 'rain': { fill('#4b5b6a', '#2e3a45'); ctx.fillStyle = '#3a281b'; ctx.fillRect(-40, 170, 400, 120); ctx.fillStyle = 'rgba(160,210,240,.18)'; ctx.beginPath(); ctx.arc(150, 92, 74, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(220,235,255,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 34; i++) { const x = (i * 47) % 340 - 10, y = (T * 120 + i * 29) % 260 - 80; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 10); ctx.stroke(); } label('raindrop', 150, 178); break; }
      case 'factory': {
        fill('#2c3239', '#3c444d'); ctx.strokeStyle = 'rgba(200,170,140,.45)'; ctx.lineWidth = 1;
        for (let x = 70; x < 260; x += 14) for (let y = 128; y < 200; y += 12) { ctx.beginPath(); for (let j = 0; j <= 6; j++) { const a = j / 6 * TAU; const px = x + (y % 24 ? 7 : 0) + Math.cos(a) * 6, py = y + Math.sin(a) * 6; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
        ctx.fillStyle = 'rgba(6,14,12,.6)'; roundRect(ctx, 104, -12, 112, 22, 11); ctx.fill(); ctx.fillStyle = '#ffd08a'; ctx.font = '700 10.5px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('200 atm · 450 °C', 160, -1); label('iron catalyst', 160, 186); break;
      }
      case 'soilwater': { fill('#3a281b', '#2a1c12'); ctx.fillStyle = 'rgba(90,170,210,.24)'; ctx.fillRect(-40, 70, 400, 220); ctx.fillStyle = '#6f9744'; ctx.fillRect(-40, -100, 400, 108); grains([[20, 170, 24], [300, 160, 26]], '#5a4128'); break; }
      case 'leach': {
        fill('#3a281b', '#2a1c12'); const g = ctx.createLinearGradient(0, 118, 0, 260); g.addColorStop(0, 'rgba(70,150,190,.78)'); g.addColorStop(1, 'rgba(25,80,120,.92)'); ctx.fillStyle = g; ctx.fillRect(-40, 118, 400, 170);
        ctx.strokeStyle = 'rgba(200,240,255,.6)'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(-40, 118); ctx.lineTo(360, 118); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(220,235,255,.45)'; for (let i = 0; i < 18; i++) { const x = (i * 41) % 340 - 10, y = (T * 90 + i * 23) % 200 - 80; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9); ctx.stroke(); }
        ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = 3; for (const x of [40, 120, 210, 280]) { ctx.beginPath(); ctx.moveTo(x, -80); ctx.quadraticCurveTo(x + 6, 10, x - 4, 70); ctx.stroke(); } label('roots end here', 64, 84); break;
      }
      case 'river': {
        fill('#2b6c8a', '#1a4a63'); const bloom = clamp(T / 3, 0, 1);
        for (let i = 0; i < 22; i++) { ctx.fillStyle = 'rgba(140,210,90,' + (.2 + bloom * .5) + ')'; ctx.beginPath(); ctx.ellipse((i * 53) % 340 - 10, -6 + (i % 5) * 12, 10 + bloom * 12, 5 + bloom * 4, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,.2)'; for (let i = 0; i < 12; i++) { const x = (T * 40 + i * 37) % 360 - 20; ctx.beginPath(); ctx.moveTo(x, 70 + (i % 6) * 22); ctx.lineTo(x + 18, 70 + (i % 6) * 22); ctx.stroke(); } break;
      }
      default: fill('#13261d', '#0f1f1a');
    }
  }

  /* ---------- controller: the atom's trip through the landscape ---------- */
  class JourneyController {
    constructor(scene) {
      this.scene = scene; this.active = false; this.path = MAIN.slice(); this.index = 0; this.phase = 'idle'; this.animT = 0; this.lensIn = 0;
      this.colors = () => '#ffffff';
      scene.overlayHit = (x, y) => { if (!this.active || this.lensIn < .5 || !this.lens) return null; const l = this.lens; return Math.hypot(x - l.cx, y - l.cy) < l.r ? 'lens' : null; };
    }
    station(i = this.index) { return S[this.path[i]]; }
    branchHere() { const id = this.path[this.index]; return Object.entries(BRANCHES).filter(([, b]) => b.from === id && this.path.indexOf(b.stations[0]) === -1).map(([k, b]) => ({ id: k, ...b })); }
    start() { this.active = true; this.path = MAIN.slice(); this.lensIn = 0; this.goTo(0, true); }
    stop() { this.active = false; this.phase = 'idle'; this.dark = 0; this.scene.journey = null; this.scene.cowAnim = null; this.scene.resetView(); }
    takeBranch(id) {
      const b = BRANCHES[id]; if (!b) return;
      const from = this.path.indexOf(b.from), rejoin = MAIN.indexOf(b.rejoin);
      this.path = this.path.slice(0, from + 1).concat(b.stations, MAIN.slice(rejoin));
      this.goTo(from + 1);
    }
    next() { if (this.phase === 'travel') { this.arrive(); return; } if (this.index < this.path.length - 1) this.goTo(this.index + 1); }
    prev() { if (this.index > 0) this.goTo(this.index - 1, true); }
    replay() { this.animT = 0; this.outDone = false; this.compound = this.station().in; }
    restart() { this.path = MAIN.slice(); this.goTo(0, true); }
    goTo(i, instant) {
      const sc = this.scene; this.index = clamp(i, 0, this.path.length - 1);
      const st = this.station(), prevSt = this.index > 0 ? this.station(this.index - 1) : null, to = st.pos(sc);
      const jump = prevSt && prevSt.dead; // the atom left the field: follow another nitrate
      if (instant || !prevSt) { this.arrive(); return; }
      if (st.script) { // the cow carries the atom: a short scripted scene instead of a glide
        this.travel = { plan: this.planScript(st), s: 0, t: 0, cam0: { ...sc.camera } };
        this.phase = 'travel'; this.compound = prevSt.out; this.visual = { wet: !!st.wet, storm: false };
        if (this.onChange) this.onChange('travel');
        return;
      }
      const start = jump ? sc.point('nitrate') : prevSt.pos(sc);
      const wps = st.via ? st.via(sc, start, to) : [start, [lerp(start[0], to[0], .5), Math.min(start[1], to[1]) - 30], to];
      const path = sc.buildPath(wps);
      path.stages = [{ t: 0, c: prevSt.out }].concat((st.stages || []).map(([wi, c]) => ({ t: path.wpT[wi], c })));
      // A smooth glide: eased progress, and the camera dollies from this view to the next station's.
      this.travel = { path, t: 0, dur: clamp(path.total / 165, 2, 4.2), fade: jump, cam0: { ...sc.camera }, cam1: this.stationCam(st).cam };
      this.phase = 'travel'; this.compound = prevSt.out;
      this.visual = { wet: !!st.wet, storm: false };
      if (this.onChange) this.onChange('travel');
    }
    arrive() {
      const sc = this.scene, st = this.station(), tr = this.travel;
      // skipping the "hours later" cut: the cow is already where the next scene needs it
      if (tr && tr.plan && tr.plan.kind === 'later' && !tr.cut) { sc.cowAnim = { ...this.cowFor(st), snap: true }; sc.updateCow(0); }
      this.phase = 'station'; this.animT = 0; this.outDone = false; this.compound = st.in; this.travel = null; this.arriveT = 0; this.travelCaption = null; this.dark = 0;
      sc.cowAnim = this.cowFor(st);
      this.visual = { wet: !!st.wet, storm: !!st.storm };
      const [px, py] = st.pos(sc); if (sc.effects) sc.effects.push({ type: 'ripple', x: px, y: py, t: 0, dur: 1.4, color: '#ffd65a', bright: true });
      if (st.lightning && sc.lightning) sc.lightning();
      if (this.onChange) this.onChange('station');
      this.frameCamera();
    }
    // Screen layout: the lens beside the station (wide screens) or below it (tall screens).
    lensLayout() {
      const sc = this.scene, I = sc.insets || { top: 0, bottom: 0, left: 0, right: 0 }, W = sc.width || 800, H = sc.height || 600;
      const l = I.left + 14, t = I.top + 12, r = W - I.right - 14, b = H - I.bottom - 12, aw = Math.max(120, r - l), ah = Math.max(120, b - t);
      if (aw >= ah * 1.05) { // wide: lens beside the station
        const R = clamp(Math.min(aw * .27, ah * .45), 80, 250), cy = t + ah * .5;
        return { r: R, a: [r - R - 8, cy], b: [l + R + 8, cy], anchors: [[l + (aw - 2 * R - 16) * .5, t + ah * .55], [r - (aw - 2 * R - 16) * .5, t + ah * .55]], sw: aw - 2 * R - 40, sh: ah };
      }
      const R = clamp(Math.min(aw * .46, ah * .3), 70, 230), cx = l + aw * .5; // tall: lens below (or above) it
      return { r: R, a: [cx, b - R - 22], b: [cx, t + R + 26], anchors: [[cx, t + (ah - 2 * R - 34) * .5], [cx, b - (ah - 2 * R - 34) * .5]], sw: aw, sh: ah - 2 * R - 40 };
    }
    lensCentre() { const lay = this.lensLayout(); return { r: lay.r, c: this.lensSide ? lay.b : lay.a }; }
    frameCamera() {
      if (!this.active || this.phase !== 'station') return;
      const { cam, side } = this.stationCam(this.station());
      this.lensSide = side; this.scene.viewTarget = cam;
    }
    stationCam(st) {
      const sc = this.scene, lay = this.lensLayout(), [x, y] = st.pos(sc), [hw, hh] = st.frame || [100, 80];
      const z = clamp(Math.min(lay.sw / (2 * hw * sc.s), Math.max(60, lay.sh) / (2 * hh * sc.s)), 1, 3), k = sc.s * z;
      const place = side => { const [ax, ay] = lay.anchors[side], cam = sc.clampCamera({ zoom: z, x: x - (ax - sc.width / 2) / k, y: y - (ay - sc.height / 2) / k }); const S = [(x - cam.x) * k + sc.width / 2, (y - cam.y) * k + sc.height / 2], C = side ? lay.b : lay.a; return { cam, gap: Math.hypot(S[0] - C[0], S[1] - C[1]) - lay.r }; };
      // Prefer the usual side; switch when the camera can't move far enough to keep the spot clear of the lens.
      const first = place(0), second = place(1), use = first.gap >= 40 || first.gap >= second.gap ? 0 : 1;
      return { cam: (use ? second : first).cam, side: use };
    }
    followCamera(tr, e, pos) {
      const sc = this.scene, a = tr.cam0, b = tr.cam1, I = sc.insets || { top: 0, bottom: 0, left: 0, right: 0 };
      const z = Math.max(1, lerp(a.zoom, b.zoom, e) * (1 - .2 * Math.sin(Math.PI * e))), k = sc.s * z;
      let x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e);
      // keep the gliding atom comfortably inside the visible area
      const W = sc.width, H = sc.height, mx = (W - I.left - I.right) * .16, my = (H - I.top - I.bottom) * .16;
      const sx = (pos[0] - x) * k + W / 2, sy = (pos[1] - y) * k + H / 2;
      if (sx < I.left + mx) x -= (I.left + mx - sx) / k; else if (sx > W - I.right - mx) x += (sx - (W - I.right - mx)) / k;
      if (sy < I.top + my) y -= (I.top + my - sy) / k; else if (sy > H - I.bottom - my) y += (sy - (H - I.bottom - my)) / k;
      sc.viewTarget = sc.clampCamera({ zoom: z, x, y });
    }
    /* ----- the cow: where it stands at each station, and its three short scenes ----- */
    cowGeo() {
      const sc = this.scene, L = sc.L, k = L.cowK, leaf = sc.biteLeaf(true);
      // eat: mouth reaches the leaf; dung: the cow stands with its tail end over the dung pile
      return { dxEat: leaf.bite[0] + 172 * k - L.cowX, dxDung: L.dungX - 6 - 116 * k - L.cowX };
    }
    cowFor(st) {
      const c = st && st.cow; if (!c) return { dx: 0 };
      const g = this.cowGeo(), A = { dx: c.at === 'eat' ? g.dxEat : c.at === 'dung' ? g.dxDung : 0, leafGone: !!c.leafGone, fresh: !!c.fresh, xray: !!c.xray, organ: c.organ || null };
      if (c.head === 'chew') { A.head = CHEW; A.headW = 1; }
      if (c.chew !== undefined) A.chew = c.chew;
      return A;
    }
    stationReveal(st, pos) {
      const sc = this.scene, out = [[...st.pos(sc), 120], [pos[0], pos[1], 70]];
      if (st.cow && st.cow.xray) { const k = sc.L.cowK; out.push([...sc.cowToWorld([50, -110]), 150 * k], [...sc.cowToWorld([-70, -104]), 150 * k], [...sc.cowPoint('mouth'), 80 * k]); }
      return out;
    }
    planScript(st) {
      const rig = this.scene.cowRig || { dx: 0 }, g = this.cowGeo();
      if (st.script === 'eat') { const dx0 = rig.dx, walk = clamp(Math.abs(g.dxEat - dx0) / 100, .8, 3.8), reach = .3 + walk - .15, bite = reach + .8; return { kind: 'eat', dx0, walk, reach, bite, dur: bite + 3.1 }; }
      if (st.script === 'later') return { kind: 'later', cutAt: .75, dur: 2.7 };
      return { kind: 'poop', dur: 5.4 };
    }
    // Runs one frame of a cow scene: poses the cow, then places the atom and the camera.
    runScript(st, tr, dt) {
      const sc = this.scene, p = tr.plan, s = tr.s, k = sc.L.cowK, g = this.cowGeo();
      const lerpCam = (a, b, u) => ({ zoom: lerp(a.zoom, b.zoom, u), x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
      const pose = A => { sc.cowAnim = A; sc.updateCow(dt); sc.cowStamp = true; };
      const settle = (cam, from, len) => { const u = ease(clamp((s - from) / len, 0, 1)); return u > 0 ? lerpCam(cam, this.stationCam(st).cam, u) : cam; };
      if (p.kind === 'eat') {
        const leaf = sc.biteLeaf(), after = s - p.bite;
        const A = { dx: lerp(p.dx0, g.dxEat, ease(clamp((s - .3) / p.walk, 0, 1))), exact: true, head: WALK, headW: ease(clamp(s / .45, 0, 1)) };
        if (s >= p.reach) { // stretch the neck out to the leaf, open wide… and snap shut
          A.bite = leaf.bite;
          A.biteW = after < 0 ? ease(clamp((s - p.reach) / .7, 0, 1)) : 1 - ease(clamp((after - .1) / .6, 0, 1));
          A.open = after < 0 ? ease(clamp((s - p.reach - .3) / .4, 0, 1)) : 1 - clamp(after / .1, 0, 1);
        }
        if (after >= 0) {
          A.head = CHEW; A.headW = 1; A.leafGone = true;
          A.leaf = 1 - clamp((after - .6) / 1.3, 0, 1);
          A.chew = clamp((after - .35) / .3, 0, 1) * .9;
          if (after > 1.75 && after < 2.85) A.bolus = (after - 1.75) / 1.1;
          A.xray = after > 1.4; A.organ = after > 2.7 ? 'rumen' : null;
          if (!tr.bitten) { tr.bitten = true; sc.plantJolt = 1; if (sc.effects) sc.effects.push({ type: 'burst', x: leaf.bite[0], y: leaf.bite[1], color: '#9fd16a', t: 0, dur: .7, seed: 3, bright: true }); }
        }
        pose(A);
        const mouth = sc.cowPoint('mouth'), box = sc.cowBox(), lc = leaf.centre;
        let pos = lc;
        if (after >= 0 && after < 1.75) pos = [lerp(lc[0], mouth[0], ease(clamp(after / .25, 0, 1))), lerp(lc[1], mouth[1], ease(clamp(after / .25, 0, 1)))];
        else if (after >= 1.75 && after < 2.85) pos = sc.gulletPoint(A.bolus);
        else if (after >= 2.85) pos = sc.cowPoint('rumen');
        const walkCam = sc.boxCam([[box[0], box[1]], [box[2], box[3]], [lc[0] - 50, lc[1] - 50], [lc[0] + 30, lc[1] + 40]], 2.3);
        const biteCam = sc.boxCam([[lc[0] - 90, lc[1] - 80], [mouth[0] + 150 * k, mouth[1] + 80]], 3);
        const cowCam = sc.boxCam([[box[0], box[1] - 10], [box[2], box[3]]], 2.4);
        let cam = lerpCam(lerpCam(walkCam, biteCam, ease(clamp((s - p.reach + .4) / .8, 0, 1))), cowCam, ease(clamp((after - 1.4) / .9, 0, 1)));
        cam = settle(cam, p.dur - .8, .8);
        const caption = s < p.reach - .3 ? 'The cow walks over to the bean plant…' : after < 1.2 ? 'It bites off a leaf — our nitrogen atom is in the leaf’s protein.' : 'Chew… swallow! The leaf goes down to the cow’s stomach.';
        return { pos, cam, caption, reveal: [[...sc.cowToWorld([50, -110]), 160 * k], [...sc.cowToWorld([-70, -104]), 150 * k], [...mouth, 110 * k], [lc[0], lc[1], 110], [pos[0], pos[1], 70]] };
      }
      if (p.kind === 'later') {
        const prev = S[this.path[this.index - 1]] || S.feed;
        if (s < p.cutAt) pose(this.cowFor(prev));
        else if (!tr.cut) { // in the dark: the cow wanders back to its spot by the dung pile
          tr.cut = true; pose({ ...this.cowFor(st), snap: true });
          const cam = this.stationCam(st).cam; sc.camera = { ...cam }; tr.cam0 = { ...cam };
        } else pose(this.cowFor(st));
        this.dark = s < p.cutAt ? ease(s / p.cutAt) : s < 1.6 ? 1 : 1 - ease(clamp((s - 1.6) / 1.05, 0, 1));
        const pos = s < p.cutAt ? sc.cowPoint('rumen') : sc.cowPoint('liver');
        return { pos, cam: { ...tr.cam0 }, caption: 'Hours later… the amino acids have travelled in the blood to the liver.', reveal: this.stationReveal(st, pos) };
      }
      // poop: zoom in on the tail end; the dung drops and carries our atom down to the soil
      const A = { ...this.cowFor(S.waste), organ: s < 1.7 ? 'gut' : null, xray: s < 1.9, poopT: s, fresh: s > 3 };
      A.tailLift = ease(clamp((s - .8) / .55, 0, 1)) * (1 - ease(clamp((s - 3.6) / .6, 0, 1)));
      pose(A);
      const anus = sc.cowPoint('anus'), ground = sc.surface(anus[0]), pieces = sc.dungDrop(s), first = pieces[0], soil = st.pos(sc);
      let pos = sc.gutPoint(ease(clamp((s - .1) / 1.45, 0, 1)));
      if (first) pos = [first.x, first.y];
      if (first && first.state === 'land' && s > 3.7) { const top = [first.x, first.y], u = ease(clamp((s - 3.7) / 1.5, 0, 1)); pos = [lerp(top[0], soil[0], u), lerp(top[1], soil[1], u)]; }
      const rearCam = sc.boxCam([[anus[0] - 110 * k, anus[1] - 70 * k], [anus[0] + 70 * k, ground + 26]], 3.2);
      let cam = lerpCam(tr.cam0, rearCam, ease(clamp(s / 1.1, 0, 1)));
      cam = settle(cam, 3.6, 1.6);
      const caption = s < 1.5 ? 'The cow’s body must get rid of nitrogen it cannot use…' : s < 3.7 ? 'Plop! It leaves in dung (and urine), onto the soil.' : 'Our atom soaks into the soil, where decomposers are waiting.';
      return { pos, cam, caption, reveal: [[anus[0], anus[1], 110 * k], [anus[0], ground, 100], [pos[0], pos[1], 70], [soil[0], soil[1], 90]] };
    }
    update(dt) {
      if (!this.active) return;
      const sc = this.scene, st = this.station();
      this.clock = (this.clock || 0) + dt; this.arriveT = (this.arriveT || 0) + dt; this.dark = 0; this.travelCaption = null;
      let pos, reveal = null;
      if (this.phase === 'travel' && this.travel && this.travel.plan) {
        const tr = this.travel; tr.s += dt; tr.t = Math.min(1, tr.s / tr.plan.dur);
        const out = this.runScript(st, tr, dt), last = tr.last || out.pos;
        pos = out.pos; reveal = out.reveal; this.travelCaption = out.caption; sc.viewTarget = out.cam;
        const v = Math.hypot(pos[0] - last[0], pos[1] - last[1]) / Math.max(dt, 1e-3); tr.last = pos;
        if (v > 1) tr.heading = Math.atan2(pos[1] - last[1], pos[0] - last[0]); tr.speed = clamp(v / 260, 0, 1) * .6;
        if (tr.s >= tr.plan.dur) { this.arrive(); pos = st.pos(sc); }
      } else {
        sc.cowAnim = this.cowFor(st); sc.updateCow(dt); sc.cowStamp = true;
        if (this.phase === 'station' && sc.cowRig && sc.cowRig.amp > .05) this.frameCamera(); // keep framing a walking cow
      }
      if (pos) { /* scripted scene placed the atom */ }
      else if (this.phase === 'travel' && this.travel) {
        const tr = this.travel; tr.t = Math.min(1, tr.t + dt / tr.dur);
        const e = .5 - .5 * Math.cos(Math.PI * tr.t); // ease in and out
        pos = sc.pointAt(tr.path, e);
        const ahead = sc.pointAt(tr.path, Math.min(1, e + .01)); tr.heading = Math.atan2(ahead[1] - pos[1], ahead[0] - pos[0]); tr.speed = Math.sin(Math.PI * tr.t);
        this.followCamera(tr, e, pos);
        let c = tr.path.stages[0].c; for (const s of tr.path.stages) if (e >= s.t) c = s.c;
        if (c !== this.compound) { this.compound = c; if (sc.effects) sc.effects.push({ type: 'burst', x: pos[0], y: pos[1], color: sc.particleColor(c), t: 0, dur: .7, seed: 1, bright: true }); }
        if (tr.t >= 1) this.arrive();
      } else {
        const p = st.pos(sc), bob = this.scene.reduced ? 0 : Math.sin(this.clock * 2.2) * 1.6; // a gentle float while it waits
        pos = [p[0], p[1] + bob];
        if (this.lensIn > .6) this.animT += dt; // the reaction starts once the lens is open
        if (!this.outDone && this.animT >= st.outAt) {
          this.outDone = true;
          if (this.compound !== st.out) { this.compound = st.out; if (sc.effects) sc.effects.push({ type: 'burst', x: pos[0], y: pos[1], color: sc.particleColor(st.out), t: 0, dur: .8, seed: 2, bright: true }); }
        }
      }
      this.lensIn += ((this.phase === 'station' ? 1 : 0) - this.lensIn) * (1 - Math.exp(-dt * 7));
      const fs = frameState(st, this.phase === 'station' ? this.animT : 0); this.step = this.phase === 'station' ? fs.step : -1;
      const next = this.index < this.path.length - 1 && this.phase === 'station' ? this.station(this.index + 1) : null;
      sc.journey = {
        pos, compound: this.compound, route: null, fade: this.travel && this.travel.fade ? clamp(this.travel.t * 3, 0, 1) : 1,
        reveal: reveal || (this.phase === 'travel' ? [[pos[0], pos[1], 100], [...st.pos(sc), 90]] : this.stationReveal(st, pos)),
        next: next ? next.pos(sc) : null, wet: this.visual && this.visual.wet, storm: this.visual && this.visual.storm,
        pop: this.phase === 'station' ? 1 + .35 * Math.max(0, 1 - this.arriveT / .5) * Math.sin(this.arriveT / .5 * Math.PI) : 1,
        heading: this.travel ? this.travel.heading || 0 : 0, speed: this.travel ? this.travel.speed || 0 : 0
      };
    }
    // Drawn on the scene canvas in screen space, after the landscape.
    drawOverlay(ctx) {
      if (this.active && this.lensIn >= .01) this.drawLens(ctx); else this.lens = null;
      if (this.active && this.dark > .01) this.drawDark(ctx);
    }
    // "Hours later…": a short fade to black that lets the cow digest off screen.
    drawDark(ctx) {
      const sc = this.scene, d = sc.dpr || 1, W = sc.width, H = sc.height, I = sc.insets || { top: 0, bottom: 0, left: 0, right: 0 }, a = this.dark;
      ctx.save(); ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.fillStyle = 'rgba(4,9,12,' + (.94 * a) + ')'; ctx.fillRect(0, 0, W, H);
      const cx = (I.left + W - I.right) / 2, cy = (I.top + H - I.bottom) / 2, spin = (this.clock || 0) * 6;
      ctx.globalAlpha = clamp((a - .4) / .6, 0, 1); ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 24, 22, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx, cy - 24); ctx.lineTo(cx + Math.cos(spin) * 15, cy - 24 + Math.sin(spin) * 15); ctx.moveTo(cx, cy - 24); ctx.lineTo(cx + Math.cos(spin / 12 - 1) * 9, cy - 24 + Math.sin(spin / 12 - 1) * 9); ctx.stroke();
      ctx.fillStyle = '#f2f5ee'; ctx.font = '700 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Hours later…', cx, cy + 26);
      ctx.restore();
    }
    drawLens(ctx) {
      const sc = this.scene, st = this.station(), lay = this.lensCentre(), a = this.lensIn, d = sc.dpr || 1;
      const S = sc.worldToScreen(...st.pos(sc)), e = ease(clamp(a, 0, 1));
      const R = lerp(14, lay.r, e), C = [lerp(S[0], lay.c[0], e), lerp(S[1], lay.c[1], e)]; // grows out of the spot
      this.lens = { cx: C[0], cy: C[1], r: R };
      ctx.save(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.globalAlpha = clamp(a * 1.6, 0, 1);
      // light beam from the spot under the microscope to the lens
      const dx = S[0] - C[0], dy = S[1] - C[1], dist = Math.hypot(dx, dy);
      if (dist > R + 12) {
        const th = Math.atan2(dy, dx), be = Math.acos(R / dist), t1 = [C[0] + Math.cos(th + be) * R, C[1] + Math.sin(th + be) * R], t2 = [C[0] + Math.cos(th - be) * R, C[1] + Math.sin(th - be) * R];
        const g = ctx.createLinearGradient(S[0], S[1], C[0], C[1]); g.addColorStop(0, 'rgba(255,236,170,.32)'); g.addColorStop(1, 'rgba(255,236,170,.05)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(t1[0], t1[1]); ctx.moveTo(S[0], S[1]); ctx.lineTo(t2[0], t2[1]); ctx.stroke();
      }
      ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(S[0], S[1], 18, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      // lens body
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.fillStyle = '#0d1714'; ctx.beginPath(); ctx.arc(C[0], C[1], R, 0, TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(C[0], C[1], R - 1, 0, TAU); ctx.clip();
      const k = 2 * R / 330; ctx.translate(C[0], C[1]); ctx.scale(k, k); ctx.translate(-160, -90);
      stageContent(ctx, st, this.phase === 'station' ? this.animT : 0, this.colors);
      ctx.restore();
      const v = ctx.createRadialGradient(C[0], C[1], R * .62, C[0], C[1], R); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = v; ctx.beginPath(); ctx.arc(C[0], C[1], R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C[0], C[1], R * .9, 3.6, 4.4); ctx.stroke();
      const rg = ctx.createLinearGradient(C[0], C[1] - R, C[0], C[1] + R); rg.addColorStop(0, '#5d6b64'); rg.addColorStop(.5, '#26302c'); rg.addColorStop(1, '#3d4943');
      ctx.strokeStyle = rg; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(C[0], C[1], R + 4, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,214,90,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(C[0], C[1], R + 9.5, 0, TAU); ctx.stroke();
      // name plate on the rim and a key below
      const title = LENS[st.id] || st.title; ctx.font = '700 13px system-ui, sans-serif'; const tw = ctx.measureText(title).width + 46;
      ctx.fillStyle = 'rgba(10,22,19,.92)'; roundRect(ctx, C[0] - tw / 2, C[1] - R - 22, tw, 30, 15); ctx.fill(); ctx.strokeStyle = 'rgba(255,214,90,.8)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; const mx = C[0] - tw / 2 + 18, my = C[1] - R - 7;
      ctx.beginPath(); ctx.arc(mx - 1, my - 1, 5, 0, TAU); ctx.moveTo(mx + 3, my + 3); ctx.lineTo(mx + 7, my + 7); ctx.stroke();
      ctx.fillStyle = '#f2f5ee'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(title, mx + 12, my);
      ctx.font = '600 11.5px system-ui, sans-serif'; const kw = ctx.measureText('our nitrogen atom').width + 34, ky = C[1] + R + 14;
      if (ky + 12 < (sc.height || 9999) - ((sc.insets && sc.insets.bottom) || 0)) { ctx.fillStyle = 'rgba(10,22,19,.85)'; roundRect(ctx, C[0] - kw / 2, ky - 11, kw, 22, 11); ctx.fill(); ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(C[0] - kw / 2 + 13, ky, 4.5, 0, TAU); ctx.stroke(); ctx.fillStyle = '#f2f5ee'; ctx.fillText('our nitrogen atom', C[0] - kw / 2 + 23, ky); }
      ctx.restore();
    }
  }

  root.NitrogenJourney = { STATIONS: S, MAIN, BRANCHES, JourneyController, frameState, stageContent };
})(typeof globalThis !== 'undefined' ? globalThis : this);
