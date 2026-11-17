'use strict';
(() => {
  const cfg = PTS.config, codec = PTS.codec, esc = PTS.record.escape;
  const list = [
    ['transmission','MESSAGE TRANSMISSION','MESSAGE\nTRANSMISSION'],
    ['reception','MESSAGE RECEPTION','MESSAGE\nRECEPTION'],
    ['computer','MY COMPUTER','MY COMPUTER'],
    ['about','ABOUT PTS','ABOUT PTS'],
    ['guide','USER GUIDE','USER GUIDE'],
    ['record','RECORD GUIDE','RECORD GUIDE']
  ];
  const systemStart = Date.now();
  const freshTx = () => ({step:'welcome',draft:'',material:'SOFT',phase:0,record:null,error:''});
  const state = {tx:freshTx(), records:new Map(), serial:0, generation:0,
    archiveError:'', lookup:'', looked:false, directory:'SYSTEM', file:null, guidePage:0, recordPage:0};
  const settings = {mode:cfg.IN_UNIVERSE_DATE_MODE,single:cfg.SINGLE_CLICK,scanlines:cfg.SCANLINES,glow:cfg.GLOW,
    curved:cfg.CURVATURE,flicker:cfg.FLICKER,reduced:false};

  function stamp(now = Date.now()) {
    const demo = settings.mode === '2002';
    const d = demo ? new Date(Date.parse(cfg.DEMO_CLOCK_START) + now - systemStart) : new Date(now);
    const options = demo ? {timeZone:'UTC'} : {};
    return {date:d.toLocaleDateString('en-GB', {...options,day:'2-digit',month:'2-digit',year:'numeric'}),
      time:d.toLocaleTimeString('en-GB', {...options,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),
      mode:demo?'2002 SERVICE CLOCK':'DEVICE LOCAL CLOCK'};
  }
  const idFor = n => 'PTS-' + String(n).padStart(4,'0');
  function button(action, label, primary=false, disabled=false) {
    return '<button type="button" data-act="' + action + '" class="ctl' + (primary?' primary':'') + '"' + (disabled?' disabled':'') + '>' + esc(label) + '</button>';
  }
  function fields(values) {
    return '<dl class="fieldlist">' + values.map(([key,value])=>'<dt>'+esc(key)+'</dt><dd>'+esc(value)+'</dd>').join('') + '</dl>';
  }
  function tabs(values, current, prefix) {
    return '<div class="tabs">' + values.map((v,i)=>'<button type="button" class="compact-tab" aria-pressed="'+(i===current)+'" data-act="'+prefix+i+'">'+esc(v)+'</button>').join('') + '</div>';
  }
  function counts(length){
    const blocks=codec.blockCount(length);
    return [['MESSAGE LENGTH',length+' characters'],['PHYSICAL BLOCKS',String(blocks)],['PAYLOAD',length*4+' symbols'],['FULL RECORD',(length*4+blocks*8)+' symbols']];
  }
  const clockFields=r=>[['RECORD NO.',r.id],['REGISTERED',r.date+'  '+r.time],['MATERIAL CLASS',r.material],...counts(r.message.length)];
  function blockMeter(length){
    const blocks=codec.blockCount(length);
    let html='';
    for(let i=0;i<blocks;i++){
      const usage=Math.min(cfg.BLOCK_CAPACITY,length-i*cfg.BLOCK_CAPACITY);
      html+='<div class="block-chip"><span class="block-cube" aria-hidden="true"><img alt="" src="'+esc(cfg.ASSETS.icons.record)+'"></span><span><strong>Block '+String(i+1).padStart(2,'0')+'</strong><small data-literal>'+usage+' / '+cfg.BLOCK_CAPACITY+'</small></span></div>';
    }
    return html;
  }
  function blockPreviews(record,prefix){
    const blocks=PTS.record.blocksFor(record);
    return '<div class="block-previews'+(blocks.length>1?' multiple':'')+'">'+blocks.map((block,i)=>
      '<button class="paper-button" type="button" data-act="'+prefix+i+'" title="Enlarge physical record">'+PTS.record.paper(block)+
      (blocks.length>1?'<span class="block-caption">'+PTS.record.blockLabel(block)+'</span>':'')+'</button>').join('')+'</div>';
  }
  const demoMessage = 'HELLO';

  function transmission() {
    const tx = state.tx;
    if (tx.step === 'welcome') return '<h1>Public message registration</h1><p class="lead">Welcome to the Public Transmission Service.</p><p>Enter an English message to register it as a physical record. You can review the entry before it joins this terminal’s register.</p><div class="button-row">'+button('begin','BEGIN TRANSMISSION',true)+'</div>';
    const stages = ['COMPOSE','REVIEW','ENCODE','ISSUE'];
    const active = {compose:0,review:1,processing:2,issued:3}[tx.step];
    const strip = '<div class="step-strip" aria-label="Transmission progress">'+stages.map((s,i)=>'<span>'+(i===active?'<strong aria-current="step">'+s+'</strong>':s)+'</span>').join('')+'</div>';
    if (tx.step === 'compose') {
      const v=codec.inspect(tx.draft);
      return strip+'<h1>Compose message</h1><label for="compose-message" class="form-field">ENTER YOUR MESSAGE BELOW.</label><textarea id="compose-message" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="compose-count compose-note">'+esc(tx.draft)+'</textarea><div class="countbar"><span id="compose-count">CHARACTER COUNT '+v.length+'</span><span>ENGLISH / PTS-78</span></div><div id="draft-blocks" class="block-meter" aria-label="Physical blocks"></div><div class="material-row"><label for="material-class">PHYSICAL MATERIAL</label><select id="material-class"><option value="SOFT" '+(tx.material==='SOFT'?'selected':'')+'>SOFT / short-term</option><option value="HARD" '+(tx.material==='HARD'?'selected':'')+'>HARD / long-term</option></select></div><p id="compose-note" class="message-note form-error" role="status"></p><div id="line-fix" '+(/[\r\n]/.test(tx.draft)?'':'hidden')+'>'+button('fix-lines','REPLACE LINE BREAKS WITH SPACES')+'</div><div class="button-row">'+button('review','NEXT: REVIEW',true,!!v.error)+button('clear-draft','CLEAR')+button('welcome','BACK')+'</div>';
    }
    if (tx.step === 'review') {
      const n=codec.inspect(tx.draft).length, t=stamp();
      return strip+'<h1>Review your message</h1><p>Confirm this entry to assign its record number.</p><div class="form-field">MESSAGE CONTENT</div><pre class="message-content">'+esc(tx.draft)+'</pre>' +
        '<div class="block-meter" aria-label="Physical blocks">'+blockMeter(n)+'</div>'+fields([['PROVISIONAL NO.',idFor(state.serial+1)],['SERVICE TIME',t.date+'  '+t.time],['CLOCK',t.mode],['MATERIAL CLASS',tx.material],...counts(n)]) +
        '<p class="message-note" role="status">'+esc(tx.error||state.archiveError)+'</p><div class="button-row">'+button('register','REGISTER MESSAGE',true)+button('edit','BACK TO EDIT')+'</div>';
    }
    if (tx.step === 'processing') {
      const statuses=['READING MESSAGE…','CONVERTING TO TERNARY…','REGISTERING PHYSICAL COPY…'];
      return strip+'<h1>Preparing physical record</h1><p>'+esc(tx.pending?.id||'')+'</p><div class="media-slot" id="encoding-art"></div><ul class="process-list">'+statuses.map((s,i)=>'<li class="'+(i<tx.phase?'done':'')+'">'+s+'</li>').join('')+'</ul><progress max="3" value="'+tx.phase+'" aria-label="Registration progress"></progress>';
    }
    const r=tx.record;
    return strip+'<div class="issued-grid">'+blockPreviews(r,'tx-block-')+'<div><h1>Physical record registered</h1><p>Registration complete. Please retain your record for future reference.</p>'+fields(clockFields(r))+printFeedback(r)+'<div class="button-row">'+button('print','REPRINT RECEIPT',true,printStates.get(r.id)==='pending')+button('enlarge','ENLARGE RECORD')+'</div><div class="button-row">'+button('new','NEW MESSAGE')+button('desktop','RETURN TO DESKTOP')+'</div></div></div>';
  }

  function composeFeedback(body) {
    const v=codec.inspect(state.tx.draft);
    const input=body.querySelector('#compose-message');
    if (!input) return;
    body.querySelector('#compose-count').textContent='CHARACTER COUNT '+v.length;
    const meter=body.querySelector('#draft-blocks');
    meter.innerHTML=v.error?'':blockMeter(v.length);
    PTS.lang.apply(meter);
    body.querySelector('#compose-note').textContent=v.error || 'Ready for review.';
    input.setAttribute('aria-invalid',String(!!v.error && v.length>0));
    body.querySelector('[data-act="review"]').disabled=!!v.error;
    body.querySelector('#line-fix').hidden=!/[\r\n]/.test(state.tx.draft);
    PTS.lang.apply(body.querySelector('#compose-count'));PTS.lang.apply(body.querySelector('#compose-note'));
  }

  function animateSlot(container, spec) {
    if (!container || !spec || !spec.src) return;
    const moving = spec.type==='video' || spec.type==='gif' || /\.gif(?:$|\?)/i.test(spec.src);
    if (moving && PTS.shell.reduced()) {
      if (spec.poster) animateSlot(container,{src:spec.poster,type:'image'});
      return;
    }
    const el=document.createElement(spec.type==='video'?'video':'img');
    if (spec.type==='video') {el.muted=true;el.autoplay=true;el.playsInline=true;el.loop=true;if(spec.poster)el.poster=spec.poster;}
    el.setAttribute('aria-hidden','true'); if(el.tagName==='IMG') el.alt='';
    el.addEventListener('error',()=>el.remove(),{once:true});el.src=spec.src;container.append(el);
  }

  function refresh(id, focus) {PTS.shell.render(id,focus);}
  const printStates=new Map();
  let archiveVersion=0, channel;
  function inflate(row){
    return {...row,id:idFor(row.serial)};
  }
  function archiveChanged(){
    refresh('computer');PTS.reception?.registryChanged();
  }
  function archiveFailure(){
    state.archiveError='The local archive is unavailable. Open the terminal in its usual browser profile and try again.';
  }
  async function syncArchive(){
    const version=++archiveVersion;
    try{
      const rows=await PTS.archive.list();
      if(version!==archiveVersion)return;
      state.records=new Map(rows.map(row=>{const r=inflate(row);return [r.id,r];}));
      state.serial=rows.at(-1)?.serial||0;state.archiveError='';
    }catch{if(version===archiveVersion)archiveFailure();}
    if(version===archiveVersion)archiveChanged();
  }
  function initArchive(){
    syncArchive();
    try{channel=new BroadcastChannel('pts2000-registry-updates');channel.onmessage=syncArchive;}catch{}
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncArchive();});
  }
  function announceArchive(){syncArchive();channel?.postMessage('updated');}
  function printFeedback(r){
    const message=PTS.station.messages[printStates.get(r.id)]||'';
    return '<p class="message-note print-status" role="status">'+esc(message)+'</p>';
  }
  async function sendReceipt(r){
    if(printStates.get(r.id)==='pending')return;
    printStates.set(r.id,'pending');
    const redraw=()=>{
      if(state.tx.step==='issued' && state.tx.record?.id===r.id)refresh('transmission');
      if(state.looked && state.lookup.toUpperCase()===r.id)PTS.reception?.registryChanged();
    };
    redraw();
    let result;
    try{result=await PTS.station.submit([r]);}catch{result='unconfirmed';}
    printStates.set(r.id,result);redraw();
  }
  async function register() {
    const tx=state.tx;
    if(tx.step!=='review' || codec.inspect(tx.draft).error)return;
    const data={message:tx.draft,material:tx.material==='HARD'?'HARD':'SOFT',...stamp(),disposition:'AVAILABLE FOR COLLECTION'};
    tx.phase=1;tx.step='processing';tx.error='';refresh('transmission');
    let r;
    try{
      const verified=PTS.record.blocksFor(data).map(block=>codec.decode(block.encoded.symbols)).join('');
      if(verified!==data.message)throw Error('Registry verification failed');
      const serial=await PTS.archive.add(data);
      r=inflate({...data,serial});
      state.records.set(r.id,r);state.serial=Math.max(state.serial,serial);state.archiveError='';
    }catch{
      archiveFailure();
      if(state.tx===tx){tx.step='review';tx.error='Registration was not saved. No receipt was sent.';refresh('transmission','[data-act="register"]');}
      return;
    }
    // Only an explicit committed registration starts a job. Reading the archive never does.
    sendReceipt(r);archiveChanged();announceArchive();
    if(state.tx!==tx)return;
    tx.pending=r;tx.phase=3;refresh('transmission');
    setTimeout(()=>{
      if(state.tx!==tx)return;
      tx.record=r;tx.step='issued';refresh('transmission','[data-act="enlarge"]');
    },PTS.shell.reduced()?60:400);
  }

  function sessionRecords(){
    const record=state.looked ? state.records.get(state.lookup.trim().toUpperCase()) : null;
    return '<h1>Record archive</h1><p>Look up a record number issued by this terminal.</p><p class="message-note" role="status">'+esc(state.archiveError)+'</p><form id="lookup-form"><label for="lookup" class="form-field">ENTER RECORD NUMBER</label><input id="lookup" type="text" autocomplete="off" spellcheck="false" value="'+esc(state.lookup)+'" placeholder="PTS-0001"> <button type="submit" class="ctl primary">LOOK UP</button></form><div aria-live="polite">'+
      (record ? fields([...clockFields(record),['STATUS',record.disposition]])+'<pre class="message-content">'+esc(record.message)+'</pre>'+(codec.blockCount(record.message.length)>1?blockPreviews(record,'archive-block-'):'')+printFeedback(record)+'<div class="button-row">'+button('collect','MARK COLLECTED')+button('hold','HOLD IN STORAGE')+button('manual','REQUEST MANUAL REVIEW')+button('lookup-print','REPRINT RECEIPT',false,printStates.get(record.id)==='pending')+button('lookup-enlarge','ENLARGE RECORD')+'</div>' :
       state.looked||!state.records.size?'<p>NO MATCHING RECORD IN THE LOCAL ARCHIVE.</p>':'')+'</div>';
  }

  function displaySettings(){
    const rows=[['single','Open applications with one click'],['scanlines','Scanlines'],['glow','Phosphor glow'],['curved','Curved glass'],['flicker','Slow brightness variation'],['reduced','Reduce motion']];
    return '<h2>Terminal settings</h2>'+rows.map(([key,title])=>'<label class="checkrow"><input type="checkbox" data-setting="'+key+'" '+(settings[key]?'checked':'')+'>'+title+'</label>').join('')+
      '<label class="form-field" for="date-mode">SYSTEM CLOCK</label><select id="date-mode" data-setting="mode"><option value="2002" '+(settings.mode==='2002'?'selected':'')+'>2002 service clock</option><option value="local" '+(settings.mode==='local'?'selected':'')+'>Device local date and time</option></select><p>Issued records keep the time and clock mode used at registration.</p>';
  }
  const dirs=['SYSTEM','PUBLIC RECORDS','GUIDES','TERMINAL DATA'];
  const directoryFiles={'SYSTEM':['TERMINAL.CFG','SERVICE.TXT'],'GUIDES':['USER_GUIDE.TXT','RECORD_GUIDE.TXT'],'TERMINAL DATA':['REGISTRY.TXT','PRINTER.TXT']};
  function computer(){
    const dir=state.directory;
    const files=dir==='PUBLIC RECORDS'?[...state.records.keys()]:directoryFiles[dir];
    let detail='';
    if(!state.file) detail=files.length?'<h2>'+esc(dir)+'</h2>'+files.map((f,i)=>'<button class="file-button" type="button" data-act="file-'+i+'">'+esc(f)+'</button>').join(''):'<h2>Public records</h2><p>The local archive has no registered records.</p>';
    else if(state.file==='TERMINAL.CFG') detail=displaySettings();
    else if(state.file==='SERVICE.TXT') detail='<h2>Service information</h2><p>PTS2000 / UK public access unit 01.</p>'+button('open-about','OPEN ABOUT PTS');
    else if(state.file==='USER_GUIDE.TXT' || state.file==='RECORD_GUIDE.TXT') detail='<h2>'+esc(state.file)+'</h2><p>Open this manual in its own window.</p>'+button(state.file==='USER_GUIDE.TXT'?'open-guide':'open-record','OPEN GUIDE');
    else if(state.file==='PRINTER.TXT') detail='<h2>Printer setup</h2>'+fields([['MODEL','NETUM NT-1809'],['ROLL',cfg.PAPER_MM+' mm'],['RASTER',cfg.RECEIPT_DOTS+' dots / '+cfg.PRINTABLE_MM+' mm'],['STATUS','See Developer Debug for the current output test.']])+button('test-print','TEST PRINT')+button('open-print-debug','OPEN DEVELOPER DEBUG');
    else if(state.file==='REGISTRY.TXT') detail='<h2>Local registry</h2>'+fields([['ARCHIVED RECORDS',state.records.size],['NEXT RECORD',idFor(state.serial+1)],['CAPACITY',cfg.BLOCK_CAPACITY+' characters per block']])+'<p>Records are saved in this browser profile on this device.</p>';
    else if(state.records.has(state.file)){const r=state.records.get(state.file);detail='<h2>'+esc(r.id)+'</h2>'+fields(clockFields(r))+'<pre class="message-content">'+esc(r.message)+'</pre><div class="button-row">'+button('open-reception-record','OPEN IN RECEPTION')+'</div>';}
    return '<h1>My computer</h1><address>PTS:\\'+esc(dir)+(state.file?'\\'+esc(state.file):'')+'</address><div class="folder-shell"><nav class="folder-tree" aria-label="Terminal directories">'+dirs.map((d,i)=>'<button type="button" aria-current="'+(d===dir)+'" data-act="dir-'+i+'">'+esc(d)+'</button>').join('')+'</nav><div>'+detail+'</div></div>'+(state.file?'<div class="folder-nav">'+button('folder-back','BACK TO FOLDER')+'</div>':'');
  }
  function about(){
    return '<h1>The Public Transmission Service</h1><p class="lead">A new way to keep information in your hands.</p><p>Following the Millennium record failures, the Public Transmission Service introduced a new method of registering and preserving messages. The PTS2000 terminal converts electronic messages into physical records that can be collected and kept by their holders.</p><p>Your local terminal issues a record number with each confirmed entry. Keep it for collection, storage enquiries or a request for manual review.</p><div class="button-row">'+button('open-guide','OPEN USER GUIDE')+'</div>';
  }
  function guide(){
    const page=state.guidePage;
    return '<h1>User guide</h1><div class="button-row">'+tabs(['REGISTRATION','COLLECTION & STORAGE','PRINTING'],page,'guide-')+'</div>'+
      (page===0?'<h2>Using the terminal</h2><ol class="sheets-list"><li>Open Message Transmission.</li><li>Enter an English message.</li><li>Review and register your entry.</li><li>Allow the terminal to prepare a record.</li><li>Retain your printed copy for reference.</li></ol>':
       page===1?'<h2>Looking after a record</h2><p>Unlock Message Reception. Open a numbered message to read it and print a copy. In Record Archive, enter an issued number to update its collection or storage status, or request manual review.</p><p>Clear Session locks the inbox and clears the draft. Registered records stay in the local archive.</p>':
       '<h2>Printing a temporary copy</h2><p>Registering a message sends a 57 mm receipt to the selected printer. Long messages print in numbered parts. To print another copy, open the record and choose Reprint Receipt.</p><div class="button-row">'+button('test-print','TEST PRINT')+'</div>')+
      '<div class="button-row">'+(page?button('guide-'+(page-1),'BACK'):'')+(page<2?button('guide-'+(page+1),'NEXT'):'')+'</div>';
  }
  function codeTable(){
    const entries=PTS.codebook.payload.map(row=>({name:row[1]===' '?'SPACE':row[1],code:row[2]}));
    for(const [i,label] of [[78,'END'],[79,'RSV'],[80,'PAD']])entries.push({name:label,code:PTS.codebook.controls[i].trits});
    let table='<div class="codebook-wrap"><table aria-label="81 four-trit codes in index order" class="codebook"><tbody>';
    for(let r=0;r<9;r++)table+='<tr>'+entries.slice(r*9,r*9+9).map(e=>'<td><strong>'+esc(e.name)+'</strong><small>'+e.code+'</small></td>').join('')+'</tr>';
    return table+'</tbody></table></div>';
  }
  function recordGuide(){
    const example=codec.encode(demoMessage), page=state.recordPage;
    return '<h1>Record guide</h1><div class="button-row">'+tabs(['READING A RECORD','CHARACTER TABLE'],page,'record-')+'</div>'+
      (page?'<h2>Four-trit codebook</h2><p>Read each row from left to right. END closes the payload. RSV and PAD are reserved.</p>'+codeTable()+'<div class="button-row">'+button('table-zoom','ENLARGE TABLE')+'</div>':
       '<h2>Reading the spiral</h2><p>Start at the outer top-left corner and follow the line clockwise towards the centre. Read four squares at a time. Black halves keep their left and right orientation at every turn. The fine line beyond the last marked group is the empty guide.</p><div class="symbols"><span><i class="trit d0"></i>0 / LEFT</span><span><i class="trit d1"></i>1 / RIGHT</span><span><i class="trit d2"></i>2 / FULL</span></div><p>Each group has weights 27, 9, 3 and 1. The payload ends at 2220. The next group is the sum of all character indices modulo 81, written as four trits. This final value may be any number from 0 to 80.</p><p>Each physical block holds 1,193 characters. Longer messages continue in the next numbered block.</p><div class="form-field">WORKED EXAMPLE / HELLO</div><pre class="code-readout">'+example.payload.join('  ')+'\nEND 2220    CHECK '+example.checksum+'</pre>');
  }

  const renderers={transmission,reception:()=>PTS.reception.render(sessionRecords),computer,about,guide,record:recordGuide,developer:()=>PTS.developer.render()};
  function render(id, body){
    if(id==='transmission' && state.tx.step==='processing' && body.querySelector('.process-list')){
      body.querySelectorAll('.process-list li').forEach((li,i)=>li.classList.toggle('done',i<state.tx.phase));
      body.querySelector('progress').value=state.tx.phase;return;
    }
    body.innerHTML=renderers[id]();
    if(id==='developer')PTS.developer.afterRender(body);
    if(id==='transmission'){
      if(state.tx.step==='compose') {
        // Set the property explicitly to preserve an initial newline in pasted text.
        body.querySelector('textarea').value=state.tx.draft;composeFeedback(body);
      }
      if(state.tx.step==='processing')animateSlot(body.querySelector('#encoding-art'),cfg.ASSETS.encoding);
    }
  }
  function enlarge(r,index=0){
    const blocks=PTS.record.blocksFor(r),block=blocks[index];
    if(!block)return;
    const picker=blocks.length<2?'':'<label for="view-block">Physical block</label><select id="view-block">'+blocks.map((b,i)=>
      '<option value="'+i+'"'+(i===index?' selected':'')+'>'+PTS.record.blockLabel(b)+'</option>').join('')+'</select>';
    PTS.shell.modal('PHYSICAL COPY / '+r.id,'<div class="modal-inner"><div class="button-row">'+picker+'<button type="button" class="ctl" data-shell="zoom">ZOOM IN</button><button type="button" class="ctl" id="save-plate">85 mm · RECORD SVG</button><button type="button" class="ctl" id="save-spiral">70 mm · SPIRAL SVG</button></div><div class="zoom-paper">'+PTS.record.paper(block)+'</div></div>');
    const select=document.getElementById('view-block');
    if(select)select.onchange=()=>{enlarge(r,Number(select.value));document.getElementById('view-block').focus();};
    document.getElementById('save-plate').onclick=()=>PTS.record.download(block,false);
    document.getElementById('save-spiral').onclick=()=>PTS.record.download(block,true);
  }
  async function changeDisposition(r,value){
    try{
      const row=await PTS.archive.setDisposition(r.serial,value);
      state.records.set(r.id,inflate(row));state.archiveError='';announceArchive();
    }catch{archiveFailure();}
    archiveChanged();
  }
  function action(id, act){
    if(id==='reception' && PTS.reception.act(act))return;
    if(act==='open-print-debug'){PTS.developer.act('printer');PTS.shell.open('developer');return;}
    const tx=state.tx;
    const focusMessage='#compose-message';
    if(['begin','edit','new','clear-draft','fix-lines'].includes(act)){
      if(act==='new')state.tx=freshTx();
      if(act==='clear-draft')state.tx.draft='';
      if(act==='fix-lines')state.tx.draft=state.tx.draft.replace(/\r\n?|\n/g,' ');
      state.tx.step='compose';refresh('transmission',focusMessage);return;
    }
    if(act==='welcome'||act==='review'){
      if(act==='review' && codec.inspect(tx.draft).error)return;
      tx.step=act;refresh('transmission',act==='review'?'[data-act="register"]':'[data-act="begin"]');return;
    }
    if(act==='register'){register();return;}
    if(act==='desktop'){PTS.shell.showDesktop();return;}
    if(act==='print'&&tx.record){sendReceipt(tx.record);return;}
    if(act.startsWith('tx-block-')&&tx.record){enlarge(tx.record,Number(act.slice(9)));return;}
    if(act==='enlarge'&&tx.record){enlarge(tx.record);return;}
    if(act==='test-print'){PTS.developer.act('printer');PTS.shell.open('developer');return;}
    if(act==='table-zoom'){PTS.shell.modal('CHARACTER TABLE','<div class="modal-inner">'+codeTable()+'</div>');return;}
    if(act.startsWith('guide-')){state.guidePage=Number(act.slice(6));refresh('guide');return;}
    if(act.startsWith('record-')){state.recordPage=Number(act.slice(7));refresh('record');return;}
    if(act.startsWith('dir-')){state.directory=dirs[Number(act.slice(4))];state.file=null;refresh('computer');return;}
    if(act.startsWith('file-')){const files=state.directory==='PUBLIC RECORDS'?[...state.records.keys()]:directoryFiles[state.directory];state.file=files[Number(act.slice(5))];refresh('computer');return;}
    if(act==='folder-back'){state.file=null;refresh('computer');return;}
    if(act==='open-reception-record'){PTS.reception.openSessionRecord(state.file);return;}
    if(act.startsWith('open-')){PTS.shell.open(act.slice(5));return;}
    const r=state.records.get(state.lookup.trim().toUpperCase());
    if(r&&act==='lookup-print'){sendReceipt(r);return;}
    if(r&&act.startsWith('archive-block-')){enlarge(r,Number(act.slice(14)));return;}
    if(r&&act==='lookup-enlarge'){enlarge(r);return;}
    const dispositions={collect:'COLLECTED',hold:'HELD IN STORAGE',manual:'SUBMITTED FOR MANUAL REVIEW'};
    if(r&&dispositions[act])changeDisposition(r,dispositions[act]);
  }
  function reset(){
    PTS.reception?.reset();
    state.generation++;state.tx=freshTx();state.lookup='';state.looked=false;
    state.directory='SYSTEM';state.file=null;state.guidePage=0;state.recordPage=0;
  }
  function back(id){
    if(id==='reception')return PTS.reception.back();
    if(id==='transmission'&&state.tx.step==='review'){action(id,'edit');return true;}
    if(id==='transmission'&&state.tx.step==='compose'){action(id,'welcome');return true;}
    if(id==='computer'&&state.file){action(id,'folder-back');return true;}
    if(id==='guide'&&state.guidePage){action(id,'guide-'+(state.guidePage-1));return true;}
    if(id==='record'&&state.recordPage){action(id,'record-0');return true;}
    return false;
  }
  PTS.apps={list,state,settings,render,action,back,reset,initArchive,syncArchive,stamp,blockMeter,composeFeedback,animateSlot};
})();
