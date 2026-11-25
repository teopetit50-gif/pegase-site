/* Instantané du DOM VIVANT d'une page à une largeur (après hydratation et
   un aller-retour de défilement) : la référence fabrique une partie de son
   arbre dans le navigateur, que son HTML serveur ne contient pas.
   usage : node outils/sx/instantane.mjs <url> <largeur> <sortie.json> [--sans-defilement] */
import { writeFileSync } from 'node:fs';
import { ouvrirSession } from '../chrome.mjs';
const [url, l = '1440', sortie = '/tmp/sx/instantane.json', mode] = process.argv.slice(2);
const largeur = Number(l);
const s = await ouvrirSession({ largeur, hauteur: largeur < 600 ? 844 : 900, marque: 'sxinst', densite: 1 });
try {
  if (!await s.aller(url, { plafond: 90 })) throw new Error('page jamais prête');
  await s.dormir(1500);
  const r = await s.evaluer(`(async () => {
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    const H = () => document.documentElement.scrollHeight;
    if (${mode !== '--sans-defilement'}) {
      for (let y = 0; y < H(); y += Math.round(innerHeight * 0.6)) { scrollTo(0, y); await dormir(160); }
      scrollTo(0, H()); await dormir(300); scrollTo(0, 0); await dormir(1200);
    }
    const barre = document.querySelector('.synnax-navbar-sticky, .sx-navbar-sticky');
    return {
      enveloppe: barre ? barre.parentElement.outerHTML : null,
      pied: (document.querySelector('footer.sgf') || {}).outerHTML || null,
      styles: [...document.querySelectorAll('style')].map((e) => e.textContent),
      html: document.documentElement.className, body: document.body.className,
      hauteur: H(), iw: innerWidth,
    };
  })()`);
  writeFileSync(sortie, JSON.stringify(r));
  console.log(largeur, 'enveloppe', (r.enveloppe || '').length, 'pied', (r.pied || '').length, 'styles', r.styles.map((x) => x.length).join(','), 'hauteur', r.hauteur);
} finally { s.fermer(); }
process.exit(0);
