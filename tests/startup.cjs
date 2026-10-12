/* Regression for sharing only dist-web/index.html through an attachment. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/startup-check.js'),'utf8');let checks=0;
for(const protocol of ['content:','file:','https:'])for(const standalone of [false,true])for(const missing of ['none','css','js','both']){
 const elements=Object.fromEntries(['startup-error-title','startup-error-copy','startup-error'].map(id=>[id,{hidden:true,textContent:''}])),app={hidden:false};
 const context={location:{protocol},document:{documentElement:{getAttribute:()=>standalone?'offline':null},getElementById:id=>elements[id],querySelector:s=>s==='main.app'?app:null},getComputedStyle:()=>({getPropertyValue:()=>missing==='css'||missing==='both'?'':'#173e31'})};
 context.window=context;if(missing!=='js'&&missing!=='both')context.nitrogenDiagnostics=()=>({view:{renderer:'2.5d',ready:true}});
 vm.runInNewContext(source,context);
 assert.equal(elements['startup-error'].hidden,missing==='none');assert.equal(app.hidden,missing!=='none');
 if(!standalone&&missing!=='none')assert.match(elements['startup-error-copy'].textContent,/dist-offline\/Nitrogen-Cycle.html/);
 assert.equal(context.nitrogenLoadingStatus().protocol,protocol);checks++;
}
console.log('PASS: '+checks+' startup cases across content/file/https, missing CSS/JS and successful builds.');
