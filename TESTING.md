# Verification — 11 October 2026

## Passed

- Both outputs are built from the actual recovered original 2.5D HTML template and shared scientific/UI scripts. Standalone size is approximately 6.4 MiB, reduced from approximately 59 MiB.
- 72,021 scientific assertions including 36,000 integration steps: nonnegative pools, mass conservation, input accounting and environmental/scenario responses.
- 39 packaging assertions: both manifests identify 2.5D, the original recovered template matches exactly, all five standalone scripts parse and match source, picture assets are embedded, external runtime resources are absent, CSP blocks connections, IDs are unique and 3D runtime/model controls are absent. Source model/vendor directories are removed.
- 24 startup cases across file/content/https contexts for successful loading and missing CSS/JavaScript. These contexts test diagnostic logic rather than physical Android behavior.
- 167 application-event assertions for the website and a separate 167 for the actual inline standalone scripts, with fetch blocked: scene zoom/pan, focus/whole modes, all environmental/scenario/playback controls, fertilizer, sound routing, seven individually clickable bacteria pictures and scientific correspondence.
- 1,336 website interaction assertions at eight simulated sizes from 296 to 1920 pixels wide. The two builds share the same HTML template, CSS and scene code.
- Project scan found no remaining GLB/GLTF files or old 3D exports. Original uploaded files outside this project remain untouched.

Run `npm test` and `npm run test:responsive` to repeat the automated checks.

## Limits

The application tests use a DOM/Canvas harness. They execute the real scientific, scene-transform, event and sound-routing code, but do not prove browser CSS layout, visual composition, audio quality or frame rate.

Earlier browser automation rejected local file URL inspection and timed out on the local HTTP preview. No physical Android device was available. Actual phone/WhatsApp and offline browser acceptance remain unverified. Follow the manual steps in README.md on your target devices.

No deployment or installable application was created.
