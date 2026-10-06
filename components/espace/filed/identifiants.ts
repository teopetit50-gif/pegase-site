/* ══════════════════════════════════════════════════════════════════════
   SIREN et TVA intracommunautaire : la forme et la clé, dans le navigateur
   (06/10/2026). La base reste juge (private.filed_siren_valide,
   filed_tva_intracom_analyser) ; l'écran s'en sert pour ne pas proposer
   de « confirmer » une valeur que la base ne reprendrait pas, et pour
   prévenir avant l'envoi d'une saisie.
   ══════════════════════════════════════════════════════════════════════ */

export const chiffres = (s: string) => s.replace(/[^0-9]/g, "");
export const tvaPropre = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/* clé de Luhn sur les neuf chiffres */
export function sirenValide(brut: string): boolean {
  const s = chiffres(brut);
  if (!/^[0-9]{9}$/.test(s)) return false;
  let t = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(s[8 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    t += d;
  }
  return t % 10 === 0;
}

/* TVA FR : clé = (12 + 3 × (SIREN mod 97)) mod 97, sur deux chiffres */
export const cleTvaFr = (siren: string) => (12 + 3 * (Number(chiffres(siren)) % 97)) % 97;

export type AvisTva = { valide: boolean | null; raison: string; siren: string | null };

/* une TVA intracommunautaire : pour la France, forme, SIREN et clé ; pour un
   autre pays, la forme seulement (le registre VIES tranche) */
export function analyserTva(brut: string): AvisTva {
  const t = tvaPropre(brut);
  if (!/^[A-Z]{2}[A-Z0-9]{2,13}$/.test(t)) return { valide: false, raison: "forme invalide", siren: null };
  if (t.startsWith("FR")) {
    const m = t.match(/^FR([0-9A-Z]{2})([0-9]{9})$/);
    if (!m) return { valide: false, raison: "forme invalide (FR + 2 + 9 chiffres)", siren: null };
    if (!sirenValide(m[2])) return { valide: false, raison: "le SIREN qu'elle porte a une clé invalide", siren: m[2] };
    if (/^[0-9]{2}$/.test(m[1]) && Number(m[1]) !== cleTvaFr(m[2])) return { valide: false, raison: `clé de TVA invalide (attendue ${String(cleTvaFr(m[2])).padStart(2, "0")})`, siren: m[2] };
    return { valide: true, raison: "clé juste", siren: m[2] };
  }
  return { valide: null, raison: "forme correcte ; le registre VIES dira si le numéro existe", siren: null };
}
