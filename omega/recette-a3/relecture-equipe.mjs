/* relecture-equipe.mjs — l'écran Équipe en BASE RÉELLE (session A3, 15/10/2026) :
   l'annuaire de l'organisation, et le refus clair d'ajouter une adresse sans
   compte Omega (rattacher_membre, P0002). Rien n'est écrit.
   usage : node omega/recette-a3/relecture-equipe.mjs <session.json>
   Origine : variable ORIGINE (défaut http://localhost:3010). Le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichierSession] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichierSession) { console.error('usage : node relecture-equipe.mjs <session.json>'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const session = JSON.parse(readFileSync(fichierSession, 'utf8'));
const valeur = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-equipe', densite: 1 });
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  await s.envoyer('Network.setCookie', { name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete, url: base, path: '/' });
  reste = reste.slice(tete.length);
}
console.log(`— /espace/equipe (base réelle, ${session.user?.email})`);
ok(await s.aller(`${base}/espace/equipe?ancien=1`, { signe: `document.readyState === 'complete' && !!document.querySelector('h1')` }), 'page chargée avec le cookie de session');
/* la source « Base réelle » : localStorage espace.source (ancien et nouvel espace), puis on recharge */
await s.evaluer(`localStorage.setItem('espace.source', 'reelle')`);
await s.aller(`${base}/espace/equipe?ancien=1`, { signe: `document.readyState === 'complete' && !!document.querySelector('h1')` });
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`!document.querySelector('.esp-charge') && document.querySelectorAll('tbody tr').length > 0`)) break; }
const r = await s.evaluer(`({ lignes: [...document.querySelectorAll('tbody tr')].map(t => t.innerText.replace(/\\s+/g, ' ')), ajouter: !![...document.querySelectorAll('button')].find(b => /Ajouter une personne/.test(b.textContent)), avis: [...document.querySelectorAll('.esp-avis')].map(a => a.textContent).join(' | ') })`);
r.lignes.forEach((l) => console.log('    ·', l.slice(0, 160)));
ok(r.lignes.length >= 1 && !/n'a pas répondu/.test(r.avis), `${r.lignes.length} personne(s) lues (annuaire)`);
if (r.ajouter) {
  /* le chemin d'erreur, sans rien écrire : une adresse sans compte Omega */
  await s.evaluer(`[...document.querySelectorAll('button')].find(b => /Ajouter une personne/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input[type="email"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'personne-inconnue-a3@exemple.invalid'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Ajouter\\s*$/.test(b.textContent)).click()`);
  let dit = '';
  for (let i = 0; i < 20; i++) { await s.dormir(400); dit = await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis')?.textContent ?? ''`); if (dit) break; }
  ok(/Aucun compte pour cette adresse/.test(dit), `adresse sans compte : « ${dit} »`);
} else {
  const p = await s.evaluer(`document.body.innerText.match(/Seuls les gérants[^\\n]*/)?.[0] ?? ''`);
  ok(/Seuls les gérants/.test(p), `sans le droit : ${p}`);
}

await s.capturer(`${dossier}reel-equipe-1440.jpg`, { qualite: 55 });
s.soucis.filter((x) => !/CERT|insights|404|favicon|ERR_BLOCKED_BY_ORB|websocket|realtime/i.test(x)).forEach((x) => console.log('    souci :', x));
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
