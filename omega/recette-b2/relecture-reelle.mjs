/* relecture-reelle.mjs — /espace/tavaro en BASE RÉELLE, avec une vraie
   session (session B2, 06/10/2026 ; décalqué de omega/recette-a3/relecture-reelle.mjs).

   Prérequis : un fichier de session Supabase (ouvrir-session.mjs) et un
   serveur Next pointé sur le même projet (NEXT_PUBLIC_SUPABASE_URL /
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Le script pose le cookie de session
   tel que @supabase/ssr l'écrit, ouvre l'écran, bascule sur « Base réelle »,
   attend la lecture et relève : identité, compteurs, contrats listés, avis
   rouges, refus de la base en console (permission denied, 42501, 42883…),
   puis, si on le demande, joue un geste réel (--geste=<nom>) et relève la
   réponse de la porte. Une capture par étape.

   usage : node omega/recette-b2/relecture-reelle.mjs <session.json> [origine] [--geste=completer|litige|aucun]
   Le fichier de session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const args = process.argv.slice(2);
const fichier = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
const base = args.find((a) => /^https?:/.test(a)) ?? 'http://localhost:3013';
const geste = (args.find((a) => a.startsWith('--geste=')) ?? '--geste=aucun').slice(8);
if (!fichier) { console.error('usage : node relecture-reelle.mjs <session.json> [origine] [--geste=…]'); process.exit(2); }
const session = JSON.parse(readFileSync(fichier, 'utf8'));
if (!session.access_token) { console.error('le fichier ne porte pas de session'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const valeur = 'base64-' + b64url(JSON.stringify(session));
const morceaux = [];
{
  if (encodeURIComponent(valeur).length <= 3180) morceaux.push({ name: nom, value: valeur });
  else {
    let reste = valeur; let i = 0;
    while (reste.length) {
      let tete = reste.slice(0, 3180);
      while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
      morceaux.push({ name: `${nom}.${i++}`, value: tete });
      reste = reste.slice(tete.length);
    }
  }
}
console.log(`— cookie ${nom} en ${morceaux.length} morceau(x), utilisateur ${session.user?.email}`);

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b2-reel', densite: 1 });
await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
console.log('— /espace/tavaro (base réelle)');
ok(await s.aller(base + '/espace/tavaro', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const identite = await s.evaluer(`document.querySelector('.esp-identite-nom')?.textContent`);
ok(identite && identite !== 'Non connecté', `identité affichée : « ${identite} »`);
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
for (let i = 0; i < 40; i++) { await s.dormir(500); const charge = await s.evaluer(`!!document.querySelector('.esp-charge')`); if (!charge) break; }
await s.dormir(1500);
const releve = await s.evaluer(`(() => ({
  ruban: document.querySelector('.esp-ruban')?.textContent,
  kpis: [...document.querySelectorAll('.esp-kpi')].map(k => (k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent)),
  items: document.querySelectorAll('.esp-item').length,
  contrats: [...document.querySelectorAll('.esp-item .esp-mono')].map(e => e.textContent),
  bareme: document.querySelectorAll('section[aria-label="Barème de remise en état"] tbody tr').length,
  avis: [...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300)),
  ambre: [...document.querySelectorAll('.esp-avis[data-teinte="ambre"]')].map(a => a.textContent.trim().slice(0, 200)),
  erreurs: window.__erreurs || [],
}))()`);
ok(releve.ruban === 'Base réelle', `ruban : ${releve.ruban}`);
console.log('    compteurs :', releve.kpis.join(' · ') || '—', '| contrats :', releve.contrats.join(', ') || 'aucun', '| lignes de barème :', releve.bareme);
releve.ambre.forEach((a) => console.log('    avis ambre :', a));
ok(releve.avis.length === 0, releve.avis.length ? `avis rouge : ${releve.avis.join(' / ')}` : 'aucun avis rouge');
const refus = releve.erreurs.filter((e) => /permission denied|does not exist|42501|42883|PGRST/.test(e));
ok(refus.length === 0, refus.length ? `refus de la base : ${refus.join(' / ')}` : 'aucun refus de la base en console');
s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => console.log('  !', x));
await s.capturer(`${dossier}reel-tavaro-1440.jpg`, { qualite: 55 });

if (geste === 'completer' && releve.items > 0) {
  console.log('— geste réel : compléter les conditions du premier contrat');
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-actions .r-btn')].find(b => /Compléter les conditions/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const i = [...document.querySelectorAll('[role="dialog"] input')][0]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '600'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(300);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.click()`);
  for (let i = 0; i < 30; i++) { await s.dormir(500); const encore = await s.evaluer(`!!document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]') || !document.querySelector('[role="dialog"]')`); if (encore) break; }
  const issue = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { erreur: d.querySelector('.esp-avis[data-teinte="rouge"]')?.textContent } : { fait: document.querySelector('#esp-dossier .esp-avis[data-teinte="vert"]')?.textContent }; })()`);
  console.log('    réponse de la base :', JSON.stringify(issue));
  await s.capturer(`${dossier}reel-tavaro-completer-1440.jpg`, { qualite: 55 });
}
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
