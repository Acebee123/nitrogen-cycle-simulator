/* Both outputs share one source: the immersive 2.5D landscape and the same scientific model. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),src=path.join(root,'src');
const read=f=>fs.readFileSync(path.join(src,f),'utf8').replace(/\r\n/g,'\n'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const scripts=['model.js','content.js','scene.js','art.js','flows.js','journey.js','app.js'],files=['styles.css',...scripts];
const mime=f=>f.endsWith('.jpg')||f.endsWith('.jpeg')?'image/jpeg':f.endsWith('.webp')?'image/webp':'image/png';
function withStartupNotice(html){
 return html.replace('<main class="app">',()=>read('startup-notice.html')+'\n<main class="app">').replace('</body>',()=>'<script data-source="startup-check.js">'+read('startup-check.js')+'</script>\n</body>');
}
function build(target='all'){
 if(!['all','web','offline'].includes(target))throw Error('Expected all, web or offline');
 for(const file of scripts)new vm.Script(read(file),{filename:file});
 const template=withStartupNotice(read('index.html'));
 if(target!=='offline'){
  const dest=path.join(root,'dist-web');fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'index.html'),template);
  for(const f of files)fs.writeFileSync(path.join(dest,f),read(f));
  fs.rmSync(path.join(dest,'assets'),{recursive:true,force:true});fs.cpSync(path.join(src,'assets'),path.join(dest,'assets'),{recursive:true});
  for(const old of ['original.css','clarity.css','clarity.js'])fs.rmSync(path.join(dest,old),{force:true});
  fs.writeFileSync(path.join(dest,'build-manifest.json'),JSON.stringify({renderer:'2.5d',files:Object.fromEntries(['index.html',...files].map(f=>[f,hash(fs.readFileSync(path.join(dest,f)))]))},null,2));
  console.log('Built dist-web/ — immersive 2.5D landscape');
 }
 if(target!=='web'){
  const dest=path.join(root,'dist-offline');fs.mkdirSync(dest,{recursive:true});
  let html=template.replace('<html lang="en">','<html lang="en" data-build="offline">');
  html=html.replace('<meta name="theme-color"',`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src data:; media-src data:; object-src 'none'; base-uri 'none'">\n  <meta name="theme-color"`);
  html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>{
   const css=read(file).replace(/url\((['"]?)(assets\/[^)'"\s]+)\1\)/g,(_,quote,asset)=>'url(data:'+mime(asset)+';base64,'+fs.readFileSync(path.join(src,asset)).toString('base64')+')');
   return '<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>';
  });
  html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script data-source="'+file+'">'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');
  if(/<(?:script|link|img|audio|video)\b[^>]*\b(?:src|href)=/.test(html)||/@import\s|url\(['"]?(?:https?:|\/\/|assets\/)/i.test(html))throw Error('Offline external resource');
  fs.writeFileSync(path.join(dest,'Nitrogen-Cycle.html'),html);
  fs.writeFileSync(path.join(dest,'build-manifest.json'),JSON.stringify({renderer:'2.5d',htmlSHA256:hash(html),files:Object.fromEntries(files.map(f=>[f,hash(read(f))]))},null,2));
  console.log('Built dist-offline/Nitrogen-Cycle.html — immersive 2.5D ('+(Buffer.byteLength(html)/1048576).toFixed(1)+' MiB)');
 }
}
if(require.main===module)build(process.argv[2]||'all');
module.exports={build,withStartupNotice,root,src};
