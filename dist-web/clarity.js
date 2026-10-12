/* Extends the recovered original landscape; original scene.js remains unmodified.
   The view transform never changes nitrogen reservoirs, transfer rates or time. */
(() => {
  'use strict';
  const P=EcosystemScene.prototype, TAU=Math.PI*2;
  const palette={'N₂':'#e6b9f5','NH₄⁺':'#ffdb83','NO₂⁻':'#ffaaa3','NO₃⁻':'#91f0ef','Organic N':'#edbe88'};
  const paths={fixation:[['air','ammonium','fixation'],['ammonium','nitrite','nitri1'],['nitrite','nitrate','nitri2']],nitrification:[['ammonium','nitrite','nitri1'],['nitrite','nitrate','nitri2']],nitri1:[['ammonium','nitrite','nitri1']],nitri2:[['nitrite','nitrate','nitri2']],uptake:[['nitrate','plant','uptake']],feeding:[['plant','animal','feeding']],litter:[['plant','plant-detritus','litter'],['animal','animal-detritus','litter']],decomposition:[['plant-detritus','ammonium','decomposition'],['animal-detritus','ammonium','decomposition']],denitrification:[['nitrate','air','denitrification']],leaching:[['nitrate','leached','leaching']],lightning:[['air','nitrate','lightning']],fertilizer:[['external','ammonium','fertilizer'],['external','nitrate','fertilizer']],leaves:[['external','plant-detritus','leaves']]};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function stemPoint(stem,q){const u=1-q,x=3*u*u*q*14-3*u*q*q*10+q*q*q*6,y=u*u*u*4-3*u*u*q*60-3*u*q*q*140-q*q*q*247;return[stem.x+(x*Math.cos(stem.wind)-y*Math.sin(stem.wind))*stem.g,stem.y+(x*Math.sin(stem.wind)+y*Math.cos(stem.wind))*stem.g];}
  P.plantStem=function(){return{x:this.W*.365,y:this.surface(this.W*.365),g:this.objectScale*Math.min(1.35,.66+this.model.n.plant/75),wind:this.reduced?0:Math.sin(this.elapsed*1.2)*.017+Math.sin(this.elapsed*.73)*.009};};
  function pointAt(route,t){
    t=clamp(t,0,1);let q=route.slice(0,3);
    if(route.stem){if(t>=.76)return stemPoint(route.stem,(t-.76)/.24*.74);if(t>.64){q=[route[2],route[3],stemPoint(route.stem,0)];t=(t-.64)/.12;}else t/=.64;}
    else if(route.length===5){if(t>.64){q=route.slice(2);t=(t-.64)/.36;}else t/=.64;}
    const[a,b,c]=q;return[(1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]];
  }
  function circle(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  P.particleSprite=function(compound,matched,color=palette[compound]||palette['Organic N']){
    this.particleSprites??=new Map();const key=compound+matched+color;if(this.particleSprites.has(key))return this.particleSprites.get(key);
    const image=document.createElement('canvas');image.width=80;image.height=80;const ctx=image.getContext('2d'),r=matched?3.9:3.2;ctx.scale(2,2);
    ctx.shadowColor=color;ctx.shadowBlur=matched?9:4;circle(ctx,18,20,r+1.3,'#21342edf');circle(ctx,18,20,r,color);
    if(compound==='N₂'){circle(ctx,23,20,2.6,'#21342edf');circle(ctx,23,20,1.6,color);}
    ctx.shadowBlur=0;circle(ctx,17.3,19.1,.9,'#fffbed');this.particleSprites.set(key,image);return image;
  };
  P.processMatch=function(id){return this.selected===id||(this.selected==='nitrification'&&['nitri1','nitri2'].includes(id))||(this.selected==='fixation'&&['nitri1','nitri2'].includes(id));};
  const originalPoint=P.point,originalRoute=P.route;
  P.point=function(key){
    const stem=this.W*.365,base=this.surface(stem),g=this.objectScale*Math.min(1.35,.72+this.model.n.plant/75);
    if(key==='nodule')return[stem-25*g,base+85*g];
    if(key==='air')return[this.W*.735,150];
    if(key==='plant')return stemPoint(this.plantStem(),.74);
    if(key==='animal')return[this.W*.735-119*this.objectScale*.88,this.surface(this.W*.735)-52*this.objectScale*.88];
    if(key==='plant-detritus')return[this.W*.235,this.surface(this.W*.235)+65];
    if(key==='animal-detritus')return[this.W*.72,488];
    return originalPoint.call(this,key);
  };
  P.route=function(f){
    const W=this.W,stem=W*.365,base=this.surface(stem),g=this.objectScale*Math.min(1.35,.72+this.model.n.plant/75);
    if(f.process==='uptake'){const route=[this.point(f.from),[stem+95*g,base+215*g],[stem,base+100*g],[stem,base+35*g],this.point('plant')];route.stem=this.plantStem();return route;}
    if(f.process==='fixation')return[this.point('air'),[W*.55,240],this.point('nodule'),[W*.39,565],this.point('ammonium')];
    if(f.process==='denitrification')return[this.point('nitrate'),[W*.94,400],this.point('air')];
    if(f.process==='feeding')return[[stem+75*g,base-125*g],[W*.53,base-155*g],this.point('animal')];
    if(f.process==='litter'&&f.from==='plant')return[[stem-65*g,base-100*g],[W*.21,base-75*g],this.point('plant-detritus')];
    if(f.process==='litter'&&f.from==='animal')return[[W*.735,this.surface(W*.735)-10],[W*.75,445],this.point('animal-detritus')];
    if(f.process==='leaves')return[[W*.245,base-100],[W*.205,base+15],this.point('plant-detritus')];
    if(f.process==='decomposition')return[this.point(f.from),f.from==='plant-detritus'?[W*.255,585]:[W*.64,550],this.point('ammonium')];
    if(f.process==='lightning')return[[W*.17,95],[W*.14,285],[W*.19,this.surface(W*.19)],[W*.46,545],this.point('nitrate')];
    return originalRoute.call(this,f);
  };
  // Two visual soil sites share the original single organic reservoir. Partition
  // its real transfers; do not duplicate nitrogen or introduce new model rates.
  const originalIngest=P.ingest,originalReset=P.reset;
  P.ingest=function(flows){
    if(!this.detritusSites){const before=this.model.n.organic-flows.reduce((v,f)=>v+(f.to==='organic'?f.amount:0)-(f.from==='organic'?f.amount:0),0);this.detritusSites={plant:before*.5,animal:before*.5};}
    const visual=[];
    for(const f of flows){
      if(f.from==='organic'&&f.process==='decomposition'){
        const total=this.detritusSites.plant+this.detritusSites.animal,part=total>0?this.detritusSites.plant/total:.5;
        for(const[site,amount]of[['plant',f.amount*part],['animal',f.amount*(1-part)]]){this.detritusSites[site]=Math.max(0,this.detritusSites[site]-amount);if(amount>0)visual.push({...f,from:site+'-detritus',amount});}
      }else{if(f.to==='organic')this.detritusSites[f.from==='animal'?'animal':'plant']+=f.amount;visual.push(f);}
    }
    originalIngest.call(this,visual);
  };
  P.reset=function(){originalReset.call(this);this.detritusSites={plant:this.model.n.organic*.5,animal:this.model.n.organic*.5};};
  const originalLeaves=P.leaves;
  P.leaves=function(){const prior=new Set(this.fallingLeaves);originalLeaves.call(this);for(const leaf of this.fallingLeaves){if(!prior.has(leaf)){leaf.x=this.W*(.20+(leaf.x/this.W-.61)*.35);if(this.reduced)leaf.y=this.surface(leaf.x);}}};
  P.focusRoutes=function(){return(paths[this.selected]||[]).map(([from,to,process])=>({from,to,process,route:this.route({from,to,process})}));};
  P.drawParticle=function(ctx,p){
    if(p.process==='uptake')p.route=this.route({from:'nitrate',to:'plant',process:'uptake'});
    const t=clamp(p.progress,0,1),pos=pointAt(p.route,t),matched=this.processMatch(p.process);
    const reactants={fixation:'N₂',lightning:'N₂',nitri1:'NH₄⁺',nitri2:'NO₂⁻',decomposition:'Organic N',denitrification:'NO₃⁻'};
    const threshold=['fixation','lightning'].includes(p.process)?.64:.53;
    const compound=p.process==='uptake'?(t<.9?'NO₃⁻':'Organic N'):t<threshold?(reactants[p.process]||p.compound):p.compound,color=p.process==='feeding'?'#c5e99c':palette[compound]||palette['Organic N'];
    const zoom=this.camera?.zoom||1,scale=clamp(1/Math.sqrt(zoom),.55,1),radius=(matched?3.9:3.2)*scale;
    ctx.save();ctx.globalAlpha=p.process==='fertilizer'?1:this.selected?(matched?1:.12):.97;
    ctx.lineCap='round';ctx.lineWidth=(matched?2:1.5)*scale;ctx.strokeStyle=color;
    ctx.beginPath();for(let i=0;i<5;i++){const q=pointAt(p.route,Math.max(0,t-.047+i*.047/4));i?ctx.lineTo(...q):ctx.moveTo(...q);}ctx.stroke();
    ctx.drawImage(this.particleSprite(compound,matched,color),pos[0]-18*scale,pos[1]-20*scale,40*scale,40*scale);ctx.restore();
  };
  P.pathHighlight=function(ctx){
    this.drawInputPulse(ctx);
    if(this.inspectedMicrobe){const[x,y]=this.microbeLocation(this.inspectedMicrobe),r=this.inspectedMicrobe==='nostoc'?43:35;ctx.save();ctx.strokeStyle='#fff0bd';ctx.lineWidth=1.5/Math.sqrt(this.camera.zoom);ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(x,y,r+(this.reduced?0:Math.sin(this.elapsed*2)*2),0,TAU);ctx.stroke();ctx.restore();}
    for(const f of this.focusRoutes()){
      const species={fixation:'N₂',nitri1:'NH₄⁺',nitri2:'NO₂⁻',uptake:'NO₃⁻',leaching:'NO₃⁻',lightning:'N₂',denitrification:'N₂',decomposition:'NH₄⁺',fertilizer:'NH₄⁺'};
      const route=f.route,color=f.process==='feeding'?'#c5e99c':palette[f.process==='fertilizer'?(f.to==='nitrate'?'NO₃⁻':'NH₄⁺'):species[f.process]||'Organic N'];
      ctx.save();ctx.strokeStyle='#172e285c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(...pointAt(route,0));for(let i=1;i<=80;i++)ctx.lineTo(...pointAt(route,i/80));ctx.stroke();
      ctx.strokeStyle=color+'bb';ctx.lineWidth=1.4;ctx.stroke();
      for(const t of [.32,.79]){const a=pointAt(route,t-.012),b=pointAt(route,t);ctx.save();ctx.translate(...b);ctx.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-3);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();
    }
  };
  // Enhance the existing root strokes and microbial capsules, retaining their shapes.
  const originalRoots=P.roots,originalGround=P.groundDetails;
  function detailContext(ctx){return new Proxy(ctx,{get:(c,k)=>typeof c[k]==='function'?c[k].bind(c):c[k],set:(c,k,v)=>{if(k==='strokeStyle'&&typeof v==='string'){const map={'#d5c7a6':'#f1ddb8','#bcb898bd':'#e3d2b2ed','#b4b99768':'#d2c49fb0','#b38d7980':'#d2a48abc'};v=map[v]||(/^#[0-9a-f]{6}77$/i.test(v)?v.slice(0,7)+'db':v);}c[k]=v;return true;}});}
  P.roots=function(ctx,t){if(!this.detailCtx||this.detailTarget!==ctx){this.detailCtx=detailContext(ctx);this.detailTarget=ctx;}originalRoots.call(this,this.detailCtx,t);};
  P.groundDetails=function(ctx,t){
    // Reposition the original free-living fixer cells away from root nodules;
    // retain the recovered cell drawing and all other original ground details.
    if(!this.soilMicrobeCtx){const target=this.detailCtx||ctx,scene=this;this.soilMicrobeCtx=new Proxy(target,{get:(c,k)=>k==='translate'?(x,y)=>{const moved=Array.from({length:7},(_,i)=>Math.abs(x-(scene.W*.39+Math.sin(i*7)*19))<.01&&Math.abs(y-(590+Math.cos(i*3)*13))<.01).some(Boolean);c.translate(x+(moved?scene.W*(.155-.39):0),y+(moved?20:0));}:typeof c[k]==='function'?c[k].bind(c):c[k],set:(c,k,v)=>(c[k]=v,true)});}
    originalGround.call(this,this.soilMicrobeCtx,t);
    // Magnified Nostoc colony at the illuminated soil surface, distinct from
    // underground Azotobacter and from Rhizobium inside root nodules.
    const[nx,ny]=this.microbeLocation('nostoc');
    ctx.save();ctx.fillStyle='#345f3966';ctx.beginPath();ctx.ellipse(nx,ny,39,21,0,0,TAU);ctx.fill();
    for(let row=0;row<2;row++)for(let i=0;i<12;i++){const dx=(i-5.5)*5.2,dy=(row-.5)*14+Math.sin(i*.65+row)*5,heterocyst=i===5+row*2;circle(ctx,nx+dx,ny+dy,heterocyst?4.6:3.2,'#24392e');circle(ctx,nx+dx,ny+dy,heterocyst?3.6:2.5,heterocyst?'#f2dda3':'#a6cf76');circle(ctx,nx+dx-.6,ny+dy-.7,.6,'#e1eab8');}
    ctx.restore();
    const[x,y]=this.point('plant-detritus');
    for(let i=0;i<5;i++)this.leaf(ctx,x+Math.sin(i*7)*25,this.surface(x)-2,11+i%3*3,i*1.8,['#a97c45','#ba914e','#87613a'][i%3]);
    for(let i=0;i<7;i++){ctx.save();ctx.translate(x+Math.sin(i*7)*19,y+Math.cos(i*3)*13);ctx.rotate(i+(this.reduced?0:Math.sin(t*this.model.activity+i)*.3));ctx.strokeStyle='#e3d2b2db';ctx.lineWidth=2.7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-2.5,0);ctx.lineTo(2.5,0);ctx.stroke();ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(3,0);ctx.bezierCurveTo(7,4,8,-3,11,1);ctx.stroke();ctx.restore();}
  };
  const originalResize=P.resize;
  P.resize=function(){
    const prior=this.W;originalResize.call(this);if(!this.W)return;
    // Keep the original artwork but leave room for labels on portrait screens.
    this.objectScale=Math.min(this.objectScale,Math.max(.44,this.W/950));
    if(!this.camera){this.camera={zoom:1,x:this.W/2,y:400};this.viewTarget={...this.camera};}
    else if(prior&&prior!==this.W){this.camera.x*=this.W/prior;this.viewTarget.x*=this.W/prior;for(const p of this.particles)for(const q of p.route)q[0]*=this.W/prior;for(const leaf of this.fallingLeaves)leaf.x*=this.W/prior;}
    this.clampCamera(this.camera);this.clampCamera(this.viewTarget);this.labelMetrics=null;
  };
  P.clampCamera=function(c){c.zoom=clamp(c.zoom,1,3.5);c.x=clamp(c.x,this.W/(2*c.zoom),this.W-this.W/(2*c.zoom));c.y=clamp(c.y,400/c.zoom,800-400/c.zoom);return c;};
  P.worldToScreen=function(x,y){const c=this.camera;return[(.5+(x-c.x)*c.zoom/this.W)*this.width,(.5+(y-c.y)*c.zoom/800)*this.height];};
  P.screenToWorld=function(x,y,c=this.camera){return[c.x+(x/this.width-.5)*this.W/c.zoom,c.y+(y/this.height-.5)*800/c.zoom];};
  P.zoomAt=function(next,x=this.width/2,y=this.height/2){const world=this.screenToWorld(x,y,this.viewTarget),z=clamp(next,1,3.5);this.viewTarget={zoom:z,x:world[0]-(x/this.width-.5)*this.W/z,y:world[1]-(y/this.height-.5)*800/z};this.clampCamera(this.viewTarget);};
  P.resetView=function(){this.viewTarget={zoom:1,x:this.W/2,y:400};};
  P.fitView=function(points,maxZoom=2.8){
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);let l=Math.min(...xs),r=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    const padX=Math.max(50,(r-l)*.17),padY=45,header=this.width<700?105:75,footer=this.width<700?52:33;
    const availableHeight=800*Math.max(.4,(this.height-header-footer)/this.height);
    const z=clamp(Math.min(this.W/(r-l+padX*2),availableHeight/(bottom-top+padY*2)),1,maxZoom);
    this.viewTarget=this.clampCamera({zoom:z,x:(l+r)/2,y:(top+bottom)/2-(header-footer)*400/(this.height*z)});
  };
  P.focusProcess=function(){const points=[];for(const f of this.focusRoutes())for(let i=0;i<=30;i++)points.push(pointAt(f.route,i/30));if(['uptake','feeding','litter'].includes(this.selected)){const s=this.plantStem();points.push([s.x-115*s.g,s.y-295*s.g],[s.x+115*s.g,s.y]);}if(['feeding','litter'].includes(this.selected)){const x=this.W*.735,y=this.surface(x),g=this.objectScale*.88;points.push([x-145*g,y-140*g],[x+108*g,y+8*g]);}if(points.length)this.fitView(points);};
  P.fertilizerPulse=function(amount){this.inputPulse={amount,remaining:4};this.fitView([this.point('external'),this.point('ammonium'),this.point('nitrate')],1.8);};
  P.drawInputPulse=function(ctx){if(!this.inputPulse||this.inputPulse.remaining<=0)return;const fade=Math.min(1,this.inputPulse.remaining),phase=4-this.inputPulse.remaining;
    for(const[key,color]of[['ammonium',palette['NH₄⁺']],['nitrate',palette['NO₃⁻']]]){const[x,y]=this.point(key),r=48+Math.sin(phase*3)*8;ctx.save();ctx.globalAlpha=fade;const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,color+'80');glow.addColorStop(.45,color+'35');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.strokeStyle=color+'bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,14+(phase%1.2)*25,0,TAU);ctx.stroke();ctx.restore();}
  };
  P.inspect=function(id){
    const W=this.W,g=this.objectScale*Math.min(1.35,.72+this.model.n.plant/75),x=W*.365,b=this.surface(x);
    if(id==='roots')this.fitView([[x-110*g,b-15],[x+110*g,b+270*g]],2.6);
    if(id==='compounds')this.fitView([[W*.38,565],[W*.73,740]],2.7);
    if(id==='water')this.fitView([[W*.83,685],[W*.98,790]],3.2);
  };
  const things={
    atmosphere:{name:'Nitrogen gas · N₂',description:'Nitrogen gas is in the air. Plants cannot absorb it directly. Nitrogen-fixing bacteria first convert it into ammonia/ammonium.'},
    'plant-tag':{name:'Bean plant',description:'Roots take nitrate ions from soil. The plant uses their nitrogen to make amino acids and proteins. The uptake pathway travels through the roots and inside the stem.'},
    'cow-tag':{name:'Cow',description:'The cow receives organic nitrogen by eating plant material. Nitrogen in animal waste later returns to decomposing organic matter.'},
    'organic-tag':{name:'Decomposers · bacteria & fungi',description:'Pale rods represent decomposing microorganisms; mushrooms represent fungi. They break down dead leaves and waste, returning organic nitrogen to the soil as ammonium.'},
    'leaf-decomposer':{name:'Decomposers · bacteria & fungi',description:'These pale microbes break down plant litter on the left side of the soil. They return its organic nitrogen as ammonium (NH₄⁺).'},
    'leaf-organic-tag':{name:'Dead leaves · plant organic nitrogen',description:'Amber particles on the left come from shed plant material. These enter the soil beneath the plant and are converted by decomposers into ammonium (NH₄⁺). They do not pass through the cow.'},
    'waste-organic-tag':{name:'Animal waste · organic nitrogen',description:'The cow returns organic nitrogen to the soil through waste. This short downward amber path is separate from green feeding particles entering the cow. Decomposers return waste nitrogen as ammonium (NH₄⁺).'},
    'nodule-tag':{name:'Root nodules · nitrogen-fixing bacteria',description:'The pink swellings attached to the roots are nodules. Rhizobium bacteria live inside them and convert atmospheric N₂ into ammonia/ammonium. Nitrification can subsequently form nitrate.'},
    'fixer-microbe':{name:'Nitrogen-fixing microbes',description:'Pink rods represent nitrogen-fixing microbes in the root zone. The pink swellings on the roots are nodules that house Rhizobium. Fixation supplies ammonium; nitrification can later form nitrate.'},
    'ammonium-tag':{name:'Ammonium ions · NH₄⁺',description:'Gold glowing dots represent ammonium nitrogen, not bacteria. Ammonia-oxidizing microorganisms convert ammonium into nitrite in oxygenated soil.'},
    'nitrite-tag':{name:'Nitrite ions · NO₂⁻',description:'Pink glowing dots represent nitrite ions, the intermediate between ammonium and nitrate. Nitrite-oxidizing microorganisms convert them into nitrate.'},
    'nitrate-tag':{name:'Nitrate ions · NO₃⁻',description:'Cyan glowing dots represent nitrate ions dissolved in soil water. Roots absorb this nitrate; rainfall can also carry it into groundwater. Cyan rod-shaped microbes are bacteria, not nitrate ions.'},
    'nitri1-microbe':{name:'Nitrifying microorganisms · stage 1',description:'Gold rods represent ammonia-oxidizing microorganisms. They convert ammonium (NH₄⁺) into nitrite (NO₂⁻). These are microbes; the moving glowing dots represent the nitrogen they transform.'},
    'nitri2-microbe':{name:'Nitrifying microorganisms · stage 2',description:'Cyan rods represent nitrite-oxidizing microorganisms. They convert nitrite (NO₂⁻) into nitrate (NO₃⁻). Both nitrification stages need oxygen.'},
    'denit-tag':{name:'Denitrifying bacteria',description:'The purple rod-shaped microbes convert soil nitrate (NO₃⁻) into nitrogen gas (N₂), especially in wet, oxygen-poor soil. The gas returns to the atmosphere; this removes nitrate from soil.'},
    'leach-tag':{name:'Groundwater · dissolved nitrate',description:'The blue-green area is groundwater and drainage water. Cyan dots entering it are dissolved nitrate ions carried below the root zone by water. This process is nitrate leaching.'}
  };
  P.describeThing=function(kind){return things[kind]||null;};
  const microbeProfiles={
    rhizobium:{name:'Rhizobium etli',group:'Symbiotic nitrogen fixer · root nodules',picture:0,process:'fixation',kind:'nodule-tag',input:'N₂',output:'NH₄⁺',description:'Rhizobium etli forms nitrogen-fixing nodules on common bean roots. Inside nodules, it converts atmospheric nitrogen into ammonia/ammonium that supports plant growth. Subsequent nitrification can form nitrate.',habitat:'Inside common bean root nodules',note:'Representative species for this role; the illustration is not a microscope photograph or species identification.',source:'https://pubmed.ncbi.nlm.nih.gov/15184121/'},
    soilFixers:{name:'Azotobacter chroococcum',group:'Free-living nitrogen-fixing bacterium',picture:1,process:'fixation',kind:'fixer-microbe',input:'N₂',output:'NH₄⁺',description:'Azotobacter chroococcum fixes atmospheric nitrogen while living freely in soil. It does not need a root nodule. Fixation produces ammonia/ammonium; nitrifying microbes can later convert this nitrogen into nitrate.',habitat:'Aerated soil around roots',note:'Representative free-living fixer. The simulator combines biological fixation in one shared transfer, rather than tracking individual species.',source:'https://pubmed.ncbi.nlm.nih.gov/15966103/'},
    nostoc:{name:'Nostoc commune',group:'Nitrogen-fixing cyanobacterium',picture:6,process:'fixation',kind:'nostoc-microbe',input:'N₂',output:'NH₄⁺',description:'Nostoc commune grows as bead-like chains of photosynthetic bacterial cells. Specialized cells called heterocysts fix atmospheric nitrogen into ammonia. It is a cyanobacterium, not a root-nodule bacterium.',habitat:'Moist, illuminated soil surfaces and gelatinous mats',note:'Find the green cell chains at the left soil surface; larger pale cells are heterocysts. All microorganisms are magnified teaching examples. The model tracks shared process rates rather than individual species populations.',source:'https://pubmed.ncbi.nlm.nih.gov/35384797/'},
    nitrosomonas:{name:'Nitrosomonas europaea',group:'Ammonia-oxidizing bacterium · nitrification 1',picture:2,process:'nitri1',kind:'nitri1-microbe',input:'NH₄⁺',output:'NO₂⁻',description:'Nitrosomonas europaea oxidizes ammonia, in equilibrium with ammonium in soil water, into nitrite. This is the first nitrification stage. The process needs oxygen and slows in waterlogged soil.',habitat:'Moist, oxygenated soil and water',note:'Representative species for ammonia oxidation. Other bacteria and archaea also perform this role.',source:'https://pubmed.ncbi.nlm.nih.gov/29577088/'},
    nitrobacter:{name:'Nitrobacter winogradskyi',group:'Nitrite-oxidizing bacterium · nitrification 2',picture:3,process:'nitri2',kind:'nitri2-microbe',input:'NO₂⁻',output:'NO₃⁻',description:'Nitrobacter winogradskyi oxidizes nitrite into nitrate in the second nitrification stage. This needs oxygen and increases the soil nitrate available for root absorption.',habitat:'Moist, oxygenated soil and water',note:'Representative species for nitrite oxidation; this role is also performed by other microorganisms.',source:'https://pubmed.ncbi.nlm.nih.gov/29577088/'},
    denitrifiers:{name:'Stutzerimonas stutzeri',group:'Denitrifying bacterium · nitrate removal',picture:4,process:'denitrification',kind:'denit-tag',input:'NO₃⁻',output:'N₂',description:'Formerly named Pseudomonas stutzeri, this bacterium can use nitrate when oxygen is scarce. Denitrification proceeds through intermediates to nitrogen gas, returning nitrogen to the atmosphere and removing soil nitrate.',habitat:'Soil and sediments, including oxygen-poor wet microsites',note:'Common textbook name: Pseudomonas stutzeri. Current name: Stutzerimonas stutzeri. The model shows the overall nitrate-to-N₂ transfer; behavior depends on strain and conditions.',source:'https://pubmed.ncbi.nlm.nih.gov/16760312/'},
    decomposers:{name:'Bacillus subtilis',group:'Decomposing bacterium · organic nitrogen recycling',picture:5,process:'decomposition',kind:'organic-tag',input:'Organic N',output:'NH₄⁺',description:'Bacillus subtilis is a soil bacterium that helps break down organic material. Decomposer communities recycle nitrogen in dead leaves and waste; ammonification returns organic nitrogen as ammonium.',habitat:'Soil, plant litter and decaying organic material',note:'The pale rods illustrate Bacillus; branching threads illustrate fungal partners, which are not bacteria. This species is one example of the broader decomposer community represented by the model.',source:'https://doi.org/10.1016/j.envint.2020.105989'}
  };
  const microbeKinds={'nodule-tag':'rhizobium','fixer-microbe':'soilFixers','nostoc-microbe':'nostoc','nitri1-microbe':'nitrosomonas','nitri2-microbe':'nitrobacter','denit-tag':'denitrifiers','organic-tag':'decomposers','leaf-decomposer':'decomposers'};
  for(const[kind,id]of Object.entries(microbeKinds)){const p=microbeProfiles[id];things[kind]={...things[kind],name:p.name,description:p.description};}
  P.describeMicrobe=function(kind){const key=microbeKinds[kind];return key?{id:key,...microbeProfiles[key]}:null;};
  P.microbeProfile=function(id){return microbeProfiles[id]?{id,...microbeProfiles[id]}:null;};
  P.microbeLocation=function(id){const W=this.W;return{rhizobium:this.point('nodule'),soilFixers:[W*.155,610],nostoc:[W*.125,this.surface(W*.125)+16],nitrosomonas:[W*.48,640],nitrobacter:[W*.62,687],denitrifiers:[W*.86,587],decomposers:[W*.72,488]}[id];};
  P.focusMicrobe=function(id){const p=microbeProfiles[id],pos=this.microbeLocation(id);if(!p||!pos)return;this.inspectedMicrobe=id;const[x,y]=pos,offset=id==='rhizobium'?-65:0;this.fitView([[x-95+offset,y-68],[x+95+offset,y+82]],3.3);};
  P.hitThing=function(x,y){
    const W=this.W,spots=Object.entries(microbeProfiles).map(([id,p])=>[p.kind,p.process,this.microbeLocation(id)]);spots.push(['leaf-decomposer','decomposition',this.point('plant-detritus')]);
    const g=this.objectScale*Math.min(1.35,.72+this.model.n.plant/75),stem=W*.365,base=this.surface(stem);
    for(const[dx,dy]of[[-25,71],[-31,90],[18,101],[33,119],[-53,112],[0,64],[39,83]])spots.push(['nodule-tag','fixation',[stem+dx*g,base+dy*g]]);
    const radius=Math.max(32,22*this.W/(this.width*this.camera.zoom));
    const hit=spots.map(s=>({s,d:Math.hypot(x-s[2][0],y-s[2][1])})).filter(h=>h.d<radius).sort((a,b)=>a.d-b.d)[0]?.s;return hit?{kind:hit[0],process:hit[1],...things[hit[0]]}:null;
  };
  P.initViewControls=function(){
    this.viewDisposers=[];this.labelElements=[...document.querySelectorAll('[data-info]')].filter(el=>(el.className||el.getAttribute('class')||'').split(' ').includes('tag'));this.contacts=new Map();
    for(const el of this.labelElements)el.dataset.thing=(el.className||el.getAttribute('class')||'').split(' ').find(kind=>things[kind]);
    const on=(el,type,fn,options)=>{if(!el)return;el.addEventListener(type,fn,options);this.viewDisposers.push(()=>el.removeEventListener(type,fn,options));};
    const el=id=>document.getElementById(id),local=e=>{const r=this.canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];};
    on(el('reset-view'),'click',()=>this.resetView());for(const[id,view]of[['view-roots','roots'],['view-compounds','compounds'],['view-water','water']])on(el(id),'click',()=>this.inspect(view));
    on(el('zoom-in'),'click',()=>this.zoomAt(this.viewTarget.zoom*1.25));on(el('zoom-out'),'click',()=>this.zoomAt(this.viewTarget.zoom/1.25));
    on(this.canvas,'wheel',e=>{e.preventDefault();const[x,y]=local(e);this.zoomAt(this.viewTarget.zoom*Math.exp(-clamp(e.deltaY,-180,180)*.0018),x,y);},{passive:false});
    on(this.canvas,'pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;this.contacts.set(e.pointerId,local(e));this.gestureOrigin=local(e);this.gestureMoved=this.contacts.size>1;this.canvas.setPointerCapture?.(e.pointerId);this.canvas.classList.add('dragging');});
    on(this.canvas,'pointermove',e=>{
      const pos=local(e),prev=this.contacts.get(e.pointerId);if(!prev)return;
      if(this.contacts.size>1||Math.hypot(pos[0]-this.gestureOrigin[0],pos[1]-this.gestureOrigin[1])>5)this.gestureMoved=true;
      const old=[...this.contacts.values()];this.contacts.set(e.pointerId,pos);const now=[...this.contacts.values()];
      if(now.length===2){
        const a=old[0],b=old[1],n=now[0],m=now[1],oldMid=[(a[0]+b[0])/2,(a[1]+b[1])/2],mid=[(n[0]+m[0])/2,(n[1]+m[1])/2];
        const anchor=this.screenToWorld(...oldMid,this.viewTarget),ratio=Math.hypot(n[0]-m[0],n[1]-m[1])/Math.max(5,Math.hypot(a[0]-b[0],a[1]-b[1]));
        const z=clamp(this.viewTarget.zoom*ratio,1,3.5);this.viewTarget=this.clampCamera({zoom:z,x:anchor[0]-(mid[0]/this.width-.5)*this.W/z,y:anchor[1]-(mid[1]/this.height-.5)*800/z});
      }else if(now.length===1){const c=this.viewTarget;c.x-=(pos[0]-prev[0])*this.W/(this.width*c.zoom);c.y-=(pos[1]-prev[1])*800/(this.height*c.zoom);this.clampCamera(c);}
    });
    const end=e=>{this.contacts.delete(e.pointerId);if(!this.contacts.size)this.canvas.classList.remove('dragging');};
    on(this.canvas,'pointerup',end);on(this.canvas,'pointercancel',end);on(this.canvas,'lostpointercapture',end);
    on(this.canvas,'click',e=>{if(this.gestureMoved)return;const hit=this.hitThing(...this.screenToWorld(...local(e)));if(hit&&this.onInspect)this.onInspect(hit.process,hit.kind);});
    // Correct hit testing in zoomed coordinates; hover does not move the view.
    this.canvas.removeEventListener('pointermove',this.handlePointer);
    this.handlePointer=e=>{if(this.contacts.size)return;const hit=this.hitThing(...this.screenToWorld(...local(e)));this.canvas.title=hit?'Click to see this microorganism’s name and picture.':'Glowing dots are nitrogen; rod shapes are microbes. Scroll or pinch to zoom. Drag to pan.';this.canvas.style.cursor=hit?'pointer':'grab';};
    on(this.canvas,'pointermove',this.handlePointer);
    this.viewElements={zoom:el('zoom-value'),plus:el('zoom-in'),minus:el('zoom-out')};
  };
  const intersects=(a,b)=>a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+5&&a.y+a.h+5>b.y;
  P.layoutLabels=function(){
    const W=this.W,base=this.surface(W*.365),g=this.objectScale*Math.min(1.35,.72+this.model.n.plant/75),cow=this.objectScale*.88;
    const worldBoxes=[[W*.365-120*g,base-295*g,240*g,295*g],[W*.735-145*cow,this.surface(W*.735)-133*cow,248*cow,140*cow],[W*.365-115*g,base,230*g,275*g]];
    for(const[x,y]of[this.point('plant-detritus'),...['soilFixers','nitrosomonas','nitrobacter','decomposers','denitrifiers'].map(id=>this.microbeLocation(id))])worldBoxes.push([x-25,y-20,50,40]);
    const[nx,ny]=this.microbeLocation('nostoc');worldBoxes.push([nx-39,ny-21,78,42]);
    this.protectedBoxes=worldBoxes.map(([x,y,w,h])=>{const a=this.worldToScreen(x,y),b=this.worldToScreen(x+w,y+h);return{x:a[0],y:a[1],w:b[0]-a[0],h:b[1]-a[1]};});
    const anchor={atmosphere:this.point('air'),'plant-tag':[W*.365+95*g,base-145*g],'cow-tag':this.point('animal'),'leaf-organic-tag':this.point('plant-detritus'),'waste-organic-tag':[W*.745,440],'organic-tag':[W*.72,488],'nodule-tag':this.point('nodule'),'ammonium-tag':this.point('ammonium'),'nitrite-tag':this.point('nitrite'),'nitrate-tag':this.point('nitrate'),'nitri1-microbe':[W*.48,640],'nitri2-microbe':[W*.62,687],'denit-tag':[W*.86,587],'leach-tag':[W*.925,745]};
    anchor['nostoc-microbe']=this.microbeLocation('nostoc');anchor['fixer-microbe']=this.microbeLocation('soilFixers');
    const related={fixation:['atmosphere','nodule-tag','ammonium-tag','nitrite-tag','nitrate-tag','nitri1-microbe','nitri2-microbe'],nitrification:['ammonium-tag','nitrite-tag','nitrate-tag','nitri1-microbe','nitri2-microbe'],nitri1:['ammonium-tag','nitrite-tag','nitri1-microbe'],nitri2:['nitrite-tag','nitrate-tag','nitri2-microbe'],uptake:['nitrate-tag','plant-tag'],feeding:['plant-tag','cow-tag'],decomposition:['organic-tag','ammonium-tag'],denitrification:['nitrate-tag','denit-tag','atmosphere'],leaching:['nitrate-tag','leach-tag'],lightning:['atmosphere','nitrate-tag'],fertilizer:['ammonium-tag','nitrate-tag']};
    related.litter=['plant-tag','cow-tag','leaf-organic-tag','waste-organic-tag'];related.leaves=['leaf-organic-tag'];related.decomposition.push('leaf-organic-tag','waste-organic-tag');
    related.fixation.push('nostoc-microbe','fixer-microbe');
    // Measure in one read phase, then cache until resize. No per-label layout thrashing.
    this.labelMetrics??=new Map((this.labelElements||[]).map(el=>[el,{w:el.offsetWidth||Math.min(185,(el.textContent||'').length*5.5+25),h:el.offsetHeight||29}]));
    const targetKind=microbeProfiles[this.inspectedMicrobe]?.kind;
    const items=(this.labelElements||[]).map((el,index)=>{const classes=(el.className||el.getAttribute('class')||'').split(' '),kind=classes.find(k=>anchor[k]);return{el,kind,index,targeted:kind===targetKind,selected:kind===targetKind||(related[this.selected]||[]).includes(kind)||this.processMatch(el.dataset.info)||this.inputPulse?.remaining>0&&['ammonium-tag','nitrate-tag'].includes(kind)};}).sort((a,b)=>Number(b.targeted)-Number(a.targeted)||Number(b.selected)-Number(a.selected)||a.index-b.index);
    const occupied=[],placements=[],pad=8,top=this.width<700?100:70,bottom=this.height-(this.width<700?52:33);
    for(const{el,kind,selected,targeted}of items){
      if(!kind)continue;const[a,b]=this.worldToScreen(...anchor[kind]);let found=null;
      const {w,h}=this.labelMetrics.get(el);
      const eligible=(!this.selected||selected)&&(!microbeKinds[kind]||kind===targetKind);
      if(eligible&&a>=-10&&a<=this.width+10&&b>=top-50&&b<=this.height+10){
        const positions=[];for(const d of[18,42,72,108,150,...targeted?[200,230,260]:[]])positions.push([a-w/2,b-d-h],[a-w/2,b+d],[a-d-w,b-h/2],[a+d,b-h/2],[a-d-w,b-d-h],[a+d,b-d-h],[a-d-w,b+d],[a+d,b+d],[a+d,b+18],[a-d-w,b+18],[a+d,b-18-h],[a-d-w,b-18-h]);
        if(targeted){positions.push([pad+14,bottom-h],[this.width-pad-w,bottom-h],[pad+14,top],[this.width-pad-w,top]);for(let y=top;y+h<=bottom;y+=24)positions.push([pad+14,y],[this.width-pad-w,y]);}
        for(const[x,y]of positions){const r={x,y,w,h};if(x<pad+14||x+w>this.width-pad||y<top||y+h>bottom)continue;if(kind==='cow-tag'&&y+h>this.worldToScreen(W*.735,this.surface(W*.735)+10)[1])continue;const distance=Math.hypot(a-clamp(a,x,x+w),b-clamp(b,y,y+h));if(distance>(targeted?280:this.width<700?90:120))continue;if([...occupied,...this.protectedBoxes].some(box=>intersects(r,box)))continue;found=r;break;}
      }
      el.style.opacity=found?'1':'0';el.style.visibility=found?'visible':'hidden';el.style.pointerEvents=found?'auto':'none';el.setAttribute('aria-hidden',String(!found));el.tabIndex=found?0:-1;el.classList?.toggle('focus-related',selected);
      if(found){el.style.left=found.x+'px';el.style.top=found.y+'px';occupied.push(found);placements.push({kind,...found,anchor:[a,b],selected,text:el.textContent||kind});}
    }
    this.labelPlacements=placements;
    // Original marginal layer annotations follow the same world transform.
    for(const[id,y]of[['layer-air',255],['layer-top',480],['layer-sub',707]]){const el=document.getElementById(id);if(!el)continue;const p=this.worldToScreen(17,y);el.style.top=p[1]+'px';el.style.opacity=p[1]>top&&p[1]<bottom-70?'1':'0';}
  };
  const originalRender=P.render;
  P.render=function(dt,playing){
    if(!this.camera||!this.terrain)return;if(this.inputPulse)this.inputPulse.remaining=Math.max(0,this.inputPulse.remaining-dt);
    if(!playing){for(const p of this.particles)if(p.process==='fertilizer')p.progress+=dt/p.duration;this.particles=this.particles.filter(p=>p.progress<1);}
    const c=this.camera,target=this.viewTarget,k=this.reduced?1:1-Math.exp(-dt*9);
    for(const key of['zoom','x','y'])c[key]+= (target[key]-c[key])*k;this.clampCamera(c);
    const ctx=this.ctx,transform=ctx.setTransform;
    ctx.setTransform=(a,b,cc,d,e,f)=>transform.call(ctx,a*c.zoom,b,cc,d*c.zoom,a*(this.W/2-c.x*c.zoom),d*(400-c.y*c.zoom));
    try{originalRender.call(this,dt*(this.speed||1),playing);if(this.reduced)for(const p of this.particles)if(p.progress>=0)this.drawParticle(ctx,p);}
    finally{ctx.setTransform=transform;}
    this.layoutLabels();
    if(this.viewElements){this.viewElements.zoom.textContent=Math.round(c.zoom*100)+'%';this.viewElements.minus.disabled=target.zoom<=1.001;this.viewElements.plus.disabled=target.zoom>=3.499;}
    // Short leaders connect noun labels to their exact object, in either mode.
    transform.call(ctx,this.dpr,0,0,this.dpr,0,0);ctx.save();ctx.strokeStyle='#f3edd381';ctx.lineWidth=.75;
    for(const r of this.labelPlacements||[]){const x=clamp(r.anchor[0],r.x,r.x+r.w),y=clamp(r.anchor[1],r.y,r.y+r.h);if(Math.hypot(x-r.anchor[0],y-r.anchor[1])<(r.kind===microbeProfiles[this.inspectedMicrobe]?.kind?285:125)){ctx.globalAlpha=r.selected?.9:.45;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(...r.anchor);ctx.stroke();circle(ctx,...r.anchor,1.8,'#f9eed1');}}
    ctx.restore();
  };
  P.viewStats=function(){return{camera:{...this.camera},target:{...this.viewTarget},labels:(this.labelPlacements||[]).map(p=>({...p})),protectedBoxes:(this.protectedBoxes||[]).map(p=>({...p})),microbe:this.inspectedMicrobe||null,microbeSites:Object.keys(microbeProfiles).map(id=>({id,kind:microbeProfiles[id].kind,point:this.microbeLocation(id)})),organicSites:{...this.detritusSites},worldWidth:this.W,width:this.width,height:this.height};};
  const originalDestroy=P.destroy;P.destroy=function(){for(const dispose of this.viewDisposers||[])dispose();originalDestroy.call(this);};
})();
