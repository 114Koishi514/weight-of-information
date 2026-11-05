import test from 'node:test';
import assert from 'node:assert/strict';
import {measure,countCharacters,quantity,rasterize} from '../docs/core.js';
test('UTF-8 measures preserved spaces, multilingual text and emoji correctly',()=>{
 assert.equal(measure('hello').bytes,5);assert.equal(measure('你好').bytes,6);assert.equal(measure('🙂').bytes,4);
 assert.equal(measure(' a\n').bytes,3);assert.equal(measure('e\u0301').bytes,3);assert.equal(countCharacters('👨‍👩‍👧‍👦'),1);
});
test('empty input and invalid experiment rates are rejected',()=>{
 for(const input of ['','  ','\n\t'])assert.throws(()=>measure(input),/EMPTY/);
 for(const rate of [0,-1,1.5,Infinity,10001])assert.throws(()=>measure('hello',rate),/INVALID_RATE/);
 assert.throws(()=>measure('a'.repeat(501)),/TOO_LONG/);
});
test('network allocation uses decimal GB and proper joule conversion',()=>{
 const r=measure('a'.repeat(100));assert.ok(Math.abs(r.joules-0.02124)<1e-12);
 assert.ok(Math.abs(r.lampSeconds-0.004248)<1e-12);
 assert.ok(Math.abs(r.riceGrams-0.02124/5290)<1e-12);
 assert.equal(r.materialUnits,5);assert.equal(measure('a'.repeat(21)).materialUnits,2);
 assert.equal(measure('a'.repeat(21),7).materialUnits,3);
});
test('small energy and reference values never round to zero',()=>{
 const r=measure('a');assert.notEqual(quantity(r.joules,'energy').value,'0');assert.notEqual(quantity(r.riceGrams,'rice').value,'0');assert.notEqual(quantity(r.lampSeconds,'time').value,'0');
 assert.equal(quantity(0.004248,'time').unit,'ms');assert.equal(quantity(0.000004,'rice').unit,'µg');
});
test('384-dot raster maps pixels to high-to-low bits and ignores transparent pixels',()=>{
 const data=new Uint8ClampedArray(384*2*4).fill(255);
 const black=(x,y)=>{let p=(384*y+x)*4;data[p]=data[p+1]=data[p+2]=0;};
 black(0,0);black(7,0);black(8,0);black(383,1);black(10,1);data[(384+10)*4+3]=0;
 const r=rasterize({width:384,height:2,data});assert.equal(r.length,96);assert.equal(r[0],129);assert.equal(r[1],128);assert.equal(r[95],1);assert.equal(r[49],0);
 assert.throws(()=>rasterize({width:380,height:2,data}),/INVALID_RASTER_SIZE/);
});
