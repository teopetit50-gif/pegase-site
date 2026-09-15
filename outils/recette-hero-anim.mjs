/** Recette de la cascade du hero — une image par instant de l'animation.
 *
 *    node recette-hero-anim.mjs <url> [largeur] [hauteur] [dossier]
 *
 * Pourquoi ne pas simplement charger la page et photographier : le temps
 * qu'un serveur de développement rende la main, la cascade est déjà finie.
 * Et un délai fixe après navigation ne dit rien — on ne sait pas de quand on
 * compte.
 *
 * Ici la page est chargée normalement, PUIS toutes ses animations Web sont
 * mises en pause et remises à l'instant voulu (`currentTime`). Chaque image
 * est donc prise à un instant EXACT de la cascade, et deux exécutions
 * donnent la même chose. Les tweens GSAP de la page ne sont pas des
 * animations Web : ils ne sont pas touchés.
 *
 * `--disable-webgl` : l'accueil peint son fond « Silk » en WebGL, qui sature
 * ici le processeur au point que la première mesure ne rend jamais la main.
 * Le fond ne se photographie donc pas — tout le reste, si.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
const hauteur = Number(process.argv[4] || 900);
const dossier = process.argv[5] || 'captures/hero-anim';
if (!url) { console.error('usage: node recette-hero-anim.mjs <url> [largeur] [hauteur] [dossier]'); process.exit(1); }

const INSTANTS = [0, 250, 500, 800, 1100, 1500, 2200];

mkdirSync(dossier, { recursive: true });
const s = await ouvrirSession({ largeur, hauteur, marque: 'heroanim',
                                densite: 1, flags: ['--disable-webgl'] });
try {
  if (!await s.aller(url)) {
    console.log('⚠ page jamais prête (serveur éteint, ou qui recompile encore)');
  } else {
    const n = await s.evaluer(`document.querySelectorAll('.o-mot').length`);
    const anim = await s.evaluer(`document.getAnimations().length`);
    console.log(`${largeur}px — ${n} mots animés, ${anim} animations vivantes`);

    for (const t of INSTANTS) {
      await s.evaluer(`document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = ${t}; } catch {} })`);
      await s.dormir(120);
      const { result } = await s.envoyer('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`${dossier}/${largeur}-${String(t).padStart(4, '0')}ms.png`,
                    Buffer.from(result.data, 'base64'));
    }

    /* état final : on relâche tout, puis on mesure la page posée */
    await s.evaluer(`document.getAnimations().forEach(a => { try { a.finish(); } catch {} })`);
    await s.dormir(200);
    const mesure = await s.evaluer(`(() => {
      const q = (s) => document.querySelector(s);
      const vis = (e) => { if (!e) return null; const c = getComputedStyle(e);
        return { opacite: c.opacity, transform: c.transform === 'none' ? 'none' : 'posé' }; };
      const r = (e) => { const b = e?.getBoundingClientRect(); return b ? Math.round(b.top) : null; };
      return {
        debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pastille: vis(q('.o-flux-pastille')?.parentElement),
        titre: vis(q('.o-flux-h1 .o-mot')),
        chapo: vis(q('.o-flux-lead')),
        bouton: vis(q('.o-flux-btn')),
        sous: vis(q('.o-flux-sous')),
        hautTitre: r(q('.o-flux-h1')),
        hautMaquette: r(q('.o-flux-maquette')),
        decor: !!q('.o-hero-decor'),
        coinsVus: [...document.querySelectorAll('.o-hero-coin')]
          .filter((e) => getComputedStyle(e).display !== 'none').length,
      };
    })()`);
    console.log(JSON.stringify(mesure, null, 2));
  }
  if (s.soucis.length) console.log('⚠ ' + s.soucis.slice(0, 8).join('\n⚠ '));
  else console.log('console : rien');
} finally { s.fermer(); }
