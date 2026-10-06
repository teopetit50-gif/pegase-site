/* courrier-reel.mjs — déposer un VRAI courrier de mairie par l'écran, en base réelle, et le voir lu
   (session B5, 06/10/2026). Suite de relecture-reelle.mjs : même cookie de session, même serveur.

   Parcours : ouvrir le permis « Pavillon Lemoine » du banc → « Déposer un courrier de la mairie » → fichier PDF
   posé dans le contrôle de fichier par CDP (DOM.setFileInputFiles) → nature « Récépissé de dépôt » → Déposer.
   L'écran met le fichier dans omega-clients/<client>/lorani_projet/<projet>/… puis appelle lorani_deposer_piece
   (b5_01) ; le socle dépose lecteur.lire ; le lecteur (A1, cron chaque minute) lit ; lorani_lectures_passage
   (cron toutes les cinq minutes) propose la date. Le script recharge l'écran toutes les 30 s, jusqu'à 9 minutes, jusqu'à voir la
   proposition « Date de dépôt » ; puis il la confirme et vérifie que le permis porte le numéro lu.

   Reprise (06/10, Opus 5.5) : le nom du fichier n'est plus figé et la nature se choisit (4e argument) ; les
   courriers d'essai se fabriquent avec fabriquer-courrier.mjs (un nouveau fichier par rejeu : même sha256 = refus).

   usage : node omega/recette-b5/courrier-reel.mjs <session.json> <courrier.pdf> [origine] [nature]
   nature : lorani_recepisse_depot (défaut) ou lorani_demande_pieces */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichier, pdf, base = 'http://localhost:3012', nature = 'lorani_recepisse_depot'] = process.argv.slice(2);
if (!fichier || !pdf) { console.error('usage : node courrier-reel.mjs <session.json> <courrier.pdf> [origine] [nature]'); process.exit(2); }
const nomPdf = basename(pdf);
/* ce que la proposition doit porter, selon la nature (les courriers de fabriquer-courrier.mjs) */
const ATTENDU = {
  lorani_recepisse_depot: { re: /Date de dépôt/, valeurs: /15\/09\/2026|PC04410926A0042/, dit: 'la date de dépôt du récépissé et le numéro de dossier' },
  /* la liste elle-même, pas la citation : le 06/10 la citation portait « PCMI 3 » et la liste était « aucune » ;
     PIECES_ATTENDUES (« PCMI2, PCMI8 ») pour une autre lettre que celle par défaut */
  lorani_demande_pieces: ((l) => ({ re: /Demande de pièces/, valeurs: new RegExp(`Pièces réclamées : ${l}`), dit: `la demande de pièces et la liste ${l}` }))(process.env.PIECES_ATTENDUES ?? 'PCMI3, PCMI6'),
}[nature];
if (!ATTENDU) { console.error(`nature inconnue : ${nature}`); process.exit(2); }
const session = JSON.parse(readFileSync(fichier, 'utf8'));
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

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b5-courrier', densite: 1, flags: ['--ignore-certificate-errors'] });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });

const ouvrirReel = async () => {
  await s.aller(base + '/espace/lorani', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` });
  await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (b && !b.disabled && b.getAttribute('aria-checked') !== 'true') b.click(); })()`);
  for (let i = 0; i < 40; i++) { await s.dormir(500); if (!(await s.evaluer(`!!document.querySelector('.esp-charge')`))) break; }
  await s.dormir(1200);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(e => e.textContent.includes('Pavillon Lemoine'))?.click()`);
  await s.dormir(800);
};

console.log('— déposer le récépissé par l\'écran');
await ouvrirReel();
ok(await s.evaluer(`(document.querySelector('#esp-detail h2')?.textContent || '').includes('Pavillon Lemoine')`), 'le permis du banc est ouvert en base réelle');
const dejaLu = await s.evaluer(`[...document.querySelectorAll('.lor-lecture')].length`);
if (dejaLu === 0 && !(await s.evaluer(`(document.querySelector('#esp-detail')?.innerText || '').includes(${JSON.stringify(nomPdf)})`))) {
  await s.evaluer(`[...document.querySelectorAll('#esp-detail .r-btn')].find(b => /Déposer un courrier de la mairie/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const { root } = await s.envoyer('DOM.getDocument', { depth: 1 }).then((r) => r.result);
  const { nodeId } = await s.envoyer('DOM.querySelector', { nodeId: root.nodeId, selector: '#lor-courrier-fichier' }).then((r) => r.result);
  ok(nodeId > 0, 'le contrôle de fichier du dialogue est trouvé');
  await s.envoyer('DOM.setFileInputFiles', { nodeId, files: [resolve(pdf)] });
  await s.dormir(400);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] select'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(i, ${JSON.stringify(nature)}); i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const pret = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { fichier: d.innerText.includes(${JSON.stringify(nomPdf)}), gris: [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Déposer')?.disabled }; })()`);
  ok(pret.fichier && pret.gris === false, 'le fichier est pris, « Déposer » s\'active');
  await s.capturer(`${dossier}reel-courrier-depot-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Déposer')?.click()`);
  let err = '';
  for (let i = 0; i < 40; i++) { await s.dormir(500); if (!(await s.evaluer(`!!document.querySelector('[role="dialog"]')`))) break; err = await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent || ''`); if (err) break; }
  ok(!err, err ? `la base a refusé le dépôt : ${err}` : 'déposé : fichier dans omega-clients, pièce créée par lorani_deposer_piece');
  await s.dormir(2000);
  const piece = await s.evaluer(`(() => { const t = document.querySelector('#esp-detail')?.innerText || ''; const i = t.indexOf(${JSON.stringify(nomPdf)}); return t.slice(Math.max(0, i - 40), i + 80); })()`);
  ok(piece.includes(nomPdf), `la pièce est dans « Courriers du dossier » : « ${piece.replace(/\s+/g, ' ').trim()} »`);
} else {
  console.log('  · le récépissé est déjà déposé (ou déjà lu), on attend la lecture');
}

console.log('— attendre le lecteur (cron chaque minute) puis lorani_lectures_passage (cron toutes les cinq minutes), 9 minutes au plus');
let lecture = null;
const debut = Date.now();
while (Date.now() - debut < 9 * 60 * 1000) {
  await s.dormir(30000);
  await ouvrirReel();
  const etat = await s.evaluer(`(() => { const t = document.querySelector('#esp-detail')?.innerText || ''; const i = t.indexOf(${JSON.stringify(nomPdf)}); const l = document.querySelector('.lor-lecture'); return { piece: t.slice(i, i + 60).replace(/\\s+/g, ' '), lecture: l ? l.innerText.replace(/\\s+/g, ' ').slice(0, 300) : null }; })()`);
  console.log(`  · ${Math.round((Date.now() - debut) / 1000)} s : ${etat.piece || 'pièce absente'}${etat.lecture ? ' | LU : ' + etat.lecture : ''}`);
  if (etat.lecture) { lecture = etat.lecture; break; }
}
ok(!!lecture, lecture ? `une date lue est proposée par le socle : « ${lecture} »` : 'aucune proposition de date lue après 9 minutes (lecteur ou passage en retard ?)');
if (lecture) {
  await s.capturer(`${dossier}reel-courrier-lu-1440.jpg`, { qualite: 55 });
  ok(ATTENDU.re.test(lecture) && ATTENDU.valeurs.test(lecture), `la proposition porte ${ATTENDU.dit}`);
  await s.evaluer(`[...document.querySelectorAll('.lor-lecture .r-btn')].find(b => /Confirmer/.test(b.textContent))?.click()`);
  await s.dormir(600);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Confirmer\\s*$/.test(b.textContent))?.click()`);
  let err = '';
  for (let i = 0; i < 40; i++) { await s.dormir(500); if (!(await s.evaluer(`!!document.querySelector('[role="dialog"]')`))) break; err = await s.evaluer(`document.querySelector('[role="dialog"] .esp-avis[data-teinte="rouge"]')?.textContent || ''`); if (err) break; }
  ok(!err, err ? `la base a refusé la confirmation : ${err}` : 'confirmée par lorani_confirmer_date_lue');
  await s.dormir(2500);
  const apres = await s.evaluer(`(() => { const t = document.querySelector('#esp-detail')?.innerText || ''; return { numero: t.includes('PC04410926A0042') || t.includes('PC 044109 26 A0042'), lectures: document.querySelectorAll('.lor-lecture').length, journal: t.includes('confirmée par') }; })()`);
  ok(apres.numero && apres.lectures === 0, `le permis porte le numéro lu (${apres.numero}), plus rien à confirmer (${apres.lectures}) ; la décision est dans le fil des courriers (${apres.journal})`);
  await s.capturer(`${dossier}reel-courrier-confirme-1440.jpg`, { qualite: 55 });
}
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
