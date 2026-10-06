/* recette-appro.mjs — l'approvisionnement de l'écran /espace/daliro (session B6, 06/10/2026, b6_22).
   À 390 et 1440, sur l'exemple des Tilleuls : les commandes et leurs états, une nouvelle commande (refus sans
   fournisseur, puis ajout), « noter commandée » (date promise), « noter reçue » (en partie), annuler (motif) ;
   axe-core sur la carte et la fenêtre ; aucun débordement horizontal. Séparée de recette-daliro.mjs, qui approche
   les dix minutes.
   usage : node omega/recette-b6/recette-appro.mjs [origine] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const graves = (cible) => `(async () => { const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')); })()`;
const bouton = (motif, racine = 'document') => `(() => { const b = [...${racine}.querySelectorAll('button')].find(b => ${motif}.test(b.textContent)); if (!b) return null; b.click(); return !b.disabled; })()`;
const dlgBouton = (motif) => `[...document.querySelectorAll('[role="dialog"] button')].find(b => ${motif}.test(b.textContent))`;
const saisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); if (!t) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const choisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); if (!t) return false; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;

for (const largeur of [390, 1440]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b6-appro-${largeur}`, densite: 1 });
  console.log(`— Les Tilleuls : l'approvisionnement (${largeur})`);
  ok(await s.aller(base + '/espace/daliro'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Tilleuls/.test(b.textContent))?.click()`);
  await s.dormir(600);
  const carte = `document.querySelector('section[aria-label="Approvisionnement"]')`;
  const t0 = await s.evaluer(`${carte}?.innerText || ''`);
  ok(/Fenêtres PVC sur mesure/.test(t0) && /Garde-corps acier/.test(t0) && /Nacelle/.test(t0), 'trois commandes d\'exemple');
  ok(/(Commandée|Livraison trop tardive|Livraison attendue)/i.test(t0) && /(À commander|Commande en retard)/i.test(t0), 'chaque commande porte son état');
  // nouvelle commande : refus sans fournisseur, puis ajout
  ok(await s.evaluer(bouton('/Nouvelle commande/', carte)) === true, 'clic sur « Nouvelle commande »');
  await s.dormir(400);
  await s.evaluer(axe + ';true');
  const d1 = await s.evaluer(graves(`document.querySelector('[role="dialog"]')`));
  ok(d1.length === 0, `fenêtre « Nouvelle commande » : aucun écart axe grave ${d1.length ? JSON.stringify(d1) : ''}`);
  await s.evaluer(saisir('[role="dialog"] input[placeholder="Fenêtres PVC sur mesure"]', 'Bavettes alu'));
  await s.dormir(100);
  await s.evaluer(`${dlgBouton('/Ajouter la commande/')}?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Nommez le fournisseur/.test(document.querySelector('[role="dialog"]')?.innerText || '')`), 'sans fournisseur : refusé');
  await s.evaluer(saisir('[role="dialog"] input[placeholder="Point P Lyon 3"]', 'Point P Lyon 3'));
  await s.dormir(100);
  await s.evaluer(`${dlgBouton('/Ajouter la commande/')}?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Bavettes alu/.test(${carte}?.innerText || '') && /ajouté à l'approvisionnement/.test(${carte}?.innerText || '')`), 'la commande est ajoutée');
  // noter commandée la commande des garde-corps
  ok(await s.evaluer(`(() => { const tr = [...${carte}.querySelectorAll('tr')].find(t => /Garde-corps acier/.test(t.textContent)); const b = tr && [...tr.querySelectorAll('button')].find(b => /Noter commandée/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`), 'clic sur « Noter commandée »');
  await s.dormir(400);
  const dans = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  await s.evaluer(`(() => { const i = [...document.querySelectorAll('[role="dialog"] input[type="date"]')][1]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(dans)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await s.dormir(100);
  await s.evaluer(`${dlgBouton('/Noter commandée/')}?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Garde-corps acier, balcons R\\+3» commandé|commandé, livraison promise/.test(${carte}?.innerText || '')`), 'garde-corps commandés, livraison promise');
  // noter reçue en partie les fenêtres
  ok(await s.evaluer(`(() => { const tr = [...${carte}.querySelectorAll('tr')].find(t => /Fenêtres PVC/.test(t.textContent)); const b = tr && [...tr.querySelectorAll('button')].find(b => /Noter reçue/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`), 'clic sur « Noter reçue »');
  await s.dormir(400);
  await s.evaluer(choisir('[role="dialog"] select', 'non'));
  await s.dormir(100);
  await s.evaluer(`${dlgBouton('/Noter reçue/')}?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Livrée en partie/.test(${carte}?.innerText || '')`), 'fenêtres livrées en partie');
  // annuler la nacelle
  ok(await s.evaluer(`(() => { const tr = [...${carte}.querySelectorAll('tr')].find(t => /Nacelle/.test(t.textContent)); const b = tr && [...tr.querySelectorAll('button')].find(b => /Annuler/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`), 'clic sur « Annuler » (nacelle)');
  await s.dormir(400);
  await s.evaluer(saisir('[role="dialog"] input[placeholder="Pris au dépôt"]', 'Prise au dépôt'));
  await s.dormir(100);
  await s.evaluer(`${dlgBouton('/Annuler la commande/')}?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Annulée/.test(${carte}?.innerText || '') && /Prise au dépôt/.test(${carte}?.innerText || '')`), 'nacelle annulée, motif affiché');
  await s.evaluer(axe + ';true');
  const c1 = await s.evaluer(graves(carte));
  ok(c1.length === 0, `carte de l'approvisionnement : aucun écart axe grave ${c1.length ? JSON.stringify(c1) : ''}`);
  const deb = await s.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  ok(deb === 0, `pas de débordement horizontal (${deb})`);
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
