'use strict';
(() => {
  function thermalPage(record, part, index, count, test) {
    const dots = 384, inset = 8;
    const canvas = document.createElement('canvas');
    canvas.width = dots;
    const ctx = canvas.getContext('2d');
    const rows = [];
    let y = 12;
    const text = (value, size = 16, weight = 400) => {
      rows.push({value, y, font: weight+' '+size+'px "IBM Plex Mono","PTS CJK",monospace'});
      y += size + 6;
    };
    function wrapped(value,size,weight){
      ctx.font=weight+' '+size+'px "IBM Plex Mono","PTS CJK",monospace';
      let line='';
      for(const ch of value){
        if(line && ctx.measureText(line+ch).width>dots-2*inset){text(line,size,weight);line='';}
        line+=ch;
      }
      text(line,size,weight);
    }
    const rule = () => {y += 4; rows.push({line:true, y}); y += 10;};
    const spiral = PTS.record.raster(part.symbols, dots);
    text('PTS2000', 32, 600);
    text('PUBLIC TRANSMISSION SERVICE', 15);
    text('UNITED KINGDOM', 15);
    rule();
    if (test) text('TEST PRINT / SAMPLE', 18, 600);
    if (record.incomingTitle) text('INCOMING MESSAGE  '+record.incomingTitle, 17, 600);
    if(record.sender)wrapped('FROM  '+record.sender,16,600);
    if(record.subject)wrapped(record.subject,16,400);
    if(record.recipient)wrapped('TO  '+record.recipient,16,400);
    text('RECORD NO.  '+record.id);
    text('DATE  '+record.date+'   '+record.time);
    text('MESSAGE LENGTH  '+record.wholeLength+' CHR');
    if(record.blockCount>1)text(PTS.record.blockLabel(record),18,600);
    text('MATERIAL CLASS  '+record.material);
    if (count > 1) text('PART '+(index+1)+' / '+count, 18, 600);
    rule();
    text('MESSAGE CONTENT', 15);
    wrapped(part.message,21,600);
    const spiralTop = y;
    y += dots + 6;
    text(record.encoded.totalCount+' SYMBOLS / CHECK '+record.encoded.checksum);
    if (record.testCode) {rule(); text('PAPER TEST CODE  '+record.testCode, 22, 600);}
    rule();
    text('RETAIN THIS TEMPORARY PAPER RECORD.', 15);
    text('UK GOVERNMENT AUTHORISED', 15, 600);
    canvas.height = y + 8;
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,dots,canvas.height);
    ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
    for (const row of rows) {
      if (row.line) ctx.fillRect(inset,row.y,dots-2*inset,2);
      else {ctx.font = row.font; ctx.fillText(row.value,inset,row.y,dots-2*inset);}
    }
    ctx.drawImage(spiral,0,spiralTop);
    return canvas;
  }
  function* thermalPages(record,test=false){
    for(const block of PTS.record.blocksFor(record)){
      const parts=PTS.record.thermalParts(block);
      for(let i=0;i<parts.length;i++)yield thermalPage(block,parts[i],i,parts.length,test);
    }
  }
  PTS.receipt={thermalPages};
})();
