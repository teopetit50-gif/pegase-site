/** Recette visuelle : une capture de la FENÊTRE par palier de défilement.
 *
 *    node defile.mjs <url> [largeur] [hauteur] [dossier]
 *
 * Pourquoi pas `captureBeyondViewport` : il invente une fenêtre géante, ce qui
 * fait re-mesurer les conteneurs qui se dimensionnent eux-mêmes (graphiques,
 * carrousels) — ils se photographient vides alors qu'ils se dessinent très
 * bien ; et sur une page haute avec du rendu logiciel, il peut ne jamais
 * rendre la main. Un défilé de captures de la fenêtre montre ce qu'un
 * visiteur voit.
 *
 * Le défilement est lent à dessein : chaque bloc doit ENTRER dans la fenêtre
 * pour que son IntersectionObserver tire, puis y rester le temps que la
 * transition s'achève.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
const hauteur = Number(process.argv[4] || 900);
const dossier = process.argv[5] || 'captures';
if (!url) { console.error('usage: node defile.mjs <url> [largeur] [hauteur] [dossier]'); process.exit(1); }

mkdirSync(dossier, { recursive: true });
/* `--disable-webgl` : l'accueil peint son fond « Silk » en WebGL, qui passe
   ici par le processeur et sature le thread au point que la première mesure
   ne rend jamais la main. Voir l'en-tête de `ouvrirSession`. Le fond ne se
   photographie plus ; tout le reste de la page, si. */
const s = await ouvrirSession({ largeur, hauteur, marque: 'defile',
                                densite: 1, flags: ['--disable-webgl'] });
try {
  if (!await s.aller(url)) {
    console.log('⚠ page jamais prête (serveur éteint, ou qui recompile encore)');
  } else {
    const total = await s.evaluer('document.body.scrollHeight');
    const pas = Math.round(hauteur * 0.85);
    let n = 0;
    for (let y = 0; y < total; y += pas) {
      await s.evaluer(`window.scrollTo(0, ${y})`);
      await s.dormir(900);
      const cliche = await s.envoyer('Page.captureScreenshot', { format: 'png' });
      if (cliche.result?.data) {
        const nom = `${dossier}/${largeur}-vue-${String(++n).padStart(2, '0')}.png`;
        writeFileSync(nom, Buffer.from(cliche.result.data, 'base64'));
        console.log(`${nom}  y=${y}`);
      }
    }
    const deb = await s.evaluer('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    console.log(`\nlargeur ${largeur} · hauteur ${total} · débordement ${deb}`);
    console.log(s.soucis.length ? s.soucis.slice(0, 8).join('\n')
                                : 'aucune erreur console ni requête en échec');
    if (deb > 0) console.log('⚠ débordement horizontal : la page défile latéralement.');
  }
} finally {
  s.fermer();
}
process.exit(0);
