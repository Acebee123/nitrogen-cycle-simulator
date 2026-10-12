(() => {
  'use strict';
  const { NitrogenModel, PROCESSES } = NitrogenScience;
  const $ = id => document.getElementById(id);
  const model = new NitrogenModel();
  const scene = new EcosystemScene($('landscape'), model);
  scene.initViewControls();
  let playing = true, speed = 1, accumulator = 0, previous = 0, uiClock = 0, raf = 0, toastTimer, selected = null, mode = "whole", lastFocus = "nitrification", sound = false, audio;
  const disposers = [];
  const on = (element, type, fn) => { element.addEventListener(type, fn); disposers.push(() => element.removeEventListener(type, fn)); };
  function announce(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').classList.add('visible'); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3300); }
  function highlight(id) {
    selected = id; scene.selected = id; scene.inspectedMicrobe=null;
    document.querySelectorAll('[data-info]').forEach(el => { const active = el.dataset.info === id || (id === 'nitrification' && ['nitri1','nitri2'].includes(el.dataset.info)); el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
  }
  const effects={fixation:'ADDS NITRATE · VIA NITRIFICATION',nitrification:'ADDS NITRATE · TWO AEROBIC STAGES',nitri1:'PREPARES NITRATE · NH₄⁺ → NO₂⁻',nitri2:'ADDS SOIL NITRATE',uptake:'REMOVES SOIL NITRATE',denitrification:'REMOVES SOIL NITRATE',leaching:'REMOVES SOIL NITRATE',lightning:'ADDS SOIL NITRATE',fertilizer:'ADDS NITRATE + AMMONIUM',decomposition:'RETURNS AMMONIUM · PRECURSOR TO NITRATE',feeding:'TRANSFERS ORGANIC NITROGEN',litter:'RETURNS ORGANIC NITROGEN',leaves:'ADDS ORGANIC NITROGEN'};
  function setMode(next) { mode=next; $('whole-mode').setAttribute('aria-pressed',String(mode==='whole')); $('focus-mode').setAttribute('aria-pressed',String(mode==='focus')); }
  function whole() { setMode('whole'); highlight(null); scene.resetView(); $('explanation').hidden=true; }
  function explain(id,kind) { const p=PROCESSES[id]; if(!p)return; const thing=scene.describeThing(kind); lastFocus=id; setMode('focus'); highlight(id); scene.focusProcess(id); $('info-name').textContent=thing?thing.name:p.name; $('info-input').textContent=p.input; $('info-output').textContent=p.output; $('info-description').textContent=thing?thing.description:p.description; $('nitrate-effect').textContent=effects[id]; $('explanation').hidden=false; updateUI(); const microbe=scene.describeMicrobe(kind);if(microbe)showMicrobeCard(microbe); }
  function showMicrobeCard(profile){
    $('microbe-name').textContent=profile.name;$('microbe-group').textContent=profile.group;$('microbe-description').textContent=profile.description;$('microbe-habitat').textContent=profile.habitat;$('microbe-note').textContent=profile.note;$('microbe-reaction').textContent=profile.input+' → '+profile.output;
    $('microbe-select').value=profile.id;const picture=$('microbe-picture');picture.dataset.image=profile.id==='nostoc'?'nostoc':'atlas';picture.style.backgroundPosition=[0,50,100][profile.picture%3]+'% '+(profile.picture<3?'0%':'100%');picture.setAttribute('aria-label','Scientific illustration: '+profile.name);picture.dataset.profile=profile.id;
    $('microbe-reference').setAttribute('href',profile.source);$('microbe-reference').textContent='Scientific reference ↗';
    scene.focusMicrobe(profile.id);
    if(!$('microbe-dialog').open)$('microbe-dialog').showModal();
  }
  scene.onInspect=(id,kind)=>explain(id,kind);
  on($('whole-mode'),'click',whole);
  on($('focus-mode'),'click',()=>explain(lastFocus));
  function action(id, run, text) { on($(id), 'click', () => { run(); scene.ingest(model.drainFlows()); updateUI(); announce(typeof text==='function'?text():text); $(id).classList.add('active'); setTimeout(() => $(id).classList.remove('active'), 700); }); }
  document.querySelectorAll('[data-info]').forEach(el => { on(el, 'click', () => explain(el.dataset.info,el.dataset.thing)); const thing=scene.describeThing(el.dataset.thing); el.title = thing?thing.description:PROCESSES[el.dataset.info].description; });
  on($('close-info'), 'click', whole);
  on(document, 'keydown', e => { if (e.key === 'Escape') {if($('microbe-dialog').open){$('microbe-dialog').close();e.preventDefault();}else whole();} });
  on($('close-microbe'),'click',()=>$('microbe-dialog').close());
  on($('locate-microbe'),'click',()=>{const p=scene.microbeProfile($('microbe-select').value);if(!p)return;$('microbe-dialog').close();scene.focusMicrobe(p.id);$('landscape').scrollIntoView?.({behavior:scene.reduced?'auto':'smooth',block:'center'});announce(p.name+' is highlighted in the ecosystem. Tap the organism or its label to reopen its picture.');});
  on($('view-bacteria'),'click',()=>explain('fixation','nodule-tag'));
  on($('microbe-select'),'change',()=>{const p=scene.microbeProfile($('microbe-select').value);if(p)explain(p.process,p.kind);});
  on($('microbe-dialog'),'click',e=>{if(e.target!==$('microbe-dialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();});
  action('lightning', () => { model.lightning(); scene.lightning(); if (sound) { audio.ctx.resume(); audio.thunder(); } }, 'Lightning fixes atmospheric nitrogen. Nitrate deposition follows gradually.');
  action('rain', () => { model.heavyRain(); }, 'Rain wets the soil. Watch nitrate drainage and denitrification increase.');
  action('grow', () => { model.grow(); }, 'Growth encouraged. Roots will draw nitrogen from available soil reserves.');
  action('leaves', () => { model.addLeaves(); scene.leaves(); }, '8 N units added as organic matter. Decomposers return nitrogen gradually.');
  let appliedFertilizer=0;
  function fertilizerStatus(applied=false){const dose=Number($('fertilizer').value),a=(dose*.6).toFixed(0),n=(dose*.4).toFixed(0);$('fertilizer-status').textContent=applied?`Applied ${dose} N units · +${a} NH₄⁺ / +${n} NO₃⁻`:`Choose dose, then Add · +${a} NH₄⁺ / +${n} NO₃⁻`;}
  action('add-fertilizer', () => { appliedFertilizer=Number($('fertilizer').value);model.addFertilizer(appliedFertilizer);scene.fertilizerPulse(appliedFertilizer);fertilizerStatus(true); }, () => `${appliedFertilizer} N units applied: +${(appliedFertilizer*.6).toFixed(0)} ammonium and +${(appliedFertilizer*.4).toFixed(0)} nitrate. Soil pools pulse where nitrogen was added.`);
  on($('fertilizer'), 'input', () => { $('fertilizer-value').textContent = `${$('fertilizer').value} N units`; fertilizerStatus(); });
  on($('bacteria'), 'input', () => { model.activity = Number($('bacteria').value) / 100; $('bacteria-value').textContent = `${$('bacteria').value}%`; updateUI(); });
  on($('moisture'), 'input', () => { model.moistureTarget = Number($('moisture').value) / 100; model.moisture = model.moistureTarget; updateUI(); });
  function togglePlay() { playing = !playing; $('play').textContent = playing ? 'Ⅱ' : '▶'; $('play').setAttribute('aria-label', playing ? 'Pause simulation' : 'Play simulation'); $('play').title = playing ? 'Pause simulation' : 'Play simulation'; if (audio) audio.setWeather(model.rain > 0, playing && sound); updateUI(); }
  on($('play'), 'click', togglePlay);
  on($('speed'), 'change', () => { speed = Number($('speed').value); accumulator = 0; });
  function reset() {
    model.reset($('scenario').value); scene.reset(); scene.inputPulse=null;scene.ingest(model.drainFlows()); accumulator = 0; $('fertilizer').value = 20; $('fertilizer-value').textContent = '20 N units';fertilizerStatus(); $('bacteria').value = model.activity * 100; $('bacteria-value').textContent = '100%'; $('moisture').value = Math.round(model.moisture * 100); whole(); updateUI();
  }
  on($('restart'), 'click', () => { reset(); announce('Current ecosystem restarted.'); });
  on($('scenario'), 'change', () => { reset(); announce({healthy:'Balanced soil, active microbes, and healthy vegetation.',rain:'Sustained rainfall and wet soil. Follow nitrogen into drainage and air.',fertilized:'85 N units of fertilizer added. Explore uptake and the risk of nutrient loss.'}[model.scenario]); });
  on($('model-info'), 'click', () => $('about-dialog').showModal());
  on($('close-about'), 'click', () => $('about-dialog').close());
  on($('about-dialog'), 'click', e => { if (e.target === $('about-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });
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
      this.noiseBuffer = buffer; this.source = this.ctx.createBufferSource(); this.source.buffer = buffer; this.source.loop = true; const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1800; this.source.connect(filter); filter.connect(this.gain); this.source.start();
      // Rain ambience and a rolling thunder tail; no impact/crack sound.
      this.rumbleBuffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 4.3), this.ctx.sampleRate);
      const rumble = this.rumbleBuffer.getChannelData(0); let low = 0;
      for (let i = 0; i < rumble.length; i++) { const white = Math.random() * 2 - 1; low = (low + white * .055) / 1.018; rumble[i] = Math.max(-1, Math.min(1, low * 3 + white * .08)); }
    }
    setEnabled(enabled) { this.enabled=enabled; this.output.gain.setTargetAtTime(enabled&&this.raining ? .9 : 0, this.ctx.currentTime, .025); }
    setWeather(rain, enabled) { this.raining=rain; this.gain.gain.setTargetAtTime(enabled&&rain ? .13 : 0, this.ctx.currentTime, .25);this.output.gain.setTargetAtTime(this.enabled&&(rain||this.ctx.currentTime<(this.thunderUntil||0)) ? .9 : 0,this.ctx.currentTime,.025); }
    thunder() {
      const now = this.ctx.currentTime;
      this.thunderUntil=now+4.3;this.output.gain.setTargetAtTime(this.enabled?.9:0,now,.025);
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), tail = this.ctx.createGain();
      source.buffer = this.rumbleBuffer; filter.type = 'lowpass'; filter.frequency.setValueAtTime(650, now); filter.frequency.exponentialRampToValueAtTime(180, now + 3);
      tail.gain.setValueAtTime(.0001, now); tail.gain.exponentialRampToValueAtTime(.65, now + .12); tail.gain.exponentialRampToValueAtTime(.3, now + .5); tail.gain.exponentialRampToValueAtTime(.48, now + .9); tail.gain.exponentialRampToValueAtTime(.19, now + 1.8); tail.gain.exponentialRampToValueAtTime(.0001, now + 4.1);
      source.connect(filter); filter.connect(tail); tail.connect(this.output); source.start(now); source.stop(now + 4.2);
      source.onended = () => { source.disconnect(); filter.disconnect(); tail.disconnect(); };
    }
    destroy() { this.source.stop(); this.ctx.close(); }
  }
  on($('sound'), 'click', async () => {
    try { if (!audio) audio = new AmbientAudio(); await audio.ctx.resume(); sound = !sound; audio.setEnabled(sound); $('sound').setAttribute('aria-pressed', String(sound)); $('sound').setAttribute('aria-label', sound ? 'Turn environmental sound off' : 'Turn environmental sound on'); $('sound').title = sound ? 'Sound on' : 'Sound off'; $('sound').innerHTML = sound ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>'; audio.setWeather(model.rain > 0, playing && sound); } catch { announce('Environmental audio is unavailable in this browser.'); }
  });
  function updateUI() {
    $('day').textContent=model.time.toFixed(1).padStart(4,'0');$('moisture-value').textContent=`${Math.round(model.moisture*100)}%`;
    $('weather-label').textContent=!playing?'Simulation paused':model.rain>0?'Rainfall · wet soil':model.moisture>.8?'Waterlogged soil':model.moisture<.25?'Dry soil':model.activity===0?'Microbes inactive':model.n.nitrate+model.n.ammonium>85?'Nutrient-rich soil':'Balanced conditions';
    if(selected){const ids=selected==='nitrification'?['nitri1','nitri2']:selected==='fixation'?['fixation','nitri1','nitri2']:[selected];$('focus-rate').textContent=ids.map(k=>PROCESSES[k].name+' · '+(model.rates[k]||0).toFixed(2)+' N/day').join('  /  ');}
    if(audio)audio.setWeather(model.rain>0,playing&&sound);
  }
  on(window,'resize',updateUI);
  on(document,'visibilitychange',()=>{previous=0;accumulator=0;if(audio)audio.setWeather(model.rain>0,sound&&playing&&!document.hidden);});
  function frame(now) {
    const dt=previous?Math.min((now-previous)/1000,.1):0;previous=now;
    if(playing&&!document.hidden){accumulator+=dt*.5*speed;while(accumulator>=.05-1e-10){model.step(.05);accumulator-=.05;}scene.ingest(model.drainFlows());}
    scene.speed=speed; scene.render(dt,playing&&!document.hidden);uiClock+=dt;if(uiClock>.2){uiClock=0;updateUI();}raf=requestAnimationFrame(frame);
  }
  on(window,'pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(raf);clearTimeout(toastTimer);scene.destroy();if(audio)audio.destroy();for(const dispose of disposers)dispose();});
  scene.ingest(model.drainFlows());updateUI();raf=requestAnimationFrame(frame);
  // Read-only diagnostics make conservation and transfer behavior inspectable.
  Object.defineProperty(window,'nitrogenDiagnostics',{value:()=>({time:model.time,reservoirs:{...model.n},inputs:model.inputs,total:model.total(),balanceError:model.balanceError(),rates:{...model.rates},history:model.history.map(p=>({...p})),playing,speed,moisture:model.moisture,activity:model.activity,view:scene.viewStats(),particleCount:scene.particles.length,selected,mode,particleProcesses:[...new Set(scene.particles.map(p=>p.process))],focusRoutes:scene.focusRoutes().map(({from,to,process})=>({from,to,process})),sound}),writable:false});
})();
