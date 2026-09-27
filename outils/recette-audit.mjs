/** Recette des interactions de /reserver-un-audit (27/09/2026) — ce qu'une
 *  capture ne montre pas : colonnes du tableau, sélecteur mobile, bulles
 *  d'aide, bento des garanties, section « Tout se combine », FAQ
 *  (recherche, thèmes, accordéon), débordement.
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
    /* on amène le HAUT du tableau 160 px au-dessus du bas de l'en-tête :
       la tête doit alors coller. (« milieu − 300 » ne suffisait pas à
       1700, où le tableau est moins haut : sa tête n'avait pas encore à
       coller, et la sonde criait au défaut) */
    const y = table.getBoundingClientRect().top + scrollY - 72 + 160;
    window.scrollTo(0, y);
    /* le défilement est lissé (Lenis) : on attend que la tête ne bouge
       plus, au lieu d'un délai fixe qui mesure parfois en pleine course */
    const th = document.querySelector('.tb-table thead th');
    let avant = -1;
    for (let k = 0; k < 20; k++) {
      await new Promise(r => setTimeout(r, 250));
      const top = Math.round(th.getBoundingClientRect().top);
      if (top === avant) break;
      avant = top;
    }
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

  /* ——— FAQ : recherche, thème, ouverture, fermeture ——— */
  const f = await s.evaluer(`(async () => {
    const attendre = (ms) => new Promise(r => setTimeout(r, ms));
    const faq = document.querySelector('#faq');
    faq.scrollIntoView({ block: 'start' });
    await attendre(500);
    const total = faq.querySelectorAll('.qf-item').length;
    const champ = faq.querySelector('.qf-champ');
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    poser.call(champ, 'cheque');
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    await attendre(400);
    const apresRecherche = faq.querySelectorAll('.qf-item').length;
    const surligne = faq.querySelectorAll('.qf-marque').length;
    poser.call(champ, '');
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    await attendre(300);
    const theme = [...faq.querySelectorAll('.qf-theme')].find(b => b.textContent.includes('Périmètre'));
    theme.click();
    await attendre(300);
    const apresTheme = faq.querySelectorAll('.qf-item').length;
    theme.click();
    await attendre(300);
    const q = faq.querySelector('.qf-question');
    q.click();
    await attendre(600);
    const item = q.closest('.qf-item');
    /* la hauteur du bloc INTÉRIEUR : le conteneur, lui, est animé de 0 à
       sa hauteur, et l'horloge des animations du Chromium de recette
       avance par à-coups (vu le 27/09 : 0 px sur une réponse ouverte) */
    const reponse = item.querySelector('.qf-reponse');
    const ouvert = { etat: q.getAttribute('aria-expanded'), h: reponse ? Math.round(reponse.getBoundingClientRect().height) : 0,
                     liens: item.querySelectorAll('.qf-lien').length, suggestions: faq.querySelectorAll('.qf-suggestion').length };
    q.click();
    await attendre(600);
    return { total, apresRecherche, surligne, apresTheme, ouvert, ferme: q.getAttribute('aria-expanded') };
  })()`);
  verifier('neuf questions', f.total === 9, `${f.total}`);
  verifier('la recherche filtre et surligne', f.apresRecherche >= 1 && f.apresRecherche < 9 && f.surligne >= 1, `${f.apresRecherche} carte(s), ${f.surligne} surlignage(s)`);
  verifier('le thème filtre', f.apresTheme === 2, `${f.apresTheme} carte(s) « Périmètre »`);
  verifier('réponse ouverte, avec ses liens', f.ouvert.etat === 'true' && f.ouvert.h > 40 && f.ouvert.liens >= 1, `hauteur ${f.ouvert.h} px, ${f.ouvert.liens} lien(s), ${f.ouvert.suggestions} suggestion(s)`);
  verifier('réponse refermée', f.ferme === 'false');

  /* ——— rien ne sort de l'écran à droite, même rogné par la page : la
     FAQ l'a fait le 27/09 sans faire défiler la page (la colonne prenait la
     largeur minimale du rail de thèmes) ——— */
  const hors = await s.evaluer(`[...document.querySelectorAll('main .r-wrap > *, #faq .qf-droite, #faq .qf-gauche, .ga, .tb-cadre, .ua-liste')]
    .filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className.split(' ')[0]).slice(0, 5)`);
  verifier('aucun bloc hors de l\u2019écran', hors.length === 0, hors.join(', '));

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
