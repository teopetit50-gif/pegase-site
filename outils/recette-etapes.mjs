/** Recette de la section « Comment se passe l'audit » (#deroule).
 *
 *    node outils/recette-etapes.mjs <url> <largeur> <dossier>
 *
 * Trois choses qu'un défilé de captures ne montre pas :
 *  · les trois pastilles sont-elles alignées sur UNE ligne, et centrées sur
 *    leur colonne (c'est ce que la sous-grille doit garantir) ;
 *  · les filets se rejoignent-ils d'une colonne à l'autre (aucun trou dans
 *    la gouttière, aucun bout qui dépasse aux extrémités) ;
 *  · les trois cartes font-elles la même hauteur, et combien de LIGNES
 *    chacune (le budget mobile se compte en lignes, pas en signes).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
const dossier = process.argv[4] || 'captures';
mkdirSync(dossier, { recursive: true });

const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'etapes',
                                densite: 1, flags: ['--disable-webgl'] });
try {
  if (!await s.aller(url)) { console.log('⚠ page jamais prête'); process.exit(1); }

  const mesure = await s.evaluer(`(() => {
    const r = (e) => { const b = e.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY),
               l: Math.round(b.width), h: Math.round(b.height) }; };
    const lignes = (e) => { const c = getComputedStyle(e);
      const lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.4;
      return Math.round(e.getBoundingClientRect().height / lh); };
    const eta = document.querySelector('.eta');
    if (!eta) return { absent: true };
    const temps = [...eta.querySelectorAll('.eta-temps')];
    return {
      section: r(document.querySelector('#deroule')),
      pastilles: temps.map((t) => r(t.querySelector('.eta-pastille'))),
      traits: temps.map((t) => [...t.querySelectorAll('.eta-trait')].map((f) => ({
        ...r(f), vu: getComputedStyle(f).visibility, aff: getComputedStyle(f).display }))),
      cartes: temps.map((t) => {
        const c = t.querySelector('.eta-carte');
        return { ...r(c), lignes: lignes(c.querySelector('.eta-texte')),
                 titre: lignes(c.querySelector('.eta-titre')) };
      }),
      debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  })()`);

  console.log(JSON.stringify(mesure, null, 1));

  /* capture de la section seule : on cadre la fenêtre sur elle */
  const { y, h } = mesure.section;
  await s.envoyer('Emulation.setDeviceMetricsOverride',
    { width: largeur, height: Math.min(h + 20, 2400), deviceScaleFactor: 1,
      mobile: largeur < 768 });
  /* Après un changement de fenêtre, les déclencheurs GSAP de la page sont
     périmés : la carte reste à l'opacité 0 posée par le reveal et on
     photographie une section vide en croyant avoir cassé la page. On
     rafraîchit, puis on passe DEVANT la section avant de revenir la cadrer. */
  await s.evaluer(`window.ScrollTrigger && window.ScrollTrigger.refresh()`);
  await s.evaluer(`window.scrollTo(0, ${y + 400})`);
  await s.dormir(1000);
  await s.evaluer(`window.scrollTo(0, ${y - 10})`);
  await s.dormir(1400);
  const c = await s.envoyer('Page.captureScreenshot', { format: 'png' });
  const nom = `${dossier}/etapes-${largeur}.png`;
  writeFileSync(nom, Buffer.from(c.result.data, 'base64'));
  console.log(nom);
  console.log(s.soucis.length ? s.soucis.slice(0, 5).join('\n') : 'aucune erreur console');
} finally { s.fermer(); }
process.exit(0);
