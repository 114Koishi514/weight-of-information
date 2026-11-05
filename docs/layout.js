// The exhibition uses a 1920 × 1080 landscape canvas. Fit the whole canvas
// into the browser viewport without changing the receipt's printer pixels.
const frame=document.getElementById('station-frame');
function fitStation(){
  const scale=Math.min(window.innerWidth/1920,window.innerHeight/1080);
  frame.style.transform=`scale(${scale})`;
  frame.dataset.scale=String(scale);
}
fitStation();
window.addEventListener('resize',fitStation,{passive:true});
window.visualViewport?.addEventListener('resize',fitStation,{passive:true});
