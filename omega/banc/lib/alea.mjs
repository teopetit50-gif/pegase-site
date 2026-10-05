// Générateur pseudo-aléatoire déterministe (mulberry32) : le banc se régénère à l'identique.
export function creerAlea(graine) {
  let a = graine >>> 0;
  const suivant = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    reel: suivant,
    entier: (min, max) => min + Math.floor(suivant() * (max - min + 1)),
    choix: (liste) => liste[Math.floor(suivant() * liste.length)],
    chance: (p) => suivant() < p,
    melange: (liste) => {
      const copie = [...liste];
      for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(suivant() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
      }
      return copie;
    },
    chiffres: (n) => Array.from({ length: n }, () => Math.floor(suivant() * 10)).join(''),
  };
}
