/* relecture-fournisseur.mjs — la fiche fournisseur de FILED en BASE RÉELLE
   (session A3, 06/10/2026) : ouvre un document par sa référence, relève le
   statut du fournisseur, la ligne « Identité », l'état du bouton
   « Confirmer ce fournisseur » (gris pour qui a déposé la pièce d'origine),
   et, avec --reverifier, clique « Revérifier » puis attend la réponse de
   l'ouvrier identite (jusqu'à trois minutes, l'écran se relit par Realtime
   ou à la main).

   usage : node omega/recette-a3/relecture-fournisseur.mjs <session.json> <référence> [origine] [--reverifier]
   Le cookie est posé comme dans relecture-reelle.mjs ; le fichier de
   session ne se commite jamais. */
import { readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const reverifier = process.argv.includes('--reverifier');
const [fichier, reference, base = 'http://localhost:3010'] = args;
if (!fichier || !reference) { console.error('usage : node relecture-fournisseur.mjs <session.json> <référence> [origine] [--reverifier]'); process.exit(2); }
const session = JSON.parse(readFileSync(fichier, 'utf8'));
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nom = `sb-${ref}-auth-token`;
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const valeur = 'base64-' + b64url(JSON.stringify(session));
const morceaux = [];
for (let reste = valeur, i = 0; reste.length; i++) {
  let tete = reste.slice(0, 3180);
  while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
  morceaux.push({ name: encodeURIComponent(valeur).length <= 3180 ? nom : `${nom}.${i}`, value: tete });
  reste = reste.slice(tete.length);
}

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'a3-reel-fournisseur', densite: 1 });
await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
ok(await s.aller(base + '/espace/filed', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` }), 'page chargée avec le cookie de session');
const bascule = await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (!b) return null; if (b.disabled) return 'grise'; if (b.getAttribute('aria-checked') !== 'true') b.click(); return 'reelle'; })()`);
ok(bascule === 'reelle', `interrupteur de source : ${bascule}`);

const attendreListe = async () => { for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`!document.querySelector('.esp-charge') && document.querySelectorAll('.esp-item').length > 0`)) break; } };
const ouvrirDossier = async () => {
  await attendreListe();
  const clic = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => b.textContent.includes(${JSON.stringify(reference)})); if (!b) return false; b.click(); return true; })()`);
  for (let i = 0; i < 40; i++) { await s.dormir(500); if (await s.evaluer(`document.querySelector('#esp-dossier .esp-mono')?.textContent === ${JSON.stringify(reference)} && !!document.querySelector('#esp-dossier .esp-section-titre')`)) break; }
  return clic;
};
const relever = () => s.evaluer(`(() => {
  const titre = [...document.querySelectorAll('#esp-dossier .esp-section-titre')].find(e => /^Fournisseur/.test(e.textContent));
  const bloc = titre?.parentElement;
  const bouton = (re) => [...(bloc?.querySelectorAll('.r-btn') ?? [])].find(b => re.test(b.textContent));
  const c = bouton(/Confirmer ce fournisseur/);
  return {
    fiche: !!bloc,
    texte: bloc ? bloc.innerText.replace(/\\s+/g, ' ').trim().slice(0, 400) : null,
    confirmer: c ? (c.disabled ? 'gris' : 'actif') : 'absent',
    reverifier: bouton(/Revérifier/)?.textContent.trim() ?? null,
    registre: [...document.querySelectorAll('#esp-dossier .esp-controle')].map(e => e.innerText.replace(/\\s+/g, ' ')).find(t => /identite\\.registre/.test(t)) ?? null,
    avis: [...document.querySelectorAll('#esp-dossier .esp-avis')].map(a => a.textContent.trim().slice(0, 240)),
    erreurs: (window.__erreurs || []).filter(e => /permission denied|does not exist|42501|42883|PGRST/.test(e)),
  };
})()`);

ok(await ouvrirDossier(), `dossier ${reference} ouvert`);
const avant = await relever();
console.log('    fiche :', avant.texte);
console.log('    « Confirmer ce fournisseur » :', avant.confirmer, '| revérifier :', avant.reverifier);
console.log('    contrôle :', avant.registre);
ok(avant.fiche, 'la fiche fournisseur est affichée');
ok(avant.erreurs.length === 0, avant.erreurs.length ? `refus de la base : ${avant.erreurs.join(' / ')}` : 'aucun refus de la base en console');
await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-section-titre')].find(e => /^Fournisseur/.test(e.textContent))?.scrollIntoView({ block: 'start' })`);
await s.dormir(300);
await s.capturer(`${dossier}reel-fournisseur-1440.jpg`, { qualite: 55 });

if (reverifier && avant.reverifier) {
  const date = (t) => (t?.match(/le (\d{2}\/\d{2}\/\d{4})/) ?? [])[1] ?? null;
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .r-btn')].find(b => /Revérifier auprès/.test(b.textContent))?.click()`);
  await s.dormir(2500);
  const dit = await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-avis')].map(a => a.textContent.trim()).join(' / ')`);
  console.log('    après le clic :', dit);
  ok(/demandée/.test(dit) && !/Refusé/.test(dit), 'la demande de vérification est acceptée par la base');
  let apres = null;
  for (let i = 0; i < 18; i++) {
    await s.dormir(10000);
    await s.aller(base + '/espace/filed', { signe: `document.readyState === 'complete' && !!document.querySelector('.esp-kpi-valeur')` });
    await s.evaluer(`(() => { const b = document.querySelector('.esp-bascule [role="switch"]'); if (b && b.getAttribute('aria-checked') !== 'true') b.click(); })()`);
    await ouvrirDossier();
    apres = await relever();
    if (apres.texte !== avant.texte) break;
  }
  console.log('    fiche après :', apres?.texte);
  ok(apres && apres.texte !== avant.texte, `la fiche a changé après la réponse du registre (date ${date(avant.texte)} → ${date(apres?.texte)})`);
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-section-titre')].find(e => /^Fournisseur/.test(e.textContent))?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}reel-fournisseur-reverifie-1440.jpg`, { qualite: 55 });
}
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
