/** Recette des quatre pages du Réseau Omega dans Espace 2 (02/11/2026,
 *  intégration des branches Fil, Membres, Messages et Opportunités).
 *
 *    node outils/recette-reseau.mjs [base] [dossier-captures] [source]
 *
 *  base     : http://localhost:3000 par défaut (un `next start` ou un
 *             `next dev` ; sans session, Espace 2 montre l'exemple)
 *  dossier  : où poser les captures (aucune si absent)
 *  source   : « exemple » (défaut) ou « reelle ». La base réelle n'existe
 *             que pour un compte connecté (components/espace/source.tsx) :
 *             pour la recetter sans compte, il faut un serveur où
 *             SourceFournisseur reçoit connecte={true} — voir le rapport
 *             d'intégration dans docs/reseau-espace2/BRIEF.md.
 *
 *  Pour chaque page, à 390 / 768 / 1024 / 1440 / 1700 px, en sombre puis
 *  en clair (session neuve à chaque largeur, donc page rechargée) :
 *   · erreurs de console et exceptions ;
 *   · débordement horizontal (scrollWidth > clientWidth) ;
 *   · l'entrée Réseau allumée dans le rail (ou, sans rail, dans le volet) ;
 *   · aucune mention « exemple / démonstration / fictif » dans la page, ni
 *     ruban dans la barre du haut (retiré le 04/11) ;
 *   · en base réelle, l'état vide commun (« Le réseau ouvre bientôt »)
 *     et aucun des 12 membres d'exemple à l'écran.
 */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from './chrome.mjs';

const BASE = process.argv[2] || 'http://localhost:3000';
const DOSSIER = process.argv[3] || null;
const SOURCE = process.argv[4] === 'reelle' ? 'reelle' : 'exemple';
const LARGEURS = (process.env.LARGEURS || '390,768,1024,1440,1700').split(',').map(Number);
const THEMES = (process.env.THEMES || 'sombre,clair').split(',');
if (DOSSIER) mkdirSync(DOSSIER, { recursive: true });

const PAGES = [
  ['fil', '/espace2/reseau'],
  ['membres', '/espace2/reseau/membres'],
  ['fiche', '/espace2/reseau/membres/atelier-moko'],
  ['messages', '/espace2/reseau/messages'],
  ['messages-a', '/espace2/reseau/messages?a=atelier-moko'],
  ['opportunites', '/espace2/reseau/opportunites'],
];

/* les 12 membres d'exemple (membres.ts) : aucun ne doit paraître en base réelle */
const NOMS_EXEMPLE = ['Atelier Moko', 'Karuko Fret', 'Solelek Antilles', 'Kaz Zépis', 'Bwa Vert BTP', 'Emballa Kréyol', 'Lanmou Traiteur', 'Garage Kalbas', 'Nauti Sable', 'Kontab Île', 'Frigo Tropik', 'Imprim Alizé'];

const SONDE = `(() => {
  const vu = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const rail = [...document.querySelectorAll('.v2-rail-item[aria-current="true"]')].filter(vu).map((a) => a.getAttribute('href'));
  const volet = [...document.querySelectorAll('.v2-lien[aria-current="page"]')].filter(vu).map((a) => a.getAttribute('href'));
  const main = document.querySelector('main#contenu');
  const marques = [];
  if (main) {
    const it = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let n; (n = it.nextNode());) {
      const t = n.textContent.trim();
      if (/exemple|démonstration|fictif/i.test(t) && n.parentElement && vu(n.parentElement)) marques.push(t.slice(0, 80));
    }
  }
  const ruban = [...document.querySelectorAll('.v2-ruban-source')].filter(vu).length;
  const texte = main ? main.innerText : '';
  const h1 = document.querySelector('main h1');
  return {
    theme: document.documentElement.dataset.v2Theme,
    debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rail, volet, ruban, marques,
    vide: /Le réseau ouvre bientôt/.test(texte),
    noms: ${JSON.stringify(NOMS_EXEMPLE)}.filter((n) => texte.includes(n)),
    h1: h1 ? { texte: h1.textContent.trim(), visible: vu(h1) && h1.getBoundingClientRect().width > 2 } : null,
  };
})()`;

let defauts = 0;
const lignes = [];
const dire = (ok, texte) => { if (!ok) defauts++; if (!ok) console.log('  ✗   ' + texte); };

for (const theme of THEMES) {
  for (const largeur of LARGEURS) {
    const s = await ouvrirSession({ largeur, hauteur: 900, marque: 'reseau', densite: 1 });
    try {
      /* le thème et la source vivent dans localStorage : les poser, puis recharger */
      await s.aller(BASE + '/espace2/reseau');
      await s.evaluer(`(() => {
        ${theme === 'clair' ? `localStorage.setItem('espace2.theme', 'clair')` : `localStorage.removeItem('espace2.theme')`};
        localStorage.setItem('espace.source', '${SOURCE}');
      })()`);
      for (const [cle, chemin] of PAGES) {
        s.soucis.length = 0;
        const pret = await s.aller(BASE + chemin, { signe: `document.readyState === 'complete' && !!document.querySelector('main#contenu') && document.querySelector('main#contenu').innerText.length > 40` });
        await s.dormir(900);
        if (!pret) { dire(false, `${cle} ${largeur} ${theme} : page jamais prête`); lignes.push({ cle, largeur, theme, ok: false }); continue; }
        const d = await s.evaluer(SONDE);
        /* la capture AVANT d'ouvrir le tiroir : le refermer efface data-v2-theme de <html> (défaut de la
           coquille, présent sur main : la copie de BarreLaterale du tiroir appelle useTheme(), dont le
           nettoyage retire le thème au démontage) — la page passerait en clair sur la photo */
        if (DOSSIER) await s.capturer(`${DOSSIER}/${cle}-${largeur}-${theme}${SOURCE === 'reelle' ? '-reelle' : ''}.jpg`, { qualite: 55 });
        /* le script de Vercel Analytics n'existe qu'une fois servi par Vercel : en local il répond 404, sans rapport avec la page */
        const insights = s.soucis.some((x) => /_vercel\/insights/.test(x));
        let pardon404 = insights ? 1 : 0;   // le 404 du script lui-même, et lui seul
        const erreurs = s.soucis.filter((x) => {
          if (/_vercel\/insights|NET net::ERR_(INTERNET|NAME|PROXY|TUNNEL|CONNECTION)/.test(x)) return false;
          if (/status of 404 \(Not Found\)/.test(x) && pardon404 > 0) { pardon404--; return false; }
          /* en base réelle, la recette tourne sans compte, avec connecte forcé : la coquille interroge alors
             Supabase (validations, FILED) sans jeton et reçoit des 401. Ces lectures ne sont pas celles du réseau. */
          if (SOURCE === 'reelle' && /status of 401/.test(x)) return false;
          return true;
        });
        const reseauAllume = (r) => r.rail.some((h) => h?.endsWith('/espace2/reseau')) || r.volet.some((h) => h?.startsWith('/espace2/reseau'));
        let allume = reseauAllume(d);
        /* sous 768 px, le rail et le volet vivent dans un tiroir : l'ouvrir, regarder, le refermer */
        if (!allume && await s.evaluer(`!!document.querySelector('button[aria-label="Ouvrir la navigation"]')?.offsetParent`)) {
          await s.evaluer(`document.querySelector('button[aria-label="Ouvrir la navigation"]').click()`);
          await s.dormir(500);
          allume = reseauAllume(await s.evaluer(SONDE));
          await s.evaluer(`document.querySelector('button[aria-label="Fermer la navigation"]')?.click()`);
          await s.dormir(400);
        }
        const attendu = theme === 'clair' ? 'light' : 'dark';
        const t = `${cle} ${largeur} ${theme}`;
        dire(d.theme === attendu, `${t} : thème ${d.theme}`);
        dire(erreurs.length === 0, `${t} : console ${JSON.stringify(erreurs)}`);
        dire(d.debordement <= 0, `${t} : débordement ${d.debordement} px`);
        dire(allume, `${t} : Réseau éteint (rail ${JSON.stringify(d.rail)}, volet ${JSON.stringify(d.volet)})`);
        if (SOURCE === 'exemple') {
          dire(d.ruban === 0 && d.marques.length === 0, `${t} : exemple signalé ${d.ruban} fois par le ruban, + ${JSON.stringify(d.marques)}`);
        } else {
          dire(d.ruban === 0, `${t} : ruban d'exemple en base réelle`);
          dire(d.vide, `${t} : pas d'état vide en base réelle`);
          dire(d.noms.length === 0, `${t} : membres d'exemple en base réelle ${JSON.stringify(d.noms)}`);
        }
        const ok = d.theme === attendu && erreurs.length === 0 && d.debordement <= 0 && allume
          && (SOURCE === 'exemple' ? d.ruban === 0 && d.marques.length === 0 : d.ruban === 0 && d.vide && d.noms.length === 0);
        lignes.push({ cle, largeur, theme, ok, debordement: d.debordement, erreurs: erreurs.length, h1: d.h1 });
      }
    } finally {
      s.fermer();
    }
  }
}

/* le tableau pages × largeurs */
console.log(`\nSource : ${SOURCE}`);
for (const theme of THEMES) {
  console.log(`\n${theme.padEnd(14)}${LARGEURS.map((l) => String(l).padStart(6)).join('')}`);
  for (const [cle] of PAGES)
    console.log(cle.padEnd(14) + LARGEURS.map((l) => (lignes.find((x) => x.cle === cle && x.largeur === l && x.theme === theme)?.ok ? 'ok' : '✗').padStart(6)).join(''));
}
console.log(`\n${defauts ? `${defauts} défaut(s)` : 'Aucun défaut.'}`);
process.exit(defauts ? 1 : 0);
