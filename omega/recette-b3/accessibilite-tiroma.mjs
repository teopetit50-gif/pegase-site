/* accessibilite-tiroma.mjs — /espace/tiroma passé à axe-core (session B3,
   06/10/2026), sur le modèle de omega/recette-a3/accessibilite.mjs : à 390
   et 1440 px, les règles WCAG 2.1 A et AA sur la zone de l'espace (.esp),
   puis sur le dialogue « Inscrire un patient » avec la liste des patients
   trouvés ouverte (« Nes » → Rosalie Nestor), et sur le dialogue « Noter
   l'appel » (b3_12). Un écart « serious » ou
   « critical » fait échouer.
   usage : node omega/recette-b3/accessibilite-tiroma.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3013';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const analyser = (s, cible) => s.evaluer(`(async () => {
  const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
})()`);

function dire(nom, violations) {
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) console.log(`    ${v.impact === 'serious' || v.impact === 'critical' ? '!' : '·'} [${v.impact}] ${v.id} ×${v.n} — ${v.aide}\n        ${v.cibles.join('\n        ')}`);
  ok(graves.length === 0, `${nom} : ${graves.length} écart(s) grave(s), ${violations.length - graves.length} mineur(s)`);
}

for (const largeur of [390, 1440]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b3-axe-tiroma', densite: 1 });
  console.log(`— /espace/tiroma à ${largeur}`);
  await s.aller(base + '/espace/tiroma');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  dire(`tiroma ${largeur}`, await analyser(s, `document.querySelector('.esp')`));
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Liste d\\'attente"] button')].find(b => /Inscrire un patient/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Nes'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(600);
  const liste = await s.evaluer(`document.querySelectorAll('[role="dialog"] ul[aria-label="Patients trouvés"] button').length`);
  ok(liste > 0, `la liste des patients trouvés est ouverte (${liste} bouton(s))`);
  dire(`tiroma ${largeur}, dialogue liste d'attente`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  /* b3_12 : le dialogue « Noter l'appel », issue « à rappeler » (le champ date apparaît) */
  await s.aller(base + '/espace/tiroma');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Créneaux à sauver"] button')].find(b => /Noter l.appel/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`document.querySelector('[role="dialog"] input[type="radio"][value="rappeler"]')?.click()`);
  await s.dormir(300);
  ok(await s.evaluer(`!!document.querySelector('[role="dialog"] input[type="date"]')`), 'le dialogue « Noter l\'appel » est ouvert, date de rappel visible');
  dire(`tiroma ${largeur}, dialogue noter l'appel`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  /* b3_14 : le dialogue « Ajouter un moyen de contact », patients trouvés ouverts */
  await s.aller(base + '/espace/tiroma');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Rappels aux patients"] button')].find(b => /Ajouter un moyen de contact/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Nes'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(700);
  ok(await s.evaluer(`!!document.querySelector('[role="dialog"] ul[aria-label="Patients trouvés pour le contact"]')`), 'le dialogue « Ajouter un moyen de contact » est ouvert, patients trouvés');
  dire(`tiroma ${largeur}, dialogue moyen de contact`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  /* b3_18 : le dialogue « Noter une absence » */
  await s.aller(base + '/espace/tiroma');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Équipe absente"] button')].find(b => /Noter une absence/.test(b.textContent))?.click()`);
  await s.dormir(500);
  ok(await s.evaluer(`/Noter une absence/.test(document.querySelector('[role="dialog"]')?.textContent || '')`), 'le dialogue « Noter une absence » est ouvert');
  dire(`tiroma ${largeur}, dialogue noter une absence`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  /* b3_20 : le dialogue « Objectif » d'un fauteuil */
  await s.aller(base + '/espace/tiroma');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Objectifs par fauteuil"] button')].find(b => /Changer/.test(b.textContent))?.click()`);
  await s.dormir(500);
  ok(await s.evaluer(`/Objectif —/.test(document.querySelector('[role="dialog"]')?.textContent || '')`), 'le dialogue « Objectif » est ouvert');
  dire(`tiroma ${largeur}, dialogue objectif`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  /* b3_22 : le dialogue « Aligner sur … » */
  await s.aller(base + '/espace/tiroma');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Règles communes"] button')].find(b => /Aligner sur ce centre/.test(b.textContent))?.click()`);
  await s.dormir(500);
  ok(await s.evaluer(`/Aligner sur/.test(document.querySelector('[role="dialog"]')?.textContent || '')`), 'le dialogue « Aligner » est ouvert');
  dire(`tiroma ${largeur}, dialogue aligner les règles`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
