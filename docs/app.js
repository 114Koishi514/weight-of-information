import {MODEL,measure,quantity,identifier,countCharacters} from './core.js';
import {makeReceipt} from './receipt.js';
import {createBrowserPrinter} from './browser-print.js';
const $=id=>document.getElementById(id);
const strings={
 en:{station:'EXPERIMENT 01 / EXCHANGE STATION',test:'TEST PRINT',projectTag:'A MATERIAL EXPERIMENT',title:'WHAT DOES<br>YOUR MESSAGE<br><span class="outline-word">WEIGH?</span>',intro:'A message feels weightless. Give yours a physical form.',step1:'LEAVE A MESSAGE',step2:'SEE ITS WEIGHT',step3:'COLLECT THE TRACE',inputHeading:'INPUT TERMINAL',type:'TYPE',speak:'SPEAK',spokenLanguage:'Spoken language',record:'START SPEAKING',stop:'STOP & REVIEW',speechNote:'Your browser may process audio online. Review the transcript before exchanging.',messageLabel:'What would you like to say?',reviewHint:'Your words. Exactly as you leave them.',exchange:'EXCHANGE MESSAGE',outputHeading:'ON THE OTHER SIDE',outputTitle:'A FEW WORDS.<br>A PHYSICAL TRACE.',outputText:'Discover your message’s data size, its energy references, and the material it exchanges for.',autoPrint:'AUTO PRINT',inputNote:'One message, one exchange. Your receipt is sent automatically at the end.',measuring:'MEASURING YOUR MESSAGE',loadingTitle:'WORDS IN.<br>MATTER OUT.',resultTag:'EXCHANGE COMPLETE',resultTitle:'YOUR WORDS,<br>MADE TANGIBLE.',dataSize:'DATA SIZE',networkEnergy:'MODELLED NETWORK ENERGY',equivalentTitle:'THE SAME ENERGY, TWO EVERYDAY REFERENCES',how:'HOW IS THIS CALCULATED? ↗',foodLabel:'FOOD / COOKED RICE',riceDescription:'contains this much food energy',lightLabel:'LIGHT / 5 W LED',lampDescription:'of light from a 5-watt LED',modelNote:'A data-based allocation, not a meter reading. Both references describe the same estimated energy.',materialTitle:'YOUR MATERIAL EXCHANGE',paperUnits:'paper units',another:'ANOTHER MESSAGE',receiptCaption:'YOUR PHYSICAL RECORD',method:'THE METHOD',setup:'STATION SETUP',footer:'SMALL WORDS. MATERIAL CONSEQUENCES.',setupDescription:'Operator settings for the physical experiment.',rateLabel:'Bytes per paper unit',rateNote:'An experimental rule, rounded up to whole units. Define one paper unit with your chosen material before the session.',saveSettings:'SAVE EXCHANGE RATE',automaticPrinting:'AUTOMATIC RECEIPT PRINTING',setup1:'Connect your NETUM printer and make sure its Windows test page works.',setup2:'Download and extract the station package. Double-click START_STATION.cmd.',setup3:'Select your printer. Use the local webpage that opens, and keep the station window open.',download:'DOWNLOAD WINDOWS STATION ↗',setupNote:'No Python or Node installation needed. Printing uses your installed Windows printer queue. Voice input may still need an internet connection.',placeholder:'Type something you want to tell someone…',offline:'PRINTER OFFLINE',ready:'PRINTER LINK READY',hosted:'This online version can calculate and preview receipts. For automatic physical printing, run the Windows station below.',connected:'Connected to Windows printer queue: ',disconnected:'The local print connection is unavailable. Keep the station window open and check your printer.',saved:'Exchange rate saved for the next message.',badRate:'Enter a whole number between 1 and 10,000.',tooLong:'Please keep your message to 500 characters.',empty:'Leave a message before exchanging.',unsupported:'Speech recognition is unavailable in this browser. Try the latest Chrome, or type your message.',listening:'Listening… speak, then select STOP & REVIEW.',speechDone:'Review or edit your transcript, then exchange it.',noSpeech:'No speech was recognised. Try again, or type your message.',permission:'Microphone access was not granted. Enable it in browser settings or type your message.',network:'Speech recognition could not connect. Check your internet connection or type your message.',micError:'No microphone is available. Connect one, or type your message.',speechError:'Speech recognition stopped. You can edit or type your message.',queued:'Receipt sent to the Windows print queue. Collect it from the printer.',pending:'Connecting to the printer… receipt will send automatically.',preview:'Receipt preview ready. Automatic printing is available in the Windows station.',failed:'The printer has not accepted this receipt. Check the station window; the connection will retry automatically.',uncertain:'Printer acknowledgement is uncertain. Check the paper and station window before repeating this exchange.',testSent:'Test receipt sent to the Windows print queue.',testPending:'Sending test receipt…',testOffline:'Open the Windows station to test physical printing.',rateText:(rate)=>`1 paper unit / ${rate} bytes · rounded up · experimental rule`,setupPrinter:'Printer connection',printError:'Printing could not be completed. Check the station window.'},
 zh:{station:'实验 01 / 信息交换站',test:'测试打印',projectTag:'一次关于物质的实验',title:'你的一句话，<br>究竟有<br><span class="outline-word">多重？</span>',intro:'信息看起来没有重量。让你的一句话拥有实体。',step1:'留下一句话',step2:'查看它的分量',step3:'领取实体痕迹',inputHeading:'信息输入端',type:'打字',speak:'说话',spokenLanguage:'说话语言',record:'开始说话',stop:'停止并确认',speechNote:'浏览器可能在线处理语音。请在交换前检查转写文字。',messageLabel:'你想说些什么？',reviewHint:'保留你输入的原话。',exchange:'交换这条信息',outputHeading:'交换之后',outputTitle:'几句话。<br>一个实体痕迹。',outputText:'查看消息的数据量、日常能量参照，以及它对应的材料数量。',autoPrint:'自动打印',inputNote:'每条信息对应一次交换。结算后自动发送小票。',measuring:'正在测量你的信息',loadingTitle:'话语进入。<br>物质呈现。',resultTag:'交换完成',resultTitle:'你说的话，<br>现在有了实体。',dataSize:'数据量',networkEnergy:'模型分摊的网络能量',equivalentTitle:'同一份能量，两种日常参照',how:'这些数字如何计算？ ↗',foodLabel:'食物 / 熟米饭',riceDescription:'所含的食物热量',lightLabel:'照明 / 5 W LED 灯',lampDescription:'一盏 5 瓦 LED 灯的点亮时间',modelNote:'这些是按数据量分摊的模型参照，并非实测耗电。两项对应同一份估算能量。',materialTitle:'你的材料兑换',paperUnits:'个纸材单位',another:'交换另一条信息',receiptCaption:'你可以带走的记录',method:'计算方法',setup:'实验设置',footer:'简单的话语。可感知的物质。',setupDescription:'供现场操作者调整的实验设置。',rateLabel:'每个纸材单位对应的字节数',rateNote:'这是实验设定的比例，向上取整。请在实验前，用你选择的材料定义一个纸材单位。',saveSettings:'保存兑换比例',automaticPrinting:'自动打印小票',setup1:'连接 NETUM 打印机，先确认 Windows 测试页能正常打印。',setup2:'下载并解压启动包，双击 START_STATION.cmd。',setup3:'选择打印机，使用自动打开的本地网页，并保持启动窗口开启。',download:'下载 WINDOWS 启动包 ↗',setupNote:'无需安装 Python 或 Node。通过已安装的 Windows 打印队列输出；语音输入可能仍需联网。',placeholder:'输入一句你想告诉某个人的话……',offline:'打印机未连接',ready:'打印连接就绪',hosted:'线上版本支持计算和小票预览。自动实体打印请使用下面的 Windows 启动包。',connected:'已连接 Windows 打印队列：',disconnected:'本地打印连接暂不可用。请保持启动窗口开启，并检查打印机。',saved:'兑换比例已保存，将用于下一条信息。',badRate:'请输入 1 至 10,000 之间的整数。',tooLong:'请将信息控制在 500 个字符以内。',empty:'请先输入一句话。',unsupported:'此浏览器不支持语音识别。请尝试新版 Chrome，或直接打字。',listening:'正在聆听……说完后选择“停止并确认”。',speechDone:'请检查或修改转写文字，然后进行交换。',noSpeech:'没有识别到语音。请重试，或直接打字。',permission:'未获得麦克风权限。可在浏览器设置中允许访问，或直接打字。',network:'语音识别服务连接失败。请检查网络，或直接打字。',micError:'未发现可用的麦克风。请连接麦克风，或直接打字。',speechError:'语音识别已停止。你可以修改或输入文字。',queued:'小票已发送至 Windows 打印队列，请到打印机处领取。',pending:'正在连接打印机……小票将自动发送。',preview:'小票预览已生成。自动实体打印请使用 Windows 启动包。',failed:'打印机尚未接受此小票。请检查启动窗口；恢复连接后会自动重试。',uncertain:'打印确认状态不明。再次交换前请检查出纸及启动窗口，避免重复。',testSent:'测试小票已发送至 Windows 打印队列。',testPending:'正在发送测试小票……',testOffline:'请打开 Windows 本地实验站以测试实体打印。',rateText:(rate)=>`每 ${rate} bytes = 1 个纸材单位 · 向上取整 · 实验设定`,setupPrinter:'打印连接',printError:'打印未完成，请检查启动窗口。'}
};
Object.assign(strings.en,{
 browserPrinter:'SYSTEM PRINT',browserMode:'PRINT DIALOG',
 browserNote:'After each exchange, choose your printer in the print window.',
 browserPrompt:'Print window opened. Choose your NETUM receipt printer and confirm. If it did not open, press Ctrl+P.',
 browserFailed:'The print window could not open. Press Ctrl+P to print this receipt.',
 browserTest:'Test receipt ready. Choose your NETUM printer, 58 mm paper, portrait and 100% scale. Turn off headers and footers.',
 browserHeading:'PRINT DIRECTLY FROM THIS WEBSITE',
 browserHelp:'TEST PRINT opens a receipt in the system print window. Choose your NETUM printer, 58 mm paper, portrait and 100% scale. Turn off headers and footers. Each exchange opens its own receipt automatically; confirm Print to send it.',
 hosted:'This website prints through the system print window. For automatic receipts without a dialog, use the Windows station below.',
 openStation:'OPEN LOCAL AUTOMATIC STATION ↗',
 openStationNote:'Already running START_STATION.cmd? Open the local station here. Otherwise, download and start it first.'
});
Object.assign(strings.zh,{
 browserPrinter:'系统打印',browserMode:'打印窗口',
 browserNote:'每次交换后会打开打印窗口，请选择打印机并确认。',
 browserPrompt:'已打开打印窗口。请选择 NETUM 热敏打印机并确认；若窗口未出现，可按 Ctrl+P 打印这张小票。',
 browserFailed:'未能打开打印窗口。请按 Ctrl+P 打印这张小票。',
 browserTest:'测试小票已准备好。请选择 NETUM 打印机、58 mm 纸张、纵向和 100% 缩放，并关闭页眉页脚。',
 browserHeading:'直接从此网站打印',
 browserHelp:'右上角“测试打印”会打开系统打印窗口。请选择 NETUM 打印机、58 mm 纸张、纵向和 100% 缩放，并关闭页眉页脚。每次交换后会自动打开对应小票，点击打印即可发送。',
 hosted:'此网站通过系统打印窗口打印。若需要结算后直接出纸、不弹确认窗口，请使用下方 Windows 本地实验站。',
 openStation:'打开本地自动打印实验站 ↗',
 openStationNote:'如果 START_STATION.cmd 已经运行，可从这里打开本地实验站；否则请先下载并启动。'
});
let lang='en',mode='text',screen='input',current=null,recording=false,recognition=null,bridge=null,token=null,rate=20,busy=false,speechFailed=false;
let toastTimer;const jobs=new Map();let printBusy=false;
const browserPrinter=createBrowserPrinter(document,window);
const localStation=['127.0.0.1','localhost'].includes(location.hostname) && location.port==='8765';
try{rate=Number(localStorage.getItem('woi-rate'))||20;if(!Number.isInteger(rate)||rate<1||rate>10000)rate=20;}catch{}
const t=key=>strings[lang][key];
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function showScreen(name){screen=name;for(const item of ['input','loading','result'])$(item+'-screen').hidden=item!==name;window.scrollTo({top:0,behavior:'instant'});}
function setLanguage(value){lang=value;document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.querySelectorAll('[data-i18n-html]').forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));$('language').textContent=lang==='en'?'中文':'EN';$('language').setAttribute('aria-label',lang==='en'?'Switch to Chinese':'切换为英文');$('message').placeholder=t('placeholder');$('record').lastElementChild.textContent=t(recording?'stop':'record');updatePrinter();renderMethod();validate(false);if(current)renderResult(false);}
function renderMethod(){
 const links=`<p><a href="${MODEL.sources.network}" target="_blank" rel="noopener">Sustainable Web Design Model v4</a><br><a href="${MODEL.sources.rice}" target="_blank" rel="noopener">Sainsbury’s cooked basmati rice reference</a><br><a href="${MODEL.sources.critique}" target="_blank" rel="noopener">Mytton, Lundén & Malmodin (2024): model limitations</a><br><a href="${MODEL.sources.units}" target="_blank" rel="noopener">NIST: energy unit conversion</a></p>`;
 $('method-content').innerHTML=lang==='en'?`<p>This experiment separates measured data size, modelled energy references, and a fictional material exchange.</p><h3>01 / THE MESSAGE</h3><p>We count the UTF-8 bytes of the exact text you confirm, including spaces and line breaks. Speech is transcribed into text first; the audio file is not measured.</p><h3>02 / THE ENERGY REFERENCE</h3><p>We apply the SWDM v4 network allocation factor of 0.059 kWh per GB to one text payload, with 1 GB = 1,000,000,000 bytes and 1 kWh = 3,600,000 joules. This is an average attribution, not the actual extra electricity used by sending your message.</p><p>Application overhead, data centres, user devices, storage, speech recognition and printing are outside this calculation. This website does not send the message to a recipient. Small values are displayed in smaller units, without artificial magnification.</p><h3>03 / FOOD & LIGHT</h3><p>Cooked basmati rice: 529 kJ per 100 g, taken from the linked product label. Rice mass = joules ÷ 5,290. A specified 5 W LED uses 5 joules per second, so lighting time = joules ÷ 5. Food energy and electrical energy are compared numerically; their production footprints and useful work differ.</p><h3>04 / THE MATERIAL EXCHANGE</h3><p>One paper unit per ${rate} bytes, rounded up. This is a provisional experiment rule, adjustable in Station setup. Define your physical paper unit before testing. It is independent of the energy model.</p><h3>05 / YOUR WORDS & PRINTING</h3><p>Typed text and receipt rendering stay in this page. The local Windows station receives the receipt image to print it; it keeps only job identifiers and hashes for duplicate prevention, not your message. Your browser’s speech service may process audio online. Closing the page clears any unsent receipts.</p><h3>SOURCES / MODEL ${MODEL.version}</h3>${links}`:
 `<p>本实验分别呈现：可测量的数据量、模型估算的能量参照，以及虚构的材料兑换。</p><h3>01 / 信息</h3><p>按 UTF-8 编码计算最终确认文字的字节数，保留空格和换行。语音先转成文字，再按同样方式计量；不计算录音文件大小。</p><h3>02 / 能量参照</h3><p>采用 SWDM v4 的网络分摊系数 0.059 kWh/GB，用于一份文字载荷。1 GB = 10 亿字节，1 kWh = 360 万焦耳。这是平均分摊模型，不是发送这句话实际增加的耗电。</p><p>不包含应用额外流量、数据中心、用户设备、储存、语音识别及打印。本网站不会把消息发给收件人。数值较小时会换用更小的单位显示，不人为放大。</p><h3>03 / 食物与灯光</h3><p>熟印度香米参照为每 100 克 529 kJ，来自所列产品营养标签。米饭克数 = 焦耳数 ÷ 5290。设定的 5 W LED 灯每秒用 5 焦耳，点亮秒数 = 焦耳数 ÷ 5。食物与电力只比较能量数值，其生产足迹与做功能力不同。</p><h3>04 / 材料兑换</h3><p>每 ${rate} bytes 对应 1 个纸材单位，向上取整。这是可在“实验设置”调整的暂定实验比例，请在测试前定义实体纸材单位。它与能量模型独立。</p><h3>05 / 文字与打印</h3><p>打字和小票绘制在当前页面完成。本地 Windows 程序接收小票图像以打印，只保留防止重复打印的任务编号和摘要，不保存原文。浏览器语音服务可能在线处理声音。关闭网页会清除尚未发送的小票。</p><h3>来源 / 模型 ${MODEL.version}</h3>${links}`;
}
function validate(report=true){const text=$('message').value;const count=countCharacters(text);$('character-count').textContent=`${count} / 500`;$('exchange').disabled=!text.trim()||count>500||text.length>12000||recording||busy;if(report)$('input-error').textContent=count>500||text.length>12000?t('tooLong'):'';return !!text.trim()&&count<=500&&text.length<=12000;}
function switchMode(next){if(recording&&recognition)recognition.stop();mode=next;$('speech-controls').hidden=mode!=='speech';document.querySelectorAll('[data-mode]').forEach(el=>{const active=el.dataset.mode===mode;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});if(mode==='speech'&&!(window.SpeechRecognition||window.webkitSpeechRecognition)){$('speech-status').textContent=t('unsupported');$('record').disabled=true;}else $('record').disabled=false;}
function stopUI(){recording=false;$('message').readOnly=false;$('record').classList.remove('recording');$('record').lastElementChild.textContent=t('record');validate();}
function record(){
 if(recording){recognition?.stop();return;}
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){$('speech-status').textContent=t('unsupported');return;}
 const baseline=$('message').value;recognition=new Speech();recognition.lang=$('speech-language').value;recognition.continuous=true;recognition.interimResults=true;speechFailed=false;
 recognition.onstart=()=>{$('speech-status').textContent=t('listening');};
 recognition.onresult=event=>{let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript;$('message').value=baseline+(baseline&&!/\s$/.test(baseline)?' ':'')+text;validate();};
 recognition.onerror=event=>{speechFailed=true;const key=({'not-allowed':'permission','service-not-allowed':'permission','audio-capture':'micError','network':'network','no-speech':'noSpeech','aborted':'speechError'})[event.error]||'speechError';$('speech-status').textContent=t(key);stopUI();};
 recognition.onend=()=>{stopUI();if(!speechFailed)$('speech-status').textContent=t($('message').value===baseline?'noSpeech':'speechDone');};
 try{recording=true;$('message').readOnly=true;$('record').classList.add('recording');$('record').lastElementChild.textContent=t('stop');validate();recognition.start();}catch{stopUI();$('speech-status').textContent=t('speechError');}
}
async function submit(){
 if(busy||recording)return;if(!validate()){$('input-error').textContent=t($('message').value.trim()?'tooLong':'empty');return;}
 busy=true;validate();
 try{
   const value=measure($('message').value,rate);const now=new Date();
   current={...value,id:identifier(),mode,time:now.toISOString(),timeLabel:now.toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}),printState:localStation?'pending':'browserPrompt'};
   showScreen('loading');await Promise.all([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?80:1150))]);
   current.receipt=makeReceipt(current);renderResult();showScreen('result');
   if(localStation){jobs.set(current.id,{id:current.id,receipt:current.receipt,test:false,record:current,state:'pending'});flush();}
   else {
    try { browserPrinter.print(current.receipt); }
    catch { current.printState='browserFailed';renderResult(false);toast(t('browserFailed')); }
   }
 }catch(error){showScreen('input');$('input-error').textContent=error.message==='MESSAGE_TOO_LONG'?t('tooLong'):'Unable to prepare this exchange. Please try a shorter message.';}finally{busy=false;validate();}
}
function renderResult(draw=true){
 if(!current)return;$('result-id').textContent=current.id;$('result-message').textContent=current.message;$('result-bytes').textContent=current.bytes.toLocaleString('en-GB');
 for(const [key,target,unit] of [['joules','result-energy','energy-unit'],['riceGrams','result-rice','rice-unit'],['lampSeconds','result-lamp','lamp-unit']]){const q=quantity(current[key],key==='joules'?'energy':key==='riceGrams'?'rice':'time');$(target).textContent=q.value;$(unit).textContent=q.unit;}
 $('material-units').textContent=current.materialUnits;$('material-rate').textContent=t('rateText')(current.bytesPerUnit);$('print-result').textContent=t(current.printState||'preview');
 if(draw&&current.receipt){const c=$('receipt');c.height=current.receipt.height;c.getContext('2d').drawImage(current.receipt.canvas,0,0);}
}
function updatePrinter(){const ready=!!bridge;$('printer-status').textContent=t(localStation?(ready?'ready':'offline'):'browserPrinter');$('printer-dot').classList.toggle('ready',ready);$('connection-detail').textContent=ready?t('connected')+bridge.printer:t(localStation?'disconnected':'hosted');document.querySelector('[data-i18n="autoPrint"]').textContent=t(localStation?'autoPrint':'browserMode');document.querySelector('[data-i18n="inputNote"]').textContent=t(localStation?'inputNote':'browserNote');}
async function api(path,options={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),options.method==='POST'?12000:3000);try{const response=await fetch(path,{...options,signal:controller.signal,cache:'no-store',headers:{'Content-Type':'application/json',...(token?{'X-Station-Token':token}:{}),...options.headers}});const data=await response.json();if(!response.ok){const e=new Error(data.error||'Printer request failed');e.status=response.status;e.uncertain=data.uncertain;throw e;}return data;}finally{clearTimeout(timer);}}
async function checkBridge(){if(!localStation)return;try{bridge=await api('/api/status');token=bridge.token;}catch{bridge=null;token=null;}updatePrinter();if(bridge)flush();}
async function flush(){
 if(printBusy||!bridge||!token)return;
 const job=[...jobs.values()].find(j=>j.state==='pending');if(!job)return;printBusy=true;
 try{
  job.state='sending';const response=await api('/api/print',{method:'POST',body:JSON.stringify({id:job.id,width:384,height:job.receipt.height,raster:job.receipt.raster,test:job.test})});
  if(response.status==='queued'||response.status==='duplicate'){job.state='queued';if(job.record)job.record.printState='queued';if(job.test)toast(t('testSent'));jobs.delete(job.id);}else throw new Error('Unexpected printer response');
 }catch(error){job.state=error.uncertain?'uncertain':'pending';if(job.record)job.record.printState=error.uncertain?'uncertain':'failed';if(error.uncertain)jobs.delete(job.id);if(job.test){toast(t('printError'));jobs.delete(job.id);}bridge=null;updatePrinter();}
 finally{printBusy=false;if(current)renderResult(false);$('test-print').disabled=false;if(bridge&&[...jobs.values()].some(j=>j.state==='pending'))flush();}
}
async function testPrint(){
 if(!localStation){
  $('test-print').disabled=true;
  try { await document.fonts.ready;browserPrinter.print(makeReceipt(null,true));toast(t('browserTest')); }
  catch { toast(t('browserFailed')); }
  finally { $('test-print').disabled=false; }
  return;
 }
 $('test-print').disabled=true;await checkBridge();
 if(!bridge){$('test-print').disabled=false;$('material-setting').value=rate;$('settings-dialog').showModal();toast(t('disconnected'));return;}
 await document.fonts.ready;const id='TEST-'+identifier();jobs.set(id,{id,receipt:makeReceipt(null,true),test:true,state:'pending'});toast(t('testPending'));flush();
}
$('message').addEventListener('input',()=>validate());$('exchange').addEventListener('click',submit);$('record').addEventListener('click',record);$('language').addEventListener('click',()=>setLanguage(lang==='en'?'zh':'en'));$('test-print').addEventListener('click',testPrint);
document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>switchMode(el.dataset.mode)));
$('new-message').addEventListener('click',()=>{current=null;$('message').value='';$('speech-status').textContent='';$('input-error').textContent='';showScreen('input');validate();$('message').focus();});
document.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>{$('material-setting').value=rate;$(el.dataset.open).showModal();}));
document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});});
$('save-settings').addEventListener('click',()=>{const value=Number($('material-setting').value);if(!Number.isInteger(value)||value<1||value>10000){toast(t('badRate'));return;}rate=value;try{localStorage.setItem('woi-rate',String(rate));}catch{}renderMethod();toast(t('saved'));});
setInterval(()=>$('clock').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false}),1000);
setInterval(checkBridge,6000);window.addEventListener('online',checkBridge);window.addEventListener('beforeunload',()=>recognition?.abort());
window.addEventListener('beforeprint',()=>{if(!browserPrinter.printing)browserPrinter.prepare(current?.receipt||makeReceipt(null,true));});
setLanguage('en');checkBridge();
