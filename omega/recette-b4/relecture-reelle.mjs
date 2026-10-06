/* relecture-reelle.mjs — /espace/tamila en BASE RÉELLE, avec une vraie session (session B4, 06/10/2026).
   Calqué sur omega/recette-a3/relecture-reelle.mjs : le cookie de session est posé à la façon de
   @supabase/ssr, l'écran est ouvert, l'interrupteur basculé sur « Base réelle », puis le parcours
   d'un cabinet est rejoué pour de vrai : installer Tamila (gérant), mémoriser la phrase du cabinet,
   ouvrir un dossier chiffré, ajouter le client (Guadeloupe), déclarer l'appel, lire les délais
   calculés, déposer une pièce chiffrée. Chaque étape relève les avis rouges et les refus de la base
   en console. Un second fichier de session (referent, avocat) confirme un délai.
   usage : node omega/recette-b4/relecture-reelle.mjs <session-gerant.json> [session-referent.json] [origine]
   Les fichiers de session ne se commitent jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, fichierReferent, base = 'http://localhost:3011'] = process.argv.slice(2);
if (!fichier) { console.error('usage : node relecture-reelle.mjs <session-gerant.json> [session-referent.json] [origine]'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
const PHRASE = process.env.TAMILA_PHRASE ?? 'banc-varelo-phrase-de-recette-2026';
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function morceauxDe(session) {
  const valeur = 'base64-' + b64url(JSON.stringify(session));
  const m = [];
  if (encodeURIComponent(valeur).length <= 3180) m.push({ name: nom, value: valeur });
  else { let reste = valeur; let i = 0; while (reste.length) { let tete = reste.slice(0, 3180); while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1); m.push({ name: `${nom}.${i++}`, value: tete }); reste = reste.slice(tete.length); } }
  return m;
}

async function ouvrir(session, marque) {
  /* le conteneur de recette sort par un mandataire TLS dont Chromium ne connaît pas l'autorité :
     on lui dit de ne pas s'arrêter au certificat (recette seulement, jamais sur une machine de travail) */
  const s = await ouvrirSession({ largeur: 1440, hauteur: 1000, marque, densite: 1, flags: process.env.RECETTE_MANDATAIRE ? ['--ignore-certificate-errors'] : [] });
  await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
  for (const m of morceauxDe(session)) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
  ok(await s.aller(base + '/espace/tamila', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
  const identite = await s.evaluer(`document.querySelector('.esp-identite-nom')?.textContent`);
  ok(identite && identite !== 'Non connecté', `identité affichée : « ${identite} »`);
  const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
  ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);
  await attendre(s);
  return s;
}
/* un geste part par une porte puis l'écran se relit : on attend que le dialogue se ferme (porte répondue)
   ou, s'il reste ouvert (refus de la base), on le ferme pour continuer */
async function finDialogue(s, ms = 1500) {
  let ouvert = true;
  for (let i = 0; i < 60; i++) { ouvert = await s.evaluer(`!!document.querySelector('[role="dialog"]')`); if (!ouvert) break; await s.dormir(500); }
  if (ouvert) { const err = await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent || ''`); console.log('    dialogue resté ouvert :', err.slice(0, 200)); await s.evaluer(`document.querySelector('[role="dialog"] .dlg-fermer')?.click()`); await s.dormir(500); }
  await attendre(s, ms);
}
async function attendre(s, ms = 1200) { for (let i = 0; i < 40; i++) { await s.dormir(400); if (!(await s.evaluer(`!!document.querySelector('.esp-charge')`))) break; } await s.dormir(ms); }
async function releve(s, etape) {
  const r = await s.evaluer(`(() => ({
    ruban: document.querySelector('.esp-ruban')?.textContent,
    kpis: [...document.querySelectorAll('.esp-kpi')].map(k => (k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent)),
    items: document.querySelectorAll('.esp-item').length,
    rouges: [...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300)),
    verts: [...document.querySelectorAll('.esp-avis[data-teinte="vert"]')].map(a => a.textContent.trim().slice(0, 200)),
    erreurs: (window.__erreurs || []).filter(e => /permission denied|does not exist|42501|42883|PGRST|55000|22023|23/.test(e)),
  }))()`);
  console.log(`    [${etape}] ${r.kpis.join(' · ') || '—'} | dossiers : ${r.items}${r.verts.length ? ' | ' + r.verts.join(' / ') : ''}`);
  ok(r.rouges.length === 0, r.rouges.length ? `avis rouge : ${r.rouges.join(' / ')}` : 'aucun avis rouge');
  ok(r.erreurs.length === 0, r.erreurs.length ? `refus de la base : ${r.erreurs.join(' / ')}` : 'aucun refus de la base en console');
  await s.evaluer(`window.__erreurs = []`);
  return r;
}
const taper = (s, selecteur, valeur) => s.evaluer(`(() => { const e = document.querySelector(${JSON.stringify(selecteur)}); if (!e) return false; const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${JSON.stringify(valeur)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
const cliquer = (s, selecteur, texte) => s.evaluer(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(selecteur)})].find(b => ${texte.source ? `/${texte.source}/` : JSON.stringify(texte)}.test(b.textContent)); if (!b) return null; if (b.disabled) return 'gris'; b.click(); return true; })()`);
const champsDialogue = (s) => s.evaluer(`[...document.querySelectorAll('[role="dialog"] .rv-champ')].map((e, i) => i + ':' + e.tagName + ':' + (e.type || '') + ':' + (e.closest('label')?.textContent?.trim().slice(0, 30) || ''))`);

/* ——— le gérant ——— */
const session = JSON.parse(readFileSync(fichier, 'utf8'));
console.log(`— gérant ${session.user?.email}`);
let s = await ouvrir(session, 'b4-reel-gerant');
let r = await releve(s, 'ouverture');
await s.capturer(`${dossier}reel-ouverture-1440.jpg`, { qualite: 55 });

/* installation, si l'écran la propose */
const installer = await cliquer(s, '.esp-avis .r-btn', /Installer Tamila/);
if (installer === true) { await attendre(s, 1500); r = await releve(s, 'installation'); ok(r.verts.some((v) => /install/.test(v)) || !(await s.evaluer(`/n'est pas installé/.test(document.body.innerText)`)), 'Tamila est installé (l\'avis « pas installé » a disparu)'); }
else console.log('    (Tamila déjà installé, ou le bouton n\'est pas proposé :', installer, ')');

/* la phrase du cabinet */
ok((await cliquer(s, '.esp-tete .r-btn', /Phrase/)) === true, 'ouverture du dialogue de la phrase');
await s.dormir(300);
await taper(s, '[role="dialog"] input[type="password"]', PHRASE);
await s.dormir(200);
ok((await cliquer(s, '[role="dialog"] button', /Mémoriser/)) === true, 'phrase mémorisée pour l\'onglet');
await attendre(s);

/* un dossier chiffré — ou, avec TAMILA_REF, un dossier déjà ouvert par un passage précédent */
const REF = process.env.TAMILA_REF ?? `BANC-${new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '')}`;
let refAffichee = null;
if (process.env.TAMILA_REF) {
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(REF)}))?.click()`);
  for (let i = 0; i < 50; i++) { refAffichee = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`); if (refAffichee === REF) break; await s.dormir(500); }
  ok(refAffichee === REF, `dossier existant ${REF} ouvert et déchiffré (${refAffichee})`);
} else {
ok((await cliquer(s, '.esp-tete .r-btn', /Nouveau dossier/)) === true, 'ouverture de « Nouveau dossier »');
await s.dormir(400);
console.log('    champs :', (await champsDialogue(s)).join(' | '));
await taper(s, '[role="dialog"] input[placeholder="2026-0431"]', REF);
await taper(s, '[role="dialog"] input[placeholder="26/01234"]', '26/04567');
await taper(s, '[role="dialog"] input[placeholder="Demandeur c/ Défendeur"]', 'SCI du Moulin c/ Bâti-Sud (banc)');
await taper(s, '[role="dialog"] input[placeholder="Cour d\'appel de Paris"]', 'Cour d\'appel de Paris');
await s.dormir(300);
const ouvrirBtn = await cliquer(s, '[role="dialog"] button', /Ouvrir le dossier/);
ok(ouvrirBtn === true, `clic « Ouvrir le dossier » (${ouvrirBtn})`);
await finDialogue(s, 1000);
/* le dossier se relit puis se charge : on attend sa référence déchiffrée (jusqu'à 25 s) */
for (let i = 0; i < 50; i++) { refAffichee = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`); if (refAffichee === REF) break; await s.dormir(500); }
r = await releve(s, 'dossier créé');
ok(refAffichee === REF, `le dossier ouvert montre sa référence déchiffrée : ${refAffichee}`);
await s.capturer(`${dossier}reel-dossier-1440.jpg`, { qualite: 55 });
}
const dejaPartie = /SCI du Moulin/.test(await s.evaluer(`document.querySelector('section[aria-label="Parties"]')?.innerText || ''`));
const dejaAppel = /Appel introduit le/.test(await s.evaluer(`document.querySelector('section[aria-label="Appel et délais de procédure"]')?.innerText || ''`));
if (!dejaPartie) {

/* le client, en Guadeloupe */
ok((await cliquer(s, 'section[aria-label="Parties"] .r-btn', /Ajouter/)) === true, 'ouverture « Ajouter une partie »');
await s.dormir(400);
await taper(s, '[role="dialog"] input.rv-champ', 'SCI du Moulin');
await s.evaluer(`(() => { const sels = [...document.querySelectorAll('[role="dialog"] select')]; const q = sels[0]; q.value = 'client'; q.dispatchEvent(new Event('change', { bubbles: true })); const r = sels[1]; r.value = 'appelant'; r.dispatchEvent(new Event('change', { bubbles: true })); const d = sels[2]; d.value = 'guadeloupe'; d.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await s.dormir(200);
ok((await cliquer(s, '[role="dialog"] button', /Enregistrer/)) === true, 'clic « Enregistrer » la partie');
await finDialogue(s, 1000);
let partie = '';
for (let i = 0; i < 30; i++) { partie = await s.evaluer(`document.querySelector('section[aria-label="Parties"]')?.innerText || ''`); if (/SCI du Moulin/.test(partie)) break; await s.dormir(500); }
r = await releve(s, 'partie');
ok(/SCI du Moulin/.test(partie) && /Guadeloupe/.test(partie), 'la partie s\'affiche déchiffrée, demeure en Guadeloupe');
}

/* l'appel */
if (!dejaAppel) {
ok((await cliquer(s, 'section[aria-label="Appel et délais de procédure"] .r-btn', /Déclarer l'appel/)) === true, 'ouverture « Déclarer l\'appel »');
await s.dormir(400);
await taper(s, '[role="dialog"] input[type="date"]', '2026-09-15');
await s.dormir(200);
ok((await cliquer(s, '[role="dialog"] button', /Enregistrer/)) === true, 'clic « Enregistrer » l\'appel');
await finDialogue(s, 2000);
}
r = await releve(s, 'appel');
const delais = await s.evaluer(`[...document.querySelectorAll('section[aria-label="Appel et délais de procédure"] .tam-ligne')].map(l => l.innerText.replace(/\\n/g, ' · ').slice(0, 160))`);
console.log('    délais :', delais.join(' || ') || '—');
ok(delais.length >= 1 && delais.some((d) => /À confirmer/.test(d)), 'au moins un délai posé par la déclaration d\'appel, à confirmer');
ok(delais.some((d) => /un mois/.test(d)), 'l\'augmentation d\'un mois (client en Guadeloupe) est visible');
await s.evaluer(`[...document.querySelectorAll('.tam-depli')][0]?.click()`);
await s.dormir(300);
const calcul = await s.evaluer(`document.querySelector('.tam-calcul')?.textContent || ''`);
ok(/CPC, art\./.test(calcul), `le calcul en toutes lettres vient de la base : « ${calcul.slice(0, 140)}… »`);
await s.capturer(`${dossier}reel-delais-1440.jpg`, { qualite: 55 });

/* une pièce chiffrée */
const piece = await cliquer(s, 'section[aria-label="Pièces"] .r-btn', /Déposer/);
ok(piece === true, `ouverture « Déposer une pièce » (${piece})`);
if (piece === true) {
  await s.dormir(300);
  const nd = await s.evaluer(`(() => { const d = document; const i = d.querySelector('[role="dialog"] input[type="file"]'); return i ? true : false; })()`);
  ok(nd, 'le contrôle de fichier est là');
  /* un petit PDF fabriqué sur place */
  const root = (await s.envoyer('DOM.getDocument', { depth: 1 })).result.root;
  const nodeId = (await s.envoyer('DOM.querySelector', { nodeId: root.nodeId, selector: '[role="dialog"] input[type="file"]' })).result.nodeId;
  const { writeFileSync } = await import('node:fs');
  const chemin = `${dossier}.piece-essai.pdf`;
  writeFileSync(chemin, '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
  await s.envoyer('DOM.setFileInputFiles', { nodeId, files: [chemin] });
  await s.dormir(300);
  const dep = await cliquer(s, '[role="dialog"] button', /Chiffrer et déposer/);
  ok(dep === true, `clic « Chiffrer et déposer » (${dep})`);
  await finDialogue(s, 2000);
  r = await releve(s, 'pièce');
  const pieces = await s.evaluer(`document.querySelector('section[aria-label="Pièces"]')?.innerText || ''`);
  ok(/piece-essai\.pdf/.test(pieces) && /Chiffrée/.test(pieces), 'la pièce chiffrée est au dossier');
  await s.capturer(`${dossier}reel-piece-1440.jpg`, { qualite: 55 });
}
/* Me Referent (valideur) entre dans le dossier en intervenant : il pourra confirmer */
const dejaMembre = /referent/i.test(await s.evaluer(`document.querySelector('section[aria-label="Membres et murailles"]')?.innerText || ''`));
if (!dejaMembre) {
const ajoutMembre = await cliquer(s, 'section[aria-label="Membres et murailles"] .esp-carte-tete .r-btn', /Ajouter/);
ok(ajoutMembre === true, `ouverture « Ajouter une personne » (${ajoutMembre})`);
await s.dormir(400);
const choixReferent = await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select'); const o = [...sel.options].find(o => /referent/i.test(o.textContent)); if (!o) return [...sel.options].map(o => o.textContent); sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
ok(choixReferent === true, `referent choisi (${JSON.stringify(choixReferent)})`);
await s.dormir(200);
ok((await cliquer(s, '[role="dialog"] button', /Enregistrer/)) === true, 'clic « Enregistrer » le membre');
await finDialogue(s, 2000);
r = await releve(s, 'membre');
}
ok(/referent/i.test(await s.evaluer(`document.querySelector('section[aria-label="Membres et murailles"]')?.innerText || ''`)), 'Me Referent est intervenant du dossier');
await s.capturer(`${dossier}reel-membres-1440.jpg`, { qualite: 55 });

/* ——— la suite, avec TAMILA_SUITE=1 : audience, avis saisi, muraille et sa levée, export, clôture puis annulation ——— */
if (process.env.TAMILA_SUITE) {
  console.log('— suite réelle : audience, avis, muraille, export, clôture');
  ok((await cliquer(s, 'section[aria-label="Audiences"] .r-btn', /Ajouter/)) === true, 'ouverture « Ajouter une audience »');
  await s.dormir(400);
  await taper(s, '[role="dialog"] input[type="date"]', '2026-11-12');
  await taper(s, '[role="dialog"] input[placeholder="Pôle 4 – chambre 5"]', 'Pôle 4 – chambre 5');
  ok((await cliquer(s, '[role="dialog"] button', /Enregistrer/)) === true, 'clic « Enregistrer » l\'audience');
  await finDialogue(s, 1500);
  r = await releve(s, 'audience');
  ok(/12\/11\/2026/.test(await s.evaluer(`document.querySelector('section[aria-label="Audiences"]')?.innerText || ''`)), 'l\'audience du 12/11/2026 est posée pour de vrai');
  /* un avis d'audience saisi : le socle ajoute l'audience depuis l'avis */
  ok((await cliquer(s, 'section[aria-label="Avis RPVA"] .r-btn', /Saisir un avis/)) === true, 'ouverture « Saisir un avis »');
  await s.dormir(400);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const dates = [...d.querySelectorAll('input[type="date"]')]; const set = (e, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); }; set(dates[0], '2026-10-02'); set(dates[1], '2027-02-04'); })()`);
  ok((await cliquer(s, '[role="dialog"] button', /Enregistrer/)) === true, 'clic « Enregistrer » l\'avis');
  await finDialogue(s, 2000);
  r = await releve(s, 'avis');
  const avisTxt = await s.evaluer(`document.querySelector('section[aria-label="Avis RPVA"]')?.innerText || ''`);
  ok(/Avis d'audience/.test(avisTxt) && /Appliqué/.test(avisTxt), 'l\'avis d\'audience est appliqué par le socle');
  ok(/04\/02\/2027/.test(await s.evaluer(`document.querySelector('section[aria-label="Audiences"]')?.innerText || ''`)), 'l\'audience du 04/02/2027 vient de l\'avis');
  await s.capturer(`${dossier}reel-audiences-1440.jpg`, { qualite: 55 });
  /* la muraille sur Daf (valideur), puis sa levée par décision du gérant */
  ok((await cliquer(s, 'section[aria-label="Membres et murailles"] .esp-carte-tete .r-btn', /Muraille/)) === true, 'ouverture « Poser une muraille »');
  await s.dormir(400);
  const daf = await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select'); const o = [...sel.options].find(o => /^daf\b|daf@|daf ·/i.test(o.textContent) && !/daf2/i.test(o.textContent)) || [...sel.options].find(o => /daf/i.test(o.textContent)); if (!o) return null; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return o.textContent; })()`);
  ok(!!daf, `personne écartée : ${daf}`);
  await taper(s, '[role="dialog"] textarea', 'Conflit d\'intérêts (essai de recette, motif chiffré).');
  ok((await cliquer(s, '[role="dialog"] button', /Poser la muraille/)) === true, 'clic « Poser la muraille »');
  await finDialogue(s, 2000);
  r = await releve(s, 'muraille');
  ok(/En place/.test(await s.evaluer(`document.querySelector('section[aria-label="Membres et murailles"]')?.innerText || ''`)), 'la muraille est en place');
  await s.capturer(`${dossier}reel-muraille-1440.jpg`, { qualite: 55 });
  ok((await cliquer(s, 'section[aria-label="Membres et murailles"] .tam-ligne-actions .r-btn', /Demander la levée/)) === true, 'clic « Demander la levée »');
  await attendre(s, 2500);
  r = await releve(s, 'levée demandée');
  const decider = await cliquer(s, '.esp-avis .r-btn', /Approuver/);
  ok(decider === true, `la demande de levée est proposée à la décision du gérant (${decider})`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Approuver\\s*$/.test(b.textContent))?.click()`);
  await finDialogue(s, 2500);
  r = await releve(s, 'levée');
  ok(/Levée/.test(await s.evaluer(`document.querySelector('section[aria-label="Membres et murailles"]')?.innerText || ''`)), 'la muraille est levée par décision');
  /* l'export */
  ok((await cliquer(s, 'section[aria-label="Identité du dossier"] .r-btn', /Exporter le dossier/)) === true, 'ouverture « Exporter »');
  await s.dormir(400);
  ok((await cliquer(s, '[role="dialog"] button', /Demander l'export/)) === true, 'clic « Demander l\'export »');
  await finDialogue(s, 2000);
  r = await releve(s, 'export');
  ok(/En préparation/.test(await s.evaluer(`document.querySelector('section[aria-label="Exports"]')?.innerText || ''`)), 'l\'export est demandé : en préparation (le travail tamila.exporter attend son ouvrier)');
  /* la clôture : demande, décision, puis annulation (le dossier reste ouvert sur le banc) */
  ok((await cliquer(s, 'section[aria-label="Identité du dossier"] .r-btn', /Clôturer le dossier/)) === true, 'ouverture « Clôturer »');
  await s.dormir(400);
  ok((await cliquer(s, '[role="dialog"] button', /Demander la clôture/)) === true, 'clic « Demander la clôture »');
  await finDialogue(s, 2500);
  r = await releve(s, 'clôture demandée');
  const dec2 = await cliquer(s, '.esp-avis .r-btn', /Approuver/);
  ok(dec2 === true, `la clôture est proposée à la décision d\'un associé (${dec2})`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Approuver\\s*$/.test(b.textContent))?.click()`);
  await finDialogue(s, 2500);
  r = await releve(s, 'clos');
  const tete = await s.evaluer(`document.querySelector('section[aria-label="Identité du dossier"]')?.innerText || ''`);
  ok(/Clos/.test(tete) && /Effacement prévu/.test(tete), 'le dossier est clos, l\'effacement est daté');
  await s.capturer(`${dossier}reel-cloture-1440.jpg`, { qualite: 55 });
  ok((await cliquer(s, 'section[aria-label="Identité du dossier"] .r-btn', /Annuler la clôture/)) === true, 'clic « Annuler la clôture » (gérant)');
  await attendre(s, 2500);
  r = await releve(s, 'rouvert');
  ok(/Ouvert/.test(await s.evaluer(`document.querySelector('section[aria-label="Identité du dossier"] .esp-pastille')?.textContent || ''`)), 'le dossier est rouvert : rien ne sera effacé');
  const journal = await s.evaluer(`document.querySelector('section[aria-label="Journal des accès"]')?.innerText || ''`);
  ok(/a consulté le dossier/.test(journal), 'le journal des accès (b4_02) montre les consultations');
  await s.capturer(`${dossier}reel-journal-1440.jpg`, { qualite: 55 });
}
s.fermer();

/* ——— l'avocat (referent) confirme le délai ——— */
if (fichierReferent) {
  const sr = JSON.parse(readFileSync(fichierReferent, 'utf8'));
  console.log(`— avocat ${sr.user?.email}`);
  s = await ouvrir(sr, 'b4-reel-referent');
  r = await releve(s, 'ouverture referent');
  const visible = await s.evaluer(`[...document.querySelectorAll('.esp-item')].some(b => /Chiffré|BANC-/.test(b.textContent))`);
  ok(visible, 'Me Referent, membre, voit le dossier dans sa liste (chiffré : il n\'a pas la phrase)');
  /* la phrase du cabinet, puis la clé lui vient par tamila_cle_dossier (b4_03) */
  ok((await cliquer(s, '.esp-tete .r-btn', /Phrase/)) === true, 'ouverture du dialogue de la phrase');
  await s.dormir(300);
  await taper(s, '[role="dialog"] input[type="password"]', PHRASE);
  await s.dormir(200);
  ok((await cliquer(s, '[role="dialog"] button', /Mémoriser/)) === true, 'phrase mémorisée');
  await attendre(s, 1500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => new RegExp(${JSON.stringify(REF)}).test(b.textContent) || /Chiffré/.test(b.textContent))?.click()`);
  let refR = null;
  for (let i = 0; i < 50; i++) { refR = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`); if (refR && refR !== 'Référence chiffrée') break; await s.dormir(500); }
  r = await releve(s, 'dossier chez referent');
  console.log('    référence vue par referent :', refR, '(déchiffrée = la clé est venue par tamila_cle_dossier ; « Référence chiffrée » = porte b4_03 pas encore posée)');
  const conf = await cliquer(s, '.tam-ligne-actions .r-btn', /Confirmer/);
  ok(conf === true, `bouton « Confirmer » ouvert par l\'avocat (${conf})`);
  if (conf === true) {
    await s.dormir(400);
    await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Approuver\\s*$/.test(b.textContent))?.click()`);
    await finDialogue(s, 2500);
    r = await releve(s, 'confirmation');
    const confirme = await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-pastille')].some(p => /Confirmé/.test(p.textContent))`);
    ok(confirme, 'le délai est confirmé pour de vrai par Me Referent (tamila_decider → tamila_executer_confirmation)');
    await s.capturer(`${dossier}reel-confirmation-1440.jpg`, { qualite: 55 });
  }
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
