/* accessibilite-varelo.mjs — /espace/varelo passé à axe-core (session B1,
   06/10/2026), sur le modèle d'omega/recette-a3/accessibilite.mjs : à 390 et
   1440 px, les règles WCAG 2.1 A et AA sur la zone de l'espace (.esp). Un
   écart « serious » ou « critical » fait échouer. Puis la liste des objets :
   plus de listbox ni d'option, l'objet ouvert porte aria-current="true", et
   un autre objet le prend quand on le choisit.
   usage : node omega/recette-b1/accessibilite-varelo.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

for (const largeur of [390, 1440]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b1-axe-varelo', densite: 1 });
  console.log(`— /espace/varelo à ${largeur}`);
  await s.aller(base + '/espace/varelo');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  const violations = await s.evaluer(`(async () => {
    const r = await axe.run(document.querySelector('.esp'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
  })()`);
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) console.log(`    ${graves.includes(v) ? '!' : '·'} [${v.impact}] ${v.id} ×${v.n} — ${v.aide}\n        ${v.cibles.join('\n        ')}`);
  ok(graves.length === 0, `varelo ${largeur} : ${graves.length} écart(s) grave(s), ${violations.length - graves.length} mineur(s)`);

  const liste = await s.evaluer(`(() => ({
    listbox: document.querySelectorAll('.esp [role="listbox"], .esp [role="option"]').length,
    courants: [...document.querySelectorAll('.esp-item[aria-current="true"]')].map(b => b.querySelector('.esp-mono')?.textContent),
    ouvert: document.querySelector('#vrl-objet .vrl-objet-code')?.textContent,
  }))()`);
  ok(liste.listbox === 0 && liste.courants.length === 1 && liste.courants[0] === liste.ouvert, `varelo ${largeur}, liste des objets : ${liste.listbox} listbox/option, objet courant ${liste.courants.join(', ')} = objet ouvert ${liste.ouvert}`);
  await s.evaluer(`document.querySelectorAll('.esp-item')[1]?.click()`);
  await s.dormir(400);
  const apres = await s.evaluer(`(() => ({ courants: [...document.querySelectorAll('.esp-item[aria-current="true"]')].map(b => b.querySelector('.esp-mono')?.textContent), ouvert: document.querySelector('#vrl-objet .vrl-objet-code')?.textContent }))()`);
  ok(apres.courants.length === 1 && apres.courants[0] === apres.ouvert && apres.ouvert !== liste.ouvert, `varelo ${largeur}, choisir un autre objet : courant ${apres.courants.join(', ')}, ouvert ${apres.ouvert}`);
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
