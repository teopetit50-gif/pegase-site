/** Recette de la page interne /espace2/ecosysteme (18/10/2026).
 *
 *    node outils/recette-ecosysteme.mjs [url] [largeur]
 *
 * Contre un `next dev` (en développement, la page s'ouvre sans compte ;
 * en production elle est réservée au compte gérant d'Omega). Ce que ce
 * fichier prouve, à chacune des cinq largeurs :
 *  · la page est prête, avec son titre, ses cinq compteurs et son flux
 *    en cinq étapes ;
 *  · les compteurs disent vrai : la somme des niveaux du moteur actif
 *    égale le nombre de lignes affichées ;
 *  · une ligne se déplie et montre son mécanisme ; l'onglet change et
 *    s'inscrit dans l'adresse ; le filtre par niveau filtre ; « Tout
 *    déplier » déplie tout ;
 *  · la finition Attio tient (bouton-menu de 30 px, coins de 6 px) ; le
 *    flux passe en colonne sous 1024 px ; aucun débordement horizontal ;
 *    aucune erreur de console.
 */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2] || 'http://localhost:3000/espace2/ecosysteme';
const LARGEURS = process.argv[3] ? [Number(process.argv[3])] : [390, 768, 1024, 1440, 1700];
mkdirSync('captures', { recursive: true });

const SONDE = `(() => {
  const q = (s) => document.querySelector(s);
  const n = (s) => document.querySelectorAll(s).length;
  const actif = q('.eco-moteur[aria-pressed="true"]');
  const bouton = q('.eco-filtres .v2-val-bouton');
  const flux = q('.eco-flux');
  return {
    regles: [...document.styleSheets].reduce((k, f) => { try { return k + f.cssRules.length } catch { return k } }, 0),
    h1: q('.eco h1')?.textContent ?? null,
    moteurs: n('.eco-moteur'),
    actif: actif?.querySelector('.eco-moteur-nom')?.firstChild?.textContent?.trim() ?? null,
    compte: actif ? parseInt(actif.querySelector('.eco-compte').textContent, 10) : -1,
    niveaux: actif ? [...actif.querySelectorAll('.eco-niveaux .v2-badge')].map((b) => parseInt(b.textContent, 10)) : [],
    flux: n('.eco-flux li'),
    colonnesFlux: flux ? getComputedStyle(flux).gridTemplateColumns.split(' ').length : 0,
    lignes: n('.eco-ligne'),
    ouvertes: n('.eco-ligne[data-ouvert]'),
    h2: q('#eco-moteur-titre')?.firstChild?.textContent?.trim() ?? null,
    boutonHauteur: bouton ? getComputedStyle(bouton).height : null,
    boutonRayon: bouton ? getComputedStyle(bouton).borderTopLeftRadius : null,
    carteRayon: q('.eco-carte') ? getComputedStyle(q('.eco-carte')).borderTopLeftRadius : null,
    hash: location.hash,
    debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

let defauts = 0;
const dire = (ok, texte) => { if (!ok) defauts++; console.log(`${ok ? '  ok  ' : '  ✗   '}${texte}`); };
const somme = (xs) => xs.reduce((a, b) => a + b, 0);

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'ecosysteme', densite: 1, flags: ['--disable-webgl'] });
  try {
    console.log(`\n──────── ${largeur} px ────────`);
    if (!await s.aller(url)) { console.log('  ✗   page jamais prête'); defauts++; continue; }
    await s.dormir(2000);                                   // hydratation
    let d = await s.evaluer(SONDE);
    dire(d.regles > 50, `feuilles de style chargées (${d.regles} règles)`);
    dire(d.h1 === 'Écosystème', `titre « ${d.h1} »`);
    dire(d.moteurs === 5, `${d.moteurs} compteurs de moteur`);
    dire(d.actif === 'CASHD', `moteur actif au chargement : ${d.actif}`);
    dire(d.flux === 5, `${d.flux} étapes de flux`);
    dire(d.colonnesFlux === (largeur >= 1024 ? 5 : 1), `flux en ${d.colonnesFlux} colonne(s) à ${largeur}`);
    dire(d.niveaux.length === 4 && somme(d.niveaux) === d.compte && d.compte === d.lignes,
         `compteur juste : ${d.niveaux.join(' + ')} = ${d.compte} = ${d.lignes} lignes`);
    /* 26 px : la règle de la maison depuis le dessin /omega (espace2.css,
       `.v2 .v2-val-bouton { height: 26px }`), pas les 30 px d'origine */
    dire(d.boutonHauteur === '26px' && d.boutonRayon === '6px', `bouton-menu Attio : ${d.boutonHauteur}, rayon ${d.boutonRayon}`);
    dire(d.carteRayon === '6px', `cartes à coins de ${d.carteRayon}`);
    dire(d.ouvertes === 0, 'aucune ligne dépliée au chargement');

    /* une ligne se déplie et montre son mécanisme */
    await s.evaluer(`document.querySelector('.eco-ligne-tete').click()`);
    await s.dormir(250);
    const l1 = await s.evaluer(`(() => { const l = document.querySelector('.eco-ligne[data-ouvert]'); if (!l) return null;
      const c = l.querySelector('.eco-corps'); return { corps: !!c, mecanisme: !!(c && c.textContent.includes('Mécanisme')),
      manque: !!(c && (c.textContent.includes('Ce qui manque') || c.textContent.includes('Il ne manque rien'))),
      texte: getComputedStyle(l.querySelector('.eco-texte > span')).whiteSpace,
      expanded: l.querySelector('.eco-ligne-tete').getAttribute('aria-expanded') }; })()`);
    dire(!!l1 && l1.corps && l1.mecanisme && l1.manque, 'la première ligne se déplie : mécanisme et manque visibles');
    dire(!!l1 && l1.texte === 'normal' && l1.expanded === 'true', 'le texte exact se lit en entier une fois déplié (aria-expanded)');
    await s.capturer(`captures/ecosysteme-${largeur}-cashd.jpg`);

    /* l'onglet change et s'inscrit dans l'adresse */
    await s.evaluer(`document.querySelectorAll('.eco-moteur')[1].click()`);
    await s.dormir(400);
    d = await s.evaluer(SONDE);
    dire(d.actif === 'REPUT' && d.h2 === 'REPUT', `onglet REPUT choisi (h2 « ${d.h2} »)`);
    dire(d.hash === '#reput', `fragment ${d.hash}`);
    dire(d.ouvertes === 0, 'les lignes se referment au changement de moteur');
    dire(somme(d.niveaux) === d.compte && d.compte === d.lignes, `compteur REPUT juste : ${d.niveaux.join(' + ')} = ${d.lignes}`);
    const avant = d.lignes;

    /* le filtre par niveau filtre ; « Tout déplier » déplie tout */
    await s.evaluer(`(() => { const sel = document.querySelector('.eco-filtres select'); sel.value = '0';
      sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await s.dormir(300);
    const f = await s.evaluer(`(() => ({ lignes: document.querySelectorAll('.eco-ligne').length,
      tousZero: [...document.querySelectorAll('.eco-ligne')].every((l) => l.dataset.niveau === '0'),
      compteur: document.querySelector('.eco-compteur-filtre')?.textContent.trim() }))()`);
    dire(f.lignes > 0 && f.lignes < avant && f.tousZero, `filtre « à tenir » : ${f.lignes} lignes sur ${avant} (${f.compteur})`);
    await s.evaluer(`document.querySelector('.eco-filtres button.v2-val-bouton').click()`);
    await s.dormir(400);
    const t = await s.evaluer(`(() => ({ ouvertes: document.querySelectorAll('.eco-ligne[data-ouvert]').length,
      lignes: document.querySelectorAll('.eco-ligne').length,
      libelle: document.querySelector('.eco-filtres button.v2-val-bouton').textContent.trim() }))()`);
    dire(t.ouvertes === t.lignes && t.libelle === 'Tout replier', `« Tout déplier » : ${t.ouvertes}/${t.lignes}, bouton « ${t.libelle} »`);
    await s.capturer(`captures/ecosysteme-${largeur}-reput-filtre.jpg`);

    /* le socle, dernier onglet */
    await s.evaluer(`document.querySelectorAll('.eco-moteur')[4].click()`);
    await s.dormir(400);
    d = await s.evaluer(SONDE);
    dire(d.actif === 'Socle' && d.flux === 5, `onglet Socle : ${d.lignes} lignes, ${d.flux} étapes`);

    const fin = await s.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    dire(fin === 0, `débordement horizontal : ${fin} px`);
    const soucis = s.soucis.filter((x) => !/favicon|_next\/static\/.*\.map|hot-reloader|HMR|webpack-hmr|turbopack/i.test(x));
    dire(soucis.length === 0, soucis.length ? `console : ${soucis.slice(0, 3).join(' | ')}` : 'aucune erreur de console ni requête en échec');
  } finally {
    s.fermer();
  }
}

console.log(`\n${defauts ? `✗ ${defauts} défaut(s)` : 'ok — aucun défaut'}`);
process.exit(defauts ? 1 : 0);
