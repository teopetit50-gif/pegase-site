/* relecture-boite.mjs — la boîte de réception de FILED en BASE RÉELLE
   (session A3, 06/10/2026) : la page lit public.receptions (canal email,
   module filed) sous la politique du périmètre, dit l'adresse de la boîte,
   liste les courriels et ouvre le premier. Lecture seule : rien n'est écrit.

   usage : node omega/recette-a3/relecture-boite.mjs <session.json>
   Origine : variable ORIGINE (défaut http://localhost:3010). Le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichierSession] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichierSession) { console.error('usage : node relecture-boite.mjs <session.json>'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const session = JSON.parse(readFileSync(fichierSession, 'utf8'));
const valeur = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-boite', densite: 1 });
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  await s.envoyer('Network.setCookie', { name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete, url: base, path: '/' });
  reste = reste.slice(tete.length);
}
console.log(`— /espace/filed/boite (base réelle, ${session.user?.email})`);
ok(await s.aller(`${base}/espace/filed/boite`, { signe: `document.readyState === 'complete' && !!document.querySelector('.esp h1')` }), 'page chargée avec le cookie de session');
await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (b && b.getAttribute('aria-checked') !== 'true') b.click(); })()`);
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('.esp-ruban')?.textContent === 'Base réelle' && !document.querySelector('.esp-charge')`)) break; }
const r = await s.evaluer(`(() => ({ avis: [...document.querySelectorAll('.esp-avis')].map(a => a.innerText.replace(/\\s+/g, ' ')), kpi: [...document.querySelectorAll('.esp-kpi')].map(k => k.innerText.replace(/\\s+/g, ' ')), lignes: [...document.querySelectorAll('.esp-liste .esp-item')].map(t => t.innerText.replace(/\\s+/g, ' ')), detail: document.querySelector('#esp-courriel')?.innerText.replace(/\\s+/g, ' ') ?? '' }))()`);
console.log('    avis :', r.avis.join(' | '));
console.log('    compteurs :', r.kpi.join(' · '));
r.lignes.slice(0, 5).forEach((l) => console.log('    ·', l));
console.log('    détail :', r.detail.slice(0, 300));
ok(!r.avis.some((a) => /n'a pas répondu/.test(a)), 'la base répond (aucune erreur de lecture)');
ok(r.lignes.length >= 1, `${r.lignes.length} courriel(s) lus dans public.receptions`);
await s.capturer(`${dossier}reel-boite-1440.jpg`, { qualite: 55 });
s.soucis.filter((x) => !/CERT|insights|404|favicon|ERR_BLOCKED_BY_ORB|websocket|realtime/i.test(x)).forEach((x) => console.log('    souci :', x));
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
