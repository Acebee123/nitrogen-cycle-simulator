# Nitrogen Cycle Simulator — restored 2.5D

**Both the standalone HTML and website now use the original 2.5D ecosystem.** The original landscape, illustrated bean plant, cow, soil cross-section, roots/nodules, microbes and groundwater remain intact. There are no imported 3D models, Three.js dependencies, WebGL requirements or 3D camera controls. The superseded 3D source, model assets, working copies and exports have been removed from this project.

## Standalone HTML

Open **dist-offline/Nitrogen-Cycle.html** in a browser that allows local HTML JavaScript. Share this complete file through WhatsApp, rather than the website's index.html. It is approximately 6.4 MiB and needs neither a local server nor internet access.

CSS, classic JavaScript and the bacteria illustrations are embedded. Rain/thunder are generated locally; fonts use installed system fonts. A Content Security Policy blocks network connections. An attachment preview that disables JavaScript cannot run the simulator: save the complete HTML and open it with a compatible browser. Actual Android behavior depends on the selected browser/viewer; see ANDROID-ATTACHMENT-FIX.md.

## Website and builds

Use Node.js 20 or newer from this project folder. No npm installation, packages or paid APIs are needed.

```sh
npm run build           # generate both 2.5D outputs
npm run build:offline   # generate dist-offline/Nitrogen-Cycle.html
npm run build:web       # generate dist-web/
npm run preview         # website at http://127.0.0.1:4177
npm test                # scientific, packaging, startup and both-build interactions
npm run test:responsive # eight viewport sizes
```

Both outputs use `src/index.html`, recovered from the original working 2.5D version, together with the same scientific engine, scene, controls and illustrations. Keep the entire dist-web folder together for website hosting; Nitrogen-Cycle-Website.zip includes its companion files. The existing Vercel build configuration remains ready for future use. Nothing has been deployed. No app, APK or PWA is included.

## Preserved interactions

- Wheel/pinch zoom and drag pan within the landscape; Roots, Soil compounds, Groundwater and Reset view.
- Whole cycle and process focus, chemical notation, moving particles and explanations. Inspection does not reset or pause the scientific model.
- Lightning, heavy rain, growth, leaves, fertilizer, moisture, bacteria activity, scenarios and Play/Pause/Restart/Speed.
- Optional rain and rolling thunder. Dry weather is silent except when lightning is manually triggered with Sound enabled.
- Seven individually clickable microorganisms with names shown only when selected and their existing illustrated picture cards.
- The unchanged mass-conserving scientific engine. The large analytics dashboard previously removed at your request stays removed.

## Quick manual check

1. Disable internet and open the standalone HTML. Confirm the original landscape appears immediately, without a model-loading screen.
2. Inspect roots and groundwater; zoom, pan and Reset view. Select each process and return to Whole cycle while running and paused.
3. Test environmental controls, fertilizer Add, scenarios and playback. Tap Sound, then test dry lightning and rain.
4. Tap microorganisms and confirm the matching name and picture. Check phone portrait/landscape, tablet and desktop widths.
5. Preview the website and repeat the same actions. Its scene and controls should match the standalone.

See TESTING.md for checks actually performed and their limits. ASSETS.md describes the retained 2.5D assets.
