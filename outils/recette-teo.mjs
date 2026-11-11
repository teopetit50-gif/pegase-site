/** Recette des cinq pages de Mon espace (/espace2/teo), 11/11/2026.
 *
 *    node outils/recette-teo.mjs [base] [dossier-captures]
 *
 *  base     : http://localhost:3000 par défaut — un `next dev` : sans session,
 *             c'est en développement seulement que l'espace montre l'exemple
 *             (app/espace2/teo/layout.tsx) ; en production il renvoie vers le
 *             pilotage pour se connecter.
 *  dossier  : où poser les captures (aucune si absent)
 *
 *  Pour chaque page, à 390 / 768 / 1024 / 1440 / 1700 px, en sombre puis en
 *  clair : erreurs de console et exceptions ; débordement horizontal ;
 *  l'entrée « Mon espace » allumée dans le rail (ou le tiroir) ; un h1 ;
 *  une phrase attendue de la page.
 */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const BASE = process.argv[2] || 'http://localhost:3000';
const DOSSIER = process.argv[3] || null;
const LARGEURS = (process.env.LARGEURS || '390,768,1024,1440,1700').split(',').map(Number);
const THEMES = (process.env.THEMES || 'sombre,clair').split(',');
if (DOSSIER) mkdirSync(DOSSIER, { recursive: true });

const PAGES = [
  ['ensemble', '/espace2/teo', 'Vos clients et prospects, votre agenda'],
  ['clients', '/espace2/teo/clients', 'Rolland'],
  ['client-fiche', '/espace2/teo/clients?client=1', 'Détails de la fiche'],
  ['agenda', '/espace2/teo/agenda', 'À venir'],
  ['agenda-cal', '/espace2/teo/agenda?vue=calendrier', 'Semaine'],
  ['whatsapp', '/espace2/teo/whatsapp', 'conversation'],
  ['whatsapp-fil', '/espace2/teo/whatsapp?numero=590690110201', 'Répondre à'],
  ['mails', '/espace2/teo/mails', 'Boîte de réception'],
  ['mail-fil', '/espace2/teo/mails?id=fil-1&onglet=tous', 'Répondre à'],
];

const SONDE = `(() => {
  const vu = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const rail = [...document.querySelectorAll('.v2-rail-item[aria-current="true"]')].filter(vu).map((a) => a.getAttribute('href'));
  const volet = [...document.querySelectorAll('.v2-lien[aria-current="page"]')].filter(vu).map((a) => a.getAttribute('href'));
  const main = document.querySelector('main#contenu');
  /* la carte d'un mail (CarteCentrale) se dessine hors de main : la phrase se cherche dans toute la page */
  const texte = document.body.innerText;
  const h1 = document.querySelector('main h1');
  return {
    theme: document.documentElement.dataset.v2Theme,
    debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rail, volet, texte: texte.slice(0, 20000),
    h1: h1 ? h1.textContent.trim() : null,
  };
})()`;

let defauts = 0;
const lignes = [];
const dire = (ok, texte) => { if (!ok) defauts++; if (!ok) console.log('  ✗   ' + texte); };

for (const theme of THEMES) {
  for (const largeur of LARGEURS) {
    const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'teo', densite: 1 });
    try {
      await s.aller(BASE + '/espace2/teo');
      await s.evaluer(`(() => {
        ${theme === 'clair' ? `localStorage.setItem('espace2.theme', 'clair')` : `localStorage.removeItem('espace2.theme')`};
        localStorage.setItem('espace.source', 'exemple');
      })()`);
      for (const [cle, chemin, phrase] of PAGES) {
        s.soucis.length = 0;
        const pret = await s.aller(BASE + chemin, { signe: `document.readyState === 'complete' && !!document.querySelector('main#contenu') && document.querySelector('main#contenu').innerText.length > 40` });
        await s.dormir(900);
        if (!pret) { dire(false, `${cle} ${largeur} ${theme} : page jamais prête`); lignes.push({ cle, largeur, theme, ok: false }); continue; }
        const d = await s.evaluer(SONDE);
        if (DOSSIER) await s.capturer(`${DOSSIER}/${cle}-${largeur}-${theme}.jpg`, { qualite: 55 });
        const insights = s.soucis.some((x) => /_vercel\/insights/.test(x));
        let pardon404 = insights ? 1 : 0;
        const erreurs = s.soucis.filter((x) => {
          if (/_vercel\/insights|NET net::ERR_(INTERNET|NAME|PROXY|TUNNEL|CONNECTION)/.test(x)) return false;
          if (/status of 404 \(Not Found\)/.test(x) && pardon404 > 0) { pardon404--; return false; }
          return true;
        });
        const allumeDans = (r) => r.rail.some((h) => h?.endsWith('/espace2/teo')) || r.volet.some((h) => h?.startsWith('/espace2/teo'));
        let allume = allumeDans(d);
        if (!allume && await s.evaluer(`!!document.querySelector('button[aria-label="Ouvrir la navigation"]')?.offsetParent`)) {
          await s.evaluer(`document.querySelector('button[aria-label="Ouvrir la navigation"]').click()`);
          await s.dormir(500);
          allume = allumeDans(await s.evaluer(SONDE));
          await s.evaluer(`document.querySelector('button[aria-label="Fermer la navigation"]')?.click()`);
          await s.dormir(400);
        }
        const attendu = theme === 'clair' ? 'light' : 'dark';
        const t = `${cle} ${largeur} ${theme}`;
        const phraseLa = d.texte.includes(phrase);
        dire(d.theme === attendu, `${t} : thème ${d.theme}`);
        dire(erreurs.length === 0, `${t} : console ${JSON.stringify(erreurs)}`);
        dire(d.debordement <= 0, `${t} : débordement ${d.debordement} px`);
        dire(allume, `${t} : Mon espace éteint (rail ${JSON.stringify(d.rail)}, volet ${JSON.stringify(d.volet)})`);
        dire(!!d.h1, `${t} : pas de h1`);
        dire(phraseLa, `${t} : « ${phrase} » absent`);
        const ok = d.theme === attendu && erreurs.length === 0 && d.debordement <= 0 && allume && !!d.h1 && phraseLa;
        lignes.push({ cle, largeur, theme, ok });
      }
    } finally {
      s.fermer();
    }
  }
}

for (const theme of THEMES) {
  console.log(`\n${theme.padEnd(14)}${LARGEURS.map((l) => String(l).padStart(6)).join('')}`);
  for (const [cle] of PAGES)
    console.log(cle.padEnd(14) + LARGEURS.map((l) => (lignes.find((x) => x.cle === cle && x.largeur === l && x.theme === theme)?.ok ? 'ok' : '✗').padStart(6)).join(''));
}
console.log(`\n${defauts ? `${defauts} défaut(s)` : 'Aucun défaut.'}`);
process.exit(defauts ? 1 : 0);
