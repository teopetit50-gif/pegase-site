/* relecture-lot.mjs — « Décider en lot » en BASE RÉELLE (session A3,
   06/10/2026) : ouvre /espace/validations avec la session donnée, passe en
   mode lot, coche UNE demande par texte donné (la première de la file qui
   le contient), approuve le lot avec un commentaire et relève le bilan
   ligne à ligne. Ne coche rien d'autre.

   usage : node omega/recette-a3/relecture-lot.mjs <session.json> "<texte 1>" ["<texte 2>" …]
   Origine : variable ORIGINE (défaut http://localhost:3010). Le cookie est
   posé comme dans relecture-reelle.mjs ; le fichier de session ne se
   commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, ...textes] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichier || !textes.length) { console.error('usage : node relecture-lot.mjs <session.json> "<texte 1>" ["<texte 2>" …]'); process.exit(2); }
const session = JSON.parse(readFileSync(fichier, 'utf8'));
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const valeur = 'base64-' + b64url(JSON.stringify(session));
const morceaux = [];
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  morceaux.push({ name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete });
  reste = reste.slice(tete.length);
}

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-lot', densite: 1 });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/validations', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('.esp-ruban')?.textContent === 'Base réelle' && !document.querySelector('.esp-charge') && document.querySelectorAll('.esp-item').length > 0`)) break; }
await s.dormir(800);
await s.evaluer(`[...document.querySelectorAll('button')].find(b => /Décider en lot/.test(b.textContent))?.click()`);
await s.dormir(400);
console.log('    barre :', await s.evaluer(`document.querySelector('.esp-lot-barre')?.innerText.replace(/\\s+/g, ' ')`));
for (const t of textes) {
  const fait = await s.evaluer(`(() => { const li = [...document.querySelectorAll('.esp-li-lot')].find(l => l.textContent.includes(${JSON.stringify(t)}) && !l.querySelector('input').checked); if (!li) return false; li.querySelector('input').click(); return true; })()`);
  ok(fait, `cochée : « ${t} »`);
}
await s.dormir(300);
const cochees = await s.evaluer(`document.querySelectorAll('.esp-item-coche input:checked').length`);
ok(cochees === textes.length, `${cochees} demande(s) cochée(s), pas une de plus`);
await s.evaluer(`[...document.querySelectorAll('.esp-lot-barre button')].find(b => /Approuver/.test(b.textContent))?.click()`);
await s.dormir(600);
const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { retenues: [...d.querySelectorAll('.esp-lot-retenues li')].map(l => l.innerText.replace(/\\s+/g, ' ')), ecartees: [...d.querySelectorAll('.esp-lot-ecartees li')].map(l => l.textContent) } : null; })()`);
console.log('    retenues :', dlg?.retenues);
console.log('    écartées :', dlg?.ecartees);
ok(dlg && dlg.retenues.length === textes.length, 'toutes les demandes cochées sont retenues');
await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Rattachements vérifiés : identifiant commun (recette A3, décision en lot).'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await s.dormir(300);
await s.capturer(`${dossier}reel-lot-avant-1440.jpg`, { qualite: 55 });
await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(x => /Approuver \\d/.test(x.textContent))?.click()`);
let bilan = [];
for (let i = 0; i < 40; i++) {
  await s.dormir(500);
  bilan = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] .esp-lot-bilan li')].map(l => l.innerText.replace(/\\s+/g, ' ')).filter(t => !/en cours/.test(t))`);
  if (bilan.length === textes.length && await s.evaluer(`!![...document.querySelectorAll('[role="dialog"] button')].find(x => /^\\s*Fermer\\s*$/.test(x.textContent) && !x.disabled)`)) break;
}
bilan.forEach((l) => console.log('    bilan :', l));
ok(bilan.length === textes.length && bilan.every((l) => /Approuvée/.test(l)), 'bilan : toutes approuvées par la base');
await s.capturer(`${dossier}reel-lot-1440.jpg`, { qualite: 55 });
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
