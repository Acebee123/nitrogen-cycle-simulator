/* ES5 so a viewer too old to parse the simulator can still explain the issue. */
(function(){
  function status(){
    var styles=null,science=typeof window.nitrogenDiagnostics==='function',view=null;
    try{if(typeof getComputedStyle==='function')styles=!!getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();if(science)view=window.nitrogenDiagnostics().view;}catch(e){}
    return{protocol:location.protocol,standalone:document.documentElement.getAttribute('data-build')==='offline',css:styles,javascript:science,renderer:view&&(view.renderer||'2.5d'),modelsReady:view&&view.ready,modelError:view&&view.error};
  }
  window.nitrogenLoadingStatus=status;
  var result=status();
  if(!result.javascript||result.css===false){
    var title=document.getElementById('startup-error-title'),copy=document.getElementById('startup-error-copy'),notice=document.getElementById('startup-error');
    title.textContent=result.standalone?'The simulator could not start':'This website page needs its companion files';
    copy.textContent=result.standalone?'Open the complete Nitrogen-Cycle.html file in a browser with JavaScript enabled. Attachment previews may block scripts or graphics. Save the file first, then use Open with Chrome.':'For WhatsApp, share dist-offline/Nitrogen-Cycle.html. The website index.html alone does not contain its CSS and JavaScript. For the website, keep the complete dist-web folder together and serve it normally.';
    notice.hidden=false;var app=document.querySelector('main.app');if(app)app.hidden=true;
  }
})();
