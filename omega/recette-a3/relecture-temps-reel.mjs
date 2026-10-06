/* relecture-temps-reel.mjs — le temps réel de la vue Fournisseurs, en BASE
   RÉELLE (session A3, 06/10/2026). Deux navigateurs :
     A (session a) ouvre /espace/filed/fournisseurs, attend « En direct »
       (canal Realtime accepté par le serveur), ouvre la fiche du
       fournisseur donné et relève sa ligne « Identité » ;
     B (session b) ouvre la même vue et clique « Revérifier » sur ce
       fournisseur (identite_demander) ;
   puis A, SANS RECHARGER, doit voir la ligne « Identité » changer quand
   l'ouvrier identite répond (UPDATE de filed_fournisseurs, publiée).
   Deux voies, dites séparément : « en_direct » (le serveur a accepté le
   canal : c'est l'événement Realtime qui relit), ou « coupe » (le réseau
   refuse le WebSocket — c'est le cas dans le conteneur de recette, dont le
   mandataire ne fait pas d'Upgrade) : la vue se relit alors toutes les
   30 s. Le contrôle de l'événement lui-même ne vaut qu'en « en_direct » :
   à jouer depuis un poste ordinaire.

   usage : node omega/recette-a3/relecture-temps-reel.mjs <session-a.json> <session-b.json> "<fournisseur>"
   Origine : variable ORIGINE (défaut http://localhost:3010). Les fichiers
   de session ne se commitent jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fa, fb, nomFournisseur] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fa || !fb || !nomFournisseur) { console.error('usage : node relecture-temps-reel.mjs <session-a.json> <session-b.json> "<fournisseur>"'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

function morceaux(fichier) {
  const valeur = 'base64-' + Buffer.from(JSON.stringify(JSON.parse(readFileSync(fichier, 'utf8'))), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const m = [];
  for (let reste = valeur, i = 0; reste.length; i++) {
    let tete = reste.slice(0, 3180);
    while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
    m.push({ name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete });
    reste = reste.slice(tete.length);
  }
  return m;
}

async function ouvrir(fichier, marque) {
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque, densite: 1 });
  for (const m of morceaux(fichier)) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
  await s.aller(base + '/espace/filed/fournisseurs', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` });
  await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (b && b.getAttribute('aria-checked') !== 'true') b.click(); })()`);
  for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('.esp-ruban')?.textContent === 'Base réelle' && document.querySelectorAll('.esp-item').length > 0`)) break; }
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(nomFournisseur)}))?.click()`);
  await s.dormir(600);
  return s;
}
const identite = (s) => s.evaluer(`(() => { const d = [...document.querySelectorAll('#esp-fournisseur dt, #esp-fournisseur .esp-def-etiquette')].find(e => /Identité/.test(e.textContent)); const v = d?.nextElementSibling ?? d?.parentElement; return v ? v.innerText.replace(/\\s+/g, ' ').trim() : null; })()`);

const a = await ouvrir(fa, 'a3-direct-a');
let etat = null;
for (let i = 0; i < 30; i++) { etat = await a.evaluer(`document.querySelector('.esp-direct')?.getAttribute('data-etat') ?? null`); if (etat === 'en_direct' || etat === 'coupe') break; await a.dormir(500); }
const direct = etat === 'en_direct';
if (direct) ok(true, 'A : le canal temps réel est accepté par le serveur (en_direct)');
else {
  const temoin = await a.evaluer(`document.querySelector('.esp-direct')?.textContent ?? null`);
  console.log(`  ! A : canal « ${etat} » — ce réseau refuse le WebSocket ; on vérifie la relecture de repli (témoin : « ${temoin} »)`);
  ok(etat === 'coupe' && /30 s/.test(temoin ?? ''), 'A : le témoin dit que la vue se relit seule');
}
const avant = await identite(a);
console.log('    A, identité avant :', avant);
ok(!!avant, `A : la fiche de ${nomFournisseur} est ouverte`);
await a.capturer(`${dossier}reel-direct-avant-1440.jpg`, { qualite: 55 });

const b = await ouvrir(fb, 'a3-direct-b');
const clic = await b.evaluer(`(() => { const x = [...document.querySelectorAll('#esp-fournisseur .r-btn')].find(x => /Revérifier/.test(x.textContent)); if (!x) return false; x.click(); return true; })()`);
ok(clic, 'B : « Revérifier » cliqué');
let dit = '';
for (let i = 0; i < 20; i++) { await b.dormir(500); dit = await b.evaluer(`[...document.querySelectorAll('.esp-avis')].map(x => x.textContent.trim()).filter(t => /C'est fait|Refusé par la base/.test(t)).join(' / ')`); if (dit) break; }
console.log('    B :', dit);
ok(/demandée/.test(dit), 'B : la base accepte la demande de vérification');
b.fermer();

const t0 = Date.now();
let apres = avant;
while (Date.now() - t0 < 300_000 && apres === avant) { await a.dormir(5000); apres = await identite(a); }
console.log(`    A, identité après ${Math.round((Date.now() - t0) / 1000)} s :`, apres);
ok(apres !== avant, `A : la fiche a changé SANS recharger la page (${direct ? 'événement Realtime' : 'relecture de repli, canal coupé'})`);
if (!direct) console.log("  ! l'événement Realtime lui-même n'est pas vérifiable depuis ce réseau : rejouer ce script depuis un poste ordinaire");
const recharge = await a.evaluer(`performance.getEntriesByType('navigation').length`);
ok(recharge === 1, 'A : une seule navigation dans la page (aucun rechargement)');
await a.capturer(`${dossier}reel-direct-1440.jpg`, { qualite: 55 });
a.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
