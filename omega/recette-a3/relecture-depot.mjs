/* relecture-depot.mjs — déposer un fichier PAR L'ÉCRAN FILED, en BASE
   RÉELLE (session A3, 06/10/2026) : « Déposer un document », le champ
   fichier rempli par le protocole du navigateur (DOM.setFileInputFiles),
   « Déposer » ; relève le message (référence du document) et la ligne de
   la liste. C'est le geste d'un utilisateur : aucune clé de service.

   usage : node omega/recette-a3/relecture-depot.mjs <session.json> <fichier>
   Origine : variable ORIGINE (défaut http://localhost:3010). Le cookie est
   posé comme dans relecture-reelle.mjs ; le fichier de session ne se
   commite jamais. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichierSession, fichier] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichierSession || !fichier) { console.error('usage : node relecture-depot.mjs <session.json> <fichier>'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const valeur = 'base64-' + Buffer.from(JSON.stringify(JSON.parse(readFileSync(fichierSession, 'utf8'))), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-depot', densite: 1 });
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  await s.envoyer('Network.setCookie', { name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete, url: base, path: '/' });
  reste = reste.slice(tete.length);
}
ok(await s.aller(base + '/espace/filed', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (b && b.getAttribute('aria-checked') !== 'true') b.click(); })()`);
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('.esp-ruban')?.textContent === 'Base réelle' && !document.querySelector('.esp-charge')`)) break; }
await s.evaluer(`[...document.querySelectorAll('.r-btn')].find(b => /Déposer un document/.test(b.textContent))?.click()`);
for (let i = 0; i < 20; i++) { await s.dormir(300); if (await s.evaluer(`!!document.querySelector('#esp-depot-fichier')`)) break; }
const { root } = await s.envoyer('DOM.getDocument', { depth: -1, pierce: true }).then((r) => r.result ?? r);
const { nodeId } = await s.envoyer('DOM.querySelector', { nodeId: root.nodeId, selector: '#esp-depot-fichier' }).then((r) => r.result ?? r);
ok(!!nodeId, 'le champ fichier du dialogue est là');
await s.envoyer('DOM.setFileInputFiles', { nodeId, files: [resolve(fichier)] });
await s.dormir(500);
const pret = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Déposer')?.disabled === false`);
ok(pret, '« Déposer » est actif avec le fichier choisi');
await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Déposer')?.click()`);
let dit = '';
for (let i = 0; i < 60; i++) { await s.dormir(500); dit = await s.evaluer(`[...document.querySelectorAll('.esp-avis, [role="dialog"] .esp-avis')].map(a => a.textContent.trim()).filter(t => /C'est fait|Refusé|refus|erreur/i.test(t)).join(' / ')`); if (dit) break; }
console.log('    après :', dit);
ok(/C'est fait/.test(dit), 'la base accepte le dépôt');
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
