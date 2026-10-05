// Identifiants fictifs mais valides par clé : SIREN/SIRET (Luhn), TVA intracom FR, IBAN FR (clé RIB + mod 97).
// Aucun de ces numéros ne désigne une entreprise ou un compte réel ; ils servent uniquement au banc.

function luhnValide(chaine) {
  let somme = 0;
  let double = false;
  for (let i = chaine.length - 1; i >= 0; i--) {
    let c = Number(chaine[i]);
    if (double) { c *= 2; if (c > 9) c -= 9; }
    somme += c;
    double = !double;
  }
  return somme % 10 === 0;
}

function completerLuhn(prefixe) {
  for (let d = 0; d <= 9; d++) {
    if (luhnValide(prefixe + d)) return prefixe + d;
  }
  throw new Error('Luhn impossible');
}

export function sirenFictif(alea) {
  // Préfixe 9xx : plage réservée ici au banc pour éviter toute collision plausible avec une entreprise existante.
  return completerLuhn('9' + alea.chiffres(7));
}

export function siretDepuisSiren(siren, alea) {
  return completerLuhn(siren + alea.chiffres(4));
}

export function tvaIntracomDepuisSiren(siren) {
  const cle = (12 + 3 * (Number(siren) % 97)) % 97;
  return 'FR' + String(cle).padStart(2, '0') + siren;
}

function mod97(chaine) {
  let reste = 0;
  for (const c of chaine) reste = (reste * 10 + Number(c)) % 97;
  return reste;
}

export function ibanFictif(alea) {
  const banque = '9' + alea.chiffres(4); // codes banque 9xxxx : hors plage attribuée, fictifs
  const guichet = alea.chiffres(5);
  const compte = alea.chiffres(11);
  // Clé RIB : 97 - ((89*banque + 15*guichet + 3*compte) mod 97)
  const cle = 97 - ((89 * mod97v(banque) + 15 * mod97v(guichet) + 3 * mod97v(compte)) % 97);
  const bban = banque + guichet + compte + String(cle).padStart(2, '0');
  // IBAN : pays FR = 15 27, + '00', puis clé = 98 - mod97
  const cleIban = 98 - mod97(bban + '152700');
  return 'FR' + String(cleIban).padStart(2, '0') + bban;
}
function mod97v(chaine) { return Number(chaine) % 97; }

export function bicFictif(alea) {
  const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const code = Array.from({ length: 4 }, () => alea.choix([...lettres])).join('');
  return code + 'FRPP' + (alea.chance(0.5) ? '' : 'XXX');
}

export function ibanValide(iban) {
  const propre = iban.replace(/\s+/g, '').toUpperCase();
  const reordonne = propre.slice(4) + propre.slice(0, 4);
  const numerique = reordonne.replace(/[A-Z]/g, (l) => String(l.charCodeAt(0) - 55));
  return mod97(numerique) === 1;
}

export function sirenValide(siren) { return /^\d{9}$/.test(siren) && luhnValide(siren); }
export function siretValide(siret) { return /^\d{14}$/.test(siret) && luhnValide(siret); }
export function tvaValide(tva) {
  const m = /^FR(\d{2})(\d{9})$/.exec(tva);
  return !!m && Number(m[1]) === (12 + 3 * (Number(m[2]) % 97)) % 97;
}

export function formaterIban(iban) { return iban.replace(/(.{4})/g, '$1 ').trim(); }
export function formaterSiret(siret) { return siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4'); }
export function formaterSiren(siren) { return siren.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3'); }
