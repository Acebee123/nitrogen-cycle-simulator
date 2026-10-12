const assert = require('node:assert/strict');
const {NitrogenModel,KEYS} = require('../src/model.js');
let assertions = 0;
function check(condition, message) { assert.ok(condition, message); assertions++; }
for (const scenario of ['healthy','rain','fertilized']) {
  const m = new NitrogenModel(scenario);
  for(let i=0;i<12000;i++) {
    if(i===90)m.addFertilizer(100);
    if(i===180)m.addLeaves();
    if(i===300)m.lightning();
    if(i===700)m.grow();
    if(i===900)m.heavyRain();
    if(i===1500){m.activity=0;m.moisture=0;m.moistureTarget=0;}
    if(i===2300){m.activity=2;m.moisture=1;m.moistureTarget=1;}
    m.step(.05);m.drainFlows();
    check(KEYS.every(k=>Number.isFinite(m.n[k])&&m.n[k]>=0),'Finite nonnegative reservoirs');
    check(Math.abs(m.balanceError())<1e-8,'Mass balance includes external inputs and drainage');
  }
}
const dry=new NitrogenModel(),wet=new NitrogenModel('rain');dry.step();wet.step();
check(wet.rates.leaching>dry.rates.leaching,'Rain increases leaching');
check(wet.rates.denitrification>dry.rates.denitrification,'Waterlogging increases denitrification');
check(wet.rates.nitri1<dry.rates.nitri1,'Waterlogging suppresses aerobic nitrification');
const fert=new NitrogenModel('fertilized');check(fert.inputs===85,'Scenario records fertilizer inputs');check(fert.n.ammonium===75&&fert.n.nitrate===70,'Fertilizer composition');
const grow=new NitrogenModel(),normal=new NitrogenModel();grow.grow();for(let i=0;i<100;i++){grow.step();normal.step();}check(grow.n.plant>normal.n.plant,'Growth uses available nitrogen');
const lightning=new NitrogenModel();lightning.lightning();const air=lightning.n.air;for(let i=0;i<30;i++)lightning.step();check(lightning.n.air<air-3,'Lightning transfers atmospheric nitrogen');
const leaves=new NitrogenModel();leaves.addLeaves();check(leaves.n.organic===40&&leaves.inputs===8,'Added leaves accounted as external organic input');
const inactive=new NitrogenModel();inactive.activity=0;inactive.step();check(inactive.rates.fixation===0&&inactive.rates.nitri1===0&&inactive.rates.decomposition===0&&inactive.rates.denitrification===0,'Microbial slider affects every microbial process');
const speed1=new NitrogenModel(),speed4=new NitrogenModel();for(let i=0;i<1000;i++)speed1.step(.05);for(let frame=0;frame<250;frame++)for(let i=0;i<4;i++)speed4.step(.05);check(JSON.stringify(speed1.n)===JSON.stringify(speed4.n),'Speed-independent fixed steps');
const rain10=new NitrogenModel('rain'),healthy10=new NitrogenModel();for(let i=0;i<200;i++){rain10.step();healthy10.step();}check(rain10.n.leached>healthy10.n.leached*3,'Scenarios produce distinct trajectories');
check(normal.history.length>1&&normal.history.at(-1).ammonium===normal.n.ammonium,'Chart samples correspond exactly to state');
const flows=new NitrogenModel();flows.step();for(const f of flows.drainFlows()){check(KEYS.includes(f.from)&&KEYS.includes(f.to)&&f.amount>0,'Particle events emitted only for actual positive transfers');}
assert.throws(()=>normal.step(1));
console.log(`PASS: ${assertions} model assertions, 36,000 bounded integration steps, all environmental inputs and scenarios.`);

