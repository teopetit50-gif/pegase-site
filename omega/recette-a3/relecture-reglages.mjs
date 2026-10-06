/* relecture-reglages.mjs — « Demandes reçues » et « Réglages » en BASE
   RÉELLE (session A3, 06/10/2026) : /espace/demandes lit public.receptions
   (tous canaux, sans tiroma) ; /espace/reglages exporte le journal opposable
   en CSV (lecture seule) et dit ce que répondent l'export complet et la
   préparation de l'effacement (ESSAYER_EXPORT=1 seulement : l'export complet,
   s'il est branché, s'inscrit au journal ; la préparation écrit un manifeste).

   usage : node omega/recette-a3/relecture-reglages.mjs <session.json>
   Origine : variable ORIGINE (défaut http://localhost:3010). Le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const [fichierSession] = process.argv.slice(2);
const base = process.env.ORIGINE ?? 'http://localhost:3010';
if (!fichierSession) { console.error('usage : node relecture-reglages.mjs <session.json>'); process.exit(2); }
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const session = JSON.parse(readFileSync(fichierSession, 'utf8'));
const valeur = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-reglages', densite: 1 });
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

console.log(`— /espace/demandes (base réelle, ${session.user?.email})`);
ok(await s.aller(`${base}/espace/demandes`, { signe: `document.readyState === 'complete' && !!document.querySelector('.esp h1')` }), 'page chargée');
await reelle();
const d = await s.evaluer(`(() => ({ avis: [...document.querySelectorAll('.esp-avis')].map(a => a.innerText.replace(/\\s+/g, ' ')), lignes: [...document.querySelectorAll('.esp-liste .esp-item')].map(t => t.innerText.replace(/\\s+/g, ' ')), boites: [...document.querySelectorAll('.esp select option')].map(o => o.textContent) }))()`);
d.lignes.slice(0, 6).forEach((l) => console.log('    ·', l));
console.log('    boîtes :', d.boites.join(' / ') || '(une seule)');
ok(!d.avis.some((a) => /n'a pas répondu/.test(a)), `la base répond ${d.avis.join(' | ')}`);
ok(d.lignes.length >= 1 && !d.lignes.some((l) => /TIROMA/i.test(l)), `${d.lignes.length} demande(s), aucune du module tiroma`);
await s.capturer(`${dossier}reel-demandes-1440.jpg`, { qualite: 55 });

console.log('— /espace/reglages (base réelle)');
ok(await s.aller(`${base}/espace/reglages`, { signe: `document.readyState === 'complete' && !!document.querySelector('.esp h1')` }), 'page chargée');
await reelle();
for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`!document.querySelector('.esp [role="status"]')?.textContent?.includes('Lecture de votre rôle')`)) break; }
await s.evaluer(`(() => { window.__blobs = []; const o = URL.createObjectURL; URL.createObjectURL = (b) => { b.arrayBuffer().then(a => window.__blobs.push(new TextDecoder('utf-8', { ignoreBOM: true }).decode(a))); return o(b); }; })()`);
const boutons = await s.evaluer(`[...document.querySelectorAll('.esp button')].map(b => b.textContent.trim())`);
console.log('    commandes :', boutons.join(' · '));
if (!boutons.some((b) => /Exporter mon journal/.test(b))) {
  const dit = await s.evaluer(`[...document.querySelectorAll('.esp p')].map(p => p.textContent).filter(t => /Réservé/.test(t)).join(' | ')`);
  console.log('    sans le droit :', dit);
  ok(/Réservé aux gérants et administrateurs/.test(dit), 'sans rôle gérant ou admin, le journal ne s\'exporte pas et l\'écran dit pourquoi');
  await s.capturer(`${dossier}reel-reglages-sans-droit-1440.jpg`, { qualite: 55 });
  s.fermer();
  console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
  process.exit(echecs ? 1 : 0);
}
await s.evaluer(`[...document.querySelectorAll('.esp button')].find(b => /Exporter mon journal/.test(b.textContent))?.click()`);
let av = '';
for (let i = 0; i < 40; i++) { await s.dormir(500); av = await s.evaluer(`[...document.querySelectorAll('.esp-avis')].map(a => a.textContent).join(' | ')`); if (/téléchargé|Refusé/.test(av)) break; }
const csv = await s.evaluer(`window.__blobs[0] ?? ''`);
const lignes = csv.split('\r\n').filter(Boolean);
console.log('    journal :', av.slice(0, 160));
console.log('    CSV :', lignes.length - 1, 'lignes ; première :', (lignes[1] ?? '').slice(0, 140));
ok(/téléchargé/.test(av) && csv.startsWith('\uFEFFn°;survenu_le') && /;[0-9a-f]{64}$/.test(lignes[1] ?? ''), 'le journal réel sort en CSV, empreintes comprises');
if (process.env.ESSAYER_EXPORT === '1') {
  for (const [bouton, attente] of [['Exporter toutes mes données', /archive est prête|Pas encore branché|Refusé|pas abouti/], ["Préparer l.effacement", /Liste prête|Pas encore branché|Refusé/]]) {
    await s.evaluer(`[...document.querySelectorAll('.esp button')].find(b => new RegExp(${JSON.stringify(bouton)}).test(b.textContent))?.click()`);
    let r = '';
    for (let i = 0; i < 40; i++) { await s.dormir(500); r = await s.evaluer(`[...document.querySelectorAll('.esp-avis')].map(a => a.textContent).filter(t => !/journal-omega/.test(t)).join(' | ')`); if (attente.test(r)) break; }
    console.log(`    ${bouton} :`, r.slice(0, 200));
    ok(attente.test(r), `« ${bouton} » répond en clair`);
  }
}
await s.capturer(`${dossier}reel-reglages-1440.jpg`, { qualite: 55 });
s.soucis.filter((x) => !/CERT|insights|404|favicon|ERR_BLOCKED_BY_ORB|websocket|realtime/i.test(x)).forEach((x) => console.log('    souci :', x));
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
