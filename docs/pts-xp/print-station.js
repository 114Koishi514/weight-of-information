'use strict';
(() => {
  const origin = 'http://127.0.0.1:17483';
  const setting = 'pts2000.print-station.v4';
  const messages = {
    pending: 'Sending to the printer…',
    queued: 'Sent to the print queue.',
    unavailable: 'Print station not connected.',
    choose: 'No receipt printer selected.',
    invalid: 'This message could not be encoded for printing.',
    offline: 'Receipt printer offline.',
    unconfirmed: 'Print queue has not confirmed this copy.',
    partial: 'Earlier pages were queued. Check the numbered pages before reprinting.'
  };
  let paired = false;
  try { paired = localStorage.getItem(setting) === '1'; } catch {}

  async function request(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), path === 'jobs' ? 20000 : 6000);
    try {
      const options = {method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'same-origin', signal: controller.signal, headers: {'X-PTS-Station': '4'}};
      if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
      const response = await fetch(origin + '/api/' + path, options);
      const data = await response.json();
      if (data.station !== 'PTS2000/4') throw Error('unavailable');
      if (!response.ok) throw Error(data.error || 'unconfirmed');
      return data;
    } finally { clearTimeout(timer); }
  }
  async function connect() {
    const data = await request('devices');
    paired = true;
    try { localStorage.setItem(setting, '1'); } catch {}
    return data;
  }
  function canSend() { return location.origin === origin || paired; }

  const maxPagesPerJob = 20;
  let nextDispatch = Promise.resolve();

  async function sendBatch(pages) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const result = await request('jobs', {id, pages});
    if (result.queued !== true || result.id !== id) throw Error('unconfirmed');
  }

  async function printRecords(records, test, previous, release) {
    let confirmedPages = 0;
    try {
      await previous;
      await document.fonts.ready;
      let pages = [];
      for (const record of records) {
        for (const page of PTS.receipt.thermalPages(record, test)) {
          if (pages.length === maxPagesPerJob) {
            await sendBatch(pages);
            confirmedPages += pages.length;
            pages = [];
          }
          pages.push(page.toDataURL('image/png').split(',')[1]);
        }
      }
      if (!pages.length) return 'invalid';
      const finalBatch = sendBatch(pages);
      // A one-batch request is already on the wire. Its response may arrive after the next one.
      if (confirmedPages === 0) release();
      await finalBatch;
      return 'queued';
    } catch (error) {
      if (confirmedPages) return 'partial';
      return ['choose','offline','unavailable'].includes(error.message) ? error.message : 'unconfirmed';
    } finally {
      release();
    }
  }

  function submit(records, test = false) {
    if (!canSend()) return Promise.resolve('unavailable');
    // Multi-batch jobs keep their place while small jobs can acknowledge independently.
    const previous = nextDispatch;
    let release;
    nextDispatch = new Promise(resolve => { release = resolve; });
    return printRecords(records, test, previous, release);
  }
  PTS.station = {submit, connect, canSend, messages, choose: name => request('printer', {name})};
})();
