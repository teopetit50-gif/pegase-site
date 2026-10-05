/* relecture-reelle-varelo.mjs — /espace/varelo en BASE RÉELLE, avec une vraie
   session (session B1, 05/10/2026). Décalqué de omega/recette-a3/relecture-reelle.mjs.

   Prérequis : un fichier de session Supabase (réponse de
   POST /auth/v1/token?grant_type=password sur la recette) et un serveur Next
   construit avec NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY de la recette.
   Le script pose le cookie de session tel que @supabase/ssr l'écrit, ouvre
   l'écran, bascule sur « Base réelle », attend la lecture et relève : le nom
   affiché, les compteurs, les sociétés, les lots, les erreurs de la console
   (« permission denied for function … », à remonter au coordinateur), une
   capture. Avec --ecrire, il joue aussi UNE écriture réversible : proposer un
   nom sur le premier objet (une demande de validation s'ouvre chez le banc).

   usage : node omega/recette-b1/relecture-reelle-varelo.mjs <session.json> [origine] [--ecrire]
   Le fichier de session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ecrire = process.argv.includes('--ecrire');
const [fichier, base = 'http://localhost:3012'] = args;
if (!fichier) { console.error('usage : node relecture-reelle-varelo.mjs <session.json> [origine] [--ecrire]'); process.exit(2); }
const session = JSON.parse(readFileSync(fichier, 'utf8'));
if (!session.access_token) { console.error('le fichier ne porte pas de session'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
const marque = (session.user?.email ?? 'inconnu').split('@')[0];
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const valeur = 'base64-' + b64url(JSON.stringify(session));
const morceaux = [];
{
  const enc = encodeURIComponent(valeur);
  if (enc.length <= 3180) morceaux.push({ name: nom, value: valeur });
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

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: `b1-reel-${marque}`, densite: 1 });
console.log(`— /espace/varelo (base réelle, ${marque})`);
await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/varelo', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const identite = await s.evaluer(`document.querySelector('.esp-identite-nom')?.textContent`);
ok(identite && identite !== 'Non connecté', `identité affichée : « ${identite} »`);
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
for (let i = 0; i < 60; i++) { await s.dormir(500); const charge = await s.evaluer(`!!document.querySelector('.esp-charge')`); if (!charge) break; }
await s.dormir(1500);
const releve = await s.evaluer(`(() => ({
  ruban: document.querySelector('.esp-ruban')?.textContent,
  kpis: [...document.querySelectorAll('.esp-kpi')].map(k => (k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent)),
  objets: document.querySelectorAll('.esp-item').length,
  objet: document.querySelector('#vrl-objet .vrl-objet-code')?.textContent + ' ' + document.querySelector('#vrl-objet .vrl-objet-nom')?.textContent,
  codes: document.querySelectorAll('#vrl-objet tbody tr').length,
  paires: document.querySelectorAll('.vrl-paire').length,
  lots: [...document.querySelectorAll('section[aria-label="Lots à valider"] .esp-groupe-title, section[aria-label="Lots à valider"] .esp-groupe-titre')].length,
  societes: [...document.querySelectorAll('.vrl-societe')].map(x => x.querySelector('div > div')?.textContent),
  poles: document.querySelectorAll('.vrl-pole').length,
  boutons: [...document.querySelectorAll('.esp-tete .r-btn')].map(b => b.textContent.trim()),
  ecarter: [...document.querySelectorAll('button')].filter(b => /Écarter cette paire/.test(b.textContent)).length,
  avis: [...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300)),
  ambre: [...document.querySelectorAll('.esp-avis[data-teinte="ambre"]')].map(a => a.textContent.trim().slice(0, 200)),
  erreurs: window.__erreurs || [],
}))()`);
ok(releve.ruban === 'Base réelle', `ruban : ${releve.ruban}`);
console.log('    compteurs :', releve.kpis.join(' · '));
console.log('    objets listés :', releve.objets, '| ouvert :', releve.objet, '| codes :', releve.codes);
console.log('    paires à valider :', releve.paires, '| lots :', releve.lots, '| « écarter » proposés :', releve.ecarter);
console.log('    sociétés :', releve.societes.join(' · ') || '—', '| pôles :', releve.poles);
console.log('    boutons :', releve.boutons.join(' · '));
if (releve.ambre.length) console.log('    avis ambre :', releve.ambre.join(' / '));
ok(releve.avis.length === 0, releve.avis.length ? `avis rouge : ${releve.avis.join(' / ')}` : 'aucun avis rouge');
const refus = releve.erreurs.filter((e) => /permission denied|does not exist|42501|42883|PGRST/.test(e));
ok(refus.length === 0, refus.length ? `refus de la base : ${refus.join(' / ')}` : 'aucun refus de la base en console');
ok(releve.objets > 0, `${releve.objets} objets du groupe lus sous RLS`);
ok(releve.societes.length === 3, `${releve.societes.length} sociétés du banc lues (grp_societes_vue)`);
s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => console.log('  !', x));
await s.capturer(`${dossier}reel-varelo-${marque}-1440.jpg`, { qualite: 55 });

if (ecrire) {
  console.log('— une écriture réversible : proposer un nom (grp_proposer_nom)');
  const nomAvant = await s.evaluer(`document.querySelector('#vrl-objet .vrl-objet-nom')?.textContent`);
  const clic = await s.evaluer(`(() => { const b = [...document.querySelectorAll('#vrl-objet .esp-actions button')].find(b => /Proposer un nom/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(clic === true, 'clic « Proposer un nom »');
  await s.dormir(500);
  await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] input.rv-champ'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(t, ${JSON.stringify((nomAvant ?? 'Objet') + ' (relecture B1)')}); t.dispatchEvent(new Event('input', { bubbles: true })); const r = document.querySelector('[role="dialog"] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(r, 'Relecture réelle B1 du 05/10 : à refuser dans la file.'); r.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(300);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Proposer\\s*$/.test(b.textContent))?.click()`);
  for (let i = 0; i < 20; i++) { await s.dormir(500); const encore = await s.evaluer(`!!document.querySelector('[role="dialog"]')`); if (!encore) break; }
  await s.dormir(1500);
  const apres = await s.evaluer(`(() => ({ fait: /C.est proposé/.test(document.querySelector('#vrl-objet')?.innerText || ''), erreur: document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent, lot: /Renommer un objet/.test([...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Lots à valider')?.innerText || ''), erreurs: (window.__erreurs || []).slice(-3) }))()`);
  ok(apres.fait, apres.fait ? 'la correction est proposée : la base a ouvert une demande de validation' : `refus : ${apres.erreur ?? apres.erreurs.join(' / ')}`);
  ok(apres.lot, 'le lot « Renommer un objet » apparaît dans les lots à valider (relu après la porte)');
  await s.capturer(`${dossier}reel-varelo-${marque}-proposer-1440.jpg`, { qualite: 55 });
}
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
