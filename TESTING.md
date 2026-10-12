# Verification — 12 October 2026

## Automated (repeat with `npm test` and `npm run test:responsive`)

- **Science:** 72,021 assertions over 36,000 integration steps — non-negative pools, mass conservation, input accounting, environmental and scenario responses. The model is unchanged.
- **Packaging:** 70 assertions — both outputs from one source template, every standalone script inline and identical to source, all seven pictures embedded, no external resources, CSP blocks connections, unique IDs, no header/footer, icon-only tab bar with accessible names, dots/formula toggle and journey card present (with no animation canvas in the card), superseded files removed, standalone under 2 MiB.
- **Startup diagnostics:** 24 cases across file, content and https contexts with missing CSS/JavaScript.
- **Application:** 221 assertions for the website and 221 for the standalone's inline scripts, network disabled — journey (all eleven stations in order with the atom's compound at each, travel, Next/Previous, arrow, Page Up/Down and Space keys, replay, tapping the atom and the lens, all three side trips and their rejoin points, leaving by ×, Escape, panels and Play, live model untouched and restored), panels, cycle map, focus and stepping, dots/formula toggle (button, F key, remembered choice), fertilizer preview and 60/40 split, leaves, rain, lightning, growth, sliders, speed, scenarios, restart, sound routing, zoom/pan/pinch, resizing, seven microbe cards, Show me, and tapping each colony. Nitrogen is conserved throughout.
- **Screen sizes:** the full application suite at 296×600, 360×740, 390×844, 430×932, 720×460, 960×600, 1366×768 and 1920×1080 (1,768 assertions).

## In a real browser (headless Chromium)

- Website preview and the standalone opened from disk with every network request blocked: no console errors.
- Journey walked station by station at 1440×900 and 390×844, plus all three side trips; the standalone journey also checked offline, with reduced motion and in phone landscape (844×390).
- Screenshots reviewed at 1440×900 and 390×844 (2×): whole scene, close-ups of the cow and plant, molecule view, cycle map, all ten process focuses, lightning, rain, fertilizer, microbe card and Show me, and formula mode.
- Per-frame script time about 4.5 ms (whole view) and 5.6 ms (focus view) at 1280×760. Headless Chromium rasterises without a GPU, so its frame rate is not representative of devices.

## Limits

The application suite uses a DOM/Canvas harness: it runs the real code but does not measure layout, visuals, audio or frame rate. No physical phone was available, so WhatsApp attachment handling and on-device smoothness remain to be checked with the manual steps in README.md. Nothing was deployed.
