/* Educational quantities and rates: illustrative nitrogen units, not field predictions. */
(function (root) {
  'use strict';
  const KEYS = ['air', 'ammonium', 'nitrite', 'nitrate', 'plant', 'animal', 'organic', 'leached'];
  const PROCESSES = {
    nitrification: { name: "Nitrification", input: "NH₄⁺ → NO₂⁻", output: "NO₃⁻", description: "Two groups of aerobic nitrifying microorganisms oxidize ammonium to nitrite, then nitrite to nitrate. Nitrosomonas and Nitrobacter are familiar textbook examples. Waterlogging lowers oxygen and slows both stages.", color: "#72dcd8" },
    fixation: { name: 'Nitrogen fixation', input: 'Atmospheric N₂', output: 'Soil NH₄⁺', description: 'Rhizobium in bean root nodules fixes N₂ into ammonia/ammonium. Nitrifying microorganisms subsequently form nitrate. Fixation therefore adds nitrate indirectly, matching the textbook’s grouped pathway; it is not a direct N₂ → NO₃⁻ bacterial reaction.', color: '#d7a9ef' },
    nitri1: { name: 'Nitrification · stage 1', input: 'NH₄⁺', output: 'NO₂⁻', description: 'Ammonia-oxidizing microorganisms convert ammonium into nitrite. This aerobic process slows when soil becomes waterlogged.', color: '#ffd37e' },
    nitri2: { name: 'Nitrification · stage 2', input: 'NO₂⁻', output: 'NO₃⁻', description: 'Nitrite-oxidizing microorganisms convert nitrite into nitrate. Both stages need oxygen; nitrate is mobile in soil water.', color: '#72dcd8' },
    uptake: { name: 'Absorption & assimilation', input: 'Soil NO₃⁻', output: 'Plant organic nitrogen', description: 'Bean roots absorb nitrate and assimilate its nitrogen into amino acids and proteins. This model follows the supplied textbook’s nitrate uptake pathway. Real plants can also absorb ammonium.', color: '#b4cf80' },
    feeding: { name: 'Feeding', input: 'Plant organic nitrogen', output: 'Animal organic nitrogen', description: 'The cow eats plant material, transferring nitrogen into animal biomass. Its waste later returns nitrogen to the soil.', color: '#b4cf80' },
    litter: { name: 'Litter & animal waste', input: 'Plant + animal nitrogen', output: 'Organic matter', description: 'Shed foliage and animal waste enter the decomposing organic matter reservoir. Their nitrogen is still organic at this stage.', color: '#ddba85' },
    decomposition: { name: 'Decomposition & ammonification', input: 'Organic matter nitrogen', output: 'NH₄⁺', description: 'Decomposing bacteria and fungi mineralize nitrogen in dead material and animal waste into ammonium. Nitrification can later convert it to nitrate. Moisture and microbial activity affect the rate.', color: '#ddba85' },
    denitrification: { name: 'Denitrification', input: 'NO₃⁻', output: 'Atmospheric N₂', description: 'In oxygen-poor, waterlogged soil, microorganisms convert nitrate into gases. This simplified model represents the gaseous products as N₂; intermediates including N₂O are not separately tracked.', color: '#d7a9ef' },
    leaching: { name: 'Nitrate leaching', input: 'Soil NO₃⁻', output: 'Drainage nitrogen', description: 'Dissolved nitrate moves with drainage water below the root zone. It leaves the local ecosystem but remains in the tracked leaching reservoir.', color: '#72dcd8' },
    lightning: { name: 'Lightning fixation', input: 'Atmospheric N₂', output: 'Soil NO₃⁻', description: 'Lightning forms nitrogen oxides from atmospheric N₂. These react in rainwater to form nitric acid; reactions in soil produce nitrate. The model combines these untracked intermediates into a gradual, conserving N₂ → NO₃⁻ transfer.', color: '#ffd37e' },
    fertilizer: { name: 'Fertilizer input', input: 'External nitrogen', output: 'NH₄⁺ + NO₃⁻', description: 'This illustrative fertilizer contains 60% ammonium nitrogen and 40% nitrate nitrogen. Added nitrogen is recorded as an external input in the mass balance.', color: '#ffd37e' },
    leaves: { name: 'Added dead leaves', input: 'External organic nitrogen', output: 'Organic matter', description: 'Added leaves bring 8 illustrative nitrogen units into the system. Decomposition gradually transfers their nitrogen into ammonium.', color: '#ddba85' }
  };
  class NitrogenModel {
    constructor(scenario = 'healthy') { this.reset(scenario); }
    reset(scenario = 'healthy') {
      this.scenario = scenario;
      this.n = { air: 760, ammonium: 24, nitrite: 4, nitrate: 36, plant: 28, animal: 18, organic: 32, leached: 0 };
      this.initialTotal = this.total(); this.inputs = 0; this.time = 0;
      this.activity = 1; this.moistureTarget = scenario === 'rain' ? .9 : .55;
      this.moisture = this.moistureTarget; this.rain = scenario === 'rain' ? 28 : 0;
      this.growth = 0; this.strike = 0; this.rates = {}; this.flows = []; this.history = []; this.sampleClock = 0;
      if (scenario === 'fertilized') this.addFertilizer(85);
      this.sample();
    }
    total() { return KEYS.reduce((v, k) => v + this.n[k], 0); }
    balanceError() { return this.total() - this.initialTotal - this.inputs; }
    transfer(from, to, amount, process, compound) {
      amount = Math.max(0, Math.min(amount, this.n[from]));
      if (amount <= 0) return 0;
      this.n[from] -= amount; this.n[to] += amount;
      this.flows.push({ from, to, amount, process, compound });
      return amount;
    }
    external(to, amount, process, compound) {
      this.n[to] += amount; this.inputs += amount;
      this.flows.push({ from: 'external', to, amount, process, compound });
    }
    addFertilizer(amount) {
      amount = Math.max(0, Math.min(100, Number(amount) || 0));
      this.external('ammonium', amount * .6, 'fertilizer', 'NH₄⁺');
      this.external('nitrate', amount * .4, 'fertilizer', 'NO₃⁻');
    }
    addLeaves() { this.external('organic', 8, 'leaves', 'Organic N'); }
    lightning() { this.strike = Math.min(this.strike + 1.4, 5); }
    heavyRain() { this.rain = Math.min(this.rain + 16, 40); this.moisture = Math.min(1, this.moisture + .16); }
    grow() { this.growth = 16; }
    step(dt = .05) {
      if (!Number.isFinite(dt) || dt <= 0 || dt > .1) throw new Error('Use fixed bounded steps of at most 0.1 illustrative day.');
      this.time += dt; this.rates = {};
      const rain = this.rain > 0;
      this.moisture += ((rain ? .97 : this.moistureTarget) - this.moisture) * (1 - Math.exp(-.22 * dt));
      this.rain = Math.max(0, this.rain - dt); this.growth = Math.max(0, this.growth - dt);
      const m = this.moisture, a = this.activity;
      const wet = Math.max(.015, Math.min(1, m / .52));
      const saturated = Math.max(0, (m - .72) / .28);
      const oxygen = Math.max(.035, 1 - saturated * .96);
      const microbes = a * wet;
      const flow = (from, to, rate, process, compound) => {
        const v = this.transfer(from, to, rate * dt, process, compound);
        this.rates[process] = (this.rates[process] || 0) + v / dt;
      };
      const n = this.n;
      flow('air', 'ammonium', .65 * microbes * (1 - .5 * saturated) * n.air / (n.air + 120) * (.65 + n.plant / 80) / (1 + (n.ammonium + n.nitrate) / 150), 'fixation', 'NH₄⁺');
      flow('organic', 'ammonium', n.organic * .028 * microbes * (.65 + .35 * oxygen), 'decomposition', 'NH₄⁺');
      flow('ammonium', 'nitrite', n.ammonium * .065 * microbes * oxygen, 'nitri1', 'NO₂⁻');
      flow('nitrite', 'nitrate', n.nitrite * .22 * microbes * oxygen, 'nitri2', 'NO₃⁻');
      const uptake = wet * (.5 + .5 * oxygen) * (this.growth > 0 ? 2.6 : 1) * Math.max(.03, 1 - n.plant / 95);
      flow('nitrate', 'plant', n.nitrate * .024 * uptake, 'uptake', 'NO₃⁻');
      flow('plant', 'animal', n.plant * .011 * Math.max(.05, 1 - n.animal / 65), 'feeding', 'Organic N');
      flow('plant', 'organic', n.plant * .004, 'litter', 'Organic N');
      flow('animal', 'organic', n.animal * .009, 'litter', 'Organic N');
      flow('nitrate', 'air', n.nitrate * .052 * microbes * saturated * n.organic / (n.organic + 15), 'denitrification', 'N₂');
      flow('nitrate', 'leached', n.nitrate * (.0012 * m + .05 * Math.max(0, (m - .65) / .35) * (rain ? 1.5 : 1)), 'leaching', 'NO₃⁻');
      if (this.strike > 0) {
        const d = Math.min(dt, this.strike);
        flow('air', 'nitrate', 2.3 * d / dt, 'lightning', 'NO₃⁻');
        this.strike = Math.max(0, this.strike - dt);
      }
      this.sampleClock += dt;
      if (this.sampleClock >= .5 - 1e-9) { this.sampleClock = 0; this.sample(); }
    }
    sample() { this.history.push({ time: this.time, ammonium: this.n.ammonium, nitrate: this.n.nitrate }); if (this.history.length > 240) this.history.shift(); }
    drainFlows() { const f = this.flows; this.flows = []; return f; }
  }
  const api = { NitrogenModel, KEYS, PROCESSES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NitrogenScience = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
