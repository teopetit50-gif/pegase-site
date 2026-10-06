/* recette-fil.mjs — le fil du chantier et les messages à ranger, /espace/daliro (session B6, 06/10/2026, b6_24).
   À 390 et 1440, sur l'exemple : la carte « Messages du terrain à ranger » de la liste (ranger un message aux
   Tilleuls) ; le fil des Tilleuls (photo et vocal, texte, rangement dit), « Ouvrir un avenant » depuis un message,
   « Écarter » ; axe-core sur les cartes et la fenêtre ; aucun débordement horizontal.
   usage : node omega/recette-b6/recette-fil.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const graves = (cible) => `(async () => { const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')); })()`;
const dlgBouton = (motif) => `[...document.querySelectorAll('[role="dialog"] button')].find(b => ${motif}.test(b.textContent))`;

for (const largeur of [390, 1440]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b6-fil-${largeur}`, densite: 1 });
  console.log(`— Le fil du chantier (${largeur})`);
  ok(await s.aller(base + '/espace/daliro'), 'page chargée');
  await s.dormir(600);
  // la carte « à ranger » de la liste
  const aRanger = `document.querySelector('section[aria-label="Messages à ranger"]')`;
  ok(await s.evaluer(`/benne est pleine/.test(${aRanger}?.innerText || '')`), 'un message à ranger (la benne)');
  await s.evaluer(axe + ';true');
  const g0 = await s.evaluer(graves(aRanger));
  ok(g0.length === 0, `carte « à ranger » : aucun écart axe grave ${g0.length ? JSON.stringify(g0) : ''}`);
  ok(await s.evaluer(`(() => { const sel = ${aRanger}.querySelector('select'); const o = [...sel.options].find(o => /Tilleuls/.test(o.textContent)); if (!o) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, o.value); sel.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`), 'choix du chantier « Les Tilleuls »');
  await s.dormir(150);
  await s.evaluer(`[...${aRanger}.querySelectorAll('button')].find(b => /^Ranger$/.test(b.textContent.trim()))?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/rangé au chantier « Résidence Les Tilleuls »|rangé au chantier/.test(${aRanger}?.innerText || '')`), 'message rangé');
  // le fil des Tilleuls
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Tilleuls/.test(b.textContent))?.click()`);
  await s.dormir(600);
  const fil = `document.querySelector('section[aria-label="Fil du chantier"]')`;
  const t0 = await s.evaluer(`${fil}?.innerText || ''`);
  ok(/prise de plus dans le garage/.test(t0) && /Karim Haddad/.test(t0) && /passage en cours de l'expéditeur/.test(t0), 'le message de Karim, rangé par son passage en cours');
  ok(/Vocal/.test(t0) && await s.evaluer(`!!${fil}?.querySelector('img[alt^="Photo envoyée par Karim Haddad"]')`), 'la photo (avec son texte de remplacement) et le vocal');
  ok(await s.evaluer(`(() => { const b = [...${fil}.querySelectorAll('button')].find(b => /Ouvrir un avenant/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`), 'clic sur « Ouvrir un avenant »');
  await s.dormir(400);
  await s.evaluer(axe + ';true');
  const d1 = await s.evaluer(graves(`document.querySelector('[role="dialog"]')`));
  ok(d1.length === 0, `fenêtre « Ouvrir un avenant » : aucun écart axe grave ${d1.length ? JSON.stringify(d1) : ''}`);
  ok(await s.evaluer(`/prise de plus dans le garage/.test(document.querySelector('[role="dialog"] textarea')?.value || '')`), 'l\'objet reprend le message');
  await s.evaluer(`${dlgBouton('/Ouvrir l.avenant/')}?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Avenant ouvert en brouillon/.test(${fil}?.innerText || '') && /Avenant ouvert/.test(${fil}?.innerText || '')`), 'avenant brouillon ouvert depuis le message');
  await s.evaluer(`[...${fil}.querySelectorAll('button')].filter(b => /Écarter/.test(b.textContent)).pop()?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Message écarté du fil/.test(${fil}?.innerText || '')`), 'un message écarté');
  await s.evaluer(axe + ';true');
  const g1 = await s.evaluer(graves(fil));
  ok(g1.length === 0, `carte du fil : aucun écart axe grave ${g1.length ? JSON.stringify(g1) : ''}`);
  const deb = await s.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  ok(deb === 0, `pas de débordement horizontal (${deb})`);
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
