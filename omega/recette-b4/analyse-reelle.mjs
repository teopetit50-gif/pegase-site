/* analyse-reelle.mjs — la première lecture longue Tamila en BASE RÉELLE (session B4, 06/10/2026).
   Avec la session du gérant du banc : (TAMILA_ACTIVER_COFFRE=1) passer le cabinet au coffre Scaleway s'il est local ;
   ouvrir un dossier neuf, dont la clé vient du coffre ; y déposer quatre pièces chiffrées (PDF texte fictifs, dates
   qui se contredisent exprès) ; attendre que le lecteur les lise ; demander la pré-lecture et la chronologie ; donner
   l'identifiant du dossier et des analyses (lus par l'API REST avec la même session, sous RLS).
   Avec TAMILA_REF=<référence> : reprendre un dossier existant (attendre les lectures, demander, relire un résultat).
   usage : RECETTE_MANDATAIRE=1 node omega/recette-b4/analyse-reelle.mjs <session-gerant.json> [origine]
   Le fichier de session ne se commite jamais. */
import { readFileSync, writeFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, base = 'http://localhost:3011'] = process.argv.slice(2);
if (!fichier) { console.error('usage : node analyse-reelle.mjs <session-gerant.json> [origine]'); process.exit(2); }
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co';
const CLE_PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const ref = new URL(URL_SB).hostname.split('.')[0];
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
const taper = (s, sel, v) => s.evaluer(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const p = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
const cliquer = (s, sel, re) => s.evaluer(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find(b => /${re.source}/.test(b.textContent)); if (!b) return null; if (b.disabled) return 'gris'; b.click(); return true; })()`);
async function attendre(s, ms = 1200) { for (let i = 0; i < 40; i++) { await s.dormir(400); if (!(await s.evaluer(`!!document.querySelector('.esp-charge')`))) break; } await s.dormir(ms); }
async function finDialogue(s, ms = 1500) {
  let ouvert = true;
  for (let i = 0; i < 60; i++) { ouvert = await s.evaluer(`!!document.querySelector('[role="dialog"]')`); if (!ouvert) break; await s.dormir(500); }
  if (ouvert) { console.log('    dialogue resté ouvert :', (await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent || ''`)).slice(0, 300)); await s.evaluer(`document.querySelector('[role="dialog"] .dlg-fermer')?.click()`); await s.dormir(500); }
  await attendre(s, ms);
}
const rouges = (s) => s.evaluer(`[...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 300))`);

/* un PDF d'une page, avec du vrai texte (Helvetica), que le lecteur sait extraire */
function pdf(lignes) {
  const esc = (t) => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const latin = (t) => Buffer.from(t, 'latin1').toString('latin1');
  const flux = `BT /F1 11 Tf 56 790 Td 14 TL ${lignes.map((l) => `(${esc(latin(l))}) Tj T*`).join(' ')} ET`;
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(flux, 'latin1')} >>\nstream\n${flux}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let corps = '%PDF-1.4\n';
  const offs = [];
  objets.forEach((o, i) => { offs.push(Buffer.byteLength(corps, 'latin1')); corps += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(corps, 'latin1');
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(corps, 'latin1');
}
const PIECES = [
  ['bail-commercial-2019.pdf', ['BAIL COMMERCIAL', '', 'Entre la SCI du Moulin, bailleur, et la societe Bati-Sud, preneur.', 'Le present bail commercial est signe le 14 juin 2019 pour neuf annees.', 'Loyer annuel : 36 000 euros hors taxes, payable par trimestre.', 'Article 8 : le bailleur garde a sa charge les grosses reparations (art. 606 C. civ.).']],
  ['constat-huissier-2023.pdf', ['PROCES-VERBAL DE CONSTAT', '', 'Le 15 mars 2023, a la requete de la societe Bati-Sud,', 'nous avons constate des infiltrations au plafond du local commercial.', 'Le gerant declare que les premieres infiltrations datent de mars 2023.', 'Trois seaux recueillent l eau en trois points de la reserve.']],
  ['conclusions-adverses.pdf', ['CONCLUSIONS D INTIME', '', 'La societe Bati-Sud expose que des infiltrations sont apparues des le mois de fevrier 2023.', 'Elle soutient que le bailleur, informe par courrier du 2 fevrier 2023, n a rien fait.', 'Elle demande 48 000 euros de dommages et interets pour perte d exploitation.', 'Fondement : articles 1719 et 1720 du code civil.']],
  ['jugement-2026.pdf', ['TRIBUNAL JUDICIAIRE DE PARIS', '', 'Jugement rendu le 3 mars 2026.', 'Le tribunal retient que le preneur n a averti le bailleur que le 20 avril 2023.', 'Il rejette la demande de dommages et interets de la societe Bati-Sud.', 'Il condamne la societe Bati-Sud aux depens.']],
];

const session = JSON.parse(readFileSync(fichier, 'utf8'));
console.log(`— gérant ${session.user?.email}`);
const s = await ouvrirSession({ largeur: 1440, hauteur: 1000, marque: 'b4-analyse-reelle', densite: 1, flags: process.env.RECETTE_MANDATAIRE ? ['--ignore-certificate-errors'] : [] });
for (const m of morceauxDe(session)) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/tamila', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec la session');
ok((await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b || b.disabled) return false; if (b.getAttribute('aria-checked') !== 'true') b.click(); return true; })()`)) === true, 'base réelle');
await attendre(s, 2000);
ok((await cliquer(s, '.esp-tete .r-btn', /Phrase/)) === true, 'dialogue de la phrase');
await s.dormir(300);
await taper(s, '[role="dialog"] input[type="password"]', PHRASE);
ok((await cliquer(s, '[role="dialog"] button', /Mémoriser/)) === true, 'phrase mémorisée');
await attendre(s);

/* le coffre */
ok((await cliquer(s, '.esp-tete .r-btn', /Coffre/)) === true, 'dialogue du coffre');
await s.dormir(600);
const etat = await s.evaluer(`document.querySelector('[role="dialog"] .tam-coffre-etat')?.innerText || ''`);
console.log('    coffre :', etat.replace(/\n/g, ' · '));
if (/Phrase du cabinet/.test(etat) && process.env.TAMILA_ACTIVER_COFFRE) {
  ok((await cliquer(s, '[role="dialog"] button', /Passer au coffre Scaleway/)) === true, 'clic « Passer au coffre Scaleway »');
  await finDialogue(s, 3000);
  console.log('    rouges :', (await rouges(s)).join(' / ') || '—');
} else {
  await s.evaluer(`document.querySelector('[role="dialog"] .dlg-fermer')?.click()`);
  await s.dormir(400);
}

/* le dossier */
const REF = process.env.TAMILA_REF ?? `BANC-ANALYSE-${new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '')}`;
let refAffichee = null;
if (!process.env.TAMILA_REF) {
  ok((await cliquer(s, '.esp-tete .r-btn', /Nouveau dossier/)) === true, 'Nouveau dossier');
  await s.dormir(400);
  await taper(s, '[role="dialog"] input[placeholder="2026-0431"]', REF);
  await taper(s, '[role="dialog"] input[placeholder="26/01234"]', '26/09876');
  await taper(s, '[role="dialog"] input[placeholder="Demandeur c/ Défendeur"]', 'SCI du Moulin c/ Bâti-Sud (lecture longue)');
  await taper(s, '[role="dialog"] input[placeholder="Cour d\'appel de Paris"]', 'Cour d\'appel de Paris');
  ok((await cliquer(s, '[role="dialog"] button', /Ouvrir le dossier/)) === true, 'Ouvrir le dossier');
  await finDialogue(s, 1500);
} else {
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(REF)}))?.click()`);
}
for (let i = 0; i < 60; i++) { refAffichee = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`); if (refAffichee === REF) break; await s.dormir(500); }
ok(refAffichee === REF, `dossier ${REF} ouvert et déchiffré (${refAffichee})`);

/* les pièces */
const deja = await s.evaluer(`document.querySelector('section[aria-label="Pièces"]')?.innerText || ''`);
for (const [nomFichier, lignes] of PIECES) {
  if (deja.includes(nomFichier)) continue;
  const chemin = `${process.env.ESSAI_DIR ?? "/tmp"}/${nomFichier}`;
  writeFileSync(chemin, pdf(lignes));
  ok((await cliquer(s, 'section[aria-label="Pièces"] .r-btn', /Déposer/)) === true, `Déposer ${nomFichier}`);
  await s.dormir(400);
  const root = (await s.envoyer('DOM.getDocument', { depth: 1 })).result.root;
  const nodeId = (await s.envoyer('DOM.querySelector', { nodeId: root.nodeId, selector: '[role="dialog"] input[type="file"]' })).result.nodeId;
  await s.envoyer('DOM.setFileInputFiles', { nodeId, files: [chemin] });
  await s.dormir(300);
  ok((await cliquer(s, '[role="dialog"] button', /Chiffrer et déposer/)) === true, 'Chiffrer et déposer');
  await finDialogue(s, 1500);
}

/* la lecture des pièces par le lecteur v28 : on relit l'écran toutes les 30 s, 12 minutes au plus */
let lues = 0;
for (let tour = 0; tour < 24; tour++) {
  const t = await s.evaluer(`document.querySelector('section[aria-label="Pièces"]')?.innerText || ''`);
  lues = (t.match(/\bLue\b/g) ?? []).length;
  console.log(`    pièces lues : ${lues}/${PIECES.length}`);
  if (lues >= PIECES.length) break;
  await s.dormir(30000);
  await s.aller(base + '/espace/tamila', { signe: `document.readyState === 'complete'` });
  await attendre(s, 1500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(REF)}))?.click()`);
  await attendre(s, 2500);
}
ok(lues >= PIECES.length, `les ${PIECES.length} pièces sont lues par le lecteur`);
await s.capturer(`${dossier}reel-analyse-pieces-1440.jpg`, { qualite: 55 });

/* les lectures longues */
for (const t of ['Pré-lecture', 'Chronologie']) {
  const c = await cliquer(s, 'section[aria-label="Lectures du dossier"] .r-btn', new RegExp(`^\\s*${t}`));
  ok(c === true, `demande « ${t} » (${c})`);
  await attendre(s, 1500);
}
console.log('    rouges :', (await rouges(s)).join(' / ') || '—');
const carte = await s.evaluer(`document.querySelector('section[aria-label="Lectures du dossier"]')?.innerText || ''`);
console.log('    carte :', carte.replace(/\n/g, ' · ').slice(0, 600));
await s.capturer(`${dossier}reel-analyse-demande-1440.jpg`, { qualite: 55 });

/* l'identifiant du dossier et des analyses, par l'API REST, avec la même session (RLS) */
if (CLE_PUB) {
  const r = await fetch(`${URL_SB}/rest/v1/analyses?select=id,objet_id,type,statut,demandee_le&module=eq.tamila&order=demandee_le.desc&limit=4`, { headers: { apikey: CLE_PUB, Authorization: `Bearer ${session.access_token}` } });
  console.log('    analyses :', r.status, (await r.text()).slice(0, 800));
}
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
