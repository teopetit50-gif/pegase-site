// Un ZIP sans compression (méthode 0, « stored ») : les pièces sont déjà des PDF, des images ou du XML, et un fichier
// rendu tel qu'il est arrivé se vérifie octet pour octet contre son SHA-256. Noms en UTF-8 (bit 11), pas de ZIP64 :
// un volume reste sous 4 Go et sous 65 535 entrées (le manifeste en fait au plus 60 000).

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(donnees: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < donnees.length; i++) c = TABLE_CRC[(c ^ donnees[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dateDos(d: Date): { heure: number; jour: number } {
  const an = Math.max(d.getUTCFullYear(), 1980);
  return {
    heure: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2),
    jour: ((an - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
  };
}

interface Entree {
  nom: Uint8Array;
  crc: number;
  taille: number;
  decalage: number;
}

export class EcrivainZip {
  private readonly morceaux: Uint8Array[] = [];
  private readonly entrees: Entree[] = [];
  private readonly noms = new Set<string>();
  private decalage = 0;
  private readonly dos: { heure: number; jour: number };

  constructor(instant: Date = new Date()) {
    this.dos = dateDos(instant);
  }

  get octets(): number {
    return this.decalage;
  }

  ajouter(nom: string, donnees: Uint8Array): void {
    if (!nom || nom.startsWith("/") || nom.split("/").includes("..")) throw new Error(`nom d'entrée refusé : ${nom}`);
    if (this.noms.has(nom)) throw new Error(`entrée en double : ${nom}`);
    if (this.entrees.length >= 65535) throw new Error("trop d'entrées pour un ZIP sans ZIP64");
    if (this.decalage + donnees.length > 0xfffffffe) throw new Error("volume trop gros pour un ZIP sans ZIP64");
    this.noms.add(nom);
    const n = new TextEncoder().encode(nom);
    const crc = crc32(donnees);
    const tete = new Uint8Array(30 + n.length);
    const v = new DataView(tete.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true);
    v.setUint16(8, 0, true);
    v.setUint16(10, this.dos.heure, true);
    v.setUint16(12, this.dos.jour, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, donnees.length, true);
    v.setUint32(22, donnees.length, true);
    v.setUint16(26, n.length, true);
    v.setUint16(28, 0, true);
    tete.set(n, 30);
    this.entrees.push({ nom: n, crc, taille: donnees.length, decalage: this.decalage });
    this.morceaux.push(tete, donnees);
    this.decalage += tete.length + donnees.length;
  }

  terminer(): Uint8Array {
    const central: Uint8Array[] = [];
    let tailleCentral = 0;
    for (const e of this.entrees) {
      const c = new Uint8Array(46 + e.nom.length);
      const v = new DataView(c.buffer);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 0x031e, true);
      v.setUint16(6, 20, true);
      v.setUint16(8, 0x0800, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, this.dos.heure, true);
      v.setUint16(14, this.dos.jour, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, e.taille, true);
      v.setUint32(24, e.taille, true);
      v.setUint16(28, e.nom.length, true);
      v.setUint32(38, 0o100644 << 16, true);
      v.setUint32(42, e.decalage, true);
      c.set(e.nom, 46);
      central.push(c);
      tailleCentral += c.length;
    }
    const fin = new Uint8Array(22);
    const v = new DataView(fin.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, this.entrees.length, true);
    v.setUint16(10, this.entrees.length, true);
    v.setUint32(12, tailleCentral, true);
    v.setUint32(16, this.decalage, true);
    const tout = new Uint8Array(this.decalage + tailleCentral + 22);
    let i = 0;
    for (const m of [...this.morceaux, ...central, fin]) {
      tout.set(m, i);
      i += m.length;
    }
    return tout;
  }
}
