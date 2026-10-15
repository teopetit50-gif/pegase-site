/* L'archive ZIP d'un dossier, dans le navigateur (11/10/2026, session B4, b4_17) : la même écriture que l'ouvrier
   tamila-purge (méthode « stockée », CRC-32, sans dépendance), plus la lecture d'une archive stockée. Sert à ouvrir
   l'archive chiffrée produite par le serveur et à rendre la même archive en clair. */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type Entree = { nom: string; octets: Uint8Array };

export function zipper(entrees: Entree[], date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const heure = ((date.getUTCHours() & 31) << 11) | ((date.getUTCMinutes() & 63) << 5) | ((date.getUTCSeconds() >> 1) & 31);
  const jour = (((date.getUTCFullYear() - 1980) & 127) << 9) | (((date.getUTCMonth() + 1) & 15) << 5) | (date.getUTCDate() & 31);
  const locaux: Uint8Array[] = [];
  const centraux: Uint8Array[] = [];
  let decalage = 0;
  for (const e of entrees) {
    const nom = enc.encode(e.nom);
    const crc = crc32(e.octets);
    const l = new Uint8Array(30 + nom.length);
    const v = new DataView(l.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); // noms en UTF-8
    v.setUint16(8, 0, true);
    v.setUint16(10, heure, true);
    v.setUint16(12, jour, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, e.octets.length, true);
    v.setUint32(22, e.octets.length, true);
    v.setUint16(26, nom.length, true);
    l.set(nom, 30);
    const c = new Uint8Array(46 + nom.length);
    const w = new DataView(c.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(12, heure, true);
    w.setUint16(14, jour, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, e.octets.length, true);
    w.setUint32(24, e.octets.length, true);
    w.setUint16(28, nom.length, true);
    w.setUint32(42, decalage, true);
    c.set(nom, 46);
    locaux.push(l, e.octets);
    centraux.push(c);
    decalage += l.length + e.octets.length;
  }
  const tailleCentrale = centraux.reduce((s, c) => s + c.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, entrees.length, true);
  f.setUint16(10, entrees.length, true);
  f.setUint32(12, tailleCentrale, true);
  f.setUint32(16, decalage, true);
  const tout = new Uint8Array(decalage + tailleCentrale + 22);
  let p = 0;
  for (const b of [...locaux, ...centraux, fin]) {
    tout.set(b, p);
    p += b.length;
  }
  return tout;
}

/** Les entrées d'une archive « stockée » (sans compression), lues par le répertoire central ; CRC vérifié. */
export function dezipper(z: Uint8Array): Entree[] {
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
  let fin = z.length - 22;
  while (fin >= 0 && v.getUint32(fin, true) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error("Archive illisible : fin de répertoire introuvable.");
  const n = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  const out: Entree[] = [];
  for (let i = 0; i < n; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Archive illisible : répertoire central abîmé.");
    if (v.getUint16(p + 10, true) !== 0) throw new Error("Archive compressée : seule la méthode « stockée » est lue ici.");
    const crc = v.getUint32(p + 16, true);
    const taille = v.getUint32(p + 20, true);
    const lnom = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const nom = dec.decode(z.slice(p + 46, p + 46 + lnom));
    const debut = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const octets = z.slice(debut, debut + taille);
    if (crc32(octets) !== crc) throw new Error(`Archive abîmée : ${nom}.`);
    out.push({ nom, octets });
    p += 46 + lnom + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return out;
}
