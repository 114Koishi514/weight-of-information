'use strict';
(() => {
  if(location.protocol!=='file:') return;
  const address='http://127.0.0.1:17483/';
  const notice=document.createElement('aside');
  notice.id='file-entry';
  notice.innerHTML='<p>For automatic printing, run Start-PTS2000.cmd from the extracted folder.</p><a href="'+address+'">OPEN LOCAL TERMINAL</a>';
  document.getElementById('workarea').append(notice);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),1600);
  fetch(address+'api/ready',{signal:controller.signal,credentials:'omit',cache:'no-store'})
    .then(r=>r.ok?r.json():null).then(data=>{if(data?.station==='PTS2000/4')location.replace(address);})
    .catch(()=>{}).finally(()=>clearTimeout(timer));
})();
