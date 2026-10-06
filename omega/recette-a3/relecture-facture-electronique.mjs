/* relecture-facture-electronique.mjs — la facture électronique en BASE
   RÉELLE (session A3, 06/10/2026), sur le Factur-X déposé par l'écran
   (R2026-000005 du banc) : la pastille de provenance, « du fichier » sur les
   valeurs xml, « Corriger une valeur » grisé, la frise du cycle de vie
   (filed_cycle_vie_facture), l'onglet Écritures, le dialogue « Ouvrir un
   litige » et ses motifs lus en base (fermé sans écrire). Puis la page
   Comptabilité : les comptes de FILED, et l'export FEC (EXPORTER=1 seulement :
   l'export s'inscrit au journal de la recette).

   usage : node omega/recette-a3/relecture-facture-electronique.mjs <session.json> [référence]
   Origine : variable ORIGINE (défaut http://localhost:3010). Le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichierSession, reference = 'R2026-000005'] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichierSession) { console.error('usage : node relecture-facture-electronique.mjs <session.json> [référence]'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const valeur = 'base64-' + Buffer.from(JSON.stringify(JSON.parse(readFileSync(fichierSession, 'utf8'))), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-electronique', densite: 1 });
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  await s.envoyer('Network.setCookie', { name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete, url: base, path: '/' });
  reste = reste.slice(tete.length);
}
const reelle = async () => {
  await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (b && b.getAttribute('aria-checked') !== 'true') b.click(); })()`);
  for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('.esp-ruban')?.textContent === 'Base réelle' && !document.querySelector('.esp-charge')`)) break; }
};

console.log(`— /espace/filed?objet=facture:${reference} (base réelle)`);
ok(await s.aller(`${base}/espace/filed?objet=facture:${reference}`, { signe: `document.readyState === 'complete' && !!document.querySelector('.esp h1')` }), 'page chargée avec le cookie de session');
await reelle();
for (let i = 0; i < 30; i++) { await s.dormir(500); if (await s.evaluer(`!!document.querySelector('#esp-dossier [role="tab"]')`)) break; }
const r = await s.evaluer(`(() => { const d = document.querySelector('#esp-dossier'); if (!d) return null; const c = [...d.querySelectorAll('button')].find(b => /Corriger une valeur/.test(b.textContent));
  return { tete: d.querySelector('.esp-item-haut')?.innerText.replace(/\\s+/g, ' '), pastilles: [...d.querySelectorAll('.esp-pastille, [class*="pastille"]')].map(p => p.textContent.trim()).slice(0, 8), fichier: (d.innerText.match(/du fichier/g) ?? []).length, corriger: c?.disabled, onglets: [...d.querySelectorAll('[role="tab"]')].map(t => t.textContent) }; })()`);
ok(!!r, 'le dossier s\'ouvre');
console.log('    en-tête :', r?.tete);
ok(r?.pastilles.some(p => /Fichier structuré|Facture électronique/.test(p)), `pastille de provenance : ${r?.pastilles.find(p => /Fichier structuré|Facture électronique|Lue sur la pièce|Saisie/.test(p))}`);
ok((r?.fichier ?? 0) >= 2, `valeurs xml marquées « du fichier » (${r?.fichier})`);
console.log('    « Corriger une valeur » grisé :', r?.corriger, '· onglets :', r?.onglets.join(', '));
await s.capturer(`${dossier}reel-electronique-1440.jpg`, { qualite: 55 });
await s.evaluer(`[...document.querySelectorAll('#esp-dossier [role="tab"]')].find(t => /Cycle de vie/.test(t.textContent))?.click()`);
await s.dormir(400);
const frise = await s.evaluer(`(() => { const l = [...document.querySelectorAll('#esp-dossier .esp-frise li')].map(l => l.innerText.replace(/\\s+/g, ' ')); return l.length ? l : [document.querySelector('#esp-dossier [role="tabpanel"], #esp-dossier')?.innerText.slice(0, 160)]; })()`);
console.log('    frise :', frise.map(l => l?.slice(0, 110)).join('\n            '));
ok(frise.length >= 1, 'l\'onglet Cycle de vie se lit');
await s.capturer(`${dossier}reel-cycle-1440.jpg`, { qualite: 55 });
await s.evaluer(`[...document.querySelectorAll('#esp-dossier [role="tab"]')].find(t => /Écritures/.test(t.textContent))?.click()`);
await s.dormir(400);
const ecr = await s.evaluer(`(() => { const d = document.querySelector('#esp-dossier'); return { lignes: d.querySelectorAll('.esp-tableau tbody tr').length, texte: d.innerText.match(/Pas encore d.écriture[^\\n]*/)?.[0] ?? '' }; })()`);
ok(ecr.lignes > 0 || !!ecr.texte, `onglet Écritures : ${ecr.lignes} ligne(s) ${ecr.texte.slice(0, 60)}`);
await s.evaluer(`[...document.querySelectorAll('#esp-dossier [role="tab"]')].find(t => /^Dossier/.test(t.textContent))?.click()`);
await s.dormir(300);
const aLitige = await s.evaluer(`(() => { const b = [...document.querySelectorAll('#esp-dossier button')].find(b => /Ouvrir un litige/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`);
if (aLitige) {
  await s.dormir(1200);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, motifs: [...d.querySelectorAll('select option')].map(o => o.textContent) } : null; })()`);
  ok(dlg?.titre === 'Ouvrir un litige' && dlg.motifs.length >= 5, `dialogue « Ouvrir un litige » : ${dlg?.motifs.length} motifs lus (${dlg?.motifs.slice(0, 3).join(' · ')}…)`);
  await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await s.dormir(300);
} else console.log('    un litige est déjà ouvert sur ce dossier : pas de bouton « Ouvrir un litige »');

console.log('— /espace/filed/comptabilite (base réelle)');
ok(await s.aller(`${base}/espace/filed/comptabilite`, { signe: `document.readyState === 'complete' && !!document.querySelector('.esp h1')` }), 'page chargée');
await reelle();
await s.dormir(1500);
const c = await s.evaluer(`(() => ({ comptes: [...document.querySelectorAll('.esp-tableau tbody tr')].map(t => t.innerText.replace(/\\s+/g, ' ')), modifier: [...document.querySelectorAll('.esp button')].filter(b => /^Modifier le compte/.test(b.getAttribute('aria-label') ?? '')).length, exporter: [...document.querySelectorAll('.esp button')].find(b => /Exporter le FEC/.test(b.textContent))?.disabled, avis: [...document.querySelectorAll('.esp-avis')].map(a => a.textContent).join(' | ') }))()`);
ok(c.comptes.length === 5, `les cinq comptes de FILED : ${c.comptes.join(' / ')}`);
console.log('    « Modifier » :', c.modifier, '· « Exporter le FEC » gris :', c.exporter, c.avis ? `· avis : ${c.avis}` : '');
if (process.env.EXPORTER === '1' && c.exporter === false) {
  await s.evaluer(`[...document.querySelectorAll('.esp button')].find(b => /Exporter le FEC/.test(b.textContent)).click()`);
  let dit = '';
  for (let i = 0; i < 30; i++) { await s.dormir(500); dit = await s.evaluer(`[...document.querySelectorAll('.esp-avis')].map(a => a.textContent).filter(t => /téléchargé|SIREN|erreur|Refus|refus|exercice/i.test(t)).join(' | ')`); if (dit) break; }
  console.log('    export :', dit);
  ok(/téléchargé/.test(dit) || /SIREN/.test(dit), 'l\'export répond (fichier, ou le message SIREN de la base)');
}
await s.capturer(`${dossier}reel-comptabilite-1440.jpg`, { qualite: 55 });
s.soucis.filter((x) => !/CERT|insights|404|favicon|ERR_BLOCKED_BY_ORB|websocket|realtime/i.test(x)).forEach((x) => console.log('    souci :', x));
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
