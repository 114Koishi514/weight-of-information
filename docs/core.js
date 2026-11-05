export const MODEL = Object.freeze({
  version: 'NET-059 / V1', kwhPerGB: 0.059, joulesPerKwh: 3600000,
  riceJoulesPerGram: 5290, lampWatts: 5, bytesPerUnit: 20,
  sources: {
    network: 'https://sustainablewebdesign.org/estimating-digital-emissions/',
    rice: 'https://www.sainsburys.co.uk/groceries/product/sainsburys-basmati-rice-so-organic-500g',
    critique: 'https://doi.org/10.1111/jiec.13512',
    units: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8'
  }
});
export function countCharacters(text) {
  return typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].length : Array.from(text).length;
}
export function measure(message, bytesPerUnit = MODEL.bytesPerUnit) {
  if (typeof message !== 'string' || !message.trim()) throw new Error('EMPTY_MESSAGE');
  if (countCharacters(message) > 500 || message.length > 12000) throw new Error('MESSAGE_TOO_LONG');
  if (!Number.isInteger(bytesPerUnit) || bytesPerUnit < 1 || bytesPerUnit > 10000) throw new Error('INVALID_RATE');
  const bytes = new TextEncoder().encode(message).length;
  const joules = bytes / 1e9 * MODEL.kwhPerGB * MODEL.joulesPerKwh;
  return Object.freeze({message, bytes, characters:countCharacters(message), joules,
    riceGrams:joules / MODEL.riceJoulesPerGram, lampSeconds:joules / MODEL.lampWatts,
    materialUnits:Math.ceil(bytes / bytesPerUnit), bytesPerUnit, model:MODEL.version});
}
const n = value => Number(value.toPrecision(3)).toLocaleString('en-GB',{maximumSignificantDigits:3});
export function quantity(value,type) {
  const units = type==='rice' ? [[1,'g'],[1e-3,'mg'],[1e-6,'µg'],[1e-9,'ng']] :
    type==='time' ? [[3600,'h'],[60,'min'],[1,'s'],[1e-3,'ms'],[1e-6,'µs']] :
    [[1,'J'],[1e-3,'mJ'],[1e-6,'µJ']];
  const entry = units.find(([scale])=>value>=scale) || units.at(-1);
  return {value:n(value/entry[0]),unit:entry[1]};
}
export function identifier() {
  return 'EX-' + (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`).replaceAll('-','').slice(0,10).toUpperCase();
}
export function rasterize(imageData) {
  const {width,height,data}=imageData;
  if(width!==384 || height<1 || height>4096) throw new Error('INVALID_RASTER_SIZE');
  const out=new Uint8Array(48*height);
  for(let y=0;y<height;y++) for(let x=0;x<384;x++) {
    const i=(y*384+x)*4;
    if(data[i+3]>127 && data[i]*0.2126+data[i+1]*0.7152+data[i+2]*0.0722<160) out[y*48+(x>>3)] |= 0x80>>(x%8);
  }
  return out;
}
export function base64(bytes) {
  let text=''; for(let i=0;i<bytes.length;i+=8192) text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(text);
}
