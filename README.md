# Nitrogen Cycle Simulator — immersive 2.5D

A full-screen, living cross-section of a field: sky, bean plant, cow, soil, roots with nodules, seven named microorganisms and groundwater. Every moving particle comes from a real transfer in a mass-conserving nitrogen model; glowing dots resting in the soil show how big each pool is.

## Standalone HTML

Open **dist-offline/Nitrogen-Cycle.html** in a browser that allows local HTML JavaScript. Share this one file through WhatsApp, not the website's index.html. It is about 0.9 MiB and needs neither a server nor internet. A Content Security Policy blocks all network connections; sound is generated locally.

## Using it

- **Floating tab bar (icons only):** play/pause · cycle map · weather & inputs · soil conditions & settings · microbes · explore/zoom · sound.
- **Dots / formulas toggle (top left, or press F):** switches every particle in the scene between glowing dots and chemical formula text — NH₄⁺, NO₂⁻, NO₃⁻, N₂ and R–NH₂ for organic nitrogen. The choice is remembered.
- **Cycle map:** a live diagram of the pools (glow grows with the pool) and pathways (arrow speed follows the real rate). Tap an arrow to focus that process.
- **Focus:** the scene dims except the chosen pathway, shows its route with direction arrows and opens a short card with the reaction, conditions, responsible microbes and live rate. Step through all ten processes with ‹ ›.
- **Tap anything:** microbe colonies open their picture card; the plant, cow, litter, dung, water and sky open their process.
- **Zoom in** (pinch, scroll or the explore panel) to see particles become ball-and-stick molecules and root nodules open to show the bacteria inside.
- **What responds to what:** low plant nitrogen yellows the older leaves first; pods appear with plenty of nitrogen; rain raises the water table into the root zone (leaching and denitrification bubbles); lightning splits N₂ and rains nitrate down; fertilizer pellets dissolve into ammonium and nitrate; decomposers' fungal threads pulse while they work.

## Website and builds

Node.js 20 or newer. No packages or paid APIs.

```sh
npm run build           # both outputs
npm run build:offline   # dist-offline/Nitrogen-Cycle.html
npm run build:web       # dist-web/
npm run preview         # website at http://127.0.0.1:4177
npm test                # science, packaging, startup and both builds' interactions
npm run test:responsive # the interaction suite at eight screen sizes
```

Source lives in `src/`: `model.js` (the unchanged scientific engine), `content.js` (short teaching text and microbe cards), `scene.js` (layout, camera, gestures, labels), `art.js` (the drawn landscape), `flows.js` (particles, pools and process effects), `app.js` (interface) and `styles.css`. Keep the whole `dist-web` folder together for hosting. The Vercel configuration remains ready; nothing has been deployed.

## Quick manual check

1. Turn off internet and open the standalone file. The landscape appears straight away.
2. Open the cycle map and tap a few arrows; step through with ‹ ›. Toggle dots/formulas.
3. Try lightning, rain, grow, dead leaves and a fertilizer dose; change moisture and microbe activity.
4. Open the microbes panel, view each card and use **Show me**.
5. Check a phone in portrait and landscape, a tablet and a desktop.

See TESTING.md for what was verified and its limits, and ASSETS.md for the pictures.
