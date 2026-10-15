/* relecture-reelle-daliro.mjs — /espace/daliro en BASE RÉELLE, avec une vraie
   session (session B6, 06/10/2026), sur le modèle de omega/recette-a3/relecture-reelle.mjs.
   Prérequis : un fichier de session Supabase (POST /auth/v1/token?grant_type=password)
   et un serveur Next pointé sur la recette (.env.local). Le script pose le cookie
   @supabase/ssr, ouvre l'écran, bascule sur « Base réelle », attend la lecture et
   relève compteurs, chantiers, avis rouges, refus de la base en console, puis capture.
   usage : node omega/recette-b6/relecture-reelle-daliro.mjs <session.json> [origine]
   Le fichier de session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, base = 'http://localhost:3013'] = process.argv.slice(2);
if (!fichier) { console.error('usage : node relecture-reelle-daliro.mjs <session.json> [origine]'); process.exit(2); }
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
  else { let reste = valeur; let i = 0; while (reste.length) { let tete = reste.slice(0, 3180); while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1); morceaux.push({ name: `${nom}.${i++}`, value: tete }); reste = reste.slice(tete.length); } }
}
console.log(`— cookie ${nom} en ${morceaux.length} morceau(x), utilisateur ${session.user?.email}`);

/* Le conteneur de recette sort par un mandataire qui ré-émet les certificats : Chromium ne connaît
   pas son autorité (ERR_CERT_AUTHORITY_INVALID sur supabase.co) alors que Node (curl) la lit dans
   /root/.ccr/ca-bundle.crt. On autorise CETTE autorité seule, par l'empreinte SPKI de sa clé,
   passée dans B6_SPKI_MANDATAIRE (openssl x509 -pubkey | openssl pkey -pubin -outform der | sha256 | base64). */
const spki = process.env.B6_SPKI_MANDATAIRE;
const s = await ouvrirSession({ largeur: 1440, hauteur: 1000, marque: 'b6-reel', densite: 1, flags: spki ? [`--ignore-certificate-errors-spki-list=${spki}`] : [] });
await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/daliro', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const identite = await s.evaluer(`document.querySelector('.esp-identite-nom')?.textContent`);
ok(identite && identite !== 'Non connecté', `identité affichée : « ${identite} »`);
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
for (let i = 0; i < 40; i++) { await s.dormir(500); const charge = await s.evaluer(`!!document.querySelector('.esp-charge')`); if (!charge) break; }
await s.dormir(1500);
const releve = await s.evaluer(`(() => ({
  ruban: document.querySelector('.esp-ruban')?.textContent,
  kpis: [...document.querySelectorAll('.esp-kpi')].map(k => (k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent)),
  items: [...document.querySelectorAll('.esp-item')].map(i => i.innerText.replace(/\\n/g, ' | ').slice(0, 160)),
  vide: document.querySelector('.esp-vide')?.innerText,
  dossier: (document.querySelector('#esp-dossier')?.innerText || '').slice(0, 1200),
  avis: [...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300)),
  erreurs: window.__erreurs || [],
}))()`);
ok(releve.ruban === 'Base réelle', `ruban : ${releve.ruban}`);
console.log('    compteurs :', releve.kpis.join(' · ') || '—');
console.log('    chantiers :', releve.items.length ? releve.items.join('\n                ') : (releve.vide || '—'));
console.log('    tableau :', releve.dossier.replace(/\n+/g, ' / ').slice(0, 600));
ok(releve.avis.length === 0, releve.avis.length ? `avis rouge : ${releve.avis.join(' / ')}` : 'aucun avis rouge');
const refus = releve.erreurs.filter((e) => /permission denied|does not exist|42501|42883|PGRST/.test(e));
ok(refus.length === 0, refus.length ? `refus de la base : ${refus.join(' / ')}` : 'aucun refus de la base en console');
/* ——— une écriture réelle : créer un chantier (INSERT btp_chantiers, politique du bureau), saisir son marché
   (porte btp_ecrire_marche) et une ligne (porte btp_ecrire_ligne) ; la base calcule les contrôles ——— */
if (process.env.B6_ECRIRE === 'oui') {
  const bouton = (motif) => `(() => { const b = [...document.querySelectorAll('button')].find(b => ${motif}.test(b.textContent)); if (!b) return null; b.click(); return !b.disabled; })()`;
  const dlgBouton = (motif) => `[...document.querySelectorAll('[role="dialog"] button')].find(b => ${motif}.test(b.textContent))`;
  const saisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); if (!t) return false; const proto = t.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
  const attendre = async (cond, n = 40) => { for (let i = 0; i < n; i++) { if (await s.evaluer(cond)) return true; await s.dormir(500); } return false; };
  const nomChantier = `Essai B6 — ${new Date().toISOString().slice(11, 16)}`;
  console.log(`— écriture réelle : chantier « ${nomChantier} »`);
  ok(await s.evaluer(bouton('/Nouveau chantier/')) !== null, 'clic sur « Nouveau chantier »');
  await s.dormir(500);
  const entrees = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] input')].map(i => i.placeholder)`);
  ok(entrees.length >= 4, `formulaire ouvert (${entrees.length} champs)`);
  await s.evaluer(saisir('[role="dialog"] input[placeholder="Résidence Les Tilleuls"]', nomChantier));
  await s.evaluer(saisir('[role="dialog"] input[placeholder="TIL-2026"]', 'B6-ESSAI'));
  await s.evaluer(saisir('[role="dialog"] input[placeholder="69100"]', '69100'));
  await s.evaluer(saisir('[role="dialog"] input[placeholder="Villeurbanne"]', 'Villeurbanne'));
  await s.dormir(200);
  ok(await s.evaluer(`${dlgBouton('/Créer le chantier/')}?.disabled`) === false, '« Créer le chantier » s\'active');
  await s.evaluer(`${dlgBouton('/Créer le chantier/')}?.click()`);
  ok(await attendre(`/C.est fait/.test(document.querySelector('.esp')?.innerText || '')`), 'la base a créé le chantier (« C\'est fait »)');
  ok(await attendre(`!!document.querySelector('#esp-dossier .esp-carte-titre')`), 'le tableau du chantier est lu (btp_tableau_chantier)');
  const tableau = await s.evaluer(`(document.querySelector('#esp-dossier')?.innerText || '')`);
  ok(tableau.includes(nomChantier), `le chantier « ${nomChantier} » est ouvert à droite`);
  ok(/aucun lot/.test(tableau) && /aucun maître d.ouvrage/.test(tableau), 'les contrôles de la base sont là : « aucun lot », « aucun maître d\'ouvrage » (bloquant)');
  ok(/69\/|Régime normal/.test(tableau), 'TVA : régime normal (déduit du code postal par la base)');
  ok(await s.evaluer(bouton('/Saisir le marché/')) !== null, 'clic sur « Saisir le marché »');
  await s.dormir(500);
  await s.evaluer(saisir('[role="dialog"] input[placeholder="M-2026-014"]', 'B6-M-001'));
  await s.evaluer(`(() => { const t = [...document.querySelectorAll('[role="dialog"] input')].find(i => i.inputMode === 'decimal'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(t, '1000'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.evaluer(`${dlgBouton('/Saisir le marché/')}?.click()`);
  ok(await attendre(`/À vérifier ligne à ligne/i.test(document.querySelector('#esp-dossier')?.innerText || '')`), 'btp_ecrire_marche : le marché est créé « à vérifier »');
  ok(await s.evaluer(bouton('/Ajouter une ligne/')) !== null, 'clic sur « Ajouter une ligne »');
  await s.dormir(500);
  await s.evaluer(`(() => { const t = [...document.querySelectorAll('[role="dialog"] input')].find(i => !i.placeholder && i.type !== 'date' && i.inputMode !== 'decimal' && i.previousSibling === null); })()`);
  const champs = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] input')].map(i => i.placeholder + '|' + i.inputMode)`);
  console.log('    champs ligne :', champs.join(' ; '));
  /* remplir champ par champ, en relisant la valeur : un rendu de React juste après la relecture du tableau
     peut absorber une saisie synthétique trop rapide (vu le 06/10 : cinq champs vides au moment du clic) */
  const remplir = async (indice, valeur, decimal) => {
    for (let essai = 0; essai < 4; essai++) {
      await s.evaluer(`(() => { const ins = [...document.querySelectorAll('[role="dialog"] input')]${decimal ? ".filter(i => i.inputMode === 'decimal')" : ''}; const el = ins[${indice}]; if (!el) return;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(valeur)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await s.dormir(250);
      const lu = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] input')]${decimal ? ".filter(i => i.inputMode === 'decimal')" : ''}[${indice}]?.value`);
      if (lu === valeur) return true;
    }
    return false;
  };
  await s.dormir(800);
  ok(await remplir(0, '1', false) && await remplir(1, 'Ouvrage d\'essai B6', false) && await remplir(0, '10', true) && await remplir(1, '100', true) && await remplir(2, '990', true), 'les cinq champs de la ligne sont saisis et relus');
  await s.dormir(300);
  console.log('    bouton « Ajouter la ligne » gris ?', await s.evaluer(`${dlgBouton('/Ajouter la ligne/')}?.disabled`), '| valeurs :', JSON.stringify(await s.evaluer(`[...document.querySelectorAll('[role="dialog"] input')].map(i => i.value)`)));
  await s.evaluer(`${dlgBouton('/Ajouter la ligne/')}?.click()`);
  const ligneLue = await attendre(`/Ouvrage d.essai B6/.test(document.querySelector('#esp-dossier')?.innerText || '')`);
  if (!ligneLue) console.log('    requêtes rpc :', JSON.stringify(await s.evaluer(`performance.getEntriesByType('resource').filter(r => /rest\\/v1\\/rpc/.test(r.name)).map(r => r.name.split('/rpc/')[1] + ' ' + (r.responseStatus ?? '?') + ' ' + Math.round(r.duration) + 'ms')`)));
  if (!ligneLue) console.log('    dialogue :', String(await s.evaluer(`document.querySelector('[role="dialog"]')?.innerText.slice(0, 600)`)).replace(/\n+/g, ' / '), '| tableau :', (await s.evaluer(`(document.querySelector('#esp-dossier')?.innerText || '')`)).slice(0, 400).replace(/\n+/g, ' / '));
  ok(ligneLue, 'btp_ecrire_ligne : la ligne est écrite et relue');
  const apres = await s.evaluer(`(document.querySelector('#esp-dossier')?.innerText || '')`);
  ok(/Montant ≠ quantité × PU/.test(apres) && /Accepter l.écart/.test(apres), 'la base a calculé « montant_faux » (10 × 100 ≠ 990) et l\'écran propose d\'accepter l\'écart');
  ok(/Ligne rattachée à aucun lot|aucun lot/.test(apres), 'et « sans lot » (bloquant), lu de btp_controle_marches');
  await s.capturer(`${dossier}reel-daliro-ecriture-1440.jpg`, { qualite: 55 });
}
s.soucis.forEach((x) => console.log('  !', x.slice(0, 300))); console.log('    erreurs console :', JSON.stringify(releve.erreurs).slice(0, 800));
await s.capturer(`${dossier}reel-daliro-1440.jpg`, { qualite: 55 });
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
