/* accessibilite-tavaro.mjs — l'écran /espace/tavaro passé à axe-core (session
   B2, 06/10/2026), sur le modèle de omega/recette-a3/accessibilite.mjs. Pour chaque écran, à 390 et 1440 px : les règles WCAG 2.1
   A et AA sur la zone de l'espace (.esp), puis sur les dialogues ouverts
   (rendus hors de .esp, dans un portail). Un écart « serious » ou
   « critical » fait échouer ; « moderate » et « minor » sont listés.
   axe-core vient de node_modules (dépendance d'eslint-plugin-jsx-a11y).
   usage : node omega/recette-b2/accessibilite-tavaro.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const ECRANS = [
  ['tavaro', '/espace/tavaro', `[...document.querySelectorAll('#esp-dossier .esp-actions .r-btn')].find(b => /Chiffrer le retour/.test(b.textContent) && !b.disabled)?.click()`],
  ['tavaro-edl', '/espace/tavaro', `[...document.querySelectorAll('section[aria-label="États des lieux"] .r-btn')].find(b => /Faire l.état de retour/.test(b.textContent) && !b.disabled)?.click()`],
  ['tavaro-fe', '/espace/tavaro', `[...document.querySelectorAll('#esp-dossier .tav-facture .r-btn')].find(b => /Forme électronique/.test(b.textContent))?.click()`,
    `[...document.querySelectorAll('.esp-item')].find(b => /C-2026-0322/.test(b.textContent))?.click()`],
  ['tavaro-avis', '/espace/tavaro', `[...document.querySelectorAll('section[aria-label="Avis de contravention"] .r-btn')].find(b => /Désigner le conducteur/.test(b.textContent) && !b.disabled)?.click()`],
  ['tavaro-parc', '/espace/tavaro', `[...document.querySelectorAll('section[aria-label="Parc : remise en location et entretien"] .r-btn')].find(b => /Trouver un créneau/.test(b.textContent) && !b.disabled)?.click()`],
  ['tavaro-parc-anomalie', '/espace/tavaro', `[...document.querySelectorAll('section[aria-label="Parc : remise en location et entretien"] .r-btn')].find(b => /Signaler une anomalie/.test(b.textContent) && !b.disabled)?.click()`],
  ['tavaro-contestations', '/espace/tavaro', `[...document.querySelectorAll('section[aria-label="Contestations bancaires"] .r-btn')].find(b => /Ouvrir une contestation/.test(b.textContent) && !b.disabled)?.click()`,
    `(() => { const d = document.querySelector('section[aria-label="Contestations bancaires"] .tav-forces'); if (d) d.open = true; })()`],
];

const analyser = (s, cible) => s.evaluer(`(async () => {
  const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
})()`);

function dire(nom, violations) {
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) console.log(`    ${v.impact === 'serious' || v.impact === 'critical' ? '!' : '·'} [${v.impact}] ${v.id} ×${v.n} — ${v.aide}\n        ${v.cibles.join('\n        ')}`);
  ok(graves.length === 0, `${nom} : ${graves.length} écart(s) grave(s), ${violations.length - graves.length} mineur(s)`);
}

for (const [nom, chemin, ouvrir, avant] of ECRANS) {
  for (const largeur of [390, 1440]) {
    const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b2-axe-${nom}`, densite: 1 });
    console.log(`— ${chemin} à ${largeur}`);
    await s.aller(base + chemin);
    await s.dormir(800);
    /* une étape avant la mesure, si l'écran l'exige (ouvrir le bon dossier) */
    if (avant) { await s.evaluer(avant); await s.dormir(500); }
    await s.evaluer(axe + ';true');
    dire(`${nom} ${largeur}`, await analyser(s, `document.querySelector('.esp')`));
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
