const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../dist-web'),port=Number(process.env.PORT||4177);
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json','.txt':'text/plain'};
http.createServer((req,res)=>{
 try{const url=new URL(req.url,'http://localhost'),decoded=decodeURIComponent(url.pathname),file=path.resolve(base,'.'+decoded+(decoded.endsWith('/')?'index.html':''));
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log('Website preview: http://127.0.0.1:'+port));
