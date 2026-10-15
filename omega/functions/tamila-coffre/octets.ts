// Octets, hexadécimal, base64 : ce que se passent la base (bytea en hexadécimal),
// Scaleway (base64) et le navigateur (base64).

export function versHex(o: Uint8Array): string {
  return Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function depuisHex(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) throw new Error("hexadécimal illisible");
  const o = new Uint8Array(h.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = parseInt(h.slice(2 * i, 2 * i + 2), 16);
  return o;
}

export function versBase64(o: Uint8Array): string {
  let s = "";
  for (const b of o) s += String.fromCharCode(b);
  return btoa(s);
}

export function depuisBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

export function texte(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Comparaison à temps constant (jeton de service). */
export function egaux(a: string, b: string): boolean {
  const x = texte(a), y = texte(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}

/** Une ArrayBuffer à soi, pour WebCrypto (jamais une vue sur un tampon partagé). */
export function tampon(o: Uint8Array): ArrayBuffer {
  return o.slice().buffer as ArrayBuffer;
}
