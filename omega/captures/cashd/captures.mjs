/* captures.mjs — quatre captures de l'écran CASHD réel (/espace2/cashd/suivi, données d'exemple),
   à 1440 et 390 : la vue Débiteurs et la vue Relances (session C2, 17/10/2026).
   Lancer : npx next start -p 3012, puis node omega/captures/cashd/captures.mjs [base] */
import { ouvrirSession } from '../../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
for (const largeur of [1440, 390]) {
  for (const vue of ['debiteurs', 'relances']) {
    const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `c2-captures-${vue}`, densite: 2 });
    await s.aller(`${base}/espace2/cashd/suivi?vue=${vue}`);
    await s.dormir(1200);
    // à 390, la vue commence sous les compteurs : on la place en haut de l'écran
    if (largeur < 768) { await s.evaluer(`document.querySelector('.c2-onglets')?.scrollIntoView({ block: 'start' })`); await s.dormir(400); }
    const deb = await s.evaluer('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    await s.capturer(`${dossier}cashd-${vue}-${largeur}.jpg`, { qualite: 82 });
    console.log(`cashd-${vue}-${largeur}.jpg (débordement ${deb})`);
    await s.fermer();
  }
}
