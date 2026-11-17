'use strict';
(() => {
  const {codebook, config} = PTS;
  const byChar = new Map(codebook.payload.map(row => [row[1], row]));
  const end = codebook.controls[78].trits;
  const group = value => value.toString(3).padStart(4, '0');

  function inspect(message, limit = Infinity) {
    if (typeof message !== 'string') throw new TypeError('A text string is required.');
    const chars = Array.from(message);
    const invalid = chars.findIndex(ch => !byChar.has(ch));
    let error = '';
    if (!chars.length) error = 'Enter a message to continue.';
    else if (invalid >= 0) {
      const ch = chars[invalid];
      if (ch === '\n' || ch === '\r') error = 'Line break at position ' + (invalid + 1) + '. Replace line breaks with spaces to continue.';
      else error = 'Unsupported character ' + JSON.stringify(ch) + ' (U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ') at position ' + (invalid + 1) + '. Edit it to continue.';
    } else if (chars.length > limit) error = 'Message exceeds the ' + limit + '-character limit by ' + (chars.length - limit) + '.';
    return {length: chars.length, error};
  }

  function encode(message, limit = config.BLOCK_CAPACITY) {
    const validation = inspect(message, limit);
    if (validation.error) throw new RangeError(validation.error);
    const rows = Array.from(message, ch => byChar.get(ch));
    const payload = rows.map(row => row[2]);
    const checksum = group(rows.reduce((sum, row) => sum + row[0], 0) % 81);
    const groups = [...payload, end, checksum];
    return {payload, groups, checksum, symbols: groups.join(''), length: rows.length,
      payloadCount: rows.length * 4, totalCount: groups.length * 4};
  }

  function decode(symbols, limit = config.BLOCK_CAPACITY) {
    if (typeof symbols !== 'string' || !/^[012]+$/.test(symbols) || symbols.length < 12 || symbols.length % 4)
      throw new RangeError('Invalid four-symbol grouping.');
    const groups = symbols.match(/.{4}/g);
    if (groups.at(-2) !== end) throw new RangeError('Missing END before the checksum.');
    const indices = groups.slice(0, -2).map(item => parseInt(item, 3));
    if (indices.length > limit || indices.some(index => index >= codebook.payload.length))
      throw new RangeError('Invalid payload length or reserved control in the message.');
    const sum = indices.reduce((a, b) => a + b, 0) % 81;
    if (group(sum) !== groups.at(-1)) throw new RangeError('Checksum mismatch.');
    return indices.map(index => codebook.payload[index][1]).join('');
  }

  const blockCount = length => Math.ceil(length / config.BLOCK_CAPACITY);
  function encodeBlocks(message){
    const checked=inspect(message);
    if(checked.error)throw new RangeError(checked.error);
    const blocks=[];
    for(let start=0;start<message.length;start+=config.BLOCK_CAPACITY){
      const body=message.slice(start,start+config.BLOCK_CAPACITY);
      blocks.push({message:body,encoded:encode(body)});
    }
    return blocks;
  }
  PTS.codec = {encode, decode, inspect, group, blockCount, encodeBlocks};
})();
