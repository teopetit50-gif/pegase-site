/* relecture-paiement.mjs — « Noter un paiement » en BASE RÉELLE (session
   A3, 06/10/2026) : ouvre /espace/filed/a-payer avec la session donnée,
   trouve la facture par son numéro, note le paiement (montant, virement,
   référence) par le dialogue, puis relève la ligne : reste, réglé, état.

   usage : node omega/recette-a3/relecture-paiement.mjs <session.json> <n° de facture> <montant> <référence>
   Origine : variable ORIGINE (défaut http://localhost:3010). Le cookie est
   posé comme dans relecture-reelle.mjs ; le fichier de session ne se
   commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, numero, montantTexte, reference] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichier || !numero || !montantTexte || !reference) { console.error('usage : node relecture-paiement.mjs <session.json> <n° de facture> <montant> <référence>'); process.exit(2); }
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

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-paiement', densite: 1 });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/filed/a-payer', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
const ligne = () => s.evaluer(`[...document.querySelectorAll('.esp-a-payer tbody tr')].map(t => t.innerText.replace(/\\s+/g, ' ')).find(t => t.includes(${JSON.stringify(numero)})) ?? null`);
let avant = null;
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('.esp-ruban')?.textContent === 'Base réelle'`) && (avant = await ligne())) break; }
console.log('    avant :', avant);
ok(!!avant, `la facture ${numero} est dans « À payer »`);
await s.evaluer(`[...document.querySelectorAll('.esp-a-payer tbody tr')].find(t => t.textContent.includes(${JSON.stringify(numero)}))?.querySelector('button')?.click()`);
await s.dormir(600);
const remplir = (sel, v) => s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] ${sel}'); const proto = t.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(t, ${JSON.stringify(v)}); t.dispatchEvent(new Event(t.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
await remplir('input[inputmode="decimal"]', montantTexte);
await remplir('select', 'virement');
await remplir('input[maxlength="120"]', reference);
await s.dormir(300);
await s.capturer(`${dossier}reel-paiement-avant-1440.jpg`, { qualite: 55 });
await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Noter le paiement/.test(b.textContent))?.click()`);
let dit = '';
for (let i = 0; i < 30; i++) { await s.dormir(500); dit = await s.evaluer(`[...document.querySelectorAll('.esp-avis')].map(a => a.textContent.trim()).filter(t => /C'est fait|Refusé par la base/.test(t)).join(' / ')`); if (dit) break; }
console.log('    après :', dit);
ok(/C'est fait/.test(dit), 'la base accepte le paiement');
await s.dormir(1500);
const apres = await ligne();
console.log('    ligne :', apres);
ok(!!apres && /réglés/.test(apres) && /Payée en partie|Payée/.test(apres), 'la ligne montre le réglé et l\'état');
await s.capturer(`${dossier}reel-paiement-1440.jpg`, { qualite: 55 });
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
