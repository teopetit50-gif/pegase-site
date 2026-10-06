/* Recette de l'écran /espace/reput (session C3, 06/10/2026), aux cinq largeurs de CLAUDE.md.
 * usage : BASE=http://localhost:3000 node omega/recette-c3/recette_reput.mjs [dossier_captures]
 * Pour chaque largeur : la page se charge (données d'exemple), aucun débordement horizontal, aucune erreur
 * de console ; les trois onglets s'ouvrent ; « Valider et envoyer » sur la réponse prête fait passer la
 * demande en « Répondue » ; « Corriger » ouvre l'éditeur ; une capture par onglet. */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const BASE = process.env.BASE || 'http://localhost:3000';
const DOSSIER = process.argv[2] || '/tmp/recette-reput';
mkdirSync(DOSSIER, { recursive: true });
const LARGEURS = [390, 768, 1024, 1440, 1700];
let echecs = 0;
const verifier = (ok, quoi) => { console.log(`${ok ? 'ok    ' : 'ÉCHEC '} ${quoi}`); if (!ok) echecs++; };

const DEBORDE = `(() => { const W = document.documentElement.clientWidth; const t = [];
  for (const e of document.querySelectorAll('body *')) { if (!e.getClientRects().length) continue;
    const c = getComputedStyle(e); if (c.position === 'fixed') continue;
    let p = e.parentElement, rogne = false; for (; p; p = p.parentElement) if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) { rogne = true; break; }
    const r = e.getBoundingClientRect(); if (!rogne && (r.right - W > 1 || r.left < -1)) t.push((e.textContent || e.tagName).trim().slice(0, 40)); }
  return { scroll: document.documentElement.scrollWidth > W + 1, elements: t.slice(0, 5) }; })()`;
const cliquer = (texte, selecteur = 'button') => `(() => { const b = [...document.querySelectorAll(${JSON.stringify(selecteur)})].find((x) => x.textContent.trim().startsWith(${JSON.stringify(texte)}));
  if (!b) return false; b.click(); return true; })()`;

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 1000, marque: 'reput', densite: 1 });
  try {
    const charge = await s.aller(`${BASE}/espace/reput`, { signe: `document.readyState === 'complete' && document.body.innerText.includes('Demandes clients') && document.body.innerText.includes('Marie Durand')` });
    verifier(charge, `${largeur} : la page se charge avec l'exemple`);
    let d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (Demandes) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-demandes-${largeur}.jpg`, { pleine: true });
    verifier(await s.evaluer(cliquer('Marie Durand', '.esp-item')), `${largeur} : ouvrir la demande de Marie Durand`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('Valider et envoyer') && document.body.innerText.toLowerCase().includes('ses sources dans la base')`), `${largeur} : réponse prête, sources, Valider`);
    verifier(await s.evaluer(cliquer('Corriger')), `${largeur} : Corriger ouvre l'éditeur`);
    await s.dormir(300);
    verifier(await s.evaluer(`!!document.querySelector('textarea')`), `${largeur} : l'éditeur est là`);
    await s.evaluer(cliquer('Annuler'));
    await s.dormir(200);
    verifier(await s.evaluer(cliquer('Valider et envoyer')), `${largeur} : clic sur Valider et envoyer`);
    await s.dormir(400);
    verifier(await s.evaluer(`document.body.innerText.includes('La réponse est validée')`), `${largeur} : la réponse est validée`);
    for (const [onglet, attendu] of [['Base de connaissances', 'Diagnostic à domicile'], ['Sujets autorisés', "Autoriser l'envoi seul"], ['Réglages et avis', "Programmer la demande d'avis"]]) {
      verifier(await s.evaluer(cliquer(onglet, '[role=tab]')), `${largeur} : onglet ${onglet}`);
      await s.dormir(400);
      verifier(await s.evaluer(`document.body.innerText.includes(${JSON.stringify(attendu)})`), `${largeur} : ${onglet} montre « ${attendu} »`);
      d = await s.evaluer(DEBORDE);
      verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (${onglet}) ${d.elements.join(' | ')}`);
      await s.capturer(`${DOSSIER}/reput-${onglet.split(' ')[0].toLowerCase()}-${largeur}.jpg`, { pleine: true });
    }
    // Hors Vercel, /_vercel/insights rend 404 (le même sur /espace/daliro) : seules comptent les autres ressources en 404.
    const autres404 = await s.evaluer(`performance.getEntriesByType('resource').filter((e) => e.responseStatus === 404 && !e.name.includes('/_vercel/')).map((e) => e.name)`);
    const soucis = s.soucis.filter((x) => !/favicon|_vercel|analytics|Failed to load resource/i.test(x)).concat(autres404 ?? []);
    verifier(soucis.length === 0, `${largeur} : console propre ${soucis.join(' | ')}`);
  } finally {
    s.fermer();
  }
}
console.log(echecs ? `${echecs} échec(s)` : 'recette verte');
process.exit(echecs ? 1 : 0);
