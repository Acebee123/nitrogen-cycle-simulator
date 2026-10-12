/* Application event tests for the immersive interface, run against the real
   built scripts (website or standalone) with the network disabled.
   Usage: node tests/app.cjs [offline] [--size=WIDTHxHEIGHT] */
const assert = require('node:assert/strict');
const { createEnvironment, loadBuild } = require('./harness.cjs');
const offline = process.argv.includes('offline');
const sizeArg = (process.argv.find(a => a.startsWith('--size=')) || '--size=1400x620').slice(7).split('x').map(Number);
const [W, H] = sizeArg;
const build = loadBuild(offline);
const env = createEnvironment({ width: W, height: H, html: build.html });
for (const file of build.scripts) env.run(build.source(file), file);
const { elements, state, advance, fire } = env, $ = id => elements.get(id);
let assertions = 0;
const check = (ok, message) => { assert.ok(ok, message); assertions++; };
const close = (a, b, eps = 1e-8) => Math.abs(a - b) < eps;
const view = () => state().view;
const toScreen = ([x, y]) => { const v = view(), k = v.scale * v.camera.zoom; return [(x - v.camera.x) * k + v.width / 2, (y - v.camera.y) * k + v.height / 2]; };
const canvas = $('landscape'), tap = async ([x, y], id = 30) => { await fire(canvas, 'pointerdown', { pointerId: id, clientX: x, clientY: y, button: 0 }); await fire(canvas, 'pointerup', { pointerId: id, clientX: x, clientY: y }); await fire(canvas, 'click', { clientX: x, clientY: y }); };

(async () => {
  /* immersive shell */
  check(!env.select('header').length && !env.select('footer').length && !env.select('h1').length, 'No header, footer or page title: the scene fills the screen');
  const tabs = env.select('.tabbar button');
  check(tabs.length >= 7 && tabs.every(b => b.attrs['aria-label'] && b.descendants().some(c => c.tagName === 'SVG')), 'Floating tab bar uses icons with accessible names');

  /* science runs and drives the visuals */
  advance(3);
  check(state().time > 1, 'Simulation advances');
  check(state().particleCount > 0, 'Positive model flows emit particles');
  check(state().ions.ammonium > 0 && state().ions.nitrate > 0 && state().ions.air > 0, 'Resident ions show the soil and air pools');

  /* panels */
  for (const name of ['cycle', 'act', 'soil', 'microbes', 'view']) {
    const tab = env.select(`.tab[data-panel="${name}"]`)[0];
    await fire(tab, 'click');
    check(state().panel === name && !$('sheet').hidden && !$('panel-' + name).hidden && tab.attrs['aria-expanded'] === 'true', 'Tab opens its panel: ' + name);
  }
  await fire(env.select('.tab[data-panel="view"]')[0], 'click');
  check(state().panel === null && $('sheet').hidden, 'Tapping the open tab closes the sheet');

  /* cycle map */
  await fire(env.select('.tab[data-panel="cycle"]')[0], 'click');
  const arcs = $('cycle-map').querySelectorAll('.arc[data-proc]');
  check(arcs.length >= 12, 'Cycle map draws every pathway');
  const before = JSON.stringify(state().reservoirs), t0 = state().time;
  await fire(arcs.find(a => a.dataset.proc === 'fixation'), 'click');
  check(state().selected === 'fixation' && !$('explanation').hidden && state().focusRoutes.length === 1, 'Choosing an arrow focuses that process and shows its card');
  check(state().panel === null, 'Focusing closes the sheet so the process stays visible');
  check(state().time === t0 && JSON.stringify(state().reservoirs) === before, 'Focusing preserves scientific state');
  check(/N₂/.test($('info-eq').innerHTML) && /NH₄⁺/.test($('info-eq').innerHTML), 'Card shows the reaction as formulas');
  const seen = new Set([state().selected]);
  for (let i = 0; i < 9; i++) { await fire('next-process', 'click'); seen.add(state().selected); }
  check(seen.size === 10, 'Stepper walks through all ten processes');
  await fire('next-process', 'click'); check(state().selected === 'fixation', 'Stepper wraps around the cycle');
  await fire('prev-process', 'click'); check(state().selected === 'fertilizer', 'Stepper goes backwards');
  await fire(env.select('.tab[data-panel="cycle"]')[0], 'click');
  await fire(arcs.find(a => a.dataset.proc === 'nitri2'), 'click');
  check(state().selected === 'nitri2' && state().focusRoutes.length === 1, 'Nitrification steps can be focused separately');
  await fire('close-info', 'click');
  check(state().selected === null && $('explanation').hidden, 'Closing the card returns to the whole cycle');

  /* playback */
  await fire('play', 'click'); const paused = state().time; advance(2);
  check(state().time === paused && !state().playing, 'Pause freezes model time');
  check($('play').classList.contains('paused'), 'Play button shows its paused state');

  /* fertilizer */
  const b4 = state(); $('fertilizer').value = '40'; await fire('fertilizer', 'input');
  check(state().inputs === b4.inputs && JSON.stringify(state().reservoirs) === JSON.stringify(b4.reservoirs), 'Choosing a dose does not apply it');
  check(/\+24 NH₄⁺/.test($('fertilizer-status').innerHTML) && /\+16 NO₃⁻/.test($('fertilizer-status').innerHTML), 'Dose preview shows the real 60/40 split');
  await fire('add-fertilizer', 'click');
  check(state().inputs === b4.inputs + 40, 'Fertilizer records the quantity added');
  check(close(state().reservoirs.ammonium - b4.reservoirs.ammonium, 24) && close(state().reservoirs.nitrate - b4.reservoirs.nitrate, 16), 'Fertilizer changes the real ammonium and nitrate pools');
  check(state().particleProcesses.includes('fertilizer'), 'Fertilizer pellets fall even while paused');
  check(state().view.target.zoom > 1 || W < 420, 'Fertilizer frames the soil it lands on');
  advance(1); check(state().time === paused, 'Fertilizer animation never advances paused science');

  /* other interventions */
  const sites = state().view.organicSites; await fire('leaves', 'click');
  check(state().inputs === b4.inputs + 48, 'Dead leaves add external organic nitrogen');
  check(close(state().view.organicSites.plant - sites.plant, 8) && state().view.organicSites.animal === sites.animal, 'Added leaves land in the leaf-litter site only');
  check(close(state().view.organicSites.plant + state().view.organicSites.animal, state().reservoirs.organic, 1e-8), 'Leaf litter and dung share the model\'s single organic pool');
  await fire('rain', 'click'); check(state().moisture > .55, 'Rain wets the soil');
  await fire('lightning', 'click'); await fire('grow', 'click');
  check(state().selected === null, 'Interventions keep the current view mode');
  $('bacteria').value = '0'; await fire('bacteria', 'input'); $('moisture').value = '25'; await fire('moisture', 'input');
  check(state().activity === 0 && state().moisture === .25, 'Sliders change the real model parameters');
  await fire(env.select('[data-speed="4"]')[0], 'click'); await fire('play', 'click'); advance(1);
  check(state().speed === 4 && state().time > paused + 1.8, 'Speed controls the bounded model step count');
  check(state().rates.fixation === 0 && state().rates.nitri1 === 0, 'Zero microbe activity stops microbial transfers');
  check(Math.abs(state().balanceError) < 1e-8, 'The whole intervention sequence conserves nitrogen');

  /* scene labels and focus tags */
  const infoTags = env.select('.tag[data-info]');
  for (const tag of infoTags) {
    await fire(tag, 'click');
    check(state().selected === tag.dataset.info, 'Scene label focuses its process: ' + tag.dataset.thing);
    if ($('microbe-dialog').open) await fire('close-microbe', 'click');
  }

  /* particle style: dots or chemical formulas */
  await fire('close-info', 'click');
  check(state().particleStyle === 'dots' && $('label-mode').attrs['aria-pressed'] === 'false', 'Particles start as dots');
  await fire('label-mode', 'click'); advance(.5);
  check(state().particleStyle === 'formula' && $('label-mode').attrs['aria-pressed'] === 'true', 'Toggle turns particles into chemical formulas');
  check(env.store.get('nitrogen-particles') === 'formula', 'Formula choice is remembered');
  await fire(env.document, 'keydown', { key: 'f', target: env.document });
  check(state().particleStyle === 'dots', 'F key toggles back to dots');
  await fire(env.document, 'keydown', { key: 'F', target: env.document }); advance(.3);
  check(state().particleStyle === 'formula', 'F key toggles formulas again');
  await fire(env.document, 'keydown', { key: 'f', target: $('fertilizer') });
  check(state().particleStyle === 'formula', 'Typing in a control does not toggle');
  await fire('label-mode', 'click');

  /* scenarios, restart */
  for (const [id, test, msg] of [['fertilized', s => s.time === 0 && s.inputs === 85, 'Over-fertilized preset resets and records its input'], ['rain', s => s.moisture === .9, 'Rainfall preset'], ['healthy', s => s.moisture === .55 && s.inputs === 0, 'Healthy preset']]) {
    await fire(env.select(`[data-scenario="${id}"]`)[0], 'click'); check(test(state()) && state().scenario === id, msg);
  }

  /* sound */
  await fire('sound', 'click'); check(state().sound === true && $('sound').attrs['aria-pressed'] === 'true', 'Sound toggle enables the audio pipeline');
  await fire('lightning', 'click'); await fire('sound', 'click'); check(state().sound === false, 'Sound toggle mutes');
  const audio = env.audioContexts[0]; audio.currentTime += 5; await fire('sound', 'click'); const started = audio.startedSources;
  check(audio.gains[0].gain.value === 0 && audio.gains[1].gain.value === 0, 'Dry weather is silent');
  await fire('lightning', 'click'); check(audio.startedSources === started + 1 && audio.gains[0].gain.value > .5, 'Dry lightning plays thunder');
  check(audio.gains[1].gain.value === 0, 'Dry thunder does not start rain ambience');
  audio.currentTime += 5; advance(.5); check(audio.gains[0].gain.value === 0, 'Silence returns after thunder');
  await fire('sound', 'click'); const muted = audio.startedSources; await fire('lightning', 'click'); check(audio.startedSources === muted, 'Muted lightning stays silent');
  advance(1); await fire('restart', 'click'); check(state().time === 0 && state().speed === 4, 'Restart keeps the playback speed');

  /* view controls */
  const sci = JSON.stringify(state().reservoirs), vt = state().time;
  await fire('view-roots', 'click'); check(view().target.zoom > 1.2, 'Roots view zooms into the root zone');
  check(state().time === vt && JSON.stringify(state().reservoirs) === sci, 'Inspecting never changes science');
  await fire('play', 'click'); advance(2); check(view().camera.zoom > 1.2, 'Camera moves while paused');
  const saved = state().time;
  await fire('view-compounds', 'click'); advance(1); check(state().time === saved, 'Paused camera moves never advance science');
  await fire('view-water', 'click'); advance(1); check(view().camera.y > view().worldHeight * .5, 'Groundwater view reaches the water table');
  for (let i = 0; i < 8; i++) await fire('zoom-in', 'click'); advance(1); check(view().camera.zoom <= 4 + 1e-9, 'Zoom is bounded');
  await fire('reset-view', 'click'); advance(2); check(close(view().camera.zoom, 1, 1e-3), 'Reset returns the whole landscape');
  let prevented = false;
  await fire(canvas, 'wheel', { clientX: W / 2, clientY: H / 2, deltaY: -180, preventDefault() { prevented = true; } }); advance(1);
  check(prevented && view().camera.zoom > 1.2, 'Wheel zoom works and keeps the page still');
  await fire(canvas, 'pointerdown', { pointerId: 1, clientX: W / 2, clientY: H / 2, button: 0 }); const ox = view().target.x;
  await fire(canvas, 'pointermove', { pointerId: 1, clientX: W * .4, clientY: H / 2 }); check(view().target.x > ox, 'Drag pans the landscape');
  await fire(canvas, 'pointerup', { pointerId: 1 });
  await fire(canvas, 'pointerdown', { pointerId: 2, clientX: W * .4, clientY: H / 2, button: 0 }); await fire(canvas, 'pointerdown', { pointerId: 3, clientX: W * .6, clientY: H / 2, button: 0 });
  const pz = view().target.zoom; await fire(canvas, 'pointermove', { pointerId: 3, clientX: W * .7, clientY: H / 2 }); check(view().target.zoom > pz, 'Pinch zooms in');
  await fire(canvas, 'pointercancel', { pointerId: 2 }); await fire(canvas, 'pointerup', { pointerId: 3 });
  await fire('reset-view', 'click'); advance(2);

  /* resizing and orientation */
  const beforeResize = JSON.stringify(state().reservoirs);
  for (const [w, h] of [[366, 740], [800, 380], [W, H]]) {
    env.resize(w, h); advance(.3);
    check(view().width === w && view().height === h, 'Resize updates the scene: ' + w + '×' + h);
    check(state().time === saved && JSON.stringify(state().reservoirs) === beforeResize, 'Resize preserves science and paused time');
    check(Number.isFinite(view().camera.x) && view().camera.zoom >= 1 && view().camera.zoom <= 4, 'View stays finite and bounded after resize');
  }

  /* microorganisms */
  check(!view().labels.some(l => view().microbeSites.some(s => s.kind === l.kind)), 'Microbe names stay hidden until one is chosen');
  await fire('view-bacteria', 'click'); check($('microbe-dialog').open && $('microbe-name').textContent === 'Rhizobium etli', 'Bacteria button opens a named picture card');
  const names = { rhizobium: 'Rhizobium etli', soilFixers: 'Azotobacter chroococcum', nostoc: 'Nostoc commune', nitrosomonas: 'Nitrosomonas europaea', nitrobacter: 'Nitrobacter winogradskyi', denitrifiers: 'Stutzerimonas stutzeri', decomposers: 'Bacillus subtilis' };
  const pictures = new Set(), mState = JSON.stringify(state().reservoirs);
  for (const [id, name] of Object.entries(names)) {
    await fire(env.select(`[data-pick="${id}"]`)[0], 'click');
    check($('microbe-name').textContent === name && $('microbe-picture').attrs['aria-label'].includes(name), 'Picture card names ' + name);
    pictures.add($('microbe-picture').dataset.image);
    check(/^https:\/\//.test($('microbe-reference').attrs.href), 'Each species has a scientific reference');
    check(JSON.stringify(state().reservoirs) === mState && state().time === saved, 'Opening cards preserves science');
  }
  check(pictures.size === 7, 'Each microorganism has its own picture');
  await fire('close-microbe', 'click'); check(!$('microbe-dialog').open, 'Picture card closes');
  check(view().microbeSites.length === 7 && new Set(view().microbeSites.map(s => s.point.map(Math.round).join(','))).size === 7, 'All seven microbes live in distinct places');
  for (const [id, name] of Object.entries(names)) {
    await fire(env.select(`#panel-microbes [data-microbe="${id}"]`)[0], 'click');
    check($('microbe-dialog').open && $('microbe-name').textContent === name, 'Microbe gallery opens ' + name);
    await fire('locate-microbe', 'click'); advance(2);
    const site = view().microbeSites.find(s => s.id === id), [x, y] = toScreen(site.point);
    check(!$('microbe-dialog').open && view().microbe === id, 'Show me closes the card and circles ' + name);
    check(x > 0 && x < W && y > 0 && y < H, 'The located organism is on screen: ' + id);
    check(view().labels.filter(l => names[l.kind]).length <= 1 && (view().labels.some(l => l.kind === id) || W < 420), 'Only the chosen organism shows its name');
    await tap([x, y]);
    check($('microbe-dialog').open && $('microbe-name').textContent === name, 'Tapping the organism reopens its card: ' + id);
    await fire('close-microbe', 'click');
  }
  await fire('close-info', 'click'); advance(2);
  for (const id of ['nitrosomonas', 'nitrobacter', 'denitrifiers', 'soilFixers', 'decomposers']) {
    const [x, y] = toScreen(view().microbeSites.find(s => s.id === id).point);
    await tap([x, y], 40);
    check($('microbe-dialog').open && $('microbe-name').textContent === names[id], 'Tapping each microbe colony in the whole view opens its card: ' + id);
    await fire('close-microbe', 'click'); await fire('close-info', 'click'); advance(1);
  }

  /* journey: follow one nitrogen atom */
  const jSci = JSON.stringify(state().reservoirs), jTime = state().time, jWasPlaying = state().playing;
  const J = () => state().journey;
  await fire('journey', 'click');
  check(J() && J().station === 'air' && !state().playing && !$('journey-card').hidden && $('journey').attrs['aria-pressed'] === 'true', 'Journey starts in the air, pauses the live model and shows its card');
  advance(6); check(J().animT > 4 && J().lens && J().lens.r > 40, 'The reaction plays in a microscope lens on the scene');
  check(J().caption.length > 10 && J().caption === 'So plants and animals cannot use N₂ directly.', 'The card caption follows the animation');
  const order = ['air', 'fix', 'nit1', 'nit2', 'abs', 'assim', 'feed', 'waste', 'decomp', 'denit', 'return'];
  const outs = { fix: 'NH₄⁺', nit1: 'NO₂⁻', nit2: 'NO₃⁻', abs: 'NO₃⁻', assim: 'Protein N', feed: 'Protein N', waste: 'Organic N', decomp: 'NH₄⁺', denit: 'N₂', return: 'N₂' };
  for (let i = 1; i < order.length; i++) {
    await fire('j-next', 'click');
    check(J().phase === 'travel', 'The atom travels to the next station: ' + order[i]);
    advance(4.6);
    check(J().station === order[i] && J().phase === 'station' && J().index === i, 'Arrives at station ' + (i + 1) + ': ' + order[i]);
    advance(7.5);
    check(J().compound === outs[order[i]], 'At ' + order[i] + ' the atom becomes ' + outs[order[i]]);
  }
  check($('j-step').textContent.startsWith('11 / 11') && env.select('[data-jact="restart"]').length === 1, 'The cycle completes back in the air');
  check(state().time === jTime && JSON.stringify(state().reservoirs) === jSci, 'The journey never changes the live model');
  await fire(env.select('[data-jact="restart"]')[0], 'click'); check(J().station === 'air' && J().index === 0, 'Go round again restarts the journey');
  await fire('j-next', 'click'); await fire('j-next', 'click'); check(J().station === 'fix' && J().phase === 'station', 'Next during travel jumps straight to the station');
  await fire('j-prev', 'click'); check(J().station === 'air', 'Previous goes back a station');
  await fire(env.document, 'keydown', { key: 'ArrowRight', target: env.document }); advance(4.6); check(J().station === 'fix', 'Right arrow advances');
  await fire(env.document, 'keydown', { key: 'PageDown', target: env.document }); advance(4.6); check(J().station === 'nit1', 'Page Down (presentation clicker) advances');
  await fire(env.document, 'keydown', { key: 'PageUp', target: env.document }); check(J().station === 'fix', 'Page Up goes back');
  await fire(env.document, 'keydown', { key: ' ', target: env.document }); advance(4.6); check(J().station === 'nit1', 'Space advances');
  advance(6); await fire('j-replay', 'click'); check(J().animT < .5, 'Replay restarts the reaction');
  advance(3); const lens = J().lens; await tap([lens.cx, lens.cy], 60); check(J().animT < .5 && J().station === 'nit1', 'Tapping the lens replays it');
  advance(1); const [tx, ty] = toScreen(J().pos); await tap([tx, ty], 61); check(J().phase === 'travel' || J().station === 'nit2', 'Tapping the travelling atom moves on');
  await fire('j-exit', 'click');
  check(J() === null && $('journey-card').hidden && state().playing === jWasPlaying, 'Leaving restores the live model as it was');
  // side trips
  await fire('journey', 'click'); await fire(env.select('[data-branch="lightning"]')[0], 'click'); advance(4.6);
  check(J().station === 'bolt' && J().path.join() === 'air,bolt,rain,abs,assim,feed,waste,decomp,denit,return', 'Lightning side trip joins the path');
  advance(6); check(J().compound === 'NO', 'Lightning turns N₂ into NO');
  await fire('j-next', 'click'); advance(4.6); advance(7); check(J().station === 'rain' && J().compound === 'NO₃⁻', 'Rain turns NO into nitrate');
  await fire('j-next', 'click'); advance(4.6); check(J().station === 'abs', 'Lightning side trip rejoins at absorption');
  await fire(env.document, 'keydown', { key: 'Escape' }); check(J() === null, 'Escape leaves the journey');
  await fire('journey', 'click'); await fire(env.select('[data-branch="fertilizer"]')[0], 'click'); advance(4.6); advance(6);
  check(J().station === 'factory' && J().compound === 'NH₃', 'Fertilizer factory makes ammonia from N₂');
  await fire('j-next', 'click'); advance(4.6); advance(6); check(J().station === 'pellet' && J().compound === 'NH₄⁺', 'Pellet dissolves into ammonium');
  await fire('j-next', 'click'); advance(4.6); check(J().station === 'nit1', 'Fertilizer side trip rejoins at nitrification');
  await fire('j-next', 'click'); advance(4.6); check(J().station === 'nit2' && env.select('[data-branch="leaching"]').length === 1, 'Leaching is offered once nitrate forms');
  await fire(env.select('[data-branch="leaching"]')[0], 'click'); advance(4.6); check(J().station === 'leach', 'Leaching side trip starts');
  await fire('j-next', 'click'); advance(4.6); check(J().station === 'river' && env.select('[data-jact="next"]').length === 1, 'The atom reaches the river and the card offers the way back');
  await fire(env.select('[data-jact="next"]')[0], 'click'); advance(4.6); check(J().station === 'abs', 'Back to the main path at absorption');
  await fire(env.select('.tab[data-panel="act"]')[0], 'click'); check(J() === null && state().panel === 'act', 'Opening a panel leaves the journey');
  await fire(env.select('.tab[data-panel="act"]')[0], 'click');
  await fire('journey', 'click'); await fire('play', 'click'); check(J() === null && state().playing, 'Play leaves the journey and resumes the live model');
  check(Math.abs(state().balanceError) < 1e-8 && JSON.stringify(state().reservoirs) !== '', 'Nitrogen is still conserved after the journey');
  await fire(env.document, 'keydown', { key: 'Escape' }); check(state().selected === null, 'Escape returns to the whole cycle');
  check(Math.abs(state().balanceError) < 1e-8, 'Nitrogen is conserved at the end');
  console.log(`PASS: ${assertions} ${offline ? 'standalone' : 'website'} application assertions at ${W}×${H}. Immersive shell, tab panels, cycle map, focus, particle formulas, interventions, sound, view, microbes, journey. Network disabled.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
