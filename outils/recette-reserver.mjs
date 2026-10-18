/** Recette de /reserver-un-audit (18/10/2026, refonte calquée sur scale.com/demo) —
 *  ce qu'une capture ne montre pas : colonnes de la tête selon la largeur, choix
 *  du format et envoi vers /reserver, FAQ en accordéon, couleur du bouton, liens
 *  morts, débordement.
 *
 *    node outils/recette-reserver.mjs <url de la page> [largeur]
 *
 *  Remplace recette-audit.mjs, qui éprouvait l'ancienne mise en page (bento,
 *  recherche de FAQ, simulateur) et ne s'applique plus.
 */
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
if (!url) { console.error('usage: node recette-reserver.mjs <url> [largeur]'); process.exit(1); }

const s = await ouvrirSession({ largeur, hauteur: largeur < 600 ? 844 : 900, marque: 'recette-reserver' });
let echecs = 0;
const verifier = (nom, ok, detail = '') => {
  if (!ok) echecs++;
  console.log(`${ok ? '✓' : '✗'} ${nom}${detail ? ' — ' + detail : ''}`);
};

try {
  if (!await s.aller(url)) throw new Error('page jamais prête');
  await s.dormir(1200);

  /* ——— tête : titre, colonnes, police ——— */
  const t = await s.evaluer(`(() => {
    const h1 = document.querySelector('.rdv-h1');
    const grille = getComputedStyle(document.querySelector('.rdv-hero-grille')).gridTemplateColumns;
    return {
      taille: getComputedStyle(h1).fontSize,
      colonnes: grille.split(' ').length,
      carte: getComputedStyle(document.querySelector('.rdv-carte')).backgroundColor,
      police: getComputedStyle(h1).fontFamily.split(',')[0],
    };
  })()`);
  const grand = largeur >= 768;
  verifier('titre à la taille de la référence', t.taille === (grand ? '40px' : '24px'), t.taille);
  verifier('deux colonnes dès 1024, une en dessous', t.colonnes === (largeur >= 1024 ? 2 : 1), `${t.colonnes} colonne(s)`);
  verifier('carte cloud-slate', t.carte === 'rgb(131, 156, 178)', t.carte);
  verifier('police du site (General Sans)', /omega/i.test(t.police), t.police);

  /* ——— logos : trois rangées, de 4, 3 puis 4 outils, en masque ——— */
  const logos = await s.evaluer(`(() => {
    const m = document.querySelector('.rdv-marque');
    const st = getComputedStyle(m);
    return {
      rangees: [...document.querySelectorAll('.rdv-logos')].map(ul => ul.querySelectorAll('.rdv-marque').length),
      masque: st.maskImage !== 'none' || st.webkitMaskImage !== 'none',
    };
  })()`);
  verifier('logos : rangées de 4, 3 et 4 outils', JSON.stringify(logos.rangees) === '[4,3,4]', JSON.stringify(logos.rangees));
  verifier('logos en masque, couleur d\u2019encre', logos.masque === true);

  /* ——— formulaire : neuf champs comme la référence, tous obligatoires ——— */
  const f = await s.evaluer(`(() => {
    const champs = [...document.querySelectorAll('.rdv-formulaire input, .rdv-formulaire select')];
    return {
      total: document.querySelectorAll('.rdv-formulaire .rdv-champ').length,
      obligatoires: document.querySelectorAll('.rdv-formulaire input[required]').length + document.querySelectorAll('.rdv-menu-bouton').length,
      hauteur: Math.round(champs[0].getBoundingClientRect().height),
      cartes: document.querySelectorAll('.rdv-format').length,
      phare: document.querySelectorAll('.rdv-format--phare').length,
    };
  })()`);
  verifier('neuf champs, tous obligatoires', f.total === 9 && f.obligatoires === 9, `${f.total} champs, ${f.obligatoires} obligatoires`);

  /* ——— envoi vide : neuf messages « Ce champ est obligatoire. », focus sur le premier ——— */
  const vide = await s.evaluer(`(async () => {
    document.querySelector('.rdv-formulaire button[type=submit]').click();
    await new Promise(r => setTimeout(r, 300));
    return {
      messages: document.querySelectorAll('.rdv-erreur').length,
      focus: document.activeElement?.id ?? '',
      reste: location.pathname,
    };
  })()`);
  verifier('envoi vide : neuf erreurs et focus sur le premier champ', vide.messages === 9 && vide.focus === 'rdv-prenom' && vide.reste === '/reserver-un-audit', `${vide.messages} erreur(s), focus ${vide.focus}`);
  verifier('champs de 46 px', f.hauteur === 46, `${f.hauteur} px`);
  verifier('trois cartes de format, une recommandée', f.cartes === 3 && f.phare === 1, `${f.cartes} carte(s), ${f.phare} recommandée(s)`);

  /* ——— envoi : la demande part vers /api/audit/demande, réponse simulée ——— */
  const refus = await s.evaluer(`(async () => {
    const reel = window.fetch;
    window.fetch = async () => new Response(JSON.stringify({ ok: false, motif: 'indisponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    const v = (nom, valeur) => { document.querySelector('[name=' + nom + ']').value = valeur; };
    v('prenom', 'Essai'); v('nom', 'Recette'); v('entreprise', 'Atelier Essai'); v('fonction', 'Gérante');
    v('email', 'essai@example.com'); v('pays', 'Guadeloupe'); v('secteur', 'btp'); v('origine', 'LinkedIn'); v('format', 'cadrage');
    document.querySelector('.rdv-formulaire button[type=submit]').click();
    await new Promise(r => setTimeout(r, 500));
    const msg = document.querySelector('.rdv-message--erreur');
    window.fetch = reel;
    return msg ? msg.textContent : null;
  })()`);
  verifier('refus du serveur : message rouge', typeof refus === 'string' && refus.includes('pas pu envoyer'), refus ?? 'pas de message');

  if (!await s.aller(url)) throw new Error('retour sur la page impossible');
  await s.dormir(1200);

  const envoi = await s.evaluer(`(async () => {
    const reel = window.fetch;
    let cible = null, corps = null;
    window.fetch = async (url, opts) => { cible = url; corps = JSON.parse(opts.body); return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
    const v = (nom, valeur) => { document.querySelector('[name=' + nom + ']').value = valeur; };
    v('prenom', 'Essai'); v('nom', 'Recette'); v('entreprise', 'Atelier Essai'); v('fonction', 'Gérante');
    v('email', 'essai@example.com'); v('pays', 'Guadeloupe'); v('secteur', 'btp'); v('origine', 'LinkedIn'); v('format', 'cadrage');
    document.querySelector('.rdv-formulaire button[type=submit]').click();
    await new Promise(r => setTimeout(r, 500));
    const vert = document.querySelector('.rdv-confirmation');
    window.fetch = reel;
    return { cible, prenom: corps && corps.prenom, vert: vert ? vert.textContent : null, chemin: location.pathname + location.search };
  })()`);
  verifier('envoi : la demande part vers /api/audit/demande', envoi.cible === '/api/audit/demande' && envoi.prenom === 'Essai', String(envoi.cible));
  verifier('succès : message vert avec l’adresse du visiteur', !!envoi.vert && envoi.vert.includes('essai@example.com'), envoi.vert ?? 'pas de message');
  verifier('la page ne change pas d’adresse', envoi.chemin === '/reserver-un-audit', envoi.chemin);

  if (!await s.aller(url)) throw new Error('retour sur la page impossible');
  await s.dormir(1200);

  /* ——— comparatif : tableau complet, débordement absorbé par son cadre ——— */
  const c = await s.evaluer(`({
    lignes: document.querySelectorAll('.rdv-tableau tbody tr').length,
    familles: document.querySelectorAll('.rdv-tableau .rdv-famille').length,
    colonnes: document.querySelectorAll('.rdv-tableau thead th').length,
  })`);
  verifier('comparatif : trois formats en colonnes', c.colonnes === 4, `${c.colonnes} colonne(s) d’en-tête`);
  verifier('comparatif : lignes et familles présentes', c.lignes >= 8 && c.familles >= 2, `${c.lignes} ligne(s), ${c.familles} famille(s)`);

  /* ——— FAQ : neuf questions, accordéon qui s'ouvre ——— */
  const q = await s.evaluer(`(async () => {
    const items = [...document.querySelectorAll('.rdv-faq-item')];
    const premier = items[0];
    const avant = premier.open;
    premier.querySelector('summary').click();
    await new Promise(r => setTimeout(r, 300));
    return { total: items.length, avant, apres: premier.open, hauteur: Math.round(premier.querySelector('.rdv-faq-reponse').getBoundingClientRect().height) };
  })()`);
  verifier('neuf questions', q.total === 9, `${q.total}`);
  verifier('réponse qui s’ouvre au clic', q.avant === false && q.apres === true && q.hauteur > 40, `hauteur ${q.hauteur} px`);

  /* ——— bouton de l'appel final : texte blanc sur noir (les liens héritaient de l'encre) ——— */
  const b = await s.evaluer(`(() => {
    const bouton = document.querySelector('.rdv-cta .rdv-bouton');
    const st = getComputedStyle(bouton);
    return { couleur: st.color, fond: st.backgroundColor };
  })()`);
  verifier('bouton de réservation : texte blanc sur noir', b.couleur === 'rgb(255, 255, 255)' && b.fond === 'rgb(0, 0, 0)', `${b.couleur} / ${b.fond}`);

  /* ——— liens : aucun lien vide ou à « # » seul ——— */
  const l = await s.evaluer(`[...document.querySelectorAll('.rdv a[href]')].map(a => a.getAttribute('href')).filter(h => h === '#' || h === '')`);
  verifier('aucun lien mort dans la page', l.length === 0, l.join(', ') || 'tous renseignés');

  /* ——— rien ne sort de l'écran à droite, et la page ne défile pas de côté ——— */
  const hors = await s.evaluer(`[...document.querySelectorAll('.rdv > section > .rdv-wrap > *')]
    .filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className.split(' ')[0]).slice(0, 5)`);
  verifier('aucun bloc hors de l’écran', hors.length === 0, hors.join(', '));
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
