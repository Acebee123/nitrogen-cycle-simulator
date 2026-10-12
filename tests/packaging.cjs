const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const {root,withStartupNotice}=require('../scripts/build.cjs'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');let n=0;
const check=(b,m)=>{assert.ok(b,m);n++};
const html=read('dist-offline/Nitrogen-Cycle.html'),web=read('dist-web/index.html'),manifest=JSON.parse(read('dist-offline/build-manifest.json'));
check(manifest.renderer==='2.5d'&&JSON.parse(read('dist-web/build-manifest.json')).renderer==='2.5d','Both outputs are 2.5D');
check(manifest.htmlSHA256===hash(html),'Standalone fingerprint matches generated HTML');
check(!/<(?:script|link|img|audio|video)\b[^>]*\b(?:src|href)=/.test(html),'No offline external resource attributes');
check(!/@import\s|url\(['"]?(?:https?:|\/\/|assets\/)/i.test(html),'All CSS images embedded; no font/network imports');
check(html.includes("connect-src 'none'")&&html.includes('data-build="offline"'),'Standalone blocks connection requests');
check(!/serviceWorker\.register|manifest\.webmanifest|rel="manifest"/.test(html),'No installable app/PWA');
for(const page of [html,web]){
 check(!/WebGLRenderer|GLTFLoader|embedded-(?:bean-plant|cow|root-nodules)|engine\.js|three-controls|soil-opacity|loading-scene|cutaway|\.glb\b/i.test(page),'No 3D runtime, models or controls');
 const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'No duplicate element IDs');
}
const inline=[...html.matchAll(/<script data-source="([^"]+)">([\s\S]*?)<\/script>/g)];
check(inline.length===5,'Four original scripts plus startup diagnostic, all classic and inline');
for(const m of inline){new vm.Script(m[2]);n++;check(m[2]===read('src/'+m[1]).replace(/<\/script/gi,'<\\/script'),'Standalone script matches shared source: '+m[1]);}
check(withStartupNotice(read('src/index.html'))===web,'Both builds use recovered source template');
check(hash(read('src/index.html'))==='9b261f9ffbecd7f5023a5c5ea41f39e7ac281de9d342f9affb49d9af5807840a','Original recovered 2.5D template preserved exactly');
for(const file of ['original.css','clarity.css','model.js','scene.js','clarity.js','app.js'])check(read('src/'+file)===read('dist-web/'+file),'Website matches shared source: '+file);
for(const image of ['microbes-atlas.png','nostoc-commune.png'])check(html.includes(fs.readFileSync(path.join(root,'src/assets',image)).toString('base64')),'Offline picture embedded: '+image);
for(const m of web.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g))check(fs.existsSync(path.join(root,'dist-web',m[1])),'Website runtime resource present: '+m[1]);
check(!fs.existsSync(path.join(root,'src/models'))&&!fs.existsSync(path.join(root,'src/vendor')),'Removed project model assets and Three.js vendor code');
check(Buffer.byteLength(html)<10*1024*1024,'Standalone no longer carries large GLBs');
console.log('PASS: '+n+' packaging assertions. Both outputs use actual restored 2.5D source, embedded pictures, no 3D data or offline dependencies.');
