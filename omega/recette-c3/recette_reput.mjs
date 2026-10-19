/* Recette de l'écran /espace/reput (session C3, 06/10/2026), aux cinq largeurs de CLAUDE.md.
 * usage : BASE=http://localhost:3000 node omega/recette-c3/recette_reput.mjs [dossier_captures]
 * Pour chaque largeur : la page se charge (données d'exemple), aucun débordement horizontal, aucune erreur
 * de console ; les trois onglets s'ouvrent ; « Valider et envoyer » sur la réponse prête fait passer la
 * demande en « Répondue » ; « Corriger » ouvre l'éditeur ; une capture par onglet. */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const BASE = process.env.BASE || 'http://localhost:3000';
const DOSSIER = process.argv[2] || '/tmp/recette-reput';
mkdirSync(DOSSIER, { recursive: true });
const LARGEURS = [390, 768, 1024, 1440, 1700];
let echecs = 0;
const verifier = (ok, quoi) => { console.log(`${ok ? 'ok    ' : 'ÉCHEC '} ${quoi}`); if (!ok) echecs++; };

const DEBORDE = `(() => { const W = document.documentElement.clientWidth; const t = [];
  for (const e of document.querySelectorAll('body *')) { if (!e.getClientRects().length) continue;
    const c = getComputedStyle(e); if (c.position === 'fixed') continue;
    let p = e.parentElement, rogne = false; for (; p; p = p.parentElement) if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX)) { rogne = true; break; }
    const r = e.getBoundingClientRect(); if (!rogne && (r.right - W > 1 || r.left < -1)) t.push((e.textContent || e.tagName).trim().slice(0, 40)); }
  return { scroll: document.documentElement.scrollWidth > W + 1, elements: t.slice(0, 5) }; })()`;
const cliquer = (texte, selecteur = 'button') => `(() => { const b = [...document.querySelectorAll(${JSON.stringify(selecteur)})].find((x) => x.textContent.trim().startsWith(${JSON.stringify(texte)}));
  if (!b) return false; b.click(); return true; })()`;

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 1000, marque: 'reput', densite: 1 });
  try {
    const charge = await s.aller(`${BASE}/espace/reput`, { signe: `document.readyState === 'complete' && document.body.innerText.includes('Demandes clients') && document.body.innerText.includes('Marie Durand')` });
    verifier(charge, `${largeur} : la page se charge avec l'exemple`);
    let d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (Demandes) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-demandes-${largeur}.jpg`, { pleine: true });
    verifier(await s.evaluer(cliquer('Marie Durand', '.esp-item')), `${largeur} : ouvrir la demande de Marie Durand`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('Valider et envoyer') && document.body.innerText.includes('Exporter vers un tableur') && document.body.innerText.toLowerCase().includes('ses sources dans la base')`), `${largeur} : réponse prête, sources, Valider`);
    verifier(await s.evaluer(`document.body.innerText.includes('Retenue :')`), `${largeur} : la raison de la retenue est visible`);
    verifier(await s.evaluer(cliquer('Corriger')), `${largeur} : Corriger ouvre l'éditeur`);
    await s.dormir(300);
    verifier(await s.evaluer(`!!document.querySelector('textarea')`), `${largeur} : l'éditeur est là`);
    await s.evaluer(cliquer('Annuler'));
    verifier(await s.evaluer(cliquer('Hélène Roux', '.esp-item')), `${largeur} : ouvrir la demande d'Hélène Roux (pièce jointe)`);
    await s.dormir(300);
    verifier(await s.evaluer(`!!document.querySelector('[data-pieces-jointes]') && document.body.innerText.includes('Pièces jointes conservées (1)') && document.body.innerText.includes('photo-dressing.jpg')`), `${largeur} : la pièce jointe est listée, avec sa nature`);
    d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (pièces jointes) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-pieces-${largeur}.jpg`);
    verifier(await s.evaluer(cliquer('Luc Martin', '.esp-item')), `${largeur} : ouvrir la demande de Luc Martin (deux sujets)`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('Concerne aussi : Rendez-vous · service Pose et SAV prévenu') && !!document.querySelector('[data-sujet-secondaire] select')`), `${largeur} : le second sujet et son service sont dits`);
    d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (sujet secondaire) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-secondaire-${largeur}.jpg`);
    verifier(await s.evaluer(cliquer('Martin Luc', '.esp-item')), `${largeur} : ouvrir la demande de Martin Luc (WhatsApp)`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('Peut-être la même personne que') && document.body.innerText.includes('Rien n’est regroupé sans vous') || document.body.innerText.includes("Rien n'est regroupé sans vous")`), `${largeur} : le rapprochement par le nom est proposé, pas fait`);
    d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (rapprochement) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-rapprochement-${largeur}.jpg`);
    verifier(await s.evaluer(cliquer('Un seul dossier')), `${largeur} : « Un seul dossier »`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('Un seul dossier · 2 messages') && document.body.innerText.includes('Sortir cette demande du dossier') && !document.body.innerText.includes('Peut-être la même personne que')`), `${largeur} : rapprochées, un dossier de deux messages`);
    verifier(await s.evaluer(cliquer('Sortir cette demande du dossier')), `${largeur} : sortir la demande du dossier`);
    await s.dormir(300);
    verifier(await s.evaluer(`!document.body.innerText.includes('Un seul dossier · 2 messages')`), `${largeur} : séparée, le dossier est défait`);
    await s.evaluer(cliquer('Marie Durand', '.esp-item'));
    await s.dormir(200);
    verifier(await s.evaluer(cliquer('Valider et envoyer')), `${largeur} : clic sur Valider et envoyer`);
    await s.dormir(400);
    verifier(await s.evaluer(`document.body.innerText.includes('La réponse est validée')`), `${largeur} : la réponse est validée`);
    for (const [onglet, attendu] of [['Base de connaissances', 'Diagnostic à domicile'], ['Sujets autorisés', "Autoriser l'envoi seul"], ['Réglages et avis', "Programmer la demande d'avis"]]) {
      verifier(await s.evaluer(cliquer(onglet, '[role=tab]')), `${largeur} : onglet ${onglet}`);
      await s.dormir(400);
      verifier(await s.evaluer(`document.body.innerText.includes(${JSON.stringify(attendu)})`), `${largeur} : ${onglet} montre « ${attendu} »`);
      d = await s.evaluer(DEBORDE);
      verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (${onglet}) ${d.elements.join(' | ')}`);
      await s.capturer(`${DOSSIER}/reput-${onglet.split(' ')[0].toLowerCase()}-${largeur}.jpg`, { pleine: true });
    }
    // c3_17 : les réglages par site, sur l'onglet Réglages et avis (le dernier ouvert).
    verifier(await s.evaluer(`!!document.querySelector('[data-reglages-sites]') && document.body.innerText.includes("Suit l'organisation") && document.body.innerText.includes('Réglages propres')`), `${largeur} : les sites, d'où viennent leurs réglages`);
    verifier(await s.evaluer(cliquer('Régler ce site')), `${largeur} : « Régler ce site »`);
    await s.dormir(300);
    d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (réglage d'un site) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-sites-${largeur}.jpg`);
    verifier(await s.evaluer(cliquer('Enregistrer pour ce site')), `${largeur} : enregistrer pour ce site`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('a désormais ses propres réglages')`), `${largeur} : le site a ses propres réglages`);
    verifier(await s.evaluer(cliquer("Revenir à l'organisation")), `${largeur} : revenir à l'organisation`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes("reprend les réglages de l'organisation")`), `${largeur} : le site reprend les réglages de l'organisation`);
    // c3_13 : l'envoi automatique se coupe et se rallume depuis « Sujets autorisés ».
    verifier(await s.evaluer(cliquer('Sujets autorisés', '[role=tab]')), `${largeur} : onglet Sujets autorisés (envoi automatique)`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('Envoi automatique') && document.body.innerText.includes("Couper l'envoi automatique")`), `${largeur} : l'envoi automatique est voulu par défaut`);
    await s.evaluer(`window.prompt = () => 'Essai de recette'`);
    verifier(await s.evaluer(cliquer("Couper l'envoi automatique")), `${largeur} : couper l'envoi automatique`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes("Activer l'envoi automatique") && document.body.innerText.includes('tout est de nouveau relu')`), `${largeur} : coupé, tout est relu`);
    verifier(await s.evaluer(cliquer("Activer l'envoi automatique")), `${largeur} : rallumer l'envoi automatique`);
    await s.dormir(300);
    verifier(await s.evaluer(`document.body.innerText.includes('partent seules')`), `${largeur} : rallumé`);
    d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (envoi automatique) ${d.elements.join(' | ')}`);
    await s.capturer(`${DOSSIER}/reput-envoi-auto-${largeur}.jpg`, { pleine: true });
    // c3_10 : le lien du point du matin (?demande=<id>) ouvre cette demande d'emblée.
    const lien = await s.aller(`${BASE}/espace/reput?demande=00000000-0000-4000-8000-0000000c3d03`, { signe: `document.readyState === 'complete' && document.body.innerText.includes('Demandes clients')` });
    verifier(lien, `${largeur} : le lien direct se charge`);
    await s.dormir(400);
    verifier(await s.evaluer(`(document.querySelector('.esp-item[aria-current="true"]')?.textContent ?? '').includes('Luc Martin')`), `${largeur} : le lien direct ouvre la demande de Luc Martin`);
    d = await s.evaluer(DEBORDE);
    verifier(!d.scroll && d.elements.length === 0, `${largeur} : aucun débordement (lien direct) ${d.elements.join(' | ')}`);
    // Hors Vercel, /_vercel/insights rend 404 (le même sur /espace/daliro) : seules comptent les autres ressources en 404.
    const autres404 = await s.evaluer(`performance.getEntriesByType('resource').filter((e) => e.responseStatus === 404 && !e.name.includes('/_vercel/')).map((e) => e.name)`);
    const soucis = s.soucis.filter((x) => !/favicon|_vercel|analytics|Failed to load resource/i.test(x)).concat(autres404 ?? []);
    verifier(soucis.length === 0, `${largeur} : console propre ${soucis.join(' | ')}`);
  } finally {
    s.fermer();
  }
}
console.log(echecs ? `${echecs} échec(s)` : 'recette verte');
process.exit(echecs ? 1 : 0);
