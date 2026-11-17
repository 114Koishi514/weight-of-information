'use strict';
(() => {
  const WIDTH=800, HEIGHT=500, DIAGONAL_MM=8*25.4;
  const WIDTH_MM=DIAGONAL_MM*WIDTH/Math.hypot(WIDTH,HEIGHT);
  const HEIGHT_MM=WIDTH_MM*HEIGHT/WIDTH;
  const nominal=96/25.4;
  const esc=value=>PTS.record.escape(value);
  const state={tab:'display',details:null,observed:'',scale:1,desired:1,
    displayMessage:'',displaySeen:'',printerMessage:'',paperCode:'',paperSeen:'',requestId:0,devices:null,deviceRequest:0,testRequest:0,testing:false};
  const calibration=new Map();
  function activeScreen(){return state.details?.currentScreen || window.screen;}
  function signature(){
    const s=activeScreen();
    return [s.width,s.height,window.devicePixelRatio||1,s.left??s.availLeft??0,s.top??s.availTop??0].join('-');
  }
  function getCalibration(key){
    if(calibration.has(key))return calibration.get(key);
    let stored;
    try{stored=Number(localStorage.getItem('pts2000.screen.'+key));}catch{}
    return Number.isFinite(stored)&&stored>0?stored:nominal;
  }
  function size(){
    const key=signature();
    if(state.observed!==key){state.displaySeen='';state.displayMessage='';state.observed=key;}
    state.desired=WIDTH_MM*getCalibration(key)/WIDTH;
    state.scale=Math.min(state.desired,window.innerWidth/WIDTH,window.innerHeight/HEIGHT);
    const css=document.documentElement.style;
    css.setProperty('--frame-width',WIDTH*state.scale+'px');
    css.setProperty('--frame-height',HEIGHT*state.scale+'px');
    css.setProperty('--terminal-scale',state.scale);
  }
  function saveScale(pxPerMm){
    const key=signature();
    calibration.set(key,pxPerMm);
    try{localStorage.setItem('pts2000.screen.'+key,String(pxPerMm));}catch{}
    state.displaySeen='';size();
  }
  function redraw(focus){PTS.shell?.render('developer',focus);}
  function whenDisplayChanges(){
    size();if(state.tab==='display')redraw();
  }
  const time=()=>new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const button=(action,label,primary=false)=>'<button type="button" data-debug="'+action+'" class="ctl'+(primary?' primary':'')+'">'+esc(label)+'</button>';
  const literal=s=>'<span data-literal>'+esc(s)+'</span>';
  function row(label,value){
    return '<div class="diag-row"><span>'+esc(label)+'</span><strong>'+value+'</strong></div>';
  }
  function rule(){
    return '<div class="measure-rule" aria-label="50 millimetre calibration line" style="width:'+50*WIDTH/WIDTH_MM+'px"></div>';
  }
  function display(){
    const s=activeScreen(), shown=!!state.displaySeen, list=state.details?.screens || [];
    const label=s.label?literal(s.label):'<span>Current screen</span>';
    let html='<div class="diag-readings">'+row('CURRENT DISPLAY',label+' · '+literal(s.width+' × '+s.height)+' <span>CSS px</span>')+
      row('TERMINAL TARGET',literal('8″ · 16:10 · '+WIDTH_MM.toFixed(1)+' × '+HEIGHT_MM.toFixed(1)+' mm'))+
      row('VISUAL CHECK',shown?'<span>Confirmed on display at</span> '+literal(state.displaySeen):'Not yet confirmed')+'</div>';
    if(list.length)html+='<div class="detected-list">'+list.map((d,i)=>'<div>'+literal(d.label||String(i+1))+' · '+literal(d.width+' × '+d.height)+(d===s?' <span>(current)</span>':'')+'</div>').join('')+'</div>';
    html+='<div class="button-row">'+button('scan','DETECT SCREENS')+button('identify','IDENTIFY DISPLAY',true)+button('fullscreen',document.fullscreenElement?'EXIT FULL SCREEN':'FULL SCREEN')+'</div>';
    html+='<details class="calibration"'+(state.calibrationOpen?' open':'')+'><summary>8-inch size calibration</summary><p>Measure this line with a ruler. Enter its actual length in millimetres.</p>'+rule()+
      '<form id="calibration-form" class="inline-form"><label for="measured">Measured length (mm)</label><input type="number" id="measured" step="any" min="1" max="500" placeholder="50" required><button class="ctl" type="submit">APPLY</button></form>'+
      '<div class="button-row">'+button('use-panel','USE THIS 8″ PANEL')+button('reset-scale','RESET CALIBRATION')+'</div><p>Use the panel preset on the physical 8-inch 16:10 display. Full screen gives the panel its entire viewing area.</p></details>';
    if(state.scale<state.desired-0.001)html+='<p class="message-note">The browser window is smaller than the target. The 16:10 frame is scaled down to fit.</p>';
    return html+'<p role="status" class="message-note">'+esc(state.displayMessage)+'</p>';
  }
  function printer(){
    const devices=state.devices;
    const selected=devices?.selected;
    const deviceName=selected?literal(selected):'<span>Not selected</span>';
    let html='<div class="diag-readings">'+row('WINDOWS PRINT QUEUE',deviceName)+
      row('PAPER / RASTER',literal(PTS.config.PAPER_MM+' mm / 384')+' <span>dots</span>')+
      row('PAPER OUTPUT',state.paperSeen?'<span>Paper confirmed by operator at</span> '+literal(state.paperSeen):'Not yet confirmed')+'</div>';
    html+='<div class="button-row">'+button('connect-printer',devices?'REFRESH PRINTERS':'CONNECT PRINT STATION')+'</div>';
    if(devices && devices.printers.length){
      html+='<form id="printer-choice-form" class="inline-form"><label for="printer-choice">Receipt printer</label><select id="printer-choice" required><option value="">Select a printer</option>'+
        devices.printers.map(name=>'<option data-literal value="'+esc(name)+'"'+(name===selected?' selected':'')+'>'+esc(name)+'</option>').join('')+
        '</select><button type="submit" class="ctl">USE PRINTER</button></form>';
    }
    if(!devices)html+='<p>On the Windows terminal, run Start-PTS2000.cmd to enable background printing.</p>';
    else if(!devices.printers.length)html+='<p>No physical printer found. Connect the NETUM and refresh.</p>';
    html+='<p>Print a test slip on the NETUM. Enter the four digits at the foot of the paper to confirm output.</p>'+
      '<div class="button-row"><button type="button" class="ctl primary" data-debug="test-printer"'+(state.testing?' disabled':'')+'>PRINT TEST SLIP</button></div>'+
      (state.paperCode?'<form id="paper-code-form" class="inline-form"><label for="paper-code">PAPER TEST CODE</label><input type="text" id="paper-code" inputmode="numeric" autocomplete="off" required><button class="ctl" type="submit">CONFIRM PAPER</button></form><div class="button-row">'+button('no-paper','NO PAPER RECEIVED')+'</div>':'')+
      '<p role="status" class="message-note">'+esc(state.printerMessage)+'</p>';
    return html;
  }
  async function readPrinters(name){
    const token=++state.deviceRequest;
    if(name){state.testRequest++;state.testing=false;state.paperCode='';state.paperSeen='';}
    try{
      const devices=name?await PTS.station.choose(name):await PTS.station.connect();
      if(token!==state.deviceRequest)return;
      if(state.devices?.selected!==devices.selected){state.paperSeen='';state.paperCode='';}
      state.devices=devices;
      state.printerMessage=devices.offline?PTS.station.messages.offline:'Printer list updated.';
    }catch{
      if(token!==state.deviceRequest)return;
      state.devices=null;state.printerMessage=PTS.station.messages.unavailable;
    }
    redraw();
  }
  function render(){
    return '<div class="debug-heading"><h1>Developer debug</h1><label for="ui-language">Interface language</label><select id="ui-language"><option value="en" lang="en" data-literal>English</option><option value="zh-CN" lang="zh-CN" data-literal>简体中文</option></select></div>'+
      '<div class="tabs diag-tabs">'+['display','printer'].map(tab=>'<button type="button" class="compact-tab" data-debug="'+tab+'" aria-pressed="'+(state.tab===tab)+'">'+tab.toUpperCase()+'</button>').join('')+'</div>'+
      (state.tab==='display'?display():printer());
  }
  async function scan(){
    if(typeof window.getScreenDetails!=='function'){state.displayMessage='Only the current screen is available in this browser. Use Identify Display to check it.';redraw();return;}
    const id=++state.requestId;
    try{
      const details=await window.getScreenDetails();if(id!==state.requestId)return;
      if(state.details!==details){
        for(const ev of ['screenschange','currentscreenchange'])state.details?.removeEventListener(ev,whenDisplayChanges);
        state.details=details;
        for(const ev of ['screenschange','currentscreenchange'])details.addEventListener(ev,whenDisplayChanges);
      }
      size();state.displayMessage='Display list updated.';
    }catch{state.displayMessage='Display list unavailable. The current screen and visual check are available.';}
    redraw();
  }
  function identify(){
    const key=signature();
    PTS.shell.modal('DISPLAY IDENTIFICATION','<div class="display-pattern"><i></i><i></i><i></i><i></i><strong>PTS2000</strong><span>DISPLAY TEST</span><span data-literal>8″ / 16:10</span></div><p class="identify-note">Confirm when this pattern is visible on the intended physical screen.</p><div class="button-row">'+button('seen','I SEE THE PATTERN',true)+'<button type="button" class="ctl" data-shell="dismiss">BACK</button></div>');
    document.querySelector('#modal [data-debug="seen"]').onclick=()=>{
      if(signature()===key){state.displaySeen=time();state.displayMessage='Visual check confirmed.';}
      else{state.displaySeen='';state.displayMessage='The active display changed. Identify it again.';}
      document.getElementById('modal').close();redraw();
    };
  }
  async function testPaper(){
    if(state.testing)return;
    const token=++state.testRequest;
    const random=new Uint32Array(1);crypto.getRandomValues(random);
    const code=String(random[0]%10000).padStart(4,'0');
    const message='PTS PAPER TEST';
    state.paperCode='';state.paperSeen='';
    const record={id:'TEST-0000',message,testCode:code,...PTS.apps.stamp(),material:'SOFT'};
    state.testing=true;state.printerMessage=PTS.station.messages.pending;redraw();
    let result;
    try{result=await PTS.station.submit([record],true);}catch{result='unconfirmed';}
    if(token!==state.testRequest)return;
    state.testing=false;
    if(result==='queued'){state.paperCode=code;state.printerMessage='Test copy queued. Check the physical slip.';}
    else state.printerMessage=PTS.station.messages[result];
    redraw('#paper-code');
  }
  function act(action){
    switch(action){
      case 'display':case 'printer':
        state.tab=action;redraw('[data-debug="'+action+'"]');
        if(action==='printer' && !state.devices && PTS.station.canSend())readPrinters();
        break;
      case 'connect-printer':readPrinters();break;
      case 'scan':scan();break;
      case 'identify':identify();break;
      case 'fullscreen':{
        const op=document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();
        if(op)op.catch(()=>{state.displayMessage='Use the browser full-screen command on the exhibition display.';redraw();});
        else{state.displayMessage='Use the browser full-screen command on the exhibition display.';redraw();}break;
      }
      case 'use-panel':{
        const s=activeScreen();
        if(Math.abs(s.width/s.height-1.6)>.035)state.displayMessage='The reported screen ratio differs from 16:10. Use the ruler to calibrate this display.';
        else{saveScale(s.width/WIDTH_MM);state.displayMessage='8-inch panel calibration applied.';}
        redraw();break;
      }
      case 'reset-scale':{
        calibration.delete(signature());try{localStorage.removeItem('pts2000.screen.'+signature());}catch{}
        state.displaySeen='';size();state.displayMessage='Reference size restored.';redraw();break;
      }
      case 'test-printer':testPaper();break;
      case 'no-paper':state.paperCode='';state.paperSeen='';state.printerMessage='No paper confirmed. Check the selected Windows queue and try again.';redraw();break;
    }
  }
  function submit(form){
    if(form.id==='printer-choice-form'){readPrinters(form.elements['printer-choice'].value);return;}
    if(form.id==='paper-code-form'){
      if(state.paperCode && form.elements['paper-code'].value.trim()===state.paperCode){
        state.paperSeen=time();state.paperCode='';state.printerMessage='Physical test slip confirmed.';
      }else state.printerMessage='That code does not match the latest test slip.';
      redraw('#paper-code');return;
    }
    if(form.id==='calibration-form'){
      const measured=Number(form.elements.measured.value);
      if(!(measured>=1&&measured<=500))return;
      const pixels=form.parentElement.querySelector('.measure-rule').getBoundingClientRect().width;
      saveScale(pixels/measured);state.displayMessage='Ruler calibration saved.';redraw();
    }
  }
  function init(){
    size();window.addEventListener('resize',whenDisplayChanges);document.addEventListener('fullscreenchange',whenDisplayChanges);
    window.screen.orientation?.addEventListener?.('change',whenDisplayChanges);
  }
  function afterRender(body){
    const sel=body.querySelector('#ui-language');if(sel)sel.value=PTS.lang.current();
    const fold=body.querySelector('.calibration');
    if(fold)fold.ontoggle=()=>{if(fold.isConnected)state.calibrationOpen=fold.open;};
  }
  PTS.developer={init,render,afterRender,act,submit,scale:()=>state.scale};
})();
