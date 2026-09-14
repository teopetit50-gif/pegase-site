/** Recette de la section « équipe » de l'accueil.
 *
 *    node outils/recette-equipe.mjs [url]
 *
 * Ce que prouve ce fichier, et qu'aucune capture ne montre :
 *  · le survol relie les deux moitiés — la vignette s'encre, les autres
 *    s'atténuent, le nom d'en face s'allume, et l'inverse marche aussi ;
 *  · la branche TACTILE rend la couleur pleine (`@media (hover: none)`),
 *    sans quoi un téléphone reste devant des portraits éteints ;
 *  · la mosaïque ne déborde de la colonne à aucune des cinq largeurs.
 *
 * Trois pièges du harnais, tous déjà payés (voir la skill methode-site) :
 *  1. `Input.dispatchMouseEvent` n'applique PAS les règles `:hover` en
 *     headless. Ici ça n'empêche rien : tout l'effet est piloté par l'état
 *     React, donc par des attributs `data-etat`, et un attribut se lit.
 *     C'est même la raison de préférer un attribut à `:hover`.
 *  2. Une page mesurée avant sa feuille de style n'a ni `lg:` ni `hidden` :
 *     on compte les règles CSS avant de conclure quoi que ce soit.
 *  3. Le « débordement 0 » ne prouve rien sous émulation mobile : on tente
 *     le défilement latéral pour de bon.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2] || 'http://localhost:3010/';
const LARGEURS = process.argv[3] ? [Number(process.argv[3])] : [390, 768, 1024, 1440, 1700];
mkdirSync('captures', { recursive: true });

const SONDE = `(() => {
  const mos = document.querySelector('.eq-mosaique');
  if (!mos) return { absent: true };
  const sec = mos.closest('section');
  const wrap = sec.querySelector('.o-wrap');
  const r = (e) => { const b = e.getBoundingClientRect(); return { g: Math.round(b.left), d: Math.round(b.right), l: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    regles: [...document.styleSheets].reduce((n, f) => { try { return n + f.cssRules.length } catch { return n } }, 0),
    hauteurSection: Math.round(sec.getBoundingClientRect().height),
    wrap: r(wrap), mosaique: r(mos),
    tuiles: [...document.querySelectorAll('.eq-tuile')].map(r),
    liste: r(document.querySelector('.eq-liste')),
    colonne: getComputedStyle(mos.parentElement).flexDirection,
    drapeau: [...document.querySelectorAll('.o-pill svg rect')].map(x => x.getAttribute('fill')).filter(Boolean),
    survolNon: matchMedia('(hover: none)').matches,
  };
})()`;

const ETATS = `(() => ({
  tuiles: [...document.querySelectorAll('.eq-tuile')].map(t => ({
    etat: t.dataset.etat,
    opacite: +getComputedStyle(t).opacity.slice(0, 4),
    mono: getComputedStyle(t.querySelector('.eq-mono') || t).color,
    photo: t.querySelector('.eq-photo') ? getComputedStyle(t.querySelector('.eq-photo')).filter : null,
  })),
  rangs: [...document.querySelectorAll('.eq-rang')].map(l => ({
    etat: l.dataset.etat,
    opacite: +getComputedStyle(l).opacity.slice(0, 4),
    tiret: getComputedStyle(l.querySelector('.eq-tiret')).width,
    nom: getComputedStyle(l.querySelector('.eq-nom')).color,
  })),
}))()`;

const centre = (sel, n) => `(() => {
  const e = document.querySelectorAll('${sel}')[${n}];
  e.scrollIntoView({ block: 'center' });
  const b = e.getBoundingClientRect();
  return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
})()`;

let defauts = 0;
const dire = (ok, texte) => { if (!ok) defauts++; console.log(`${ok ? '  ok  ' : '  ✗   '}${texte}`); };

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'equipe',
                                  densite: 1, flags: ['--disable-webgl'] });
  try {
    console.log(`\n──────── ${largeur} px ────────`);
    if (!await s.aller(url)) { console.log('  ✗   page jamais prête'); defauts++; continue; }
    await s.dormir(2500);                       // hydratation (4ᵉ mensonge)
    await s.evaluer(`document.querySelector('.eq-mosaique').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    /* ⚠ ATTENDRE L'APPARITION, ET NE PAS LA SUPPOSER. Le bloc porte
       `data-reveal` : PageMotion le met à `opacity: 0` puis le rend au
       passage de son ScrollTrigger. En headless le rendu est logiciel —
       relevé le 12/09 sur cette page : 58 ms par image, et l'apparition
       n'arrive qu'entre 2,8 et 3,2 s après le saut. Une capture prise à
       1,2 s rend une PAGE BLANCHE, section comprise, alors que la page va
       parfaitement bien. On sonde l'opacité jusqu'à ce qu'elle arrive. */
    let apparu = false;
    for (let i = 0; i < 30 && !apparu; i++) {
      await s.dormir(300);
      apparu = await s.evaluer(`getComputedStyle(document.querySelector('.eq-mosaique').closest('[data-reveal]')).opacity === '1'`);
    }
    dire(apparu, apparu ? 'le bloc est apparu (data-reveal joué)' : 'le bloc est resté invisible après 9 s');
    await s.dormir(400);

    const m = await s.evaluer(SONDE);
    if (m.absent) { console.log('  ✗   section absente de la page'); defauts++; continue; }
    dire(m.regles > 400, `feuille chargée (${m.regles} règles CSS)`);
    console.log(`      section ${m.hauteurSection} px · mosaïque ${m.mosaique.l} px · liste ${m.liste.l} px · ${m.colonne === 'row' ? 'côte à côte' : 'empilé'}`);
    dire(m.mosaique.g >= m.wrap.g - 1 && m.mosaique.d <= m.wrap.d + 1,
         `mosaïque dans la colonne (${m.mosaique.g}→${m.mosaique.d} dans ${m.wrap.g}→${m.wrap.d})`);
    dire(m.tuiles.every(t => t.l > 60), `${m.tuiles.length} vignettes, la plus étroite ${Math.min(...m.tuiles.map(t => t.l))} px`);
    dire(JSON.stringify(m.drapeau).includes('#000091') && JSON.stringify(m.drapeau).includes('#E1000F'),
         `drapeau aux teintes officielles (${m.drapeau.join(' ')})`);

    /* débordement : on TENTE le défilement, on ne lit pas scrollWidth */
    const deborde = await s.evaluer(`(() => {
      const e = document.scrollingElement; e.scrollLeft = 9999;
      const x = e.scrollLeft; e.scrollLeft = 0; return x;
    })()`);
    dire(deborde === 0, `aucun défilement latéral (scrollLeft ${deborde})`);

    const cl = await s.envoyer('Page.captureScreenshot', { format: 'png' });
    if (cl.result?.data) writeFileSync(`captures/equipe-${largeur}.png`, Buffer.from(cl.result.data, 'base64'));

    /* ——— le survol, à partir de lg (au-dessous la liste est empilée) ——— */
    if (largeur >= 1024) {
      const p = await s.evaluer(centre('.eq-tuile', 1));
      await s.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, buttons: 0 });
      await s.dormir(900);
      const e = await s.evaluer(ETATS);
      dire(e.tuiles[1].etat === 'actif' && e.tuiles.filter(t => t.etat === 'attenue').length === e.tuiles.length - 1,
           `vignette survolée active, les autres atténuées (${e.tuiles.map(t => t.etat).join(', ')})`);
      dire(e.tuiles[1].opacite === 1 && e.tuiles[0].opacite < 0.7,
           `l'atténuation est peinte (${e.tuiles.map(t => t.opacite).join(' / ')})`);
      dire(e.rangs[1].etat === 'actif', `le nom d'en face s'allume (${e.rangs.map(r => r.etat).join(', ')})`);
      dire(parseFloat(e.rangs[1].tiret) > parseFloat(e.rangs[0].tiret),
           `le tiret du nom actif s'allonge (${e.rangs.map(r => r.tiret).join(' / ')})`);
      dire(e.rangs[1].nom !== e.rangs[0].nom, `le nom actif s'encre (${e.rangs[1].nom} vs ${e.rangs[0].nom})`);

      /* et l'inverse : survoler un NOM doit encrer sa vignette */
      const q = await s.evaluer(centre('.eq-rang', 2));
      await s.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x, y: q.y, buttons: 0 });
      await s.dormir(900);
      const e2 = await s.evaluer(ETATS);
      dire(e2.tuiles[2].etat === 'actif', `survoler un nom encre sa vignette (${e2.tuiles.map(t => t.etat).join(', ')})`);
      await s.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, buttons: 0 });
    }

    /* ——— la branche tactile ———
       `mobile: true` du harnais ne suffit pas : `hover` reste `hover`. On
       émule la caractéristique média elle-même. */
    if (largeur === 390) {
      /* ⚠ `Emulation.setEmulatedMedia` ne sait PAS émuler `hover` : ses
         `features` ne couvrent que les préférences (couleur, mouvement,
         contraste). Relevé le 12/09 — la sonde répondait `hover: none =
         false` sur une page qui va bien. Ce qui bascule la caractéristique,
         c'est l'émulation TACTILE : un pointeur grossier sans survol. */
      await s.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await s.dormir(500);
      /* Tant que les portraits ne sont pas déposés, aucune `.eq-photo`
         n'existe : la règle qui compte ne serait pas mesurée, et la sonde
         répondrait « conforme » sans avoir rien lu. On greffe donc une
         image d'essai — la règle porte sur la CLASSE, pas sur la source. */
      const t = await s.evaluer(`(() => {
        let p = document.querySelector('.eq-photo'), greffe = false;
        if (!p) {
          p = document.createElement('img');
          p.className = 'eq-photo'; greffe = true;
          p.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
          document.querySelector('.eq-tuile').appendChild(p);
        }
        return { survolNon: matchMedia('(hover: none)').matches,
                 filtre: getComputedStyle(p).filter, greffe };
      })()`);
      dire(t.survolNon, `média tactile émulé (hover: none = ${t.survolNon})`);
      dire(t.filtre === 'none',
           `couleur pleine au doigt (filter: ${t.filtre}${t.greffe ? ', image d\'essai greffée' : ''})`);
      await s.envoyer('Emulation.setTouchEmulationEnabled', { enabled: false });
      await s.dormir(400);
      /* 14/09 — le noir et blanc a été retiré à la demande de Teo. Le
         contrôle change de sens : on vérifie désormais qu'AUCUN filtre ne
         décolore les portraits, au doigt comme à la souris. */
      const t2 = await s.evaluer(`getComputedStyle(document.querySelector('.eq-photo')).filter`);
      dire(!/grayscale\(([1-9]|0?\.[1-9])/.test(t2), `couleur pleine aussi à la souris (filter: ${t2})`);
      await s.envoyer('Emulation.setTouchEmulationEnabled', { enabled: false });
    }

    /* Les portraits pas encore déposés rendent un 404 par vignette, et le
       message de console ne porte pas l'URL. On en tolère exactement autant
       que de vignettes retombées sur le monogramme — ni plus, ni moins. */
    const manquants = await s.evaluer(`document.querySelectorAll('.eq-mono').length`);
    let quota = manquants;
    const bruit = s.soucis.filter(x => {
      if (quota > 0 && /404/.test(x)) { quota--; return false; }
      return true;
    });
    dire(bruit.length === 0, bruit.length ? `console : ${bruit.slice(0, 3).join(' | ')}`
         : `aucune erreur console ni requête en échec${manquants ? ` (hors ${manquants} portrait(s) non déposé(s))` : ''}`);
    if (manquants) console.log(`      · ${manquants} portrait(s) non déposé(s) : la vignette rend les initiales`);
  } finally {
    s.fermer();
  }
}

console.log(defauts === 0 ? '\n✔ recette passée aux cinq largeurs' : `\n✗ ${defauts} défaut(s)`);
process.exit(0);
