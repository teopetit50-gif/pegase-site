/* relecture-annulation.mjs — « Annuler ma demande » en BASE RÉELLE (session
   A3, 06/10/2026) : ouvre /espace/validations avec la session donnée, choisit
   le filtre « Toutes », ouvre la demande dont le résumé contient le texte
   donné, vérifie que « Annuler ma demande » est offert (la personne est la
   demandeuse), annule, et relève le message et la file.

   usage : node omega/recette-a3/relecture-annulation.mjs <session.json> "<texte du résumé>" [origine]
   Le cookie est posé comme dans relecture-reelle.mjs ; le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, texte, base = 'http://localhost:3010'] = process.argv.slice(2);
if (!fichier || !texte) { console.error('usage : node relecture-annulation.mjs <session.json> "<texte du résumé>" [origine]'); process.exit(2); }
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

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-annulation', densite: 1 });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/validations', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`!document.querySelector('.esp-charge') && document.querySelectorAll('.esp-item').length > 0`)) break; }
await s.evaluer(`[...document.querySelectorAll('button')].find(b => /^\\s*Toutes/.test(b.textContent))?.click()`);
await s.dormir(600);
const clic = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(texte)})); if (!b) return false; b.click(); return true; })()`);
ok(clic, `demande « ${texte} » trouvée dans la file`);
await s.dormir(800);
const offre = await s.evaluer(`!![...document.querySelectorAll('.r-btn')].find(b => /Annuler ma demande/.test(b.textContent))`);
ok(offre, '« Annuler ma demande » est offert à la demandeuse');
await s.capturer(`${dossier}reel-annulation-avant-1440.jpg`, { qualite: 55 });
await s.evaluer(`[...document.querySelectorAll('.r-btn')].find(b => /Annuler ma demande/.test(b.textContent))?.click()`);
await s.dormir(600);
await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Annuler la demande/.test(b.textContent))?.click()`);
let dit = '';
for (let i = 0; i < 30; i++) { await s.dormir(500); dit = await s.evaluer(`[...document.querySelectorAll('.esp-avis')].map(a => a.textContent.trim()).filter(t => /C'est fait|Refusé par la base/.test(t)).join(' / ')`); if (dit) break; }
console.log('    après l\'annulation :', dit);
ok(/est annulée/.test(dit), 'la base accepte l\'annulation');
await s.dormir(1500);
await s.capturer(`${dossier}reel-annulation-1440.jpg`, { qualite: 55 });
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
