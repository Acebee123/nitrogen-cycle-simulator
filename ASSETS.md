# Assets

The landscape — sky, hills, tree, bean plant, roots and nodules, cow, soil horizons, groundwater, microbe colonies, litter, dung, fungi, earthworm, particles and molecules — is drawn procedurally on a canvas (`src/art.js`, `src/flows.js`). Nothing is imported, so it stays sharp at every zoom level.

The seven microorganism pictures in `src/assets/microbe-*.jpg` are the existing educational illustrations, cropped from the earlier atlas into one image per species and re-encoded as 440 px JPEGs (about 40 KB each, down from two 2.4 MB PNGs). The standalone build embeds them as data images; the website copies them. They are illustrations, not micrographs or identification evidence.

Fonts are the device's system fonts. Rain and thunder are generated with Web Audio. No external fonts, audio, textures or APIs are used at runtime; reference links open only when chosen.
