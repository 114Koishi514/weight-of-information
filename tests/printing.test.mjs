import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as core from '../docs/core.js';
import {createBrowserPrinter} from '../docs/browser-print.js';

function documentFixture() {
 const elements=new Map(),translations=[];
 function element(tag='div') {
  return {tagName:tag,children:[],dataset:{},value:'',textContent:'',hidden:false,disabled:false,
   classList:{toggle(){},add(){},remove(){}},lastElementChild:{textContent:''},listeners:{},
   setAttribute(name,value){this[name]=value;},
   append(child){this.children.push(child);if(child.id)elements.set(child.id,child);},
   replaceChildren(...children){this.children=children;},
   getContext(){return {drawImage:(...args)=>{this.drawn=args;}};},
   addEventListener(name,fn){this.listeners[name]=fn;},
   querySelector(){return element('button');},
   showModal(){this.open=true;},close(){this.open=false;},focus(){}
  };
 }
 const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g))elements.set(match[1],element());
 for(const match of html.matchAll(/data-i18n(-html)?="([^"]+)"/g)){
  const e=element();e.dataset[match[1]?'i18nHtml':'i18n']=match[2];translations.push(e);
 }
 return {head:element('head'),body:element('body'),documentElement:{lang:'en'},fonts:{ready:Promise.resolve()},
  getElementById:id=>elements.get(id),createElement:element,
  querySelectorAll(selector){
   if(selector==='[data-i18n]')return translations.filter(e=>e.dataset.i18n);
   if(selector==='[data-i18n-html]')return translations.filter(e=>e.dataset.i18nHtml);
   if(selector==='dialog')return ['settings-dialog','method-dialog'].map(id=>elements.get(id));
   return [];
  },
  querySelector(selector){const key=selector.match(/data-i18n="([^"]+)"/)[1];return translations.find(e=>e.dataset.i18n===key);}
 };
}

function receipt(height=1441) {return {width:384,height,canvas:{receipt:true,height},raster:'AA=='};}

test('browser printing copies the entire receipt outside the scaled UI at thermal-paper dimensions',()=>{
 const doc=documentFixture();let calls=0;
 const printer=createBrowserPrinter(doc,{print(){calls++;assert.equal(printer.printing,true);}});
 const full=receipt();
 assert.equal(printer.print(full),true);
 const root=doc.getElementById('print-root');
 assert.ok(doc.body.children.includes(root));
 assert.equal(root.children[0].width,384);
 assert.equal(root.children[0].height,1441);
 assert.equal(root.children[0].drawn[0],full.canvas);
 assert.match(doc.getElementById('receipt-page-size').textContent,/58mm 191mm/);
 assert.equal(calls,1);
 assert.equal(printer.printing,false);
 printer.print(receipt(800));
 assert.equal(root.children.length,1);
 assert.equal(root.children[0].height,800);
 assert.equal(doc.head.children.length,1);
});

test('invalid receipt never prints and a rejected print dialog does not lock later attempts',()=>{
 const doc=documentFixture();let calls=0;
 const printer=createBrowserPrinter(doc,{print(){calls++;throw new Error('blocked');}});
 assert.throws(()=>printer.print({...receipt(),width:192}),/INVALID_PRINT_RECEIPT/);
 assert.equal(calls,0);
 assert.throws(()=>printer.print(receipt()),/blocked/);
 assert.equal(printer.printing,false);
 assert.throws(()=>printer.print(receipt()),/blocked/);
 assert.equal(calls,2);
});

async function appFixture({local=false,offline=false,blocked=false}={}) {
 const doc=documentFixture(),requests=[],events={},prints=[];
 const win={
  addEventListener:(event,handler)=>{events[event]=handler;},scrollTo(){},matchMedia(){return {matches:true};},
  print(){events.beforeprint?.();if(blocked)throw new Error('blocked');prints.push(doc.getElementById('print-root').children[0]);}
 };
 const context=vm.createContext({
  ...core,makeReceipt:(_record,isTest)=>receipt(isTest?800:1600),createBrowserPrinter,
  document:doc,window:win,location:{hostname:local?'127.0.0.1':'114koishi514.github.io',port:local?'8765':''},
  localStorage:{getItem(){return null;},setItem(){}},crypto:webcrypto,
  AbortController,setInterval(){},setTimeout:(fn,ms)=>ms>=3000?0:setTimeout(fn,0),clearTimeout,
  fetch:async(url,options)=>{
   requests.push({url,options});if(offline)throw new TypeError('Failed to fetch');
   return {ok:true,json:async()=>url==='/api/status'?{printer:'NETUM',token:'test-session'}:{status:'queued'}};
  }
 });
 const source=readFileSync(new URL('../docs/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInContext(source+'\nthis.actions={submit,testPrint,setLanguage};',context);
 await new Promise(resolve=>setImmediate(resolve));
 return {doc,requests,prints,events,actions:context.actions};
}

test('hosted TEST PRINT opens a test receipt instead of the station setup dead end',async()=>{
 const app=await appFixture();
 await app.actions.testPrint();
 assert.equal(app.prints.length,1);
 assert.equal(app.prints[0].height,800);
 assert.notEqual(app.doc.getElementById('settings-dialog').open,true);
 assert.equal(app.doc.getElementById('test-print').disabled,false);
 assert.equal(app.requests.length,0);
});

test('each hosted exchange opens its own receipt once; language changes and cancellation never claim queue success',async()=>{
 const app=await appFixture();app.doc.getElementById('message').value='Hello 你好';
 await app.actions.submit();
 assert.equal(app.prints.length,1);assert.equal(app.prints[0].height,1600);
 assert.match(app.doc.getElementById('print-result').textContent,/Print window opened/);
 app.actions.setLanguage('zh');
 assert.equal(app.prints.length,1);
 assert.match(app.doc.getElementById('print-result').textContent,/已打开打印窗口/);
 assert.doesNotMatch(app.doc.getElementById('print-result').textContent,/已发送至/);
 assert.equal(app.requests.length,0);
 await app.actions.testPrint();
 assert.equal(app.prints.at(-1).height,800);
 // Ctrl+P after a test restores the current exchange, not the test receipt.
 app.events.beforeprint();
 assert.equal(app.doc.getElementById('print-root').children[0].height,1600);
});

test('a blocked hosted print leaves the result and complete receipt available for Ctrl+P',async()=>{
 const app=await appFixture({blocked:true});app.doc.getElementById('message').value='hello';
 await app.actions.submit();
 assert.equal(app.doc.getElementById('result-screen').hidden,false);
 assert.match(app.doc.getElementById('print-result').textContent,/Ctrl\+P/);
 assert.equal(app.doc.getElementById('print-root').children[0].height,1600);
});

test('local station still sends one authenticated automatic print and never opens a second system dialog',async()=>{
 const app=await appFixture({local:true});app.doc.getElementById('message').value='hello';
 await app.actions.submit();await new Promise(resolve=>setImmediate(resolve));
 const post=app.requests.filter(r=>r.url==='/api/print');
 assert.equal(post.length,1);assert.equal(post[0].options.headers['X-Station-Token'],'test-session');
 assert.equal(JSON.parse(post[0].options.body).height,1600);
 assert.equal(app.prints.length,0);
 assert.match(app.doc.getElementById('print-result').textContent,/Windows print queue/);
});

test('offline local station keeps a pending receipt without creating an accidental duplicate via system printing',async()=>{
 const app=await appFixture({local:true,offline:true});app.doc.getElementById('message').value='hello';
 await app.actions.submit();
 assert.equal(app.prints.length,0);
 assert.equal(app.requests.filter(r=>r.url==='/api/print').length,0);
 assert.match(app.doc.getElementById('print-result').textContent,/Connecting/);
});
