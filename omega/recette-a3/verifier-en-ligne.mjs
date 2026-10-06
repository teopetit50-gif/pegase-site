/* verifier-en-ligne.mjs — l'espace client tel que le site le SERT
   (session A3, 06/10/2026). Lecture seule, sans session : ce que voit un
   visiteur, c'est-à-dire les données d'exemple.

   Pour chaque écran de l'espace (les cinq d'A3 et les six des B) :
     · la page répond 200 et porte son titre ;
     · aux cinq largeurs (390 / 768 / 1024 / 1440 / 1700) : aucun
       débordement horizontal, aucun élément plus large que l'écran ;
     · axe-core (WCAG 2.1 A et AA) à 390 et 1440 ;
     · pour les écrans d'A3, une phrase de chaque lot de la nuit du 6/10
       (« la modification est en ligne » = la phrase est dans la page).
   Un défaut sur un écran d'A3 fait échouer ; sur un écran des B, il est
   relevé comme constat (à transmettre), sans faire échouer.

   usage : node omega/recette-a3/verifier-en-ligne.mjs [origine]   (défaut https://omegaai.fr) */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = (process.argv[2] ?? 'https://omegaai.fr').replace(/\/$/, '');
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const constats = [];
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const releve = (c, m) => { console.log(`${c ? '  ✓' : '  !'} ${m}`); if (!c) constats.push(m); };

/* une zone qui défile (horizontalement ou verticalement) doit se rejoindre au
   clavier : elle a tabIndex ≥ 0 (et alors un rôle et un nom), ou contient un
   élément focalisable — ce que mesure aussi axe (scrollable-region-focusable) */
const DEFILANTES = `(() => [...document.querySelectorAll('.esp *')].filter(e => {
  const st = getComputedStyle(e);
  const defile = (/(auto|scroll)/.test(st.overflowX) && e.scrollWidth > e.clientWidth + 1) || (/(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 1);
  if (!defile) return false;
  const atteinte = e.tabIndex >= 0 && e.getAttribute('role') && (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'));
  const contient = !!e.querySelector('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
  return !atteinte && !contient;
}).map(e => e.tagName + '.' + [...e.classList].join('.')))()`;

/* [clé, chemin, à A3 ?, phrases attendues] */
const ECRANS = [
  ['validations', '/espace/validations', true, ['Décider en lot', 'Le dossier', 'Ouvrir le dossier']],
  ['filed', '/espace/filed', true, ['Fournisseurs', 'À payer', 'Déposer un document']],
  ['filed-identifiants', '/espace/filed?objet=facture:R2026-000017', true, ['Identifiants lus sur la pièce, non retenus', 'Saisir les vrais identifiants']],
  ['fournisseurs', '/espace/filed/fournisseurs', true, ['Les fournisseurs que FILED connaît', 'À confirmer']],
  ['a-payer', '/espace/filed/a-payer', true, ['Noter un paiement', 'Payée en partie']],
  ['point', '/espace/point', true, ['Point du matin']],
  ['varelo', '/espace/varelo', false, []],
  ['tavaro', '/espace/tavaro', false, []],
  ['tiroma', '/espace/tiroma', false, []],
  ['tamila', '/espace/tamila', false, []],
  ['lorani', '/espace/lorani', false, []],
  ['daliro', '/espace/daliro', false, []],
];
const LARGEURS = [390, 768, 1024, 1440, 1700];

for (const [cle, chemin, aA3, phrases] of ECRANS) {
  const dire = (c, m) => (aA3 ? ok : releve)(c, `${cle} · ${m}`);
  console.log(`— ${chemin}${aA3 ? '' : ' (écran des B : constats)'}`);
  const statut = await fetch(base + chemin, { redirect: 'follow' }).then((r) => r.status).catch((e) => `réseau : ${e.message}`);
  dire(statut === 200, `répond ${statut}`);
  if (statut !== 200) continue;
  for (const largeur of LARGEURS) {
    const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `a3-ligne-${cle}`, densite: 1 });
    await s.aller(base + chemin);
    await s.dormir(1200);
    const m = await s.evaluer(`(() => {
      const w = document.documentElement.clientWidth;
      const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
      const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); }).slice(0, 3).map(e => e.tagName + '.' + [...e.classList].join('.'));
      return { deb: document.documentElement.scrollWidth - w, larges, h1: document.querySelector('.esp h1')?.textContent ?? null, texte: document.querySelector('.esp')?.innerText ?? '' };
    })()`);
    dire(!!m.h1, `${largeur} : titre « ${m.h1} »`);
    dire(m.deb === 0 && m.larges.length === 0, `${largeur} : pas de débordement (${m.deb}${m.larges.length ? ' ; ' + m.larges.join(', ') : ''})`);
    /* sans la casse : les titres de section sont mis en capitales par la feuille de style */
    if (largeur === 1440) for (const p of phrases) dire(m.texte.toLowerCase().includes(p.toLowerCase()), `la page dit « ${p} »`);
    if (largeur === 390) { const d = await s.evaluer(DEFILANTES); dire(d.length === 0, `390 : zones qui défilent atteignables au clavier${d.length ? ' — sauf ' + d.join(', ') : ''}`); }
    if (largeur === 390 || largeur === 1440) {
      await s.evaluer(axe + ';true');
      const v = await s.evaluer(`(async () => (await axe.run(document.querySelector('.esp'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations.map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length })))()`);
      const graves = v.filter((x) => x.impact === 'serious' || x.impact === 'critical');
      dire(graves.length === 0, `${largeur} : axe, ${graves.length} écart(s) grave(s)${graves.length ? ' — ' + graves.map((x) => `${x.id} ×${x.n}`).join(', ') : ''}${v.length > graves.length ? `, ${v.length - graves.length} mineur(s)` : ''}`);
    }
    s.fermer();
  }
}

console.log(`\n${echecs ? `${echecs} échec(s) sur les écrans d'A3` : "écrans d'A3 : tout passe"}`);
if (constats.length) console.log(`${constats.length} constat(s) sur les écrans des B :\n  - ${constats.join('\n  - ')}`);
process.exit(echecs ? 1 : 0);
