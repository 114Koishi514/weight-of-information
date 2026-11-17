'use strict';
(() => {
  const {apps,config,record} = PTS, settings=apps.settings;
  const screen=document.getElementById('screen'), area=document.getElementById('workarea');
  const desktop=document.getElementById('desktop'), shortcuts=document.getElementById('shortcuts');
  const host=document.getElementById('windows'), tasks=document.getElementById('tasks');
  const menu=document.getElementById('start-menu'), start=document.getElementById('start');
  const dialog=document.getElementById('modal'), content=document.getElementById('modal-content');
  const boot=document.getElementById('boot'), motion=matchMedia('(prefers-reduced-motion: reduce)');
  const coarse=matchMedia('(pointer: coarse)');
  const openWindows=new Map();
  let selected='transmission', active=null, depth=10, dragging=null, booted=false;
  const timers=[];
  const reduced=()=>settings.reduced||motion.matches;
  const name=id=>id==='developer'?'DEVELOPER DEBUG':(apps.list.find(row=>row[0]===id)?.[1]||'');
  const shortcut=id=>shortcuts.querySelector('[data-app="'+id+'"]');

  function tick(){
    const t=apps.stamp();const c=document.getElementById('clock');
    c.textContent=t.time;c.title=t.date+' / '+t.mode;c.setAttribute('aria-label',t.date+' '+t.time+' '+t.mode);PTS.lang.apply(c);
  }
  function effects(){
    for(const key of ['scanlines','glow','curved','flicker'])screen.classList.toggle(key,settings[key]);
    screen.classList.toggle('reduced',reduced());
    document.getElementById('desktop-hint').textContent=settings.single||coarse.matches?'Select an application to open.':'Double-click an application to open.';
    PTS.lang.apply(document.getElementById('desktop-hint'));
    if(reduced())screen.querySelectorAll('.media-slot video, #boot-art video').forEach(v=>v.pause());
    tick();
  }
  function select(id, focus=false){
    selected=id;for(const b of shortcuts.children)b.classList.toggle('selected',b.dataset.app===id);
    if(focus)shortcut(id)?.focus({preventScroll:true});
  }
  function closeMenu(){
    menu.hidden=true;start.setAttribute('aria-expanded','false');
  }
  function drawTasks(){
    tasks.replaceChildren();
    if(!openWindows.size){
      const path=document.createElement('span');path.className='task-path';path.textContent='PTS:\\DESKTOP';tasks.append(path);return;
    }
    for(const [id,w] of openWindows){
      const b=document.createElement('button');b.type='button';b.className='task-button'+(active===id?' active':'');b.textContent=name(id);
      b.title=(w.el.hidden?'Restore ':'Switch to ')+name(id);b.setAttribute('aria-pressed',String(active===id));b.dataset.task=id;tasks.append(b);
    }
    PTS.lang.apply(tasks);
  }
  function raise(id, focus=false){
    const w=openWindows.get(id);if(!w)return;
    const changed=active!==id || w.el.hidden;
    if(changed){
      w.el.hidden=false;w.z=++depth;w.el.style.zIndex=w.z;active=id;
      for(const [k,item] of openWindows)item.el.classList.toggle('active',k===id);
      drawTasks();
    }
    if(focus && !w.el.contains(document.activeElement)){
      const target=w.body.querySelector('#reception-pin')||w.body.querySelector('textarea,input:not([type="checkbox"]),button:not(:disabled),select')||w.el;
      target.focus({preventScroll:true});
    }
  }
  function focusNext(){
    const visible=[...openWindows.entries()].filter(([,w])=>!w.el.hidden).sort((a,b)=>b[1].z-a[1].z);
    active=null;
    if(visible.length)raise(visible[0][0],true);
    else{drawTasks();select(selected,true);}
  }
  function close(id){
    const w=openWindows.get(id);if(!w)return;
    if(id==='reception')PTS.reception.lock();
    w.el.remove();openWindows.delete(id);
    if(active===id)focusNext();else drawTasks();
  }
  function minimize(id){
    const w=openWindows.get(id);if(!w)return;
    w.el.hidden=true;w.el.classList.remove('active');
    if(active===id)focusNext();else drawTasks();
  }
  function showDesktop(){
    for(const w of openWindows.values()){w.el.hidden=true;w.el.classList.remove('active');}
    active=null;drawTasks();select(selected,true);
  }
  function maximize(id){
    const w=openWindows.get(id);if(!w)return;
    raise(id);const on=w.el.classList.toggle('maximized');w.el.querySelector('[data-window="maximize"]').setAttribute('aria-label',on?'Restore window size':'Maximize window');
    PTS.lang.apply(w.el.querySelector('[data-window="maximize"]'));
    if(!on)place(w);
  }
  function place(w,x=w.x,y=w.y){
    if(w.el.classList.contains('maximized')||w.el.hidden)return;
    w.x=Math.max(0,Math.min(x,area.clientWidth-w.el.offsetWidth));w.y=Math.max(0,Math.min(y,area.clientHeight-w.el.offsetHeight));
    w.el.style.left=w.x+'px';w.el.style.top=w.y+'px';
  }
  function render(id, focusSelector){
    const w=openWindows.get(id);if(!w)return;
    const scroll=w.body.scrollTop;
    apps.render(id,w.body);w.body.scrollTop=focusSelector?0:Math.min(scroll,w.body.scrollHeight);
    w.status.textContent=id==='transmission'?({welcome:'Ready',compose:'Draft',review:'Awaiting confirmation',processing:'Registering',issued:'Record issued'}[apps.state.tx.step]):
      id==='developer'?'Device diagnostics':id==='reception'?(PTS.reception.isUnlocked()?'Incoming mailbox':'Reception locked'):id==='computer'?'Local drive':id==='record'?'PTS-78 / Base 3':'Public information';
    PTS.lang.apply(w.el);
    if(focusSelector && active===id && !w.el.hidden && !dialog.open)w.body.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  function open(id){
    if(!name(id))return;
    closeMenu();if(id!=='developer')select(id);
    if(openWindows.has(id)){raise(id,true);return;}
    const el=document.createElement('section');el.id='win-'+id;el.dataset.id=id;el.className='appwin redraw';el.tabIndex=-1;
    el.setAttribute('role','region');el.setAttribute('aria-labelledby','title-'+id);
    el.innerHTML='<div class="window-title"><span class="title-square" aria-hidden="true"></span><span id="title-'+id+'">'+name(id)+'</span><span class="title-rule"></span><div class="title-controls"><button type="button" data-window="minimize" aria-label="Minimize window">−</button><button type="button" data-window="maximize" aria-label="Maximize window">□</button><button type="button" data-window="close" aria-label="Close window">×</button></div></div><div class="win-body"></div><div class="win-status"><span></span><span>PTS2000</span></div>';
    host.append(el);
    const w={el,body:el.querySelector('.win-body'),status:el.querySelector('.win-status span'),x:0,y:0,z:0};
    const offset=openWindows.size%5*18;openWindows.set(id,w);
    place(w,(area.clientWidth-el.offsetWidth)*.55+offset,(area.clientHeight-el.offsetHeight)*.40+offset);
    render(id);raise(id,true);
  }
  function modal(title,html){
    document.getElementById('modal-title').textContent=title;dialog.setAttribute('aria-labelledby','modal-title');
    content.innerHTML=html;PTS.lang.apply(dialog);if(!dialog.open)dialog.showModal();
    content.scrollTop=0;(content.querySelector('button,input,select')||document.getElementById('modal-close')).focus({preventScroll:true});
  }
  function clearSession(){
    apps.reset();for(const w of openWindows.values())w.el.remove();openWindows.clear();active=null;
    document.getElementById('print-surface').replaceChildren();closeMenu();if(dialog.open)dialog.close();
    select('transmission',true);drawTasks();
  }
  function clearDialog(){
    modal('CLEAR SESSION','<div class="modal-inner"><h1>Clear this session?</h1><p>This clears the draft and locks the inbox. Registered records stay in the local archive.</p><div class="button-row"><button type="button" class="ctl" data-shell="dismiss">CANCEL</button><button type="button" class="ctl primary" data-shell="clear">CLEAR SESSION</button></div></div>');
  }
  function appIcon(id){
    if(id==='about')return '<span class="pts-icon" aria-hidden="true" data-literal>PTS</span>';
    return '<img class="shortcut-icon-img" alt="" src="'+record.escape(config.ASSETS.icons[id])+'">';
  }
  for(const [id,label,lines] of apps.list){
    const b=document.createElement('button');b.type='button';b.className='shortcut';b.dataset.app=id;b.setAttribute('aria-label',label);
    b.insertAdjacentHTML('afterbegin',appIcon(id));
    const text=document.createElement('span');text.className='shortcut-label';text.textContent=lines;b.append(text);shortcuts.append(b);
  }
  const wallpaper=new Image();wallpaper.alt='';wallpaper.src=config.ASSETS.wallpaper;
  document.getElementById('wallpaper').append(wallpaper);
  let pointer='mouse';
  shortcuts.addEventListener('pointerdown',e=>{pointer=e.pointerType;});
  shortcuts.addEventListener('focusin',e=>{const b=e.target.closest('[data-app]');if(b)select(b.dataset.app);});
  shortcuts.addEventListener('click',e=>{
    const b=e.target.closest('[data-app]');if(!b)return;
    select(b.dataset.app);
    if(!e.detail||settings.single||pointer==='touch'||pointer==='pen')open(b.dataset.app);
  });
  shortcuts.addEventListener('dblclick',e=>{const b=e.target.closest('[data-app]');if(b)open(b.dataset.app);});
  shortcuts.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
    const i=apps.list.findIndex(row=>row[0]===selected);
    e.preventDefault();select(apps.list[(i+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)+apps.list.length)%apps.list.length][0],true);
  });
  host.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.appwin');if(!el)return;raise(el.dataset.id);closeMenu();
    const title=e.target.closest('.window-title');
    if(e.button!==0 || !title || e.target.closest('button') || el.classList.contains('maximized'))return;
    const w=openWindows.get(el.dataset.id);dragging={w,p:e.pointerId,startX:e.clientX,startY:e.clientY,x:w.x,y:w.y};title.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove',e=>{if(dragging&&e.pointerId===dragging.p)place(dragging.w,dragging.x+(e.clientX-dragging.startX)/PTS.developer.scale(),dragging.y+(e.clientY-dragging.startY)/PTS.developer.scale());});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(ev,()=>{dragging=null;});
  host.addEventListener('dblclick',e=>{if(e.target.closest('.window-title')&&!e.target.closest('button'))maximize(e.target.closest('.appwin').dataset.id);});
  host.addEventListener('focusin',e=>{const w=e.target.closest('.appwin');if(w)raise(w.dataset.id);});
  host.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;const el=b.closest('.appwin');if(!el)return;
    const id=el.dataset.id;
    if(b.dataset.window){({minimize,maximize,close})[b.dataset.window](id);return;}
    if(b.dataset.incoming){PTS.reception.receive([b.dataset.incoming]);return;}
    if(b.dataset.debug){PTS.developer.act(b.dataset.debug);return;}
    if(b.dataset.act)apps.action(id,b.dataset.act);
  });
  host.addEventListener('input',e=>{
    if(e.target.id==='compose-message'){apps.state.tx.draft=e.target.value;apps.composeFeedback(e.target.closest('.win-body'));}
    if(e.target.id==='lookup'){apps.state.lookup=e.target.value;apps.state.looked=false;const result=e.target.closest('.win-body').querySelector('[aria-live]');if(result)result.replaceChildren();}
  });
  host.addEventListener('submit',e=>{
    e.preventDefault();const form=e.target;
    if(form.id==='reception-login'){
      PTS.reception.unlock(form.elements.pin.value, form.elements.username.value);
      return;
    }
    if(form.id==='lookup-form' && PTS.reception.isUnlocked()){apps.state.lookup=form.querySelector('input').value;apps.state.looked=true;render('reception');return;}
    PTS.developer.submit(form);
  });
  host.addEventListener('change',e=>{
    if(e.target.id==='material-class'){apps.state.tx.material=e.target.value;return;}
    if(e.target.id==='ui-language'){PTS.lang.set(e.target.value);return;}
    if(e.target.dataset.pick){PTS.reception.pick(e.target.dataset.pick,e.target.checked,e.target.closest('.win-body'));return;}
    const key=e.target.dataset.setting;if(!key)return;
    settings[key]=key==='mode'?e.target.value:e.target.checked;effects();
  });
  tasks.addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(!b)return;closeMenu();if(active===b.dataset.task)minimize(active);else{raise(b.dataset.task,true);place(openWindows.get(b.dataset.task));}});
  menu.innerHTML='<strong>PTS2000 / START</strong>'+apps.list.map(([id,label])=>'<button type="button" data-launch="'+id+'">'+appIcon(id)+'<span>'+record.escape(label)+'</span>'+'</button>').join('')+'<hr><button type="button" data-menu="developer">DEVELOPER DEBUG</button><button type="button" data-menu="settings">TERMINAL SETTINGS</button><button type="button" data-menu="clear">CLEAR SESSION…</button>';
  start.onclick=()=>{const opening=menu.hidden;menu.hidden=!opening;start.setAttribute('aria-expanded',String(opening));if(opening)menu.querySelector('button').focus();};
  menu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;closeMenu();if(b.dataset.launch)open(b.dataset.launch);else if(b.dataset.menu==='developer')open('developer');else if(b.dataset.menu==='settings'){apps.state.directory='SYSTEM';apps.state.file='TERMINAL.CFG';open('computer');render('computer');}else clearDialog();});
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!start.contains(e.target))closeMenu();});
  document.getElementById('modal-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{const cmd=e.target.closest('[data-shell]')?.dataset.shell;if(cmd==='dismiss')dialog.close();if(cmd==='clear')clearSession();if(cmd==='zoom'){const on=content.querySelector('.zoom-paper').classList.toggle('magnify');e.target.textContent=on?'FIT TO WINDOW':'ZOOM IN';PTS.lang.apply(e.target);}});
  dialog.addEventListener('close',()=>{if(dialog.open)return;content.replaceChildren();document.getElementById('print-surface').replaceChildren();});
  document.addEventListener('keydown',e=>{
    if(!booted&&e.key==='Enter'){e.preventDefault();finishBoot();return;}
    if(dialog.open||e.key!=='Escape')return;
    if(!menu.hidden){closeMenu();start.focus();e.preventDefault();return;}
    if(active){if(!apps.back(active))minimize(active);e.preventDefault();}
  });
  window.addEventListener('resize',()=>{for(const w of openWindows.values())place(w);});
  motion.addEventListener('change',effects);coarse.addEventListener('change',effects);
  function finishBoot(){
    if(booted)return;booted=true;timers.forEach(clearTimeout);boot.hidden=true;desktop.hidden=false;
    select('transmission',true);drawTasks();tick();
  }
  function startup(){
    const lines=['PTS2000 SERVICE BIOS / 2002','Checking display and keyboard ........ READY','Loading ternary codebook ............. READY','Opening local registry…'];
    const log=document.getElementById('boot-log');
    if(reduced()){log.textContent=lines.join('\n');PTS.lang.apply(log);timers.push(setTimeout(finishBoot,400));}
    else {lines.forEach((line,i)=>timers.push(setTimeout(()=>{log.textContent=lines.slice(0,i+1).join('\n');PTS.lang.apply(log);},i*360)));timers.push(setTimeout(finishBoot,2240));}
    document.getElementById('skip-boot').onclick=finishBoot;
    apps.animateSlot(document.getElementById('boot-art'),config.ASSETS.boot);
  }
  PTS.shell={render,open,close,showDesktop,modal,reduced};
  PTS.apps.initArchive();PTS.developer.init();PTS.lang.set(PTS.lang.current());
  effects();select('transmission');startup();setInterval(tick,15000);
  if('serviceWorker' in navigator && ['https:','http:'].includes(location.protocol))
    navigator.serviceWorker.register('./sw.js').catch(()=>{ /* Local file mode works without the cache. */ });
})();
