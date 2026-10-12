(function(root){
  'use strict';
  const TAU=Math.PI*2;
  function seeded(seed){return()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return(seed>>>0)/4294967296;};}
  function curve(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);}
  function blob(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  class EcosystemScene {
    constructor(canvas,model){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.model=model;this.particles=[];this.carry={};this.fallingLeaves=[];this.flash=0;this.selected=null;this.elapsed=0;this.pointer={x:0,y:0};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
      this.handlePointer=e=>{const r=canvas.getBoundingClientRect();this.pointer.x=(e.clientX-r.left)/r.width-.5;this.pointer.y=(e.clientY-r.top)/r.height-.5;const x=(this.pointer.x+.5)*this.W,y=(this.pointer.y+.5)*800;const spots=[[.365,510,'Rhizobium · nitrogen-fixing bacteria in root nodules'],[.48,640,'Ammonia-oxidizing microorganisms · NH₄⁺ → NO₂⁻'],[.62,687,'Nitrite-oxidizing microorganisms · NO₂⁻ → NO₃⁻'],[.72,488,'Decomposers · organic nitrogen → NH₄⁺'],[.86,587,'Denitrifying microorganisms · NO₃⁻ → N₂']];const hit=spots.find(([px,py])=>Math.hypot(x-px*this.W,y-py)<30);canvas.title=hit?hit[2]:'';};
      this.handleLeave=()=>{this.pointer.x=0;this.pointer.y=0;};canvas.addEventListener('pointermove',this.handlePointer);canvas.addEventListener('pointerleave',this.handleLeave);this.resize();
    }
    resize(){const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;this.width=rect.width;this.height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);this.dpr=dpr;this.W=rect.width/rect.height*800;this.H=800;this.objectScale=Math.min(1,.65+.35*this.W/1440);this.buildTerrain();}
    surface(x){return 410+Math.sin(x/this.W*TAU*1.4)*6+Math.sin(x/this.W*TAU*4)*3;}
    buildTerrain(){
      const W=this.W,H=this.H,c=document.createElement('canvas');c.width=Math.ceil(W);c.height=H;const ctx=c.getContext('2d'),rand=seeded(1108);
      const soil=ctx.createLinearGradient(0,390,0,800);soil.addColorStop(0,'#66513d');soil.addColorStop(.12,'#67513b');soil.addColorStop(.42,'#4c4232');soil.addColorStop(.82,'#353a2b');soil.addColorStop(1,'#243d32');ctx.fillStyle=soil;
      ctx.beginPath();ctx.moveTo(0,this.surface(0));for(let x=0;x<=W+10;x+=8)ctx.lineTo(x,this.surface(x));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
      // Irregular geology gives the soil depth, without turning it into a diagram.
      for(let band=0;band<8;band++){ctx.beginPath();const y=438+band*43;ctx.moveTo(-5,y);for(let x=0;x<=W+10;x+=12)ctx.lineTo(x,y+Math.sin(x/(90+band*25)+band)*12+Math.sin(x/25)*3);ctx.lineTo(W,y+12);for(let x=W;x>=-10;x-=12)ctx.lineTo(x,y+12+Math.sin(x/130+band)*9);ctx.closePath();ctx.fillStyle=['#b0966810','#392e291e','#9e87640e'][band%3];ctx.fill();}
      for(let i=0;i<8500*(W/1440);i++){const x=rand()*W,y=416+rand()*390,r=rand()*2.1+.25;blob(ctx,x,y,r,r*(.4+rand()),rand()>.54?'#d5c39415':'#101e192a');}
      for(let i=0;i<140*(W/1440);i++){const x=rand()*W,y=438+rand()*330,r=3+rand()*10;ctx.save();ctx.translate(x,y);ctx.rotate(rand()*3);const grad=ctx.createLinearGradient(-r,-r,r,r);grad.addColorStop(0,'#9c9c786b');grad.addColorStop(1,'#303c2c');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(-r*.4,-r*.6);ctx.lineTo(r*.7,-r*.5);ctx.lineTo(r,r*.4);ctx.lineTo(-r*.4,r*.6);ctx.closePath();ctx.fill();ctx.restore();}
      for(let i=0;i<360*(W/1440);i++){const x=rand()*W,y=this.surface(x);ctx.strokeStyle=i%3===0?'#b6b77b':'#516a3e';ctx.lineWidth=.6+rand();ctx.beginPath();ctx.moveTo(x,y+4);ctx.quadraticCurveTo(x-3+rand()*6,y-9,x-6+rand()*12,y-13-rand()*20);ctx.stroke();}
      // Drainage cuts into the right edge and opens into a quiet watercourse.
      const water=ctx.createLinearGradient(0,655,0,800);water.addColorStop(0,'#658f87');water.addColorStop(.4,'#466e6b');water.addColorStop(1,'#284e4a');ctx.fillStyle=water;ctx.beginPath();ctx.moveTo(W,500);ctx.bezierCurveTo(W*.98,630,W*.95,690,W*.86,725);ctx.quadraticCurveTo(W*.77,765,W*.72,800);ctx.lineTo(W,800);ctx.closePath();ctx.fill();ctx.strokeStyle='#bed3b265';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W,500);ctx.bezierCurveTo(W*.98,630,W*.95,690,W*.86,725);ctx.quadraticCurveTo(W*.77,765,W*.72,800);ctx.stroke();
      this.terrain=c;
      this.buildDistantLandscape();
    }
    reset(){this.particles=[];this.carry={};this.fallingLeaves=[];this.flash=0;this.elapsed=0;}
    lightning(){this.flash=1;}
    leaves(){const rand=seeded(Math.round(this.elapsed*1000)+71);for(let i=0;i<9;i++){const x=this.W*(.61+rand()*.14);this.fallingLeaves.push({x,y:this.reduced?this.surface(x):210+rand()*100,rotation:rand()*TAU,phase:rand()*TAU,material:1});}}
    point(key){const W=this.W;return {air:[W*.39,132],ammonium:[W*.42,614],nitrite:[W*.56,683],nitrate:[W*.7,615],plant:[W*.365,312],animal:[W*.725,355],organic:[W*.72,430],leached:[W*.96,751],external:[W*.57,365],nodule:[W*.365,535]}[key];}
    route(flow){const W=this.W;let start=this.point(flow.from),end=this.point(flow.to),mid;
      switch(flow.process){
        case 'fixation':return[this.point('air'),[W*.18,420],this.point('nodule'),[W*.39,570],this.point('ammonium')];
        case 'uptake':mid=[W*.365,575];break;
        case 'denitrification':mid=[W*.94,400];end=[W*.87,123];break;
        case 'feeding':mid=[W*.5,280];break;
        case 'decomposition':mid=[W*.64,510];break;
        case 'litter':mid=[W*.77,392];break;
        case 'leaching':mid=[W*.9,687];break;
        case 'lightning':start=[W*.17,100];mid=[W*.2,580];break;
        case 'leaves':start=[W*.68,280];mid=[W*.74,325];break;
        default:mid=[(start[0]+end[0])/2,(start[1]+end[1])/2+20];
      }
      return[start,mid,end];
    }
    ingest(flows){
      const colors={'N₂':'#d3a1ce','NH₄⁺':'#edc16d','NO₂⁻':'#dcaaa2','NO₃⁻':'#9cccd0','Organic N':'#dbab7a'};
      for(const f of flows){if(f.process==='decomposition')for(const l of this.fallingLeaves)l.material*=Math.max(0,1-f.amount/(this.model.n.organic+f.amount));const k=f.process+f.from+f.to;this.carry[k]=(this.carry[k]||0)+f.amount*7;let count=Math.floor(this.carry[k]);this.carry[k]-=count;count=Math.min(count,22);
        for(let i=0;i<count&&this.particles.length<160;i++){this.particles.push({route:this.route(f),progress:-i*.065,duration:2.8+(f.process==='denitrification'?1.4:0),color:colors[f.compound],process:f.process,compound:f.compound,amount:f.amount/Math.max(1,count)});}
      }
    }
    leaf(ctx,x,y,size,angle,color,seed=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);const grad=ctx.createLinearGradient(0,-size*.35,size,0);grad.addColorStop(0,color);grad.addColorStop(.48,color);grad.addColorStop(1,'#31573c');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(size*.18,-size*.52,size*.72,-size*.4,size,0);ctx.bezierCurveTo(size*.69,size*.35,size*.25,size*.48,0,0);ctx.fill();ctx.strokeStyle='#d8e1a03f';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(size*.5,-size*.08,size,0);for(let i=1;i<5;i++){const u=i/5;ctx.moveTo(size*u,0);ctx.lineTo(size*(u-.04),-Math.sin(u*Math.PI)*size*.27);ctx.moveTo(size*u,0);ctx.lineTo(size*(u-.08),Math.sin(u*Math.PI)*size*.25);}ctx.stroke();ctx.restore();}
    tree(ctx,x,y,h,color,rand){ctx.strokeStyle=color;ctx.lineWidth=h*.025;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-h*.75);ctx.stroke();for(let i=0;i<13;i++){const yy=y-h*.95+rand()*h*.55,xx=x+(rand()-.5)*h*.42;blob(ctx,xx,yy,h*(.1+rand()*.08),h*.15,color);}}
    buildDistantLandscape(){const W=this.W,c=document.createElement('canvas');c.width=Math.ceil(W);c.height=430;const ctx=c.getContext('2d'),rand=seeded(43);
      for(let layer=0;layer<4;layer++){const base=280+layer*32,amp=55-layer*9;ctx.fillStyle=['#7daba252','#7c9f8266','#7b9970a0','#6a835ace'][layer];ctx.beginPath();ctx.moveTo(0,base);for(let x=0;x<=W+5;x+=8)ctx.lineTo(x,base+Math.sin(x/W*8+layer)*amp+Math.sin(x/W*18+layer)*amp*.24);ctx.lineTo(W,430);ctx.lineTo(0,430);ctx.fill();}
      for(let i=0;i<48;i++){const x=rand()*W,y=353+Math.sin(x/W*8)*16;this.tree(ctx,x,y,24+rand()*45,'#557c6266',rand);}
      this.distantLandscape=c;
    }
    background(ctx,t){const W=this.W,H=this.H,m=this.model,storm=m.rain>0;
      const sky=ctx.createLinearGradient(0,0,0,430);sky.addColorStop(0,storm?'#718c90':'#a4c9ca');sky.addColorStop(.5,storm?'#a1b5af':'#c8dbcc');sky.addColorStop(1,'#ece8bf');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      const light=ctx.createRadialGradient(W*.73,100,0,W*.73,100,W*.55);light.addColorStop(0,storm?'#eee9c324':'#fff5bd9c');light.addColorStop(.24,'#faf0bc39');light.addColorStop(1,'#f0e5be00');ctx.fillStyle=light;ctx.fillRect(0,0,W,440);
      blob(ctx,W*.77,94,26,26,storm?'#e8e9d32a':'#fff2bf7a');
      ctx.save();ctx.translate(this.reduced?0:this.pointer.x*6,0);ctx.drawImage(this.distantLandscape,0,0);
      ctx.restore();
      const cloud=ctx.createRadialGradient(0,0,2,0,0,95);cloud.addColorStop(0,storm?'#405b6250':'#f7f7eabd');cloud.addColorStop(1,'#edf2de00');
      for(let i=0;i<6;i++){ctx.save();const cx=((i*.21*W+t*(storm?3:1.3))%(W+280))-110,cy=70+Math.sin(i*3)*38;ctx.translate(cx,cy);ctx.scale(1.8,.52);ctx.fillStyle=cloud;ctx.fillRect(-100,-100,200,200);ctx.restore();}
      // Perspective field rows and a distant fence.
      ctx.strokeStyle='#a5b27a4f';ctx.lineWidth=1.3;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(W*.51,310+i*7);ctx.quadraticCurveTo(W*.68,325+i*6,W,340+i*7);ctx.stroke();}
      ctx.strokeStyle='#c1c5a982';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W*.53,352);ctx.lineTo(W*.98,366);ctx.moveTo(W*.53,359);ctx.lineTo(W*.98,373);ctx.stroke();for(let i=0;i<12;i++){const x=W*(.53+i*.04),y=352+i*1.2;ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x,y+14);ctx.stroke();}
      ctx.fillStyle='#708651';ctx.beginPath();ctx.moveTo(0,390);for(let x=0;x<=W+8;x+=6)ctx.lineTo(x,this.surface(x)-5);ctx.lineTo(W,430);ctx.lineTo(0,430);ctx.fill();
      ctx.drawImage(this.terrain,0,0);
      ctx.fillStyle=`rgba(12,37,31,${Math.max(0,m.moisture-.5)*.32})`;ctx.fillRect(0,416,W,384);
    }
    roots(ctx,t){const W=this.W,base=this.surface(W*.365),growth=Math.min(1.35,.72+this.model.n.plant/75),scale=this.objectScale;
      ctx.save();ctx.translate(W*.365,base);ctx.scale(scale*growth,scale*growth);const rand=seeded(712);
      // Branching roots and fine lateral hairs are attached to the stem.
      const root=(x,y,dx,dy,level)=>{ctx.strokeStyle=level===0?'#d5c7a6':level===1?'#bcb898bd':'#b4b99768';ctx.lineWidth=level===0?3.6:level===1?1.3:.5;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+dx*.12,y+dy*.36,x+dx*.9,y+dy*.68,x+dx,y+dy);ctx.stroke();if(level<2)for(let i=1;i<=4;i++){const u=i/5;root(x+dx*u*u,y+dy*u,(rand()-.5)*85/(level+1),dy*(.38+rand()*.1),level+1);}};
      for(let i=0;i<7;i++)root(0,0,(i-3)*29,135+rand()*85,0);
      ctx.strokeStyle='#ece1b6';ctx.lineWidth=4.2;ctx.beginPath();ctx.moveTo(0,-10);ctx.quadraticCurveTo(5,45,0,110);ctx.stroke();
      const nodules=[[-25,71],[-31,90],[18,101],[33,119],[-53,112],[0,64],[39,83]];
      for(let i=0;i<nodules.length;i++){const[x,y]=nodules[i],r=5+i%3;const g=ctx.createRadialGradient(x-2,y-3,1,x,y,r);g.addColorStop(0,'#f2c4bc');g.addColorStop(1,'#9f6c6f');blob(ctx,x,y,r,r*1.3,g);if(this.model.activity>0){ctx.strokeStyle='#dcaac745';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,r+3+Math.sin(t*2+i)*1,r*1.3+3,0,0,TAU);ctx.stroke();}}
      ctx.restore();
    }
    plant(ctx,t){const W=this.W,x=W*.365,y=this.surface(x),scale=this.objectScale;const growth=Math.min(1.35,.66+this.model.n.plant/75),wind=this.reduced?0:Math.sin(t*1.2)*.017+Math.sin(t*.73)*.009;
      ctx.save();ctx.translate(x,y);ctx.scale(scale*growth,scale*growth);ctx.rotate(wind);const stem=ctx.createLinearGradient(-5,0,5,0);stem.addColorStop(0,'#425d33');stem.addColorStop(.5,'#b0b76b');stem.addColorStop(1,'#52793d');ctx.strokeStyle=stem;ctx.lineWidth=5.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,4);ctx.bezierCurveTo(14,-60,-10,-140,6,-247);ctx.stroke();
      const branches=[[-3,-50,-60,-86,-2.7,66],[0,-74,55,-115,-.4,70],[-2,-104,-45,-145,-2.5,63],[0,-128,51,-164,-.5,68],[1,-155,-36,-190,-2.7,59],[1,-182,36,-218,-.63,58],[4,-211,-17,-249,-2.2,43],[6,-240,20,-266,-.7,36]];
      for(let i=0;i<branches.length;i++){const[sx,sy,ex,ey,angle,size]=branches[i];ctx.strokeStyle='#76944d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(ex*.5,sy-25,ex,ey);ctx.stroke();this.leaf(ctx,ex,ey,size,angle+(this.reduced?0:Math.sin(t*1.3+i)*.025),['#7b984a','#91ab56','#6b8c43'][i%3]);this.leaf(ctx,ex,ey,size*.62,angle+(i%2?-.8:.8),'#6b8e43');}
      for(let i=0;i<3;i++){ctx.save();ctx.translate(i%2?-13:23,-137-i*28);for(let j=0;j<5;j++){const a=j*TAU/5;blob(ctx,Math.cos(a)*4,Math.sin(a)*4,3.5,3.2,'#f2eccc');}blob(ctx,0,0,1.8,1.8,'#e4cc80');ctx.restore();}
      ctx.strokeStyle='#8ca259';ctx.lineWidth=4;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(26+i*6,-140-i*19);ctx.quadraticCurveTo(34+i*5,-110-i*18,28+i*5,-100-i*19);ctx.stroke();}
      ctx.restore();
    }
    cow(ctx,t){const W=this.W,x=W*.735,y=this.surface(x)-4,scale=this.objectScale*.88,feeding=this.model.rates.feeding>0;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);blob(ctx,0,3,115,9,'#293e3137');
      // Tail, four articulated legs, a warm ivory body and organic chestnut markings.
      ctx.strokeStyle='#836c4e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(77,-103);ctx.bezierCurveTo(94,-94,89,-59,99+(this.reduced?0:Math.sin(t)*4),-41);ctx.stroke();blob(ctx,98,-37,4,8,'#483c2d');
      for(let i=0;i<4;i++){const lx=[-55,-37,43,67][i];ctx.fillStyle=i%2?'#d1c8a5':'#efe4c3';ctx.beginPath();ctx.moveTo(lx-7,-56);ctx.lineTo(lx+10,-51);ctx.lineTo(lx+7,-24);ctx.lineTo(lx+10,0);ctx.lineTo(lx-3,0);ctx.lineTo(lx-6,-27);ctx.closePath();ctx.fill();ctx.fillStyle='#4b4935';ctx.fillRect(lx-4,-2,15,6);}
      const body=ctx.createLinearGradient(0,-135,0,-35);body.addColorStop(0,'#f2e7c8');body.addColorStop(.6,'#e1d7b4');body.addColorStop(1,'#bdb596');ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-80,-106);ctx.bezierCurveTo(-45,-132,25,-126,73,-110);ctx.bezierCurveTo(101,-92,89,-51,56,-42);ctx.bezierCurveTo(24,-30,-56,-33,-75,-65);ctx.closePath();ctx.fill();
      ctx.save();ctx.clip();ctx.fillStyle='#75503a';ctx.beginPath();ctx.moveTo(-66,-135);ctx.bezierCurveTo(-46,-98,-22,-126,-14,-106);ctx.bezierCurveTo(-7,-87,-32,-89,-22,-56);ctx.bezierCurveTo(-5,-42,-52,-28,-78,-60);ctx.fill();ctx.beginPath();ctx.moveTo(35,-140);ctx.bezierCurveTo(15,-112,55,-112,46,-88);ctx.bezierCurveTo(30,-67,51,-55,43,-25);ctx.lineTo(90,-20);ctx.lineTo(99,-133);ctx.fill();blob(ctx,8,-67,17,11,'#8a6747');ctx.restore();
      blob(ctx,42,-36,17,9,'#c8a58d');ctx.save();ctx.translate(-72,-100);const nod=this.reduced?0:Math.sin(t*(feeding?1.6:.6))*.055;ctx.rotate(-.28+nod);ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-19,9,-27,25,-21,49);ctx.lineTo(-50,65);ctx.quadraticCurveTo(-68,44,-51,16);ctx.quadraticCurveTo(-32,-5,0,0);ctx.fill();ctx.fillStyle='#78573e';ctx.beginPath();ctx.moveTo(-31,2);ctx.quadraticCurveTo(-65,18,-58,42);ctx.lineTo(-38,46);ctx.lineTo(-25,16);ctx.closePath();ctx.fill();blob(ctx,-46,58,19,12,'#d2baa0');blob(ctx,-55,57,2.5,2,'#5b5040');blob(ctx,-37,58,2.2,2,'#5b5040');blob(ctx,-44,27,2.3,2.3,'#2c3327');blob(ctx,-43.5,26.5,.7,.7,'#efeccc');
      ctx.fillStyle='#a68e66';ctx.beginPath();ctx.moveTo(-39,9);ctx.quadraticCurveTo(-61,-10,-66,-1);ctx.quadraticCurveTo(-57,17,-39,9);ctx.fill();ctx.strokeStyle='#e2d4b1';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-34,9);ctx.quadraticCurveTo(-42,-9,-36,-16);ctx.stroke();ctx.restore();ctx.restore();
    }
    groundDetails(ctx,t){const W=this.W,rand=seeded(903);
      for(let i=0;i<100*(W/1440);i++){const x=rand()*W,y=this.surface(x),h=9+rand()*14,sway=this.reduced?0:Math.sin(t*.8+x)*2;ctx.strokeStyle=['#687c41','#9fa361','#455d37'][i%3];ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+2+sway,y-h*.5,x+4+sway,y-h);ctx.stroke();}
      for(let i=0;i<14;i++){const x=W*(.69+rand()*.065),y=this.surface(x)-2;this.leaf(ctx,x,y,12+rand()*8,rand()*TAU,['#a97c45','#ba914e','#87613a'][i%3]);}
      ctx.save();ctx.translate(W*.69,this.surface(W*.69)+18);ctx.scale(this.objectScale,this.objectScale);for(let i=0;i<3;i++){const x=i*15,y=-i%2*6;ctx.strokeStyle='#d4c4a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-18);ctx.stroke();ctx.fillStyle=['#c8b493','#d8c7a3','#a39471'][i];ctx.beginPath();ctx.ellipse(x,y-18,9,5,0,Math.PI,TAU);ctx.fill();}ctx.restore();
      // Microbes are local to soil, not decorative floating confetti.
      const microbial=[{x:.39,y:590,c:'#d6b2c2'},{x:.48,y:640,c:'#e1bc70'},{x:.62,y:687,c:'#9cccd0'},{x:.72,y:488,c:'#c9b793'},{x:.86,y:587,c:'#cca8c5'}];
      for(let g=0;g<microbial.length;g++){const b=microbial[g];for(let i=0;i<7;i++){const x=W*b.x+Math.sin(i*7)*19,y=b.y+Math.cos(i*3)*13,a=this.reduced?0:Math.sin(t*this.model.activity+i)*.3;ctx.save();ctx.translate(x,y);ctx.rotate(i+a);ctx.strokeStyle=b.c+'77';ctx.lineWidth=2.7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-2.5,0);ctx.lineTo(2.5,0);ctx.stroke();ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(3,0);ctx.bezierCurveTo(7,4,8,-3,11,1);ctx.stroke();ctx.restore();}}
      // Small decomposer worm.
      ctx.strokeStyle='#b38d7980';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W*.74,453);ctx.bezierCurveTo(W*.74+20,441,W*.74+26,470,W*.74+43,458);ctx.stroke();
      for(const l of this.fallingLeaves){ctx.save();ctx.globalAlpha=l.material;this.leaf(ctx,l.x,l.y,17*(.4+.6*l.material),l.rotation,'#b08a4a');ctx.restore();}
    }
    drawParticle(ctx,p){let t=Math.max(0,p.progress),segment=p.route.slice(0,3);if(p.route.length===5){if(t>.72){segment=p.route.slice(2);t=(t-.72)/.28;}else t/=.72;}const[a,b,c]=segment,x=(1-t)*(1-t)*a[0]+2*(1-t)*t*b[0]+t*t*c[0],y=(1-t)*(1-t)*a[1]+2*(1-t)*t*b[1]+t*t*c[1],selected=this.selected===p.process;const reactants={fixation:'N₂',lightning:'N₂',nitri1:'NH₄⁺',nitri2:'NO₂⁻',decomposition:'Organic N',denitrification:'NO₃⁻'};const colorMap={'N₂':'#d3a1ce','NH₄⁺':'#edc16d','NO₂⁻':'#dcaaa2','NO₃⁻':'#9cccd0','Organic N':'#dbab7a'};const threshold=p.process==='fixation'?.72:p.process==='lightning'?.27:.52,compound=p.progress<threshold?(reactants[p.process]||p.compound):p.compound,color=colorMap[compound];ctx.save();ctx.globalAlpha=selected?.95:.8;ctx.shadowColor=color;ctx.shadowBlur=selected?13:6;blob(ctx,x,y,selected?3.5:2.3,selected?3.5:2.3,color);if(compound==='N₂'){blob(ctx,x+5,y,2.3,2.3,color);}ctx.shadowBlur=0;if(selected){ctx.font='10px Segoe UI';ctx.fillStyle=color;ctx.fillText(compound,x+7,y-6);}ctx.restore();}
    pathHighlight(ctx){if(!this.selected)return;const map={fixation:['air','ammonium','NH₄⁺'],nitri1:['ammonium','nitrite','NO₂⁻'],nitri2:['nitrite','nitrate','NO₃⁻'],uptake:['nitrate','plant','NO₃⁻'],feeding:['plant','animal','Organic N'],litter:['animal','organic','Organic N'],decomposition:['organic','ammonium','NH₄⁺'],denitrification:['nitrate','air','N₂'],leaching:['nitrate','leached','NO₃⁻'],lightning:['air','nitrate','NO₃⁻'],fertilizer:['external','ammonium','NH₄⁺'],leaves:['external','organic','Organic N']};const f=map[this.selected];if(!f)return;const route=this.route({process:this.selected,from:f[0],to:f[1]}),[a,b,c]=route;ctx.strokeStyle=NitrogenScience.PROCESSES[this.selected].color+'88';ctx.lineWidth=1.5;ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(...a);ctx.quadraticCurveTo(...b,...c);if(route.length===5)ctx.quadraticCurveTo(...route[3],...route[4]);ctx.stroke();ctx.setLineDash([]);}
    render(dt,playing){
      if(!this.terrain||!this.terrain.width||!this.canvas.width)return;
      if(playing){this.elapsed+=dt;for(const p of this.particles)p.progress+=dt/p.duration;this.particles=this.particles.filter(p=>p.progress<1);for(const l of this.fallingLeaves){if(l.y<this.surface(l.x)){l.y+=dt*70;l.x+=Math.sin(this.elapsed*2+l.phase)*dt*15;l.rotation+=dt*.8;}}this.fallingLeaves=this.fallingLeaves.filter(l=>l.material>.08).slice(-60);this.flash=Math.max(0,this.flash-dt*1.8);}
      const ctx=this.ctx,motionTime=this.reduced?0:this.elapsed;ctx.setTransform(this.canvas.width/this.W,0,0,this.canvas.height/800,0,0);this.background(ctx,motionTime);this.roots(ctx,motionTime);this.groundDetails(ctx,motionTime);this.cow(ctx,motionTime);this.plant(ctx,motionTime);this.pathHighlight(ctx);
      if(!this.reduced)for(const p of this.particles)if(p.progress>=0)this.drawParticle(ctx,p);
      // Dissolved nitrate follows the current through the drainage.
      ctx.strokeStyle='#bad9c03d';ctx.lineWidth=1;for(let i=0;i<14;i++){const x=this.W*(.91+Math.sin(i*8)*.065),y=714+i*6;ctx.beginPath();ctx.moveTo(x+Math.sin(motionTime+i)*7,y);ctx.lineTo(x+19+Math.sin(motionTime+i)*7,y+1);ctx.stroke();}
      if(this.model.rain>0){ctx.strokeStyle='#e4efe27d';ctx.lineWidth=1;for(let i=0;i<125;i++){const x=((i*83+motionTime*64)%this.W),y=((i*137+motionTime*510)%460)-40;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+17);ctx.stroke();}ctx.fillStyle='#52696318';ctx.fillRect(0,0,this.W,410);}
      if(this.flash>0){if(!this.reduced){ctx.fillStyle=`rgba(255,251,220,${this.flash*.35})`;ctx.fillRect(0,0,this.W,800);}ctx.strokeStyle='#fff1bb';ctx.lineWidth=2.7;ctx.shadowColor='#fff3bf';ctx.shadowBlur=this.reduced?0:18;curve(ctx,[[this.W*.17,48],[this.W*.15,126],[this.W*.19,130],[this.W*.14,210],[this.W*.17,206],[this.W*.13,390]]);ctx.stroke();ctx.shadowBlur=0;}
      const vignette=ctx.createRadialGradient(this.W*.5,340,this.W*.12,this.W*.5,400,Math.max(this.W*.66,680));vignette.addColorStop(0,'#183b2700');vignette.addColorStop(1,'#173c282f');ctx.fillStyle=vignette;ctx.fillRect(0,0,this.W,800);
    }
    destroy(){this.resizeObserver.disconnect();this.canvas.removeEventListener('pointermove',this.handlePointer);this.canvas.removeEventListener('pointerleave',this.handleLeave);}
  }
  root.EcosystemScene=EcosystemScene;
})(globalThis);
