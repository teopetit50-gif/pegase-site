/** Recette de Suivi › Carte et de sa miniature sur la vue d'ensemble (29/10/2026).
 *
 *    node outils/recette-carte.mjs [origine] [largeur]
 *
 * Sur les données d'exemple (la source par défaut), à chacune des cinq
 * largeurs :
 *  · /espace2/carte : 13 blocs (4 sources, 4 agents, « Vous », 4
 *    résultats), 12 liens, des points qui courent, « Vous » en alerte ;
 *    le dessin tient dans la fenêtre (ajusté au départ) ; un clic sur
 *    FILED l'inscrit dans l'adresse et ouvre son détail dans le panneau ;
 *  · /espace2 : la miniature montre une ligne par agent et son lien vers
 *    la carte ;
 *  · aucun débordement horizontal, aucune erreur de console.
 */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const origine = process.argv[2] || 'http://localhost:3000';
const LARGEURS = process.argv[3] ? [Number(process.argv[3])] : [390, 768, 1024, 1440, 1700];
mkdirSync('captures', { recursive: true });

let defauts = 0;
/* attendre qu'une condition soit vraie dans la page (la machine peut être lente) : 15 s au plus */
const attendre = async (s, expression, plafond = 15000) => {
  for (let t = 0; t < plafond; t += 250) {
    if (await s.evaluer(expression)) return true;
    await s.dormir(250);
  }
  return false;
};
const dire = (ok, texte) => { console.log(`  ${ok ? '✓' : '✗'}   ${texte}`); if (!ok) defauts++; };

const SONDE_CARTE = `(() => {
  const c = document.querySelector('.pe-canevas');
  const vue = document.querySelector('.pe-vue');
  const blocs = [...document.querySelectorAll('.pe-bloc')];
  const r = c?.getBoundingClientRect();
  const dedans = blocs.filter((b) => { const x = b.getBoundingClientRect(); return r && x.left >= r.left - 1 && x.right <= r.right + 1; }).length;
  return {
    blocs: blocs.length,
    liens: document.querySelectorAll('.pe-lien').length,
    points: document.querySelectorAll('.pe-flux').length,
    alerte: document.querySelectorAll('.pe-bloc[data-alerte]').length,
    dedans,
    echelle: Number((vue?.style.transform.match(/scale\\(([\\d.]+)\\)/) || [])[1] || 0),
    debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

for (const largeur of LARGEURS) {
  console.log(`\n— ${largeur} px`);
  const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'carte', densite: 1, flags: ['--disable-webgl'] });
  try {
    if (!await s.aller(`${origine}/espace2/carte`)) { dire(false, 'la carte ne s\'ouvre pas'); continue; }
    await attendre(s, `document.querySelectorAll('.pe-lien').length === 12`);
    await s.dormir(500);
    const d = await s.evaluer(SONDE_CARTE);
    dire(d.blocs === 13 && d.liens === 12, `${d.blocs} blocs, ${d.liens} liens`);
    dire(d.points > 0, `${d.points} points courent sur les liens`);
    dire(d.alerte === 1, '« Vous » en alerte (des demandes attendent)');
    dire(d.dedans === d.blocs, `le dessin tient dans la largeur du canevas (échelle ${d.echelle.toFixed(2)})`);
    dire(d.debord <= 0, `aucun débordement horizontal (${d.debord})`);
    await s.capturer(`captures/carte-${largeur}.jpg`);

    await s.evaluer(`[...document.querySelectorAll('.pe-bloc')].find((b) => b.getAttribute('aria-label')?.startsWith('FILED'))?.click()`);
    await attendre(s, `location.search.includes('bloc=') && !!document.querySelector('.pe-panneau .pe-panneau-titre')`);
    const p = await s.evaluer(`({ adresse: location.search, titre: document.querySelector('.pe-panneau .pe-panneau-titre')?.textContent, ouvert: document.querySelector('.lin.pe')?.dataset.panneau, portes: [...document.querySelectorAll('.pe-panneau a')].map((a) => a.getAttribute('href')) })`);
    dire(p.adresse.includes('bloc=agent%3Afiled') && p.ouvert === 'ouvert', `clic sur FILED : ${p.adresse}, panneau ${p.ouvert}`);
    dire(p.titre?.startsWith('FILED') && p.portes.includes('/espace2/activite?modules=filed'), `détail « ${p.titre} », lien vers le journal filtré`);
    await s.capturer(`captures/carte-${largeur}-filed.jpg`);

    if (!await s.aller(`${origine}/espace2`)) { dire(false, 'la vue d\'ensemble ne s\'ouvre pas'); continue; }
    await attendre(s, `document.querySelectorAll('.mc-ligne').length === 4`);
    await s.dormir(500);
    const m = await s.evaluer(`({ lignes: document.querySelectorAll('.mc-ligne').length, lien: !!document.querySelector('.mc a[href="/espace2/carte"]'), debord: document.documentElement.scrollWidth - document.documentElement.clientWidth })`);
    dire(m.lignes === 4 && m.lien, `miniature : ${m.lignes} agents et le lien « Ouvrir la carte »`);
    dire(m.debord <= 0, `vue d'ensemble sans débordement (${m.debord})`);
    await s.capturer(`captures/carte-accueil-${largeur}.jpg`);

    const soucis = s.soucis.filter((x) => !/favicon|Download the React DevTools|_vercel\/insights|status of 404/.test(x));
    dire(soucis.length === 0, soucis.length ? `console : ${soucis.slice(0, 3).join(' | ')}` : 'aucune erreur de console');
  } finally {
    s.fermer();
  }
}

console.log(defauts ? `\n${defauts} défaut(s)` : '\nRecette verte');
process.exit(defauts ? 1 : 0);
