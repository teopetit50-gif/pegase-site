/* relecture-reelle.mjs — /espace/lorani en BASE RÉELLE, avec une vraie session
   (session B5, 05/10/2026 ; calqué sur omega/recette-a3/relecture-reelle.mjs).

   Prérequis : un fichier de session Supabase (réponse de
   POST /auth/v1/token?grant_type=password sur la recette) et un serveur Next
   pointé sur le même projet (NEXT_PUBLIC_SUPABASE_URL /
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Le script pose le cookie de session
   tel que @supabase/ssr l'écrit, ouvre l'écran, bascule l'interrupteur sur
   « Base réelle », attend la lecture et relève : l'identité, les compteurs,
   les permis listés, les avis rouges, les refus de la base en console
   (« permission denied for function … », à remonter au coordinateur), puis
   ouvre le premier permis et relève son calendrier. Une capture à la fin.

   usage : node omega/recette-b5/relecture-reelle.mjs <session.json> [origine]
   Le fichier de session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, base = 'http://localhost:3012'] = process.argv.slice(2);
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

/* le conteneur de recette sort par un mandataire dont Chromium (profil neuf) ne connaît pas le certificat :
   sans ce drapeau, fetch vers la recette rend « Failed to fetch » (relevé le 06/10). Recette seulement. */
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b5-reel', densite: 1, flags: ['--ignore-certificate-errors'] });
console.log('— /espace/lorani (base réelle)');
await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/lorani', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
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
  projets: document.querySelectorAll('.lor-projet-tete').length,
  avis: [...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300)),
  titre: document.querySelector('#esp-detail h2')?.textContent,
  etapes: document.querySelectorAll('.lor-etape').length,
  lectures: document.querySelectorAll('.lor-lecture').length,
  erreurs: window.__erreurs || [],
}))()`);
ok(releve.ruban === 'Base réelle', `ruban : ${releve.ruban}`);
console.log('    compteurs :', releve.kpis.join(' · ') || '—', '| permis :', releve.items, '| projets :', releve.projets, '| ouvert :', releve.titre ?? '—', '| étapes :', releve.etapes, '| dates lues :', releve.lectures);
ok(releve.avis.length === 0, releve.avis.length ? `avis rouge : ${releve.avis.join(' / ')}` : 'aucun avis rouge');
const refus = releve.erreurs.filter((e) => /permission denied|does not exist|42501|42883|PGRST/.test(e));
ok(refus.length === 0, refus.length ? `refus de la base : ${refus.join(' / ')}` : 'aucun refus de la base en console');
s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => console.log('  !', x));
await s.capturer(`${dossier}reel-lorani-1440.jpg`, { qualite: 55 });

/* ——— écrire pour de vrai, par l'écran : un projet du banc, puis son permis ; le moteur du socle calcule ——— */
console.log('— écrire en base réelle : projet « Maison Lemoine (banc) » puis PCMI déposé il y a vingt jours');
const deja = await s.evaluer(`[...document.querySelectorAll('.lor-projet-nom')].some(e => e.textContent.includes('Maison Lemoine (banc)'))`);
if (!deja) {
  await s.evaluer(`[...document.querySelectorAll('.esp-tete .r-btn')].find(b => /Nouveau projet/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const poser = (sel, v) => s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] ' + ${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(i.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event(i.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return i.value; })()`);
  await poser('input[placeholder="Maison Lemoine"]', 'Maison Lemoine (banc)');
  await poser('input[placeholder="26-014"]', 'B5-BANC-01');
  await poser('input[placeholder="44000"]', '44000');
  await poser('input[placeholder="Nantes"]', 'Nantes');
  await poser('input[placeholder="44109"]', '44109');
  await poser('input[placeholder="AB 123, AB 124"]', 'AB 123');
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Ouvrir le projet/.test(b.textContent))?.click()`);
  for (let i = 0; i < 20; i++) { await s.dormir(500); if (!(await s.evaluer(`!!document.querySelector('[role="dialog"]')`))) break; }
  const err = await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent || ''`);
  ok(!err, err ? `la base a refusé le projet : ${err}` : 'projet ouvert en base réelle (INSERT lorani_projets sous RLS)');
  await s.dormir(1500);
}
const projetLa = await s.evaluer(`[...document.querySelectorAll('.lor-projet-nom')].some(e => e.textContent.includes('Maison Lemoine (banc)'))`);
ok(projetLa, 'le projet du banc est dans la liste, relu depuis la base');
const dejaPermis = await s.evaluer(`[...document.querySelectorAll('.esp-item')].some(e => e.textContent.includes('Pavillon Lemoine'))`);
if (projetLa && !dejaPermis) {
  await s.evaluer(`(() => { const t = [...document.querySelectorAll('.lor-projet-tete')].find(e => e.textContent.includes('Maison Lemoine (banc)')); t?.nextElementSibling?.querySelector('.esp-item')?.click(); })()`);
  await s.dormir(600);
  await s.evaluer(`[...document.querySelectorAll('#esp-detail .r-btn')].find(b => /Nouveau permis/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const poser = (sel, v) => s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] ' + ${JSON.stringify(sel)}); if (!i) return null; const set = Object.getOwnPropertyDescriptor(i.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event(i.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return i.value; })()`);
  const j = new Date(); j.setDate(j.getDate() - 20);
  await poser('select', 'pcmi');
  await poser('input[placeholder="Extension, clôture, surélévation…"]', 'Pavillon Lemoine');
  await poser('input[type="date"]', j.toISOString().slice(0, 10));
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Saisir le permis/.test(b.textContent))?.click()`);
  for (let i = 0; i < 20; i++) { await s.dormir(500); if (!(await s.evaluer(`!!document.querySelector('[role="dialog"]')`))) break; }
  const err = await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent || ''`);
  ok(!err, err ? `la base a refusé le permis : ${err}` : 'permis saisi en base réelle (INSERT lorani_permis sous RLS, recalcul par le trigger)');
  await s.dormir(2000);
}
await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(e => /Pavillon Lemoine/.test(e.textContent))?.click()`);
await s.dormir(800);
const permisReel = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); const t = d?.innerText || ''; return { titre: d?.querySelector('h2')?.textContent, etapes: d?.querySelectorAll('.lor-etape').length, etat: (t.match(/Dossier déposé — la mairie peut réclamer des pièces|En instruction|Pièces manquantes à fournir|Décision implicite à confirmer/) || [])[0], regle: (t.match(/lorani\\.urbanisme\\.[a-z_]+/) || [])[0], echeances: (t.match(/(\\d+) en cours/) || [])[1], legifrance: t.includes('R*423-') }; })()`);
ok(permisReel.titre && /Pavillon Lemoine/.test(permisReel.titre) && permisReel.etapes >= 3, `le permis réel est ouvert : ${permisReel.titre}, ${permisReel.etapes} étapes calculées par lorani_calendrier_permis (état « ${permisReel.etat} », règle ${permisReel.regle})`);
ok(Number(permisReel.echeances) >= 1 && permisReel.legifrance, `${permisReel.echeances} échéance(s) posée(s) dans delais par le socle, l'article du code cité`);
await s.capturer(`${dossier}reel-permis-1440.jpg`, { qualite: 55 });
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
