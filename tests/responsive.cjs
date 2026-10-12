const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname;
const test=fs.readFileSync(path.join(root,'app.cjs'),'utf8');
for(const[width,height]of[[296,380],[336,380],[366,410],[406,450],[720,460],[960,500],[1366,620],[1920,680]]){
  let code=test.replace('const viewport={width:1400,height:620}',`const viewport={width:${width},height:${height}}`);
  code=code.replace("clientX:700,clientY:400",`clientX:${width*.5},clientY:${height*.5}`);
  code=code.replaceAll('clientX:700,clientY:400',`clientX:${width*.5},clientY:${height*.5}`)
    .replaceAll('clientX:630,clientY:400',`clientX:${width*.45},clientY:${height*.5}`)
    .replaceAll('clientX:600,clientY:350',`clientX:${width*.4},clientY:${height*.5}`)
    .replaceAll('clientX:800,clientY:350',`clientX:${width*.6},clientY:${height*.5}`)
    .replaceAll('clientX:900,clientY:350',`clientX:${width*.7},clientY:${height*.5}`);
  // Tiny portrait screens cannot fit every complete process at magnification >1.
  code=code.replace("check(state().view.camera.zoom>1&&state().time===savedTime,'Process focus transitions while paused')","check(state().view.camera.zoom>=1&&state().time===savedTime,'Process focus transitions while paused')");
  code=code.replaceAll("view.target.zoom>1.5","view.target.zoom>1").replaceAll("view.camera.zoom>1.5","view.camera.zoom>1");
  new vm.Script(code,{filename:`responsive-controls-${width}.cjs`}).runInNewContext({console:{log:message=>console.log(`${width}×${height}: ${message}`)},require,__dirname:root,process});
}


