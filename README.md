# Nitrogen Cycle Simulator — immersive 2.5D

A full-screen, living cross-section of a field: sky, bean plant, cow, soil, roots with nodules, seven named microorganisms and groundwater. Every moving particle comes from a real transfer in a mass-conserving nitrogen model; glowing dots resting in the soil show how big each pool is.

## Standalone HTML

Open **dist-offline/Nitrogen-Cycle.html** in a browser that allows local HTML JavaScript. Share this one file through WhatsApp, not the website's index.html. It is about 1 MiB and needs neither a server nor internet. A Content Security Policy blocks all network connections; sound is generated locally.

The page opens on a clean, still landscape — no particles or motion — so you can introduce the scene first. Press **▶ Play** to start the live flow, or the **Journey** button to follow one atom.

## Journey mode — follow one nitrogen atom

Tap the **journey** button (the winding path, next to play) to pause the live model and follow a single glowing nitrogen atom round the cycle, station by station:

air → root nodule (fixation) → Nitrosomonas → Nitrobacter → root hair → leaf → cow → waste → decomposers → denitrifiers → back to the air.

Between stations the atom glides smoothly while the camera follows it. At each station the camera frames the spot and a **microscope lens** opens in the landscape, linked to it by a beam of light. The lens irises open out of the spot. Inside it the reaction plays out with real atoms — inside the bacterium, nodule, root hair, leaf cell, gut or soil: molecules drift in through the cell membrane and tumble, bonds stretch and snap with a spark, new bonds zip closed, ATP is spent by nitrogenase or released as energy for the nitrifying and denitrifying bacteria, and products leave the cell — while the card shows a one-line caption that follows the animation, the equation lighting up step by step, who does it, what it needs, and (tap “=”) the balanced equation. The atom's formula label changes as it is transformed.

The cow carries the atom in three short scenes of its own. **Feeding:** the cow walks up to the bean plant, stretches its neck, opens its mouth and bites off the leaf holding our atom (the plant shakes and a torn stalk is left), chews, and swallows — its body turns see-through so students watch the mouthful slide down the gullet into the rumen. **Waste:** a quick fade to “Hours later…” while the amino acids travel in the blood to the liver, where the x-ray shows the atom. **Leaving the cow:** the camera zooms in on the tail end, the atom runs along the intestine, the tail lifts and dung drops onto the soil — plop — carrying the atom down to the waiting decomposers.

- Advance by tapping the atom or the next-stop beacon, the → button, or **→ / Page Down / Space** (works with a presentation clicker). **← / Page Up** goes back, **R** or tapping the lens replays, **Esc** leaves.
- Side trips: **Lightning** and **Fertilizer** (Haber–Bosch factory → pellet) from the air station, **Leaching** (groundwater → algae bloom) once nitrate forms. Each rejoins the main path.
- The journey is a scripted story; it never changes the live model's pools.

## Using it

- **Floating tab bar (icons only):** play/pause · journey · cycle map · weather & inputs · soil conditions & settings · microbes · explore/zoom · sound.
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

Source lives in `src/`: `model.js` (the unchanged scientific engine), `content.js` (short teaching text and microbe cards), `scene.js` (layout, camera, gestures, labels), `art.js` (the drawn landscape), `flows.js` (particles, pools and process effects), `journey.js` (journey stations and the microscope-lens animations), `app.js` (interface) and `styles.css`. Keep the whole `dist-web` folder together for hosting. The Vercel configuration remains ready; nothing has been deployed.

## Quick manual check

1. Turn off internet and open the standalone file. The landscape appears straight away.
2. Start the journey and step through all eleven stations with →; try each side trip. Then open the cycle map, tap a few arrows and toggle dots/formulas.
3. Try lightning, rain, grow, dead leaves and a fertilizer dose; change moisture and microbe activity.
4. Open the microbes panel, view each card and use **Show me**.
5. Check a phone in portrait and landscape, a tablet and a desktop.

See TESTING.md for what was verified and its limits, and ASSETS.md for the pictures.
