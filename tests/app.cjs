/* Dependency-free application event tests. This is a DOM harness, not a browser
   layout test; visual browser verification is reported separately. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const offline=process.argv.includes('offline');
const elements=new Map(),tags=[],html=fs.readFileSync(__dirname+'/../'+(offline?'dist-offline/Nitrogen-Cycle.html':'dist-web/index.html'),'utf8');
const viewport={width:1400,height:620},resizeObservers=[];
const drawing=new Proxy({}, {get:(t,k)=>k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='measureText'?()=>({width:10}):t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
class Element{
  constructor(id,attrs={}){this.id=id;this.attrs=attrs;this.dataset={};this.events={};this.value=attrs.value||'';this.hidden=attrs.hidden!==undefined;this.textContent='';this.width=1400;this.height=620;this.style={};const s=new Set();this.classList={add:x=>s.add(x),remove:x=>s.delete(x),toggle:(x,b)=>b?s.add(x):s.delete(x)};}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn)}removeEventListener(){}
  setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}
  getBoundingClientRect(){return {width:this.id==='landscape'?viewport.width:600,height:this.id==='landscape'?viewport.height:180,left:0,top:0,right:viewport.width,bottom:viewport.height}}
  getContext(){return drawing}showModal(){this.open=true}close(){this.open=false}
  set innerHTML(s){this.content=s;for(const match of s.matchAll(/id="([^"]+)"/g))if(!elements.has(match[1]))elements.set(match[1],new Element(match[1]));}get innerHTML(){return this.content||''}
}
for(const match of html.matchAll(/<(\w+)\s+([^>]+)>/g)){
  const attrs={};for(const a of match[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];if(/\bhidden\b/.test(match[2]))attrs.hidden='';
  if(attrs.id||attrs['data-info']){const e=new Element(attrs.id||'label-'+tags.length,attrs);if(attrs.id)elements.set(attrs.id,e);if(attrs['data-info']){e.dataset.info=attrs['data-info'];tags.push(e);}}
}
elements.get('scenario').value='healthy';elements.get('speed').value='1';
const document=new Element('document');document.hidden=false;document.getElementById=id=>{assert.ok(elements.has(id),'Element exists: '+id);return elements.get(id)};document.querySelectorAll=s=>{assert.equal(s,'[data-info]');return tags};document.createElement=()=>new Element('offscreen');
const audioContexts=[];
class AudioContext{
  constructor(){this.sampleRate=20;this.currentTime=0;this.destination={};this.gains=[];this.startedSources=0;audioContexts.push(this);}
  createGain(){const gain={gain:{value:0,setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}},connect(){}};this.gains.push(gain);return gain;}
  createBuffer(c,l){return {getChannelData:()=>new Float32Array(l)}}
  createBufferSource(){return {connect(){},start:()=>this.startedSources++,stop(){}}}createBiquadFilter(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}resume(){return Promise.resolve()}close(){}
}
const window=new Element('window');window.AudioContext=AudioContext;
let nextFrame;const context={console,document,window,devicePixelRatio:1,matchMedia:()=>({matches:false}),ResizeObserver:class{constructor(fn){resizeObservers.push(fn)}observe(){}disconnect(){}},requestAnimationFrame:fn=>(nextFrame=fn,1),cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){}};
vm.createContext(context);
context.fetch=()=>{throw Error('Network disabled in application QA')};
const inline=new Map([...html.matchAll(/<script data-source="([^"]+)">([\s\S]*?)<\/script>/g)].map(m=>[m[1],m[2].replace(/<\\\/script/gi,'</script')]));
for(const file of ['model.js','scene.js','clarity.js','app.js'])vm.runInContext(offline?inline.get(file):fs.readFileSync(__dirname+'/../dist-web/'+file,'utf8'),context,{filename:file});
let assertions=0,now=100;
const state=()=>window.nitrogenDiagnostics();
async function event(id,type='click',value){const e=elements.get(id);if(value!==undefined)e.value=String(value);for(const fn of e.events[type]||[])await fn({target:e});}
function check(b,msg){assert.ok(b,msg);assertions++;}
function advance(seconds){for(let i=0;i<seconds*10;i++){now+=100;nextFrame(now)}}
(async()=>{
  advance(3);check(state().time>1,'Simulation advances');check(state().particleCount>0,'Positive model flows emit particles');
  const before=JSON.stringify(state().reservoirs),time=state().time;
  await event('focus-mode');check(state().selected==='nitrification'&&state().focusRoutes.length===2,'Focus includes both nitrification stages');
  check(state().time===time&&JSON.stringify(state().reservoirs)===before,'Mode switch preserves scientific state');
  await event('whole-mode');check(state().mode==='whole'&&state().selected===null,'Whole cycle clears visual focus');
  await event('play');const paused=state().time;advance(2);check(state().time===paused,'Pause freezes model time');
  const beforeFertilizer=state();await event('fertilizer','input',40);
  check(state().inputs===beforeFertilizer.inputs&&JSON.stringify(state().reservoirs)===JSON.stringify(beforeFertilizer.reservoirs),'Selecting a fertilizer dose does not apply it');
  check(elements.get('fertilizer-status').textContent.includes('+24 NH₄⁺ / +16 NO₃⁻'),'Dose preview displays the real compound split');
  await event('add-fertilizer');check(state().inputs===40,'Fertilizer control records quantity');check(elements.get('fertilizer-value').textContent==='40 N units','Fertilizer readout updates');
  check(Math.abs(state().reservoirs.ammonium-beforeFertilizer.reservoirs.ammonium-24)<1e-10&&Math.abs(state().reservoirs.nitrate-beforeFertilizer.reservoirs.nitrate-16)<1e-10,'Fertilizer changes the actual ammonium and nitrate pools');
  check(state().particleProcesses.includes('fertilizer'),'Applied fertilizer emits real transfer particles while paused');
  check(state().view.target.zoom>1&&state().time===paused,'Fertilizer focuses the affected soil without advancing paused science');
  check(elements.get('fertilizer-status').textContent.startsWith('Applied 40 N units'),'Fertilizer confirms the applied amount');
  advance(1);check(state().time===paused&&state().view.camera.zoom>1,'Fertilizer camera feedback animates while paused');
  const sitesBefore=state().view.organicSites;await event('leaves');check(state().inputs===48,'Dead leaves add external organic nitrogen');
  check(Math.abs(state().view.organicSites.plant-sitesBefore.plant-8)<1e-10&&state().view.organicSites.animal===sitesBefore.animal,'Added leaves enter only the plant litter site');
  check(Math.abs(state().view.organicSites.plant+state().view.organicSites.animal-state().reservoirs.organic)<1e-8,'Separate visual sites share the existing organic nitrogen total');
  await event('rain');check(state().moisture>.55,'Rain moistens soil');
  await event('lightning');await event('grow');check(state().mode==='whole','Interventions preserve visualization mode');
  await event('bacteria','input',0);await event('moisture','input',25);check(state().activity===0&&state().moisture===.25,'Sliders change actual model parameters');
  await event('speed','change',4);await event('play');advance(1);check(state().time>paused+1.8,'Speed controls bounded model step count');
  check(state().rates.fixation===0&&state().rates.nitri1===0,'Zero activity stops microbial transfers');
  check(Math.abs(state().balanceError)<1e-8,'Intervention sequence conserves nitrogen');
  for(const tag of tags){for(const fn of tag.events.click)fn({target:tag});check(state().selected===tag.dataset.info,'Every scene and process label selects the correct pathway');if(elements.get('microbe-dialog').open)await event('close-microbe');}
  const fixation=tags.find(x=>x.dataset.info==='fixation');fixation.events.click[0]({target:fixation});check(state().focusRoutes.length===3,'Fixation highlights conversion through nitrate');
  const fertilizer=tags.find(x=>x.dataset.info==='fertilizer');fertilizer.events.click[0]({target:fertilizer});check(state().focusRoutes.length===2,'Fertilizer highlights both ammonium and nitrate');
  const litter=tags.find(x=>x.dataset.info==='litter');litter.events.click[0]({target:litter});check(state().focusRoutes.length===2&&state().focusRoutes[0].to!==state().focusRoutes[1].to,'Leaves and waste focus shows separate soil destinations');
  await event('sound');check(state().sound===true,'Sound toggle enables audio pipeline');await event('lightning');await event('sound');check(state().sound===false,'Sound toggle mutes audio pipeline');
  await event('model-info');check(elements.get('about-dialog').open,'Model explanation opens');await event('close-about');check(!elements.get('about-dialog').open,'Model explanation closes');
  await event('scenario','change','fertilized');check(state().time===0&&state().inputs===85,'Fertilized preset resets and records its input');
  await event('scenario','change','rain');check(state().moisture===.9,'Rainfall preset');
  await event('scenario','change','healthy');check(state().moisture===.55&&state().inputs===0,'Healthy preset');
  const audioState=audioContexts[0];audioState.currentTime+=5;await event('sound');const started=audioState.startedSources;
  check(audioState.gains[0].gain.value===0&&audioState.gains[1].gain.value===0,'Dry weather has no background audio');
  await event('lightning');check(audioState.startedSources===started+1&&audioState.gains[0].gain.value>.5,'Manual dry lightning plays audible thunder');
  check(audioState.gains[1].gain.value===0,'Dry thunder does not start rain ambience');
  audioState.currentTime+=5;advance(.5);check(audioState.gains[0].gain.value===0,'Dry conditions become silent after thunder ends');
  await event('sound');const mutedStart=audioState.startedSources;await event('lightning');check(audioState.startedSources===mutedStart,'Muted lightning does not start audio');
  advance(1);await event('restart');check(state().time===0&&state().speed===4,'Restart preserves playback speed');
  const conservedBefore=JSON.stringify(state().reservoirs),beforeViewTime=state().time;
  await event('view-roots');check(state().view.target.zoom>1.5,'Root inspection zooms into the original soil');
  check(state().time===beforeViewTime&&JSON.stringify(state().reservoirs)===conservedBefore,'Inspection cannot change scientific state');
  await event('play');advance(2);check(state().view.camera.zoom>1.5,'Camera transition works while simulation paused');
  const savedTime=state().time;await event('view-compounds');advance(1);check(state().time===savedTime,'Paused view transition never advances science');
  await event('view-water');advance(1);check(state().view.camera.x>state().view.worldWidth*.7,'Groundwater view reaches actual drainage');
  await event('zoom-in');advance(1);check(state().view.camera.zoom<=3.5,'Zoom maximum is bounded');
  await event('reset-view');advance(2);check(Math.abs(state().view.camera.zoom-1)<.001,'Reset returns original composition');
  const canvas=elements.get('landscape');const fire=(type,e)=>{for(const fn of canvas.events[type]||[])fn(e)};
  let prevented=false;fire('wheel',{clientX:700,clientY:400,deltaY:-180,preventDefault(){prevented=true}});advance(1);check(prevented&&state().view.camera.zoom>1.2,'Wheel zoom handles input and prevents page scroll');
  fire('pointerdown',{pointerId:1,clientX:700,clientY:400,button:0});const oldX=state().view.target.x;
  fire('pointermove',{pointerId:1,clientX:630,clientY:400});check(state().view.target.x>oldX,'Drag pans inside the landscape');
  fire('pointerup',{pointerId:1});
  fire('pointerdown',{pointerId:2,clientX:600,clientY:350});fire('pointerdown',{pointerId:3,clientX:800,clientY:350});
  const pinchBefore=state().view.target.zoom;fire('pointermove',{pointerId:3,clientX:900,clientY:350});check(state().view.target.zoom>pinchBefore,'Two-finger pinch increases magnification');
  fire('pointercancel',{pointerId:2});fire('pointerup',{pointerId:3});
  await event('focus-mode');advance(1);check(state().view.camera.zoom>1&&state().time===savedTime,'Process focus transitions while paused');
  await event('whole-mode');advance(1);check(state().selected===null&&state().time===savedTime,'Whole-cycle transition preserves paused model');
  const beforeResize=JSON.stringify(state().reservoirs);
  for(const[width,height]of[[366,410],[720,380],[1280,620]]){viewport.width=width;viewport.height=height;for(const callback of resizeObservers)callback();advance(.2);check(state().view.width===width&&state().view.height===height,'Orientation and window resizing update scene dimensions');check(state().time===savedTime&&JSON.stringify(state().reservoirs)===beforeResize,'Resizing preserves scientific state and paused time');check(Number.isFinite(state().view.camera.x)&&state().view.camera.zoom>=1&&state().view.camera.zoom<=3.5,'Resized view remains finite and bounded');}
  check(!state().view.labels.some(l=>state().view.microbeSites.some(s=>s.kind===l.kind)),'Bacterial names stay hidden before any microorganism is clicked');
  await event('view-bacteria');check(elements.get('microbe-dialog').open&&elements.get('microbe-name').textContent==='Rhizobium etli','Bacteria button opens a named picture card');
  const picturePositions=new Set(),microbeState=JSON.stringify(state().reservoirs);
  for(const[id,name]of[['rhizobium','Rhizobium etli'],['soilFixers','Azotobacter chroococcum'],['nostoc','Nostoc commune'],['nitrosomonas','Nitrosomonas europaea'],['nitrobacter','Nitrobacter winogradskyi'],['denitrifiers','Stutzerimonas stutzeri'],['decomposers','Bacillus subtilis']]){await event('microbe-select','change',id);check(elements.get('microbe-name').textContent===name,'Each microorganism has its own correct scientific name');check(elements.get('microbe-picture').attrs['aria-label'].includes(name),'Every microbe picture has a matching accessible description');picturePositions.add(elements.get('microbe-picture').dataset.image+elements.get('microbe-picture').style.backgroundPosition);check(/^https:\/\//.test(elements.get('microbe-reference').attrs.href),'Each named species has a scientific reference');check(elements.get('info-name').textContent===name,'Scene inspector uses the same specific name');check(state().time===savedTime&&JSON.stringify(state().reservoirs)===microbeState,'Opening picture cards preserves scientific quantities and paused time');}
  check(picturePositions.size===7,'Each named microorganism displays a distinct illustration');await event('close-microbe');check(!elements.get('microbe-dialog').open,'Picture card closes');
  const scientificNames={rhizobium:'Rhizobium etli',soilFixers:'Azotobacter chroococcum',nostoc:'Nostoc commune',nitrosomonas:'Nitrosomonas europaea',nitrobacter:'Nitrobacter winogradskyi',denitrifiers:'Stutzerimonas stutzeri',decomposers:'Bacillus subtilis'};
  check(state().view.microbeSites.length===7&&new Set(state().view.microbeSites.map(s=>s.point.join(','))).size===7,'All seven listed microorganisms have distinct scene locations');
  for(const[id,name]of Object.entries(scientificNames)){
    await event('view-bacteria');await event('microbe-select','change',id);await event('locate-microbe');advance(2);
    const view=state().view,site=view.microbeSites.find(s=>s.id===id),[wx,wy]=site.point,x=(.5+(wx-view.camera.x)*view.camera.zoom/view.worldWidth)*view.width,y=(.5+(wy-view.camera.y)*view.camera.zoom/800)*view.height;
    check(!elements.get('microbe-dialog').open&&view.microbe===id,'Show in ecosystem closes the card and selects its exact organism');
    check(x>0&&x<view.width&&y>0&&y<view.height,'Every located organism is inside the visible scene');
    check(view.labels.some(l=>l.kind===site.kind)&&view.labels.filter(l=>view.microbeSites.some(s=>s.kind===l.kind)).length===1,'Only the clicked '+id+' shows its name');
    fire('pointerdown',{pointerId:25,clientX:x,clientY:y,button:0});fire('pointerup',{pointerId:25,clientX:x,clientY:y});fire('click',{clientX:x,clientY:y});
    check(elements.get('microbe-dialog').open&&elements.get('microbe-name').textContent===name,'Every located organism can be clicked to reopen its own name and picture');
    check(state().time===savedTime&&JSON.stringify(state().reservoirs)===microbeState,'Locating and clicking microorganisms preserves scientific state');
    await event('close-microbe');
  }
  await event('whole-mode');advance(2);
  const v=state().view,toScreen=(x,y)=>[(.5+(x-v.camera.x)*v.camera.zoom/v.worldWidth)*v.width,(.5+(y-v.camera.y)*v.camera.zoom/800)*v.height];
  for(const[fx,y,name]of[[.48,640,'Nitrosomonas europaea'],[.62,687,'Nitrobacter winogradskyi'],[.72,488,'Bacillus subtilis'],[.86,587,'Stutzerimonas stutzeri'],[.155,610,'Azotobacter chroococcum']]){const[x,sy]=toScreen(v.worldWidth*fx,y);fire('pointerdown',{pointerId:10,clientX:x,clientY:sy,button:0});fire('pointerup',{pointerId:10,clientX:x,clientY:sy});fire('click',{clientX:x,clientY:sy});check(elements.get('microbe-dialog').open&&elements.get('microbe-name').textContent===name,'Clicking each actual microbe cluster opens its matching picture');await event('close-microbe');await event('whole-mode');}
  console.log(`PASS: ${assertions} ${offline?'standalone':'website'} 2.5D application event assertions. Modes, environmental controls, sound pipeline, presets, restart and scientific correspondence. Network disabled.`);
})().catch(e=>{console.error(e);process.exitCode=1});

