import {MODEL,quantity,rasterize,base64} from './core.js';

export function makeReceipt(record, test=false) {
  const canvas=document.createElement('canvas'); canvas.width=384;canvas.height=4096;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,384,4096);ctx.fillStyle='#000';ctx.textBaseline='top';
  let y=24; const left=18,right=366,width=348;
  const font=(size=20,bold=false,pixel=false)=>{ctx.font=`${bold?'bold ':''}${size}px ${pixel?'Silkscreen, ':''}"Courier New", "Microsoft YaHei", monospace`;};
  const line=(text,size=20,bold=false,center=false,pixel=false)=>{font(size,bold,pixel);ctx.textAlign=center?'center':'left';ctx.fillText(String(text),center?192:left,y);y+=Math.ceil(size*1.4);};
  const wrap=(text,size=20,bold=false)=>{
    font(size,bold);ctx.textAlign='left';
    const paragraphs=String(text).split(/\r\n|\r|\n/);
    for(const paragraph of paragraphs){
      const chunks=typeof Intl.Segmenter==='function' ? [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(paragraph)].map(x=>x.segment) : paragraph.split(/(\s+)/);
      let row='';
      for(const chunk of chunks){
        const parts=ctx.measureText(chunk).width>width ? (typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(chunk)].map(x=>x.segment):Array.from(chunk)):[chunk];
        for(const part of parts){
          if(ctx.measureText(row+part).width>width && row){ctx.fillText(row,left,y);y+=size*1.4;row='';if(/^\s+$/.test(part))continue;}
          row+=part;
        }
      }
      ctx.fillText(row,left,y);y+=size*1.4;
    }
  };
  const rule=()=>{y+=12;ctx.fillRect(left,Math.round(y),right-left,2);y+=18;};
  if(test){
    line('TEST PRINT',30,false,true,true);line('THE WEIGHT',24,false,true,true);line('OF INFORMATION',22,false,true,true);rule();
    line('NOT AN EXCHANGE',20,true,true);line('NETUM NT-1809',20,false,true);line('48 mm / 384 dots',18,false,true);rule();
    wrap('English / 中文 / 0123456789',20);wrap('A physical trace of a digital message.',20);rule();
    for(let i=0;i<12;i++){ctx.fillRect(left+i*28,y,14,28);}y+=46;
    wrap('If all squares and both margins are visible, the print area is ready.',18);rule();
    wrap('Automatic receipts will be sent after each exchange.',18);y+=12;
  }else{
    line('THE WEIGHT',26,false,true,true);line('OF INFORMATION',23,false,true,true);y+=8;line('MESSAGE RECEIPT',18,true,true);rule();
    line(record.id,18,true);wrap(record.timeLabel,17);line(`INPUT: ${record.mode==='speech'?'SPEECH TO TEXT':'TYPED TEXT'}`,17);rule();
    line('YOUR MESSAGE',18,true);y+=5;wrap(record.message,21);rule();
    line('DATA SIZE / UTF-8',18,true);line(`${record.bytes} bytes`,32,true);rule();
    line('MODELLED NETWORK ENERGY',17,true);const energy=quantity(record.joules,'energy');line(`${energy.value} ${energy.unit}`,29,true);line('Allocation, not a measurement.',16);rule();
    line('EVERYDAY EQUIVALENTS',18,true);y+=7;
    const rice=quantity(record.riceGrams,'rice');line(`${rice.value} ${rice.unit} COOKED RICE`,20,true);wrap('contains this much food energy',17);y+=13;
    const light=quantity(record.lampSeconds,'time');line(`5 W LED / ${light.value} ${light.unit}`,21,true);wrap('uses the same energy in this time',17);y+=6;wrap('Two references for the same energy.',16);rule();
    line('MATERIAL EXCHANGE',18,true);line(`${record.materialUnits} PAPER ${record.materialUnits===1?'UNIT':'UNITS'}`,29,true);wrap(`1 unit / ${record.bytesPerUnit} bytes. Rounded up. Experimental rate.`,17);rule();
    wrap(`Model ${MODEL.version}. Network only: 0.059 kWh/GB; 1 GB = 10^9 bytes.`,16);y+=8;
    wrap('Text payload only. Excludes app overhead, speech processing, storage and printing.',16);y+=8;
    wrap('Rice reference: 529 kJ/100 g (cooked basmati). See website for sources.',16);y+=15;
    line('A TRACE OF YOUR WORDS.',18,true,true);y+=10;
  }
  if(y>4070)throw new Error('Receipt exceeds printer length limit.');
  const height=Math.ceil(y+24);const cropped=document.createElement('canvas');cropped.width=384;cropped.height=height;
  const c=cropped.getContext('2d',{willReadFrequently:true});c.drawImage(canvas,0,0,384,height,0,0,384,height);
  const pixels=c.getImageData(0,0,384,height);const raster=rasterize(pixels);
  for(let y=0;y<height;y++)for(let x=0;x<384;x++){
    const p=(y*384+x)*4;const ink=(raster[y*48+(x>>3)]&(0x80>>(x%8)))!==0;const value=ink?0:255;
    pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=value;pixels.data[p+3]=255;
  }
  c.putImageData(pixels,0,0);
  return {canvas:cropped,width:384,height,raster:base64(raster)};
}
