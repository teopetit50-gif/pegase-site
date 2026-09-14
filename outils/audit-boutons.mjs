/* ══════════════════════════════════════════════════════════════════════
   AUDIT DES BOUTONS — écrit le 11/09/2026 après le « gros losange noir »
   de la clôture de CASHD.

   Ce que cherchait ce défaut, et que rien ne signalait : le bouton était
   réglé de deux façons contradictoires — `h-10` (hauteur fixée à 40 px)
   ET `py-5` (40 px de rembourrage vertical). En `border-box`, la boîte de
   CONTENU tombe à 0 : le libellé se centre dans le vide et touche les
   deux bords. Aucun contrôle de débordement ne le voit, la page rend
   « correctement », et ça se lit pourtant comme un bug à l'œil nu.

   Les quatre signes relevés ici, du plus sûr au plus discutable :
     ÉCRASÉ   hauteur fixe + rembourrage qui la consomme (le défaut ci-dessus)
     ROGNÉ    le LIBELLÉ déborde de sa boîte de contenu

   ⚠ PIÈGE DE LA PREMIÈRE VERSION, gardé en mémoire : comparer
   `scrollWidth` à `clientWidth` signalait ROGNÉ +74px sur les deux
   boutons de FILED. Ce n'était pas le libellé — c'est la tache
   de lumière de `star-button` (110 px) qui court sur le contour en
   `offset-path`, enfant absolu et `aria-hidden`. Le bouton va très bien.
   On mesure donc le TEXTE, par un Range sur ses nœuds, et on le compare
   à la boîte de contenu.
     CIBLE    moins de 36 px de haut — trop petit pour un DOIGT, donc
              la règle ne vaut que sous 640 : à la souris, 33 px va très
              bien, et la signaler à 1440 ferait passer pour un défaut un
              réglage volontaire.
     RAYON    rayon minoritaire sur sa page (la page a un vocabulaire,
              celui-là en sort) — à REGARDER, pas à corriger d'office :
              un appel principal a le droit de se distinguer.

   Usage : node outils/audit-boutons.mjs <largeur> <url...>
   ══════════════════════════════════════════════════════════════════════ */
import { ouvrirSession } from './chrome.mjs';

const largeur = Number(process.argv[2] || 390);
const urls = process.argv.slice(3);

const SONDE = `(() => {
  const out = [];
  for (const e of document.querySelectorAll('a, button, [role="button"], input[type="submit"]')) {
    const r = e.getBoundingClientRect();
    if (r.width < 36 || r.height < 12) continue;
    const c = getComputedStyle(e);
    if (c.visibility === 'hidden' || c.display === 'none') continue;
    const t = (e.textContent || e.value || '').trim().replace(/\\s+/g, ' ');
    if (!t || t.length > 44) continue;
    /* Un bouton, ici : une boîte qui porte un fond, une bordure ou un
       rayon. Un lien de menu ou de pied n'en est pas un et n'a pas à
       suivre ces règles. */
    const fond = c.backgroundColor && c.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const bord = parseFloat(c.borderTopWidth) > 0;
    const ray = Math.min(parseFloat(c.borderTopLeftRadius) || 0, 999);
    if (!fond && !bord && ray === 0) continue;
    const pv = parseFloat(c.paddingTop) + parseFloat(c.paddingBottom);
    const hFixe = /px$/.test(c.height);
    out.push({
      t: t.slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), ray, pv,
      contenu: Math.round(r.height - pv), hFixe,
      /* Largeur réelle du texte peint, par un Range : insensible aux
         enfants décoratifs en position absolue. */
      rogne: (() => {
        const nx = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        let max = 0, n;
        while ((n = nx.nextNode())) {
          if (!n.nodeValue.trim()) continue;
          const g = document.createRange(); g.selectNodeContents(n);
          for (const rr of g.getClientRects()) max = Math.max(max, rr.width);
        }
        const utile = e.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
        return Math.round(max - utile);
      })(),
    });
  }
  return JSON.stringify(out);
})()`;

let total = 0;
for (const url of urls) {
  const s = await ouvrirSession({
    largeur, hauteur: 844, screencast: false, densite: 1,
    flags: ['--disable-webgl'], marque: 'audit',
  });
  let liste = [];
  if (await s.aller(url)) {
    try { liste = JSON.parse(await s.evaluer(SONDE)); } catch { liste = []; }
  } else {
    console.log(`\n${url}\n  ⨯ page absente`); s.fermer(); continue;
  }
  s.fermer();

  /* Le rayon dominant de la page : le vocabulaire qu'elle s'est donné. */
  const compte = {};
  for (const b of liste) compte[b.ray] = (compte[b.ray] || 0) + 1;
  const dominant = Object.entries(compte).sort((a, b) => b[1] - a[1])[0]?.[0];

  const defauts = [];
  const vus = new Set();
  for (const b of liste) {
    const cle = b.t + b.w + b.h;
    if (vus.has(cle)) continue;
    vus.add(cle);
    const m = [];
    if (b.hFixe && b.contenu <= 2) m.push('ÉCRASÉ');
    if (b.rogne > 1) m.push(`ROGNÉ +${b.rogne}px`);
    if (largeur < 640 && b.h < 36) m.push(`CIBLE ${b.h}px`);
    if (dominant !== undefined && String(b.ray) !== dominant && compte[b.ray] === 1)
      m.push(`RAYON ${b.ray} (page : ${dominant})`);
    if (m.length) defauts.push(`  ${m.join(' · ').padEnd(30)} ${b.w}x${b.h} « ${b.t} »`);
  }
  total += defauts.filter(d => !d.includes('RAYON')).length;
  console.log(`\n${url.replace(/^https?:\/\/[^/]+/, '') || '/'}  — ${liste.length} boutons`);
  console.log(defauts.length ? defauts.join('\n') : '  rien');
}
console.log(`\n══ ${total} défaut(s) hors « RAYON » à ${largeur} px ══`);
