/** recette-rapidite.mjs — 14/09/2026
 *
 *  Contrôle le chantier « rapidité » sur un vrai navigateur, parce que le
 *  volet replié étrangle les minuteurs à 1 s et gèle les montages différés :
 *  tout ce qu'on y mesure sur une navigation est faux ([[recette-navigateur-sans-le-volet]]).
 *
 *  Trois questions, une par défaut possible du chantier :
 *    1. les décors différés (three.js du héros FILED, recharts de RELOAD)
 *       se montent-ils toujours, et leur morceau arrive-t-il bien APRÈS ?
 *    2. la cascade d'arrivée se termine en combien de temps, sur une page
 *       qui en porte une ([data-arrivee]) ?
 *    3. reste-t-il un lien interne qui recharge tout le document ?
 *
 *  Usage :  node outils/recette-rapidite.mjs [base]
 *           (base par défaut http://localhost:3411)
 */
import { ouvrirSession } from './chrome.mjs';

const BASE = process.argv[2] || 'http://localhost:3411';
const ok = (b) => (b ? '  OK  ' : ' DEFAUT ');
let defauts = 0;

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, densite: 1, marque: 'rapidite' });

console.log(`\n═══ recette rapidité — ${BASE} ═══\n`);

/* ── 1. les décors différés ───────────────────────────────────────────── */
console.log('1. DÉCORS DIFFÉRÉS — ils doivent arriver, mais après la page\n');

await s.aller(`${BASE}/offres/factures-fournisseurs`);
await s.dormir(3500);
const filed = await s.evaluer(`(() => {
  const c = document.querySelector('canvas');
  const r = performance.getEntriesByType('resource');
  const gros = r.filter(x => (x.decodedBodySize || 0) > 400 * 1024);
  const h1 = document.querySelector('h1');
  return {
    canvasMonte: !!c,
    canvasLarge: c ? c.width : 0,
    morceauLourdKo: gros.length ? Math.round(gros[0].decodedBodySize / 1024) : 0,
    /* l'instant où le gros morceau finit d'arriver, comparé à celui où le
       titre est peint : le décor doit être le second, pas le premier */
    morceauLourdFinMs: gros.length ? Math.round(gros[0].responseEnd) : null,
    titreVisible: !!h1 && h1.getBoundingClientRect().height > 0,
  };
})()`);
console.log(`${ok(filed.canvasMonte)} héros FILED : canvas monté=${filed.canvasMonte} (largeur ${filed.canvasLarge})`);
console.log(`        morceau lourd ${filed.morceauLourdKo} ko, arrivé à ${filed.morceauLourdFinMs} ms ; titre peint=${filed.titreVisible}`);
if (!filed.canvasMonte) defauts++;

await s.aller(`${BASE}/offres/nouvelles-affaires`);
const avantDefile = await s.evaluer(`(() => {
  const r = performance.getEntriesByType('resource');
  return { koAvantDefile: Math.round(r.reduce((a, x) => a + (x.decodedBodySize || 0), 0) / 1024) };
})()`);
/* le graphique vit en bas de page : on descend pour le faire entrer */
await s.evaluer(`document.querySelector('[data-sonde="graphique"]')?.scrollIntoView({block:'center'}); true`);
await s.dormir(3000);
const reload = await s.evaluer(`(() => {
  const svg = document.querySelector('[data-sonde="graphique"] svg');
  const r = performance.getEntriesByType('resource');
  return {
    graphiqueRendu: !!svg,
    tracesSvg: svg ? svg.querySelectorAll('path').length : 0,
    koApresDefile: Math.round(r.reduce((a, x) => a + (x.decodedBodySize || 0), 0) / 1024),
  };
})()`);
console.log(`${ok(reload.graphiqueRendu && reload.tracesSvg > 2)} graphique RELOAD : rendu=${reload.graphiqueRendu}, ${reload.tracesSvg} tracés SVG`);
console.log(`        ${avantDefile.koAvantDefile} ko avant défilement → ${reload.koApresDefile} ko après (le tracé arrive au défilement)`);
if (!reload.graphiqueRendu || reload.tracesSvg <= 2) defauts++;

/* ── 2. la cascade d'arrivée ──────────────────────────────────────────── */
console.log('\n2. CASCADE D\'ARRIVÉE — temps entre le clic et le premier écran posé\n');

for (const [depuis, verbe] of [['/tarifs', 'Réserver un audit'], ['/', 'Commencer']]) {
  await s.aller(`${BASE}${depuis}`);
  await s.dormir(500);
  const mesure = await s.evaluer(`(async () => {
    const a = [...document.querySelectorAll('a[href^="/"]')]
      .find(x => (x.textContent || '').trim() === ${JSON.stringify(verbe)});
    if (!a) return { erreur: 'lien « ' + ${JSON.stringify(verbe)} + ' » introuvable sur ' + location.pathname };
    const cible = a.getAttribute('href');
    const t0 = performance.now();
    a.click();
    /* on attend que la page cible soit là, puis que TOUS les éléments
       marqués du premier écran soient à pleine opacité */
    let tBascule = null, tPosee = null;
    for (let i = 0; i < 400; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const n = performance.now() - t0;
      if (tBascule === null && location.pathname === cible.split('#')[0]) tBascule = n;
      if (tBascule !== null) {
        const els = [...document.querySelectorAll('[data-arrivee]')]
          .filter(e => e.getBoundingClientRect().top < innerHeight);
        if (els.length && !els.some(e => parseFloat(getComputedStyle(e).opacity) < 0.99)) { tPosee = n; break; }
        if (!els.length && n > 300) { tPosee = n; break; }   // page sans cascade
      }
      if (n > 5000) break;
    }
    return { cible, bascule: Math.round(tBascule), posee: tPosee === null ? null : Math.round(tPosee),
             marques: document.querySelectorAll('[data-arrivee]').length };
  })()`);
  if (!mesure || mesure.erreur) { console.log(`  (ignoré) ${depuis} : ${mesure?.erreur || 'évaluation sans réponse'}`); continue; }
  const bon = mesure.posee !== null && mesure.posee < 700;
  console.log(`${ok(bon)} ${depuis} → ${mesure.cible} : DOM basculé à ${mesure.bascule} ms, premier écran posé à ${mesure.posee} ms (${mesure.marques} éléments marqués)`);
  if (!bon) defauts++;
}

/* ── 3. plus aucun lien interne qui recharge le document ──────────────── */
console.log('\n3. LIENS INTERNES — aucun ne doit recharger tout le site\n');

for (const [page, libelle] of [
  ['/offres/relances-impayes', 'Réserver un audit'],
  ['/tarifs', 'Nous écrire'],
]) {
  await s.aller(`${BASE}${page}`);
  await s.dormir(400);
  const r = await s.evaluer(`(async () => {
    const a = [...document.querySelectorAll('a[href^="/"]')]
      .find(x => (x.textContent || '').trim() === ${JSON.stringify(libelle)});
    if (!a) return { erreur: 'bouton « ' + ${JSON.stringify(libelle)} + ' » introuvable' };
    window.__temoin = 'vivant';          // ne survit pas à un rechargement
    const cible = a.getAttribute('href');
    a.click();
    await new Promise(r => setTimeout(r, 1800));
    return { cible, url: location.pathname, temoin: window.__temoin === 'vivant' };
  })()`);
  if (!r || r.erreur) { console.log(`  (ignoré) ${page} : ${r?.erreur || 'évaluation sans réponse'}`); continue; }
  console.log(`${ok(r.temoin)} ${page} → « ${libelle} » (${r.cible}) : navigation client=${r.temoin}${r.temoin ? '' : ' — RECHARGEMENT COMPLET'}`);
  if (!r.temoin) defauts++;
}

/* ── erreurs de console relevées en chemin ────────────────────────────── */
const bruit = s.soucis.filter(x => !/favicon|ERR_ABORTED/.test(x));
console.log(`\n4. CONSOLE — ${bruit.length} erreur(s)`);
for (const b of bruit.slice(0, 8)) console.log('   · ' + b);

console.log(`\n═══ ${defauts === 0 ? 'AUCUN DÉFAUT' : defauts + ' DÉFAUT(S)'} ═══\n`);
s.fermer();
process.exit(defauts === 0 ? 0 : 1);
