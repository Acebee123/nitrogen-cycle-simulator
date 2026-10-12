const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto'), vm = require('node:vm');
const { root, withStartupNotice } = require('../scripts/build.cjs');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n'), hash = b => crypto.createHash('sha256').update(b).digest('hex');
let n = 0; const check = (ok, message) => { assert.ok(ok, message); n++; };
const html = read('dist-offline/Nitrogen-Cycle.html'), web = read('dist-web/index.html'), manifest = JSON.parse(read('dist-offline/build-manifest.json'));
const scripts = ['model.js', 'content.js', 'scene.js', 'art.js', 'flows.js', 'journey.js', 'app.js'];
const pictures = ['rhizobium', 'azotobacter', 'nostoc', 'nitrosomonas', 'nitrobacter', 'stutzerimonas', 'bacillus'].map(p => 'microbe-' + p + '.jpg');

check(manifest.renderer === '2.5d' && JSON.parse(read('dist-web/build-manifest.json')).renderer === '2.5d', 'Both outputs are the 2.5D canvas landscape');
check(manifest.htmlSHA256 === hash(html), 'Standalone fingerprint matches the generated HTML');
check(!/<(?:script|link|img|audio|video)\b[^>]*\b(?:src|href)=/.test(html), 'Standalone has no external resource attributes');
check(!/@import\s|url\(['"]?(?:https?:|\/\/|assets\/)/i.test(html), 'All pictures embedded; no font or network imports');
check(html.includes("connect-src 'none'") && html.includes('data-build="offline"'), 'Standalone blocks network connections');
check(!/serviceWorker\.register|manifest\.webmanifest|rel="manifest"/.test(html), 'No installable app or PWA');
for (const page of [html, web]) {
  check(!/WebGLRenderer|GLTFLoader|\.glb\b|three\.module/i.test(page), 'No 3D runtime or models');
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); check(ids.length === new Set(ids).size, 'No duplicate element IDs');
  check(!/<header\b|<footer\b|<h1\b/.test(page), 'Immersive: no header, footer or page title block');
  const bar = (page.match(/<nav class="tabbar[\s\S]*?<\/nav>/) || [''])[0], buttons = [...bar.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
  check(buttons.length >= 7 && buttons.every(b => /aria-label="[^"]+"/.test(b[0]) && /<svg/.test(b[1]) && !b[1].replace(/<svg[\s\S]*?<\/svg>/g, '').trim()), 'Tab bar buttons are icon-only with accessible names');
  check(/id="journey"/.test(page) && /id="journey-card"/.test(page) && !/id="j-canvas"/.test(page), 'Journey button and card present; the reaction plays in the scene, not the card');
  check(/id="label-mode"/.test(page) && /aria-pressed="false"/.test((page.match(/<button id="label-mode"[^>]*>/) || [''])[0]), 'Dots/formula toggle is present');
}
const inline = [...html.matchAll(/<script data-source="([^"]+)">([\s\S]*?)<\/script>/g)];
check(inline.length === scripts.length + 1, 'Seven application scripts plus the startup diagnostic, all inline');
for (const m of inline) { new vm.Script(m[2]); n++; check(m[2] === read('src/' + m[1]).replace(/<\/script/gi, '<\\/script'), 'Standalone script matches shared source: ' + m[1]); }
check(withStartupNotice(read('src/index.html')) === web, 'Website uses the shared source template');
for (const file of ['styles.css', ...scripts]) check(read('src/' + file) === read('dist-web/' + file), 'Website matches shared source: ' + file);
for (const image of pictures) {
  check(html.includes(fs.readFileSync(path.join(root, 'src/assets', image)).toString('base64')), 'Standalone embeds picture: ' + image);
  check(fs.existsSync(path.join(root, 'dist-web/assets', image)), 'Website ships picture: ' + image);
}
for (const m of web.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) check(fs.existsSync(path.join(root, 'dist-web', m[1])), 'Website runtime resource present: ' + m[1]);
for (const old of ['original.css', 'clarity.css', 'clarity.js']) check(!fs.existsSync(path.join(root, 'src', old)) && !fs.existsSync(path.join(root, 'dist-web', old)), 'Superseded file removed: ' + old);
check(Buffer.byteLength(html) < 2 * 1024 * 1024, 'Standalone stays small enough to share easily (' + (Buffer.byteLength(html) / 1048576).toFixed(2) + ' MiB)');
console.log('PASS: ' + n + ' packaging assertions. Shared source, immersive shell, icon tab bar, embedded pictures, no offline dependencies.');
