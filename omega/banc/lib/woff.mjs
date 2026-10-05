import zlib from 'node:zlib';
// Convertit une police WOFF 1.0 en TrueType/OpenType brut (sfnt).
export function woffVersTtf(woff) {
  const b = Buffer.from(woff);
  if (b.readUInt32BE(0) !== 0x774f4646) throw new Error('pas un fichier WOFF');
  const flavor = b.readUInt32BE(4);
  const numTables = b.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = b.subarray(o, o + 4);
    const offset = b.readUInt32BE(o + 4);
    const compLength = b.readUInt32BE(o + 8);
    const origLength = b.readUInt32BE(o + 12);
    const checksum = b.readUInt32BE(o + 16);
    const raw = b.subarray(offset, offset + compLength);
    const data = compLength < origLength ? zlib.inflateSync(raw) : Buffer.from(raw);
    tables.push({ tag, data, checksum, origLength });
  }
  let entrySelector = 0; while ((1 << (entrySelector + 1)) <= numTables) entrySelector++;
  const searchRange = (1 << entrySelector) * 16;
  const rangeShift = numTables * 16 - searchRange;
  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0); header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(searchRange, 6); header.writeUInt16BE(entrySelector, 8); header.writeUInt16BE(rangeShift, 10);
  let offset = header.length; const parts = [header];
  tables.forEach((t, i) => {
    const o = 12 + i * 16;
    t.tag.copy(header, o); header.writeUInt32BE(t.checksum, o + 4);
    header.writeUInt32BE(offset, o + 8); header.writeUInt32BE(t.origLength, o + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    parts.push(t.data); if (pad) parts.push(Buffer.alloc(pad));
    offset += t.data.length + pad;
  });
  return Buffer.concat(parts);
}
