/* accessibilite-varelo.mjs — /espace/varelo passé à axe-core (session B1,
   06/10/2026), sur le modèle d'omega/recette-a3/accessibilite.mjs : à 390 et
   1440 px, les règles WCAG 2.1 A et AA sur la zone de l'espace (.esp). Un
   écart « serious » ou « critical » fait échouer. Puis la liste des objets :
   plus de listbox ni d'option, l'objet ouvert porte aria-current="true", et
   un autre objet le prend quand on le choisit. Enfin les cadres de tableau
   qui défilent (codes de l'objet ouvert, lignes rejetées d'un dépôt dans son
   dialogue) : tabIndex 0, role region, aria-label ; axe repassé sur le
   dialogue du dépôt avec son tableau des rejets. Vague 3 : la nature
   « clients » avec la carte de l'encours du groupe, et le dialogue du plafond.
   usage : node omega/recette-b1/accessibilite-varelo.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const analyser = (s, cible) => s.evaluer(`(async () => {
  const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
})()`);
const saisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event('input', { bubbles: true })); })()`;
const clic = (sel, re) => `(() => { const b = [...document.querySelectorAll('${sel}')].find(b => ${re}.test(b.textContent)); if (!b) return null; b.click(); return true; })()`;
const cadres = (racine) => `[...${racine}.querySelectorAll('.esp-tableau-cadre')].map(c => ({ tab: c.tabIndex, role: c.getAttribute('role'), nom: c.getAttribute('aria-label') }))`;
const cadresBons = (l) => l.length > 0 && l.every((c) => c.tab === 0 && c.role === 'region' && !!c.nom);
function dire(nom, violations) {
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) console.log(`    ${graves.includes(v) ? '!' : '·'} [${v.impact}] ${v.id} ×${v.n} — ${v.aide}\n        ${v.cibles.join('\n        ')}`);
  ok(graves.length === 0, `${nom} : ${graves.length} écart(s) grave(s), ${violations.length - graves.length} mineur(s)`);
}
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

for (const largeur of [390, 1440]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b1-axe-varelo', densite: 1 });
  console.log(`— /espace/varelo à ${largeur}`);
  await s.aller(base + '/espace/varelo');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  dire(`varelo ${largeur}`, await analyser(s, `document.querySelector('.esp')`));

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

  const objet = await s.evaluer(cadres(`document.querySelector('#vrl-objet')`));
  ok(cadresBons(objet), `varelo ${largeur}, cadre des codes de l'objet : ${JSON.stringify(objet)}`);
  await s.evaluer(`(e => { e?.focus(); e?.click(); })([...document.querySelectorAll('.esp-tete button')].find(b => /Déposer un export/.test(b.textContent)))`);
  await s.dormir(400);
  await s.evaluer(saisir('[role="dialog"] textarea', 'Code tiers;Raison sociale;SIREN\nF0800;MENUISERIES DU LEMAN;849300165\n;Sans code;\nF0801;;\nF0800;Doublon;'));
  await s.dormir(300);
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Déposer\\s*$/'));
  await s.dormir(900);
  const rejets = await s.evaluer(cadres(`document.querySelector('[role="dialog"]')`));
  ok(cadresBons(rejets), `varelo ${largeur}, cadre des lignes rejetées : ${JSON.stringify(rejets)}`);
  dire(`varelo ${largeur}, dialogue du dépôt avec ses rejets`, await analyser(s, `document.querySelector('[role="dialog"]')`));

  /* vague 3 : la carte de l'encours du groupe (clients), son tableau et le dialogue du plafond */
  await s.aller(base + '/espace/varelo');
  await s.dormir(800);
  await s.evaluer(axe + ';true');
  await s.evaluer(clic('.esp-filtres button', '/^Clients$/'));
  await s.dormir(400);
  const encours = await s.evaluer(cadres(`document.querySelector('section[aria-label="Encours du groupe, clients"]')`));
  ok(cadresBons(encours), `varelo ${largeur}, cadre de l'encours par client : ${JSON.stringify(encours)}`);
  dire(`varelo ${largeur}, clients avec l'encours du groupe`, await analyser(s, `document.querySelector('.esp')`));
  await s.evaluer(`(e => { e?.focus(); e?.click(); })([...document.querySelectorAll('section[aria-label="Encours du groupe, clients"] tbody button')].find(b => /^Plafond$/.test(b.textContent)))`);
  await s.dormir(500);
  dire(`varelo ${largeur}, dialogue du plafond`, await analyser(s, `document.querySelector('[role="dialog"]')`));
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
