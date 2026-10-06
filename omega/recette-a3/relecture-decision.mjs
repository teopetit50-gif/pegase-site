/* relecture-decision.mjs — approuver une demande en BASE RÉELLE, en passant
   par son dossier (session A3, 06/10/2026) : ouvre /espace/validations avec
   la session donnée, filtre « Toutes », ouvre la demande dont le résumé
   contient le texte donné, relève l'aperçu du dossier FILED, approuve avec
   un commentaire, puis suit le lien « Ouvrir le dossier » et relève l'état
   de la facture et la fin de son fil.

   usage : node omega/recette-a3/relecture-decision.mjs <session.json> "<texte du résumé>" [origine]
   Le cookie est posé comme dans relecture-reelle.mjs ; le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, texte, base = 'http://localhost:3010'] = process.argv.slice(2);
if (!fichier || !texte) { console.error('usage : node relecture-decision.mjs <session.json> "<texte du résumé>" [origine]'); process.exit(2); }
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

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-decision', densite: 1 });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/validations', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`!document.querySelector('.esp-charge') && document.querySelectorAll('.esp-item').length > 0`)) break; }
await s.evaluer(`[...document.querySelectorAll('button')].find(b => /^\\s*Toutes/.test(b.textContent))?.click()`);
await s.dormir(600);
ok(await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(texte)})); if (!b) return false; b.click(); return true; })()`), `demande « ${texte} » ouverte`);
let apercu = null;
for (let i = 0; i < 20; i++) { await s.dormir(500); apercu = await s.evaluer(`(() => { const a = document.querySelector('.esp-apercu-filed'); return a ? { texte: a.innerText.replace(/\\s+/g, ' '), lien: a.querySelector('a')?.getAttribute('href') } : null; })()`); if (apercu && /TTC/.test(apercu.texte)) break; }
console.log('    aperçu :', apercu?.texte, '|', apercu?.lien);
ok(!!apercu && /TTC/.test(apercu.texte), 'l\'aperçu du dossier est lu en base');
await s.capturer(`${dossier}reel-decision-avant-1440.jpg`, { qualite: 55 });

const bouton = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-actions .r-btn')].find(b => /^\\s*Approuver/.test(b.textContent)); if (!b) return 'absent'; if (b.disabled) return 'gris'; b.click(); return 'ouvert'; })()`);
ok(bouton === 'ouvert', `« Approuver » : ${bouton}`);
await s.dormir(600);
await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); if (!t) return; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Dossier relu : fournisseur confirmé, identité VIES, contrôles passés (recette A3).'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer l.approbation/.test(b.textContent))?.click()`);
let dit = '';
for (let i = 0; i < 30; i++) { await s.dormir(500); dit = await s.evaluer(`[...document.querySelectorAll('.esp-avis')].map(a => a.textContent.trim()).filter(t => /C'est fait|Refusé par la base/.test(t)).join(' / ')`); if (dit) break; }
console.log('    après la décision :', dit);
ok(/C'est fait/.test(dit) && !/Refusé/.test(dit), 'la base accepte l\'approbation');

if (apercu?.lien) {
  ok(await s.aller(base + apercu.lien, { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), `dossier ouvert par le lien ${apercu.lien}`);
  let releve = null;
  for (let i = 0; i < 40; i++) {
    await s.dormir(500);
    releve = await s.evaluer(`(() => { const d = document.querySelector('#esp-dossier'); if (!d || !d.querySelector('.esp-fil')) return null; return { tete: d.querySelector('.esp-carte-tete')?.innerText.replace(/\\s+/g, ' '), fil: [...d.querySelectorAll('.esp-fil li')].slice(-3).map(l => l.innerText.replace(/\\s+/g, ' ')) }; })()`);
    if (releve) break;
  }
  console.log('    dossier :', releve?.tete);
  (releve?.fil ?? []).forEach((l) => console.log('      fil :', l));
  ok(!!releve, 'le dossier désigné par la demande s\'ouvre d\'office');
  await s.capturer(`${dossier}reel-decision-dossier-1440.jpg`, { qualite: 55 });
}
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
