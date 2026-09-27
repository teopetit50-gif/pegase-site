/** Recette des interactions de /reserver-un-audit (27/09/2026) — ce qu'une
 *  capture ne montre pas : colonnes du tableau, sélecteur mobile, bulles
 *  d'aide, bento des garanties, section « Tout se combine », accordéon
 *  de la FAQ, débordement.
 *
 *    node outils/recette-audit.mjs <url de la page> [largeur]
 *
 *  Remplace recette-comparer.mjs, qui éprouvait le bento à sélecteur
 *  (<ComparerFormats>) retiré le même jour.
 */
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
if (!url) { console.error('usage: node recette-audit.mjs <url> [largeur]'); process.exit(1); }

const s = await ouvrirSession({ largeur, hauteur: largeur < 600 ? 844 : 900, marque: 'recette-audit' });
let echecs = 0;
const verifier = (nom, ok, detail = '') => {
  if (!ok) echecs++;
  console.log(`${ok ? '✓' : '✗'} ${nom}${detail ? ' — ' + detail : ''}`);
};

try {
  if (!await s.aller(url)) throw new Error('page jamais prête');
  await s.dormir(1200);

  /* ——— tableau : colonnes visibles et teinte ——— */
  const t = await s.evaluer(`(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const tetes = [...document.querySelectorAll('.tb-table thead th[data-col]')].filter(vis);
    const lignes = document.querySelectorAll('.tb-table .tb-ligne').length;
    const familles = document.querySelectorAll('.tb-table .tb-famille').length;
    const phare = document.querySelector('.tb-table td[data-phare]');
    const choix = document.querySelector('.tb-choix');
    return { tetes: tetes.map(e => e.querySelector('.tb-nom').textContent), lignes, familles,
             teinte: phare ? getComputedStyle(phare).backgroundColor : null,
             selecteur: choix ? getComputedStyle(choix).display : null };
  })()`);
  const attendues = largeur < 768 ? 1 : 3;
  verifier('colonnes de formats visibles', t.tetes.length === attendues, `${t.tetes.length} (${t.tetes.join(', ')})`);
  verifier('8 lignes en 2 familles', t.lignes === 8 && t.familles === 2, `${t.lignes} lignes, ${t.familles} familles`);
  verifier('colonne recommandée teintée', t.teinte && t.teinte !== 'rgba(0, 0, 0, 0)' && t.teinte !== 'rgb(255, 255, 255)', t.teinte);
  verifier('sélecteur mobile', largeur < 768 ? t.selecteur !== 'none' : t.selecteur === 'none', t.selecteur);

  /* ——— sélecteur mobile : Cadrage → la colonne 0 s'affiche ——— */
  if (largeur < 768) {
    const m = await s.evaluer(`(() => {
      document.querySelectorAll('.tb-choix-seg')[0].click();
      const vis = [...document.querySelectorAll('.tb-table tbody td[data-col]')].filter(e => e.getClientRects().length);
      return { cols: [...new Set(vis.map(e => e.dataset.col))], premiere: vis[0]?.textContent };
    })()`);
    verifier('le sélecteur bascule la colonne', m.cols.length === 1 && m.cols[0] === '0', `colonnes ${m.cols.join(',')}, « ${m.premiere} »`);
  }

  /* ——— tête collante (à partir de 768 px) : on descend au milieu du
     tableau ——— */
  if (largeur >= 768) {
  const c = await s.evaluer(`(async () => {
    const table = document.querySelector('.tb-table');
    const y = table.getBoundingClientRect().top + scrollY + table.offsetHeight / 2;
    window.scrollTo(0, y - 300);
    await new Promise(r => setTimeout(r, 1600));
    const th = document.querySelector('.tb-table thead th');
    const entete = document.querySelector('header').getBoundingClientRect().bottom;
    return { haut: Math.round(th.getBoundingClientRect().top), entete: Math.round(entete) };
  })()`);
  verifier("tête du tableau collée sous l'en-tête", Math.abs(c.haut - c.entete) <= 1, `th à ${c.haut} px, en-tête jusqu'à ${c.entete} px`);
  }

  /* ——— mobile : la colonne affichée doit avoir de la place ——— */
  if (largeur < 768) {
    const l = await s.evaluer(`(() => {
      const td = [...document.querySelectorAll('.tb-table tbody td[data-col]')].find(e => e.getClientRects().length);
      const table = document.querySelector('.tb-table');
      return { col: Math.round(td.getBoundingClientRect().width), table: Math.round(table.getBoundingClientRect().width) };
    })()`);
    verifier('colonne de valeurs assez large', l.col >= l.table * 0.45, `${l.col} px sur ${l.table}`);
  }

  /* ——— bulle d'aide : clic, puis Échap ——— */
  const b = await s.evaluer(`(async () => {
    const btn = document.querySelector('.tb-info-btn');
    const bulle = btn.parentElement.querySelector('.tb-info-bulle');
    btn.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 400));
    btn.click();
    await new Promise(r => setTimeout(r, 600));
    /* l'ÉTAT, pas l'opacité : dans le Chromium de recette l'horloge des
       transitions avance par à-coups, l'opacité peut rester à 0 une
       seconde après le clic (vu le 27/09) ; « visibility » bascule, elle,
       dès le début de la transition */
    const ouverte = btn.parentElement.hasAttribute('data-ouvert') && getComputedStyle(bulle).visibility === 'visible' ? '1' : '0';
    const r = bulle.getBoundingClientRect();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise(r => setTimeout(r, 350));
    return { ouverte, fermee: btn.parentElement.hasAttribute('data-ouvert') ? '1' : '0', droite: Math.round(r.right), texte: bulle.textContent.slice(0, 40) };
  })()`);
  verifier('bulle ouverte au clic', b.ouverte === '1', b.texte);
  verifier('bulle refermée par Échap', b.fermee === '0');
  verifier('bulle dans la fenêtre', b.droite <= largeur, `bord droit à ${b.droite} px`);

  /* ——— « Tout se combine » : cinq signes autour d'Omega, cinq liens ——— */
  const u = await s.evaluer(`(() => {
    const tuiles = document.querySelectorAll('.ua-orbite .ua-tuile').length;
    const liens = [...document.querySelectorAll('.ua-liste a')].map(a => a.getAttribute('href'));
    const hors = [...document.querySelectorAll('.ua-orbite .ua-tuile:not(.ua-tuile--centre)')]
      .filter(t => { const r = t.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).length;
    return { tuiles, liens, hors, simulateur: !!document.querySelector('#simulateur, .cc-range') };
  })()`);
  verifier('plus de simulateur', !u.simulateur);
  verifier('cinq signes et Omega', u.tuiles === 6, `${u.tuiles} tuiles`);
  verifier('cinq offres liées', u.liens.length === 5 && u.liens.every(h => h.startsWith('/offres/')), u.liens.join(' '));
  verifier('signes dans la fenêtre', u.hors === 0, `${u.hors} hors cadre`);

  /* ——— pas de barre flottante : Teo l'a fait retirer de l'accueil le
     16/09 ; posée ici le 27/09, retirée le même jour ——— */
  const barre = await s.evaluer(`!!document.querySelector('.br, .o-barre')`);
  verifier('aucune barre flottante', !barre);

  /* ——— le bento sous les cartes (GarantiesAudit) : quatre cartes, la
     mention de la Région, et sous 768 un rail qui ne doit PAS élargir la
     fenêtre de mise en page (piège noté le 14/09 sur un tableau) ——— */
  const g = await s.evaluer(`(async () => {
    const b = document.querySelector('.ga');
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 1500));
    return { cartes: b.querySelectorAll('.ga-carte').length,
             region: b.textContent.includes('Région Guadeloupe'),
             vu: b.hasAttribute('data-vu'),
             rail: getComputedStyle(b.querySelector('.ga-grille')).display,
             fenetre: innerWidth, visuelle: Math.round(visualViewport.width) };
  })()`);
  verifier('bento des garanties', !!g && g.cartes === 4 && g.region, g ? `${g.cartes} cartes, ${g.rail}` : 'absent');
  verifier('animations lancées à l\u2019écran', !!g && g.vu);
  verifier('fenêtre non élargie', !!g && g.fenetre === g.visuelle, g ? `${g.fenetre} / ${g.visuelle}` : '');

  /* ——— FAQ : ouvrir, puis refermer ——— */
  const f = await s.evaluer(`(async () => {
    const q = document.querySelector('.qa-question');
    q.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 300));
    q.click();
    await new Promise(r => setTimeout(r, 600));
    const item = q.closest('.qa-item');
    const contenu = item.querySelector('.qa-contenu');
    const ouvert = { etat: q.getAttribute('aria-expanded'), h: contenu ? Math.round(contenu.getBoundingClientRect().height) : 0 };
    q.click();
    await new Promise(r => setTimeout(r, 600));
    return { ouvert, ferme: q.getAttribute('aria-expanded'), reste: !!item.querySelector('.qa-contenu') };
  })()`);
  verifier('réponse ouverte', f.ouvert.etat === 'true' && f.ouvert.h > 40, `hauteur ${f.ouvert.h} px`);
  verifier('réponse refermée', f.ferme === 'false');

  /* ——— la page ne défile pas de côté ——— */
  const d = await s.evaluer(`({ sw: document.documentElement.scrollWidth, iw: innerWidth })`);
  verifier('aucun débordement horizontal', d.sw <= d.iw, `${d.sw} / ${d.iw}`);
} catch (e) {
  echecs++;
  console.log('✗', e.message);
} finally {
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s) à ${largeur} px` : `\ntout passe à ${largeur} px`);
process.exit(echecs ? 1 : 0);
