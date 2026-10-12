/* Teaching content shared by the scene and the interface.
   Short on purpose: one idea per process, details live in the microbe cards. */
(function (root) {
  'use strict';

  // One colour per nitrogen form. The same colours are used by particles,
  // resident ions, the legend and the cycle map.
  const COLORS = {
    'N₂': '#c9a8ff',
    'NH₄⁺': '#ffc857',
    'NO₂⁻': '#ff8a7a',
    'NO₃⁻': '#4fe3e1',
    'Protein N': '#9fe870',
    'Organic N': '#d9a066',
    'Pellet': '#f4f1e6'
  };

  // Name mode shows "NH₄⁺ Ammonium"; Formula mode shows only the formula.
  // Organic nitrogen has no single formula, so it is written as an amino group.
  const NAMES = {
    'N₂': 'Nitrogen gas', 'NH₄⁺': 'Ammonium', 'NO₂⁻': 'Nitrite', 'NO₃⁻': 'Nitrate',
    'Protein N': 'Protein', 'Organic N': 'Dead matter', Pellet: 'Fertilizer', groundwater: 'Groundwater'
  };
  const FORMULAS = { 'Protein N': 'R–NH₂', 'Organic N': 'R–NH₂', groundwater: 'NO₃⁻(aq)', Pellet: '' };

  // Equations use compound tokens so the interface can colour them.
  const PROCESSES = {
    fixation: {
      title: 'Nitrogen fixation', icon: 'fix',
      eq: ['N₂', '→', 'NH₄⁺'],
      line: 'Bacteria break the triple bond of N₂ and make ammonium.',
      agents: ['rhizobium', 'soilFixers', 'nostoc'], needs: ['microbes', 'water']
    },
    nitrification: {
      title: 'Nitrification', icon: 'nit',
      eq: ['NH₄⁺', '→', 'NO₂⁻', '→', 'NO₃⁻'],
      line: 'Two groups of bacteria oxidise ammonium to nitrite, then nitrate.',
      agents: ['nitrosomonas', 'nitrobacter'], needs: ['oxygen', 'microbes']
    },
    nitri1: {
      title: 'Nitrification · step 1', icon: 'nit',
      eq: ['NH₄⁺', '→', 'NO₂⁻'],
      line: 'Ammonia oxidisers turn ammonium into nitrite.',
      agents: ['nitrosomonas'], needs: ['oxygen', 'microbes']
    },
    nitri2: {
      title: 'Nitrification · step 2', icon: 'nit',
      eq: ['NO₂⁻', '→', 'NO₃⁻'],
      line: 'Nitrite oxidisers turn nitrite into nitrate.',
      agents: ['nitrobacter'], needs: ['oxygen', 'microbes']
    },
    uptake: {
      title: 'Absorption', icon: 'up',
      eq: ['NO₃⁻', '→', 'Protein N'],
      line: 'Roots absorb nitrate; leaves build it into amino acids and proteins.',
      agents: [], needs: ['water']
    },
    feeding: {
      title: 'Feeding', icon: 'feed',
      eq: ['Protein N', '→', 'Protein N'], labels: ['plant', 'cow'],
      line: 'Eating the plant passes its protein nitrogen to the cow.',
      agents: [], needs: []
    },
    litter: {
      title: 'Death & waste', icon: 'litter',
      eq: ['Protein N', '→', 'Organic N'],
      line: 'Fallen leaves and dung carry organic nitrogen back to the soil.',
      agents: [], needs: []
    },
    decomposition: {
      title: 'Decomposition', icon: 'decay',
      eq: ['Organic N', '→', 'NH₄⁺'],
      line: 'Bacteria and fungi break down dead matter and release ammonium.',
      agents: ['decomposers'], needs: ['microbes', 'water']
    },
    denitrification: {
      title: 'Denitrification', icon: 'denit',
      eq: ['NO₃⁻', '→', 'N₂'],
      line: 'In waterlogged, oxygen-poor soil, bacteria turn nitrate back into N₂ gas.',
      agents: ['denitrifiers'], needs: ['waterlogged', 'microbes']
    },
    leaching: {
      title: 'Leaching', icon: 'leach',
      eq: ['NO₃⁻', '→', 'groundwater'],
      line: 'Water carries dissolved nitrate below the roots into groundwater.',
      agents: [], needs: ['waterlogged']
    },
    lightning: {
      title: 'Lightning fixation', icon: 'bolt',
      eq: ['N₂', '→', 'NO₃⁻'],
      line: 'A strike splits N₂; rain washes the nitrate it forms into the soil.',
      agents: [], needs: []
    },
    fertilizer: {
      title: 'Fertilizer', icon: 'fert',
      eq: ['Pellet', '→', 'NH₄⁺', '+', 'NO₃⁻'],
      line: 'Adds 60% ammonium and 40% nitrate straight into the soil.',
      agents: [], needs: []
    },
    leaves: {
      title: 'Added leaves', icon: 'leaf',
      eq: ['Protein N', '→', 'Organic N'],
      line: 'Fresh litter adds 8 units of organic nitrogen for decomposers.',
      agents: ['decomposers'], needs: []
    }
  };

  // The order a learner can step through with ‹ ›.
  const CYCLE = ['fixation', 'nitrification', 'uptake', 'feeding', 'litter', 'decomposition', 'denitrification', 'leaching', 'lightning', 'fertilizer'];

  // Model transfers that belong to each focus. Litter and decomposition use two
  // visual sites (leaf litter, dung) that share the model's single organic pool.
  const FOCUS = {
    fixation: [['air', 'ammonium', 'fixation']],
    nitrification: [['ammonium', 'nitrite', 'nitri1'], ['nitrite', 'nitrate', 'nitri2']],
    nitri1: [['ammonium', 'nitrite', 'nitri1']],
    nitri2: [['nitrite', 'nitrate', 'nitri2']],
    uptake: [['nitrate', 'plant', 'uptake']],
    feeding: [['plant', 'animal', 'feeding']],
    litter: [['plant', 'plant-detritus', 'litter'], ['animal', 'animal-detritus', 'litter']],
    decomposition: [['plant-detritus', 'ammonium', 'decomposition'], ['animal-detritus', 'ammonium', 'decomposition']],
    denitrification: [['nitrate', 'air', 'denitrification']],
    leaching: [['nitrate', 'leached', 'leaching']],
    lightning: [['air', 'nitrate', 'lightning']],
    fertilizer: [['external', 'ammonium', 'fertilizer'], ['external', 'nitrate', 'fertilizer']],
    leaves: [['external', 'plant-detritus', 'leaves']]
  };

  // Model processes that count as active for each focus (for the live rate).
  const RATE_KEYS = {
    nitrification: ['nitri1', 'nitri2'],
    fixation: ['fixation']
  };

  const MICROBES = {
    rhizobium: {
      name: 'Rhizobium etli', role: 'Root-nodule fixer', process: 'fixation', image: 'rhizobium', color: '#ff8fa3',
      input: 'N₂', output: 'NH₄⁺',
      description: 'Lives inside the pink nodules on bean roots. It fixes N₂ from soil air into ammonia, and the plant pays it with sugar.',
      habitat: 'Inside bean root nodules',
      note: 'Representative species. Illustration, not a micrograph; colours are illustrative.',
      source: 'https://pubmed.ncbi.nlm.nih.gov/15184121/'
    },
    soilFixers: {
      name: 'Azotobacter chroococcum', role: 'Free-living fixer', process: 'fixation', image: 'azotobacter', color: '#a99cff',
      input: 'N₂', output: 'NH₄⁺',
      description: 'Fixes nitrogen on its own in airy soil, without a host plant.',
      habitat: 'Aerated soil near roots',
      note: 'The model shares one fixation rate between all fixers.',
      source: 'https://pubmed.ncbi.nlm.nih.gov/15966103/'
    },
    nostoc: {
      name: 'Nostoc commune', role: 'Cyanobacterium', process: 'fixation', image: 'nostoc', color: '#8fdc6a',
      input: 'N₂', output: 'NH₄⁺',
      description: 'Bead-like chains that photosynthesise. Larger pale cells called heterocysts fix nitrogen.',
      habitat: 'Moist, sunlit soil surface',
      note: 'Find the green chains on the soil surface at the left.',
      source: 'https://pubmed.ncbi.nlm.nih.gov/35384797/'
    },
    nitrosomonas: {
      name: 'Nitrosomonas europaea', role: 'Ammonia oxidiser', process: 'nitri1', image: 'nitrosomonas', color: '#ffc857',
      input: 'NH₄⁺', output: 'NO₂⁻',
      description: 'First step of nitrification. Uses oxygen to turn ammonium into nitrite; slows in waterlogged soil.',
      habitat: 'Moist, oxygenated soil',
      note: 'Other bacteria and archaea also do this step.',
      source: 'https://pubmed.ncbi.nlm.nih.gov/29577088/'
    },
    nitrobacter: {
      name: 'Nitrobacter winogradskyi', role: 'Nitrite oxidiser', process: 'nitri2', image: 'nitrobacter', color: '#4fd6c8',
      input: 'NO₂⁻', output: 'NO₃⁻',
      description: 'Second step of nitrification. Turns nitrite into nitrate, the form roots absorb here.',
      habitat: 'Moist, oxygenated soil',
      note: 'Other microorganisms also oxidise nitrite.',
      source: 'https://pubmed.ncbi.nlm.nih.gov/29577088/'
    },
    denitrifiers: {
      name: 'Stutzerimonas stutzeri', role: 'Denitrifier', process: 'denitrification', image: 'stutzerimonas', color: '#c38bff',
      input: 'NO₃⁻', output: 'N₂',
      description: 'When oxygen runs out, it breathes nitrate instead and releases nitrogen gas.',
      habitat: 'Wet, oxygen-poor soil and sediment',
      note: 'Formerly Pseudomonas stutzeri. Intermediates such as N₂O are not tracked separately.',
      source: 'https://pubmed.ncbi.nlm.nih.gov/16760312/'
    },
    decomposers: {
      name: 'Bacillus subtilis', role: 'Decomposer', process: 'decomposition', image: 'bacillus', color: '#f0deb0',
      input: 'Organic N', output: 'NH₄⁺',
      description: 'Breaks down dead leaves and dung. With fungi, it releases their nitrogen as ammonium (ammonification).',
      habitat: 'Leaf litter, dung and topsoil',
      note: 'The white threads are fungal hyphae, which are not bacteria.',
      source: 'https://doi.org/10.1016/j.envint.2020.105989'
    }
  };
  const MICROBE_ORDER = ['rhizobium', 'soilFixers', 'nostoc', 'nitrosomonas', 'nitrobacter', 'denitrifiers', 'decomposers'];

  // Short names for things in the scene, shown only in focus.
  const THINGS = {
    air: 'Air · 78% N₂',
    nodule: 'Root nodules',
    plant: 'Bean plant',
    cow: 'Cow',
    leafLitter: 'Leaf litter',
    dung: 'Dung',
    ammonium: 'NH₄⁺',
    nitrite: 'NO₂⁻',
    nitrate: 'NO₃⁻',
    water: 'Groundwater'
  };

  const api = { COLORS, NAMES, FORMULAS, PROCESSES, CYCLE, FOCUS, RATE_KEYS, MICROBES, MICROBE_ORDER, THINGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NitrogenContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
