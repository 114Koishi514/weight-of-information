'use strict';
(() => {
  const cfg=PTS.config, esc=PTS.record.escape;
  const fresh=()=>({unlocked:false,username:'',page:'inbox',ids:[],selected:new Set(),opened:new Set(),error:'',pendingLookup:false,printStatus:'',job:null});
  let state=fresh();
  const inbox=()=>cfg.INCOMING;
  const button=(act,label,primary=false,disabled=false)=>'<button type="button" class="ctl'+(primary?' primary':'')+'" data-act="'+act+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>';
  const draw=(focus)=>PTS.shell.render('reception',focus);
  const lookup=()=>PTS.apps.state;

  function locked(){
    return `<h1>Message reception</h1>
      <p>Enter the six-digit reception password to open the inbox.</p>
      <form id="reception-login" autocomplete="off">
        <label class="form-field" for="reception-name">Username (optional)</label>
        <input id="reception-name" name="username" type="text" maxlength="40" spellcheck="false" aria-describedby="name-note" value="${esc(state.username)}">
        <p id="name-note">If entered, this name appears on the message and its receipt.</p>
        <label class="form-field" for="reception-pin">Reception password</label>
        <input id="reception-pin" name="pin" type="password" inputmode="numeric" enterkeyhint="go" required aria-invalid="${Boolean(state.error)}" aria-describedby="pin-error">
        <p id="pin-error" class="message-note" role="status">${esc(state.error)}</p>
        <div class="button-row"><button class="ctl primary" type="submit">UNLOCK INBOX</button></div>
      </form>`;
  }
  function listing(){
    const rows=inbox().map(item=>'<li><input type="checkbox" data-pick="'+esc(item.id)+'" aria-label="'+esc('Select message '+item.title)+'"'+(state.selected.has(item.id)?' checked':'')+'><button type="button" class="inbox-row" data-incoming="'+esc(item.id)+'"><b data-literal>'+esc(item.title)+'</b><span class="mail-summary" data-literal><strong>'+esc(item.subject)+'</strong><small>'+esc(item.sender)+'</small></span><span class="mail-state">'+ (state.opened.has(item.id)?'OPENED':'UNOPENED')+'</span><i aria-hidden="true">↵</i></button></li>').join('');
    return '<h1>Incoming messages</h1><p class="inbox-help">Open a message to read it and automatically print a copy.</p><ul class="inbox-list">'+rows+'</ul><div class="button-row">'+button('receive-picked','RECEIVE SELECTED',true,!state.selected.size)+button('session-records','RECORD ARCHIVE')+button('lock-inbox','LOCK')+'</div>';
  }
  function detail(){
    const items=state.ids.map(id=>inbox().find(item=>item.id===id)).filter(Boolean);
    const snippets=items.map(item=>'<section class="incoming-sheet"><h2><span>MESSAGE</span> <span data-literal>'+esc(item.title)+'</span> <strong data-literal>'+esc(item.subject)+'</strong></h2><div class="envelope-line"><span>From</span> <b data-literal>'+esc(item.sender)+'</b>'+(state.username?' <span>To</span> <b data-literal>'+esc(state.username)+'</b>':'')+'</div>'+(PTS.codec.blockCount(item.message.length)>1?'<div class="block-meter">'+PTS.apps.blockMeter(item.message.length)+'</div>':'')+'<pre class="message-content">'+esc(item.message)+'</pre></section>').join('');
    return '<div class="reader-heading"><h1 id="received-title" tabindex="-1">Received messages</h1><div class="button-row">'+button('inbox','BACK TO INBOX')+button('lock-inbox','LOCK')+'</div></div><p id="reception-print-status" class="message-note" role="status">'+esc(PTS.station.messages[state.printStatus]||'')+'</p>'+snippets;
  }
  function render(sessionView){
    if(!state.unlocked)return locked();
    if(state.page==='session')return '<div class="tabs">'+button('inbox','BACK TO INBOX')+button('lock-inbox','LOCK')+'</div>'+sessionView();
    return state.page==='detail'?detail():listing();
  }
  function reset(){state=fresh();}
  function lock(){
    reset();lookup().lookup='';lookup().looked=false;
  }
  function unlock(pin, username = ''){
    state.username = Array.from(username.trim()).slice(0, 40).join('');
    if(pin !== cfg.RECEPTION_PIN){
      state.error = 'Incorrect password. Try again.';
      draw('#reception-pin');
      return false;
    }
    state.unlocked = true;
    state.error = '';
    state.page = state.pendingLookup ? 'session' : 'inbox';
    state.pendingLookup = false;
    draw(state.page==='session'?'#lookup':'[data-incoming]');
    return true;
  }
  function makeRecord(item) {
    return {id:'RX-'+item.id,incomingTitle:item.title,sender:item.sender,subject:item.subject,recipient:state.username,message:item.message,...PTS.apps.stamp(),
      material:item.material==='HARD'?'HARD':'SOFT'};
  }
  async function receive(ids){
    if(!state.unlocked || state.page!=='inbox' || !ids.length)return;
    const wanted=new Set(ids), items=inbox().filter(item=>wanted.has(item.id));
    if(!items.length)return;
    const job=Symbol();
    state.job=job;
    state.ids=items.map(item=>item.id);
    for(const item of items){state.opened.add(item.id);state.selected.delete(item.id);}
    state.page='detail';state.printStatus='pending';
    draw('#received-title');
    let result;
    try {
      result=items.some(item=>PTS.codec.inspect(item.message).error)?'invalid':await PTS.station.submit(items.map(makeRecord));
    } catch { result='unconfirmed'; }
    if(state.job!==job)return;
    state.printStatus=result;
    const status=document.getElementById('reception-print-status');
    if(state.page==='detail' && status){
      status.textContent=PTS.station.messages[result];PTS.lang.apply(status);
    }
  }
  function pick(id,checked,body){
    if(!state.unlocked||!inbox().some(row=>row.id===id))return;
    if(checked)state.selected.add(id);else state.selected.delete(id);
    const go=body.querySelector('[data-act="receive-picked"]');if(go)go.disabled=!state.selected.size;
  }
  function act(which){
    if(!state.unlocked)return true;
    switch(which){
      case 'inbox': state.page='inbox';draw('[data-incoming]');return true;
      case 'session-records': state.page='session';draw('#lookup');return true;
      case 'lock-inbox': lock();draw('#reception-pin');return true;
      case 'receive-picked': receive([...state.selected]);return true;
      default: return false;
    }
  }
  function back(){if(!state.unlocked||state.page==='inbox')return false;state.page='inbox';draw('[data-incoming]');return true;}
  function openSessionRecord(id){
    lookup().lookup=id;lookup().looked=true;
    if(state.unlocked)state.page='session';else state.pendingLookup=true;
    PTS.shell.open('reception');draw();
  }
  function registryChanged(){
    if(state.unlocked && state.page==='session' && (lookup().looked || document.activeElement?.id!=='lookup'))draw();
  }
  PTS.reception={registryChanged,render,unlock,lock,reset,receive,pick,act,back,openSessionRecord,isUnlocked:()=>state.unlocked};
})();
