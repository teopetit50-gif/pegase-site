/* accessibilite.mjs — les écrans /espace passés à axe-core (session A3,
   06/10/2026). Pour chaque écran, à 390 et 1440 px : les règles WCAG 2.1
   A et AA sur la zone de l'espace (.esp), puis sur les dialogues ouverts
   (rendus hors de .esp, dans un portail). Un écart « serious » ou
   « critical » fait échouer ; « moderate » et « minor » sont listés.
   axe-core vient de node_modules (dépendance d'eslint-plugin-jsx-a11y).
   usage : node omega/recette-a3/accessibilite.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3010';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const ECRANS = [
  ['validations', '/espace/validations', `[...document.querySelectorAll('.esp-actions .r-btn')].find(b => /^\\s*Approuver/.test(b.textContent))?.click()`],
  ['filed', '/espace/filed', `[...document.querySelectorAll('#esp-dossier .r-btn')].find(b => /Confirmer ce fournisseur/.test(b.textContent))?.click()`],
  ['fournisseurs', '/espace/filed/fournisseurs', `[...document.querySelectorAll('#esp-fournisseur .r-btn')].find(b => /Proposer un IBAN/.test(b.textContent))?.click()`],
  ['a-payer', '/espace/filed/a-payer', `[...document.querySelectorAll('.esp-a-payer .r-btn')].find(b => /Noter un paiement/.test(b.textContent))?.click()`],
  ['comptabilite', '/espace/filed/comptabilite', `[...document.querySelectorAll('.esp button')].find(b => /^Modifier le compte/.test(b.getAttribute('aria-label') ?? ''))?.click()`],
  ['filed-electronique', '/espace/filed?objet=facture:R2026-000014', `[...document.querySelectorAll('#esp-dossier .r-btn')].find(b => /Ouvrir un litige/.test(b.textContent))?.click()`],
  ['point', '/espace/point', null],
];

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

const analyser = (s, cible) => s.evaluer(`(async () => {
  const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
})()`);

function dire(nom, violations) {
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) console.log(`    ${v.impact === 'serious' || v.impact === 'critical' ? '!' : '·'} [${v.impact}] ${v.id} ×${v.n} — ${v.aide}\n        ${v.cibles.join('\n        ')}`);
  ok(graves.length === 0, `${nom} : ${graves.length} écart(s) grave(s), ${violations.length - graves.length} mineur(s)`);
}

for (const [nom, chemin, ouvrir] of ECRANS) {
  for (const largeur of [390, 1440]) {
    const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `a3-axe-${nom}`, densite: 1 });
    console.log(`— ${chemin} à ${largeur}`);
    await s.aller(base + chemin);
    await s.dormir(800);
    await s.evaluer(axe + ';true');
    dire(`${nom} ${largeur}`, await analyser(s, `document.querySelector('.esp')`));
    if (largeur === 390) { const d = await s.evaluer(DEFILANTES); ok(d.length === 0, `${nom} 390 : zones qui défilent atteignables au clavier${d.length ? ' — sauf ' + d.join(', ') : ''}`); }
    if (ouvrir) {
      /* comme au clavier : le bouton a le focus quand on l'active */
      await s.evaluer(`(e => { e?.focus(); e?.click(); })(${ouvrir.replace(/\?\.click\(\)$/, '')})`);
      await s.dormir(600);
      if (await s.evaluer(`!!document.querySelector('[role="dialog"]')`)) {
        dire(`${nom} ${largeur}, dialogue`, await analyser(s, `document.querySelector('[role="dialog"]')`));
        /* le clavier : le focus entre dans le dialogue, Tab y reste, Échap le ferme et rend le focus au bouton qui l'a ouvert */
        const dedans = await s.evaluer(`!!document.activeElement?.closest('[role="dialog"]')`);
        for (let i = 0; i < 12; i++) await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        const resteDedans = await s.evaluer(`!!document.activeElement?.closest('[role="dialog"]')`);
        await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await s.dormir(400);
        const ferme = await s.evaluer(`!document.querySelector('[role="dialog"]')`);
        const retour = await s.evaluer(`document.activeElement?.tagName === 'BUTTON' && !document.activeElement.closest('[role="dialog"]') ? document.activeElement.textContent.trim().slice(0, 40) : null`);
        ok(dedans && resteDedans && ferme && !!retour, `${nom} ${largeur}, clavier : focus dans le dialogue ${dedans}, piégé ${resteDedans}, Échap ferme ${ferme}, focus rendu à « ${retour} »`);
      } else ok(false, `${nom} ${largeur} : le dialogue ne s'est pas ouvert`);
    }
    s.fermer();
  }
}
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
