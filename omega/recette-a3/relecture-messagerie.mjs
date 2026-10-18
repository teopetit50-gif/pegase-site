/* relecture-messagerie.mjs — la carte Messagerie des Réglages en BASE RÉELLE
   (session A3, 18/10/2026) : lecture de public.messageries ; avec CONNECTER=1,
   « Connecter Gmail » (messagerie_preparer, un état de 15 min) et le départ vers
   messagerie-oauth jusqu'à la page de consentement de Google — rien n'est
   accordé, la page n'est pas validée.
   usage : node omega/recette-a3/relecture-messagerie.mjs <session.json>
   Origine : variable ORIGINE (défaut http://localhost:3010). */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichierSession] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichierSession) { console.error('usage : node relecture-messagerie.mjs <session.json>'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const session = JSON.parse(readFileSync(fichierSession, 'utf8'));
const valeur = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-messagerie', densite: 1 });
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  await s.envoyer('Network.setCookie', { name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete, url: base, path: '/' });
  reste = reste.slice(tete.length);
}
console.log(`— Réglages · Messagerie (base réelle, ${session.user?.email})`);
await s.aller(`${base}/espace/reglages?ancien=1`, { signe: `document.readyState === 'complete' && !!document.querySelector('h1')` });
await s.evaluer(`localStorage.setItem('espace.source', 'reelle')`);
ok(await s.aller(`${base}/espace/reglages?ancien=1`, { signe: `document.readyState === 'complete' && !!document.querySelector('h1')` }), 'page chargée avec le cookie de session');
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`!!document.querySelector('#messagerie') && !/Lecture des messageries|Lecture de votre rôle/.test(document.querySelector('#messagerie').innerText)`)) break; }
const t = await s.evaluer(`document.querySelector('#messagerie')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
console.log('    carte :', t.slice(0, 300));
ok(/Gmail/.test(t) && !/Refusé par la base/.test(t), 'la carte lit public.messageries');
if (process.env.CONNECTER === '1' && /Connecter Gmail|Reconnecter Gmail/.test(t)) {
  await s.evaluer(`[...document.querySelectorAll('#messagerie button')].find(b => /Connecter Gmail|Reconnecter Gmail/.test(b.textContent)).click()`);
  let url = '';
  for (let i = 0; i < 30; i++) { await s.dormir(500); url = await s.evaluer('location.href').catch(() => ''); if (/accounts\.google\.com|erreur=|messagerie-oauth/.test(url)) break; }
  console.log('    après « Connecter Gmail » :', url.replace(/(state|etat)=[^&]+/g, '$1=…').slice(0, 200));
  ok(/accounts\.google\.com/.test(url), 'messagerie_preparer puis messagerie-oauth mènent à la page de consentement de Google');
}
s.soucis.filter((x) => !/CERT|insights|404|favicon|ERR_BLOCKED_BY_ORB|websocket|realtime/i.test(x)).forEach((x) => console.log('    souci :', x));
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
