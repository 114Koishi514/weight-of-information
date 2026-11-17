'use strict';
(() => {
  function escape(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  }

  // Each new coil moves in by one pitch. The next top edge starts one
  // pitch below the previous top edge, so the line is one open spiral.
  function segments(size, margin, pitch) {
    let left = margin, top = margin, right = size - margin, bottom = size - margin;
    let x = left, y = top;
    const lines = [];
    function to(nx, ny) {
      if (nx !== x || ny !== y) lines.push({x, y, nx, ny, dx: Math.sign(nx - x), dy: Math.sign(ny - y), length: Math.abs(nx - x) + Math.abs(ny - y)});
      x = nx; y = ny;
    }
    while (left < right && top < bottom) {
      to(right, top); to(right, bottom); to(left, bottom);
      top += pitch;
      if (top > bottom) break;
      to(left, top); left += pitch; right -= pitch; bottom -= pitch;
      if (right <= left || bottom < top) { if (right >= x) to(right, top); break; }
    }
    return lines;
  }

  // Leave a clear corner and keep each consecutive quartet on one side.
  function layout(symbols, {size, margin, pitch, symbol, step, groupGap, corner = step}) {
    const lines = segments(size, margin, pitch);
    const spots = [];
    for (const side of lines) {
      for (let start = corner; start + 3 * step <= side.length - corner + 1e-7 && spots.length < symbols.length; start += 4 * step + groupGap) {
        for (let k = 0; k < 4; k++) {
          const distance = start + k * step;
          spots.push({x: side.x + side.dx * distance - symbol / 2,
            y: side.y + side.dy * distance - symbol / 2, digit: Number(symbols[spots.length])});
        }
      }
      if (spots.length === symbols.length) break;
    }
    if (spots.length !== symbols.length) throw new RangeError('Record exceeds the physical layout.');
    return {lines, spots, symbol, size};
  }

  // Independent 70 mm record from the approved publication geometry.
  const plate = {size:70, margin:2.78564, pitch:.58928, symbol:.38, step:1.25, groupGap:.55, corner:.76};

  function receiptLayout(symbols, dots = PTS.config.RECEIPT_DOTS) {
    // Integer head dots. Pick the largest printable square that fits the whole message.
    for (let symbol = 24; symbol >= 6; symbol -= 2) {
      try {
        return layout(symbols, {size: dots, margin: symbol, pitch: symbol + 6,
          symbol, step: symbol + 2, groupGap: 2});
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
      }
    }
    throw new RangeError('The message will not fit the receipt at this resolution.');
  }

  const cachedBlocks=new WeakMap();
  function blocksFor(record){
    if(cachedBlocks.has(record))return cachedBlocks.get(record);
    const data=PTS.codec.encodeBlocks(record.message);
    const blocks=data.map((block,index)=>({...record,...block,blockNumber:index+1,blockCount:data.length,wholeLength:record.message.length}));
    cachedBlocks.set(record,blocks);
    return blocks;
  }
  function blockLabel(record){
    return 'BLOCK '+String(record.blockNumber).padStart(2,'0')+' / '+String(record.blockCount).padStart(2,'0');
  }
  const mm = value => Number(value.toFixed(5));
  function spiralContent(record) {
    const {lines,spots,symbol} = layout(record.encoded.symbols, plate);
    const path = 'M'+mm(lines[0].x)+' '+mm(lines[0].y)+lines.map(l=>'L'+mm(l.nx)+' '+mm(l.ny)).join('');
    // Compound paths keep large, multi-block previews light without changing any printed dimensions.
    const outlines=[], fills=[];
    function square(x,y,width){
      return 'M'+mm(x)+' '+mm(y)+'h'+width+'v.38h-'+width+'z';
    }
    for(const {x,y,digit} of spots){
      outlines.push(square(x,y,symbol));
      fills.push(square(digit===1?x+symbol/2:x,y,digit===2?symbol:symbol/2));
    }
    return '<rect width="70" height="70" fill="white"/><path d="'+path+'" fill="none" stroke="#111" stroke-width=".063"/>'+
      '<path d="'+outlines.join('')+'" fill="white" stroke="#111" stroke-width=".052"/><path d="'+fills.join('')+'" fill="#111"/>';
  }
  function spiral(record) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="70mm" height="70mm" viewBox="0 0 70 70"><title>'+
      escape(record.id)+(record.blockCount>1?' / '+blockLabel(record):'')+' / 70 mm spiral</title>'+spiralContent(record)+'</svg>';
  }
  function paper(record) {
    function line(x,y,size,value,attrs=''){
      return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" '+attrs+'>'+escape(value)+'</text>';
    }
    const end='text-anchor="end"';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="record-paper" width="85mm" height="85mm" viewBox="0 0 85 85" role="img" aria-label="Physical record '+escape(record.id)+'">'+
      '<rect width="85" height="85" fill="white"/><svg x="7.5" y="2" width="70" height="70" viewBox="0 0 70 70">'+spiralContent(record)+'</svg>'+
      '<g fill="#151515" font-family="IBM Plex Mono,monospace" font-style="italic">'+
      line(7.5,74.6,1.55,'PTS2000 / REGISTERED RECORD','font-weight="600"')+line(77.5,74.6,1.55,record.blockCount>1?blockLabel(record):'PHYSICAL COPY ISSUED',end+' font-weight="600"')+
      line(7.5,77.2,1.19,'RECORD NO. '+record.id)+line(77.5,77.2,1.16,'DATE REGISTERED ['+record.date+']',end)+
      line(7.5,79.2,1.12,'MESSAGE LENGTH ['+record.encoded.length+'] CHARACTERS')+line(77.5,79.2,1.16,'MATERIAL CLASS ['+record.material+']',end)+
      line(7.5,81,1.12,'FULL RECORD '+record.encoded.totalCount+' SYMBOLS')+line(77.5,81,1.12,'CHECKSUM '+record.encoded.checksum,end)+
      line(7.5,82.9,.67,'ISSUED BY THE PUBLIC TRANSMISSION SERVICE')+line(7.5,84,.67,'UNITED KINGDOM / EST. 2000')+'</g></svg>';
  }
  function download(record, onlySpiral){
    const data=onlySpiral?spiral(record):paper(record);
    const url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'}));
    const link=document.createElement('a');
    link.href=url;link.download=record.id+(record.blockCount>1?'_B'+String(record.blockNumber).padStart(2,'0'):'')+(onlySpiral?'_spiral_70mm':'_record_85mm')+'.svg';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  // At 384 dots the six-dot layout fits 320 quartets. Reserve the last two
  // groups for END and checksum so those controls always share the final part.
  function thermalParts(record){
    const capacity=318, parts=[];
    for(let first=0;first<record.message.length;first+=capacity){
      const end=Math.min(first+capacity,record.message.length);
      const last=end===record.message.length;
      parts.push({message:record.message.slice(first,end),symbols:record.encoded.symbols.slice(first*4,last?undefined:end*4)});
    }
    return parts;
  }

  function raster(symbols, dots = PTS.config.RECEIPT_DOTS) {
    const g = receiptLayout(symbols, dots);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = dots;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dots, dots);
    ctx.fillStyle = '#000';
    for (const {x,y,nx,ny} of g.lines)
      ctx.fillRect(Math.min(x,nx), Math.min(y,ny), Math.max(2, Math.abs(nx-x)+2), Math.max(2, Math.abs(ny-y)+2));
    for (const {x,y,digit} of g.spots) {
      const s = g.symbol;
      ctx.fillStyle = '#000'; ctx.fillRect(x,y,s,s);
      if (digit !== 2) {
        ctx.fillStyle = '#fff';
        const edge = s >= 10 ? 2 : 1;
        ctx.fillRect(x + (digit === 0 ? s / 2 : edge), y + edge, s / 2 - edge, s - 2 * edge);
      }
    }
    return canvas;
  }

  PTS.record = {escape, segments, layout, plate, receiptLayout, paper, spiral, download, thermalParts, raster, blocksFor, blockLabel};
})();
