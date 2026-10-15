/* relecture-reelle.mjs — /espace/tiroma en BASE RÉELLE, avec une vraie
   session (session B3, 06/10/2026 ; copié de omega/recette-a3/relecture-reelle.mjs).

   Prérequis : un fichier de session Supabase (réponse de
   POST /auth/v1/token?grant_type=password, compte du banc) et un serveur Next
   pointé sur le même projet (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY). Le
   script pose le cookie de session tel que @supabase/ssr l'écrit (« base64- »
   + base64url du JSON, découpé en morceaux de 3 180 caractères), ouvre
   l'écran, bascule l'interrupteur sur « Base réelle », attend la lecture et
   relève : le nom affiché, les compteurs, l'état du cabinet (installé ou
   formulaire d'installation), les erreurs de la console (en particulier
   « permission denied for function … », à remonter au coordinateur), une
   capture.

   usage : node omega/recette-b3/relecture-reelle.mjs <session.json> [origine]
   Le fichier de session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, base = 'http://localhost:3013'] = process.argv.slice(2);
if (!fichier) { console.error('usage : node relecture-reelle.mjs <session.json> [origine]'); process.exit(2); }
const session = JSON.parse(readFileSync(fichier, 'utf8'));
if (!session.access_token) { console.error('le fichier ne porte pas de session'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

/* le cookie, à la façon de @supabase/ssr (cookies.js + chunker.js) */
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

for (const largeur of [1440, 390]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur === 390 ? 844 : 900, marque: `b3-reel-${largeur}`, densite: 1, flags: ['--ignore-certificate-errors'] });
  console.log(`— /espace/tiroma (base réelle, ${largeur} px)`);
  await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
  for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
  ok(await s.aller(base + '/espace/tiroma', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
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
    cartes: [...document.querySelectorAll('.esp-carte-titre')].map(t => t.textContent.trim()),
    installer: !!document.querySelector('section[aria-label="Installer le cabinet"]'),
    avis: [...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300)),
    erreurs: window.__erreurs || [],
    deborde: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))()`);
  ok(releve.ruban === 'Base réelle', `ruban : ${releve.ruban}`);
  console.log('    compteurs :', releve.kpis.join(' · ') || '—', '| lignes :', releve.items);
  console.log('    cartes :', releve.cartes.join(' · ') || '—', releve.installer ? '| cabinet NON installé (formulaire)' : '| cabinet installé');
  ok(!releve.deborde, 'aucun débordement horizontal');
  ok(releve.avis.length === 0, releve.avis.length ? `avis rouge : ${releve.avis.join(' / ')}` : 'aucun avis rouge');
  const refus = releve.erreurs.filter((e) => /permission denied|does not exist|42501|42883|PGRST/.test(e));
  ok(refus.length === 0, refus.length ? `refus de la base : ${refus.join(' / ')}` : 'aucun refus de la base en console');
  s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => console.log('  !', x));
  await s.capturer(`${dossier}reel-tiroma-${largeur}.jpg`, { qualite: 55 });
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
