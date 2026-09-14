/** Recette du fond « Silk » du hero.
 *
 *  Deux choses qu'aucune capture du volet ne rend :
 *  1. QUE ÇA BOUGE. Le volet replié gèle le compositeur, donc trois captures
 *     à vingt secondes d'intervalle y sont identiques — ce n'est pas le
 *     composant qui est figé, c'est le harnais. Ici le screencast force la
 *     production d'images.
 *  2. CE QUE LE TEXTE A SOUS LUI. Le nuancier traverse du #101010 au #F5F5F5 :
 *     ce qui décide de la lisibilité n'est pas la moyenne mais le PIRE
 *     moment. On capture donc le fond SEUL (texte masqué) à N instants
 *     étalés, et on relève la luminance dans le rectangle exact de chaque
 *     bloc de texte.
 *
 *  usage : node outils/silk-recette.mjs <url> <dossier>
 */
import { writeFileSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const URL_BASE = process.argv[2] || 'http://localhost:3010/';
const SORTIE = process.argv[3] || '/tmp/silk';
const LARGEURS = (process.argv[4] || '390,768,1024,1440,1700').split(',').map(Number);

/* Les blocs dont la lisibilité est en jeu, avec la couleur de leur texte
   relevée dans la page (pas devinée). */
const BLOCS = `(() => {
  /* Un rectangle d'ÉLÉMENT ment : un <h1> centré fait toute la largeur de la
     colonne, donc son rectangle englobe les marges — où le nuancier est
     entier. On relève alors « pire fond » dans le vide, pas sous le texte.
     On prend donc un rectangle PAR LIGNE RENDUE, serré sur les glyphes
     (Range.getClientRects), et on le rogne de 2 px pour ne pas mordre sur
     le fond juste à côté de la première et de la dernière lettre. */
  const lignes = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return [...r.getClientRects()].filter((k) => k.width > 8 && k.height > 4);
  };
  const out = [];
  for (const [nom, sel] of [['pastille', '.o-flux-pastille'], ['h1', '.o-flux-h1'],
                            ['chapo', '.o-flux-lead'], ['sous', '.o-flux-sous']]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const couleur = getComputedStyle(el).color;
    lignes(el).forEach((k, i) => out.push({
      nom: nom + (i ? '/' + (i + 1) : ''), couleur,
      x: Math.round(k.x + 2), y: Math.round(k.y + 2),
      w: Math.max(1, Math.round(k.width - 4)), h: Math.max(1, Math.round(k.height - 4)),
    }));
  }
  return out;
})()`;

/* `Page.captureScreenshot` attend un commit du compositeur. Sur une page
   lourde (WebGL plein cadre sous SwiftShader), la file du screencast se
   remplit et ce commit n'arrive jamais : l'appel ne rend plus la main et
   node meurt sur « unsettled top-level await ». On coupe donc le
   screencast le temps de la capture, puis on le relance — il n'est là que
   pour forcer la production d'images entre deux relevés. */
const capturer = async (s, fichier) => {
  await s.envoyer('Page.stopScreencast', {});
  const reponse = await Promise.race([
    s.envoyer('Page.captureScreenshot', { format: 'png' }),
    s.dormir(75000).then(() => null),
  ]);
  await s.envoyer('Page.startScreencast', { format: 'jpeg', quality: 5, everyNthFrame: 1 });
  if (!reponse?.result?.data) { console.log(`  ⚠ capture manquée : ${fichier}`); return false; }
  writeFileSync(fichier, Buffer.from(reponse.result.data, 'base64'));
  return true;
};

/* UNE seule session pour toutes les largeurs. Relancer Chromium par largeur
   coûtait plus cher que la mesure elle-même : à quatre lancements, la charge
   de ce Mac montait au-dessus de 20 et le serveur de développement ne
   répondait plus dans les 16 s d'attente — on relevait alors « la page n'est
   pas venue », qui n'était pas un défaut du site. On change les métriques
   d'appareil et on RECHARGE (redimensionner sans recharger ne rejoue pas ce
   qui se pose au chargement). */
const s = await ouvrirSession({ largeur: LARGEURS[0], hauteur: 900, marque: 'silk' });
const resultats = [];
for (const largeur of LARGEURS) {
  const hauteur = largeur < 768 ? 844 : 900;
  await s.envoyer('Emulation.setDeviceMetricsOverride',
    { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: largeur < 768 });
  const ok = await s.aller(URL_BASE, { signe: `!!document.querySelector('.o-flux-toile')`, plafond: 90 });
  if (!ok) { console.log(`${largeur} — la page n'est pas venue`); continue; }
  for (let i = 0; i < 60; i++) {
    if (await s.evaluer(`document.querySelector('.o-flux-toile')?.width > 300`)) break;
    await s.dormir(300);
  }
  await s.dormir(600);

  const blocs = await s.evaluer(BLOCS);
  const voile = await s.evaluer(`(() => {
    const v = document.querySelector('.o-flux-voile');
    return v ? getComputedStyle(v).backgroundImage.slice(0, 60) : 'ABSENT';
  })()`);
  const toile = await s.evaluer(`(() => {
    const c = document.querySelector('.o-flux-toile');
    return { larg: c.width, haut: c.height, cssL: c.clientWidth, cssH: c.clientHeight,
             opacite: getComputedStyle(c).opacity };
  })()`);
  const debord = await s.evaluer(`document.documentElement.scrollWidth - window.innerWidth`);

  await capturer(s, `${SORTIE}/vue-${largeur}.png`);
  await s.evaluer(`(() => {
    document.getElementById('sans-texte')?.remove();
    const st = document.createElement('style');
    st.id = 'sans-texte';
    st.textContent = '.o-flux .o-wrap, .o-flux-maquette { visibility: hidden !important }';
    document.head.appendChild(st);
  })()`);
  for (const dt of [0, 15, 30]) {
    if (dt) await s.dormir(15000);
    await capturer(s, `${SORTIE}/fond-${largeur}-t${String(dt).padStart(2, '0')}.png`);
  }
  resultats.push({ largeur, debord, voile, toile, blocs, soucis: s.soucis.slice(0, 4) });
  writeFileSync(`${SORTIE}/blocs-${largeur}.json`, JSON.stringify(blocs, null, 1));
  console.log(JSON.stringify({ largeur, debord, voile, toile: toile, nbBlocs: blocs.length, soucis: s.soucis.slice(0, 4) }));
}
s.fermer();
