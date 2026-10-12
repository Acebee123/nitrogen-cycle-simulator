/* Runs the full application test at eight screen sizes, phone portrait to wide desktop. */
const { execFileSync } = require('node:child_process'), path = require('node:path');
const sizes = [[296, 600], [360, 740], [390, 844], [430, 932], [720, 460], [960, 600], [1366, 768], [1920, 1080]];
let total = 0;
for (const [w, h] of sizes) {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'app.cjs'), `--size=${w}x${h}`], { encoding: 'utf8' });
  const n = Number((out.match(/PASS: (\d+)/) || [])[1]);
  if (!n) { console.error(out); process.exit(1); }
  total += n; console.log(`${w}×${h}: ${n} assertions`);
}
console.log(`PASS: ${total} interaction assertions across ${sizes.length} screen sizes.`);
