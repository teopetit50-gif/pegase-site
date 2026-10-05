/* recette-daliro.mjs — l'écran /espace/daliro aux cinq largeurs (session B6,
   05/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran
   (hors cadres de tableau qui défilent), aucun mot anglais surveillé, une
   capture légère (jpeg, densité 1) dans omega/recette-b6/. Puis les
   enchaînements de l'exemple : accepter un écart (motif obligatoire) puis
   vérifier le marché de la Maison Rolland ; chiffrer une ligne d'avenant sur
   un prix validé et la soumettre ; signer l'avenant validé ; noter la
   réponse d'un sous-traitant ; voir les remplaçants ; rattacher une facture
   (SIREN refusé sur le mauvais lot).
   usage : node omega/recette-b6/recette-daliro.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Draft|Signed|Contract|Site)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];
const chemin = '/espace/daliro';

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b6-${largeur}`, densite: 1 });
  console.log(`— ${chemin} à ${largeur}`);
  ok(await s.aller(base + chemin), 'page chargée');
  await s.dormir(700);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: document.querySelectorAll('.esp-kpi').length, items: document.querySelectorAll('.esp-item').length, cartes: document.querySelectorAll('#esp-dossier .esp-carte').length };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Chantiers', `titre : ${mesure.h1}`);
  ok(mesure.kpis === 4 && mesure.items === 2 && mesure.cartes >= 7, `4 compteurs, ${mesure.items} chantiers, ${mesure.cartes} cartes du tableau`);
  await s.capturer(`${dossier}daliro-${largeur}.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

const bouton = (motif, racine = 'document') => `(() => { const b = [...${racine}.querySelectorAll('button')].find(b => ${motif}.test(b.textContent)); if (!b) return null; b.click(); return !b.disabled; })()`;
const dlgBouton = (motif) => `[...document.querySelectorAll('[role="dialog"] button')].find(b => ${motif}.test(b.textContent))`;
const saisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); if (!t) return false; const proto = t.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const choisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); if (!t) return false; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b6-marche', densite: 1 });
  console.log('— Maison Rolland : accepter l\'écart avec un motif, puis vérifier le marché');
  ok(await s.aller(base + chemin), 'page chargée');
  await s.dormir(500);
  const premier = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre')?.textContent`);
  ok(premier === 'Maison Rolland — extension', `le chantier ouvert d'office est le bloqué (${premier})`);
  const verifierGris = await s.evaluer(`[...document.querySelectorAll('#esp-dossier button')].find(b => /Vérifier le marché/.test(b.textContent))?.disabled`);
  ok(verifierGris === true, '« Vérifier le marché » est gris tant que des contrôles bloquent');
  ok(await s.evaluer(bouton('/Accepter l.écart/')) !== null, 'clic sur « Accepter l\'écart avec un motif »');
  await s.dormir(400);
  const avant = await s.evaluer(`${dlgBouton('/Accepter l.écart/')}?.disabled`);
  ok(avant === true, 'sans motif, le bouton du dialogue reste gris');
  await s.evaluer(saisir('[role="dialog"] textarea', 'Remise de 50 € négociée sur le bardage, courriel du 29/09.'));
  await s.dormir(200);
  ok(await s.evaluer(`${dlgBouton('/Accepter l.écart/')}?.disabled`) === false, 'avec un motif, il s\'active');
  await s.evaluer(`${dlgBouton('/Accepter l.écart/')}?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/Écart accepté/.test(document.querySelector('#esp-dossier')?.innerText || '')`), 'la ligne porte « Écart accepté » et son motif');
  await s.capturer(`${dossier}daliro-ecart-1440.jpg`, { qualite: 55 });
  ok(await s.evaluer(bouton('/Rattacher à un lot/')) !== null, 'clic sur « Rattacher à un lot » pour la ligne sans lot');
  await s.dormir(400);
  await s.evaluer(choisir('[role="dialog"] select', await s.evaluer(`document.querySelector('[role="dialog"] select option:nth-child(2)')?.value`)));
  await s.dormir(200);
  await s.evaluer(`${dlgBouton('/^\\s*Rattacher\\s*$/')}?.click()`);
  await s.dormir(700);
  const verifierOk = await s.evaluer(`[...document.querySelectorAll('#esp-dossier button')].find(b => /Vérifier le marché/.test(b.textContent))?.disabled`);
  ok(verifierOk === false, 'plus de contrôle bloquant : « Vérifier le marché » s\'active');
  await s.evaluer(bouton('/Vérifier le marché/'));
  await s.dormir(400);
  await s.evaluer(`${dlgBouton('/Vérifier et figer/')}?.click()`);
  await s.dormir(800);
  const apres = await s.evaluer(`(() => { const t = document.querySelector('#esp-dossier')?.innerText || ''; return { fige: /Vérifié, figé/.test(t), rouvrir: /Rouvrir \\(gérant\\)/.test(t), proposes: (t.match(/Proposé/g) || []).length }; })()`);
  ok(apres.fige && apres.rouvrir, 'le marché est « Vérifié, figé », « Rouvrir (gérant) » apparaît');
  ok(apres.proposes >= 2, `la bibliothèque reçoit les prix du marché en « Proposé » (${apres.proposes})`);
  await s.capturer(`${dossier}daliro-verifie-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b6-avenant', densite: 1 });
  console.log('— Les Tilleuls : chiffrer une ligne d\'avenant sur un prix validé, soumettre, signer');
  ok(await s.aller(base + chemin), 'page chargée');
  await s.dormir(500);
  ok(await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => /Les Tilleuls/.test(b.textContent)); if (!b) return false; b.click(); return true; })()`), 'ouverture de Résidence Les Tilleuls');
  await s.dormir(500);
  const signerGris = await s.evaluer(`[...document.querySelectorAll('#esp-dossier button')].filter(b => /^\\s*Signer\\s*$/.test(b.textContent)).map(b => b.disabled)`);
  ok(signerGris.length === 1 && signerGris[0] === false, 'l\'avenant n° 1 (validé par la file) propose « Signer » ; le n° 2 (brouillon) non');
  ok(await s.evaluer(bouton('/Chiffrer une ligne/')) !== null, 'clic sur « Chiffrer une ligne » (avenant n° 2)');
  await s.dormir(400);
  const choixPrix = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')[1].options].map(o => o.textContent)`);
  ok(choixPrix.some((t) => /Garde-corps acier laqué/.test(t)) && !choixPrix.some((t) => /Porte d.entrée palière/.test(t)), 'seuls les prix VALIDÉS de la bibliothèque sont proposés (pas la porte palière, seulement proposée)');
  await s.evaluer(choisir('[role="dialog"] select:nth-of-type(1)', 'bibliotheque'));
  const prixId = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')[1].options].find(o => /Garde-corps acier laqué/.test(o.textContent))?.value`);
  await s.evaluer(`(() => { const t = document.querySelectorAll('[role="dialog"] select')[1]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(t, ${JSON.stringify(prixId)}); t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.evaluer(saisir('[role="dialog"] input[inputmode="decimal"]', '6'));
  await s.dormir(200);
  await s.evaluer(`${dlgBouton('/^\\s*Chiffrer\\s*$/')}?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/852,00/.test(document.querySelector('#esp-dossier')?.innerText || '')`), '6 ml × 142 € = 852 € HT, prix copié de la bibliothèque');
  await s.capturer(`${dossier}daliro-avenant-1440.jpg`, { qualite: 55 });
  ok(await s.evaluer(bouton('/Soumettre à la signature/')) !== null, 'clic sur « Soumettre à la signature »');
  await s.dormir(400);
  await s.evaluer(`${dlgBouton('/^\\s*Soumettre\\s*$/')}?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/Dans « À valider »/.test(document.querySelector('#esp-dossier')?.innerText || '')`), 'l\'avenant n° 2 est « À signer », sa demande attend dans « À valider »');
  const signerN2 = await s.evaluer(`[...document.querySelectorAll('#esp-dossier button')].filter(b => /^\\s*Signer\\s*$/.test(b.textContent)).map(b => b.disabled)`);
  ok(signerN2.length === 2 && signerN2.includes(true), 'le n° 2 n\'est pas signable tant que la demande n\'est pas approuvée (séparation saisie / signature)');
  ok(await s.evaluer(`(() => { const b = [...document.querySelectorAll('#esp-dossier button')].find(b => /^\\s*Signer\\s*$/.test(b.textContent) && !b.disabled); if (!b) return false; b.click(); return true; })()`), 'clic sur « Signer » de l\'avenant n° 1');
  await s.dormir(400);
  await s.evaluer(`${dlgBouton('/^\\s*Signer\\s*$/')}?.click()`);
  await s.dormir(800);
  const signe = await s.evaluer(`(() => { const t = document.querySelector('#esp-dossier')?.innerText || ''; return { signe: /Signé le/.test(t), avenants: /1[\\s\\u202f\\u00a0]884,00/.test(t) }; })()`);
  ok(signe.signe, 'l\'avenant n° 1 est signé, daté');
  ok(signe.avenants, 'le déboursé du lot 02 porte 1 884 € d\'avenant signé');
  await s.capturer(`${dossier}daliro-signe-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1024, hauteur: 900, marque: 'b6-planning', densite: 1 });
  console.log('— Les Tilleuls : noter la réponse d\'un sous-traitant, remplaçants, rattacher une facture');
  ok(await s.aller(base + chemin), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Les Tilleuls/.test(b.textContent))?.click()`);
  await s.dormir(500);
  ok(await s.evaluer(bouton('/^\\s*Remplaçants\\s*$/')) !== null, 'clic sur « Remplaçants » (passage décliné ou sans réponse)');
  await s.dormir(500);
  ok(await s.evaluer(`/Métallerie Rochat/.test(document.querySelector('[role="dialog"]')?.innerText || '') && !/Serrurerie Dumont/.test(document.querySelector('[role="dialog"]')?.innerText || '')`), 'Métallerie Rochat est proposée, pas Dumont');
  await s.capturer(`${dossier}daliro-remplacants-1024.jpg`, { qualite: 55 });
  await s.evaluer(`document.querySelector('[role="dialog"] .dlg-fermer')?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(bouton('/Noter la réponse/')) !== null, 'clic sur « Noter la réponse »');
  await s.dormir(400);
  await s.evaluer(saisir('[role="dialog"] input', 'Rappel : OK pour jeudi 8 h.'));
  await s.evaluer(`${dlgBouton('/^\\s*Noter\\s*$/')}?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`(document.querySelector('#esp-dossier')?.innerText || '').split('Confirmé').length >= 3`), 'le passage passe « Confirmé », la réponse est au fil');
  ok(await s.evaluer(bouton('/Rattacher une facture/')) !== null, 'clic sur « Rattacher une facture »');
  await s.dormir(500);
  const factureMra = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')[0].options].find(o => /Menuiseries Rhône-Alpes/.test(o.textContent))?.value`);
  ok(!!factureMra, 'la facture de Menuiseries Rhône-Alpes (FILED, pas encore rattachée) est proposée');
  await s.evaluer(`(() => { const t = document.querySelectorAll('[role="dialog"] select')[0]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(t, ${JSON.stringify(factureMra)}); t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const lot02 = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')[1].options].find(o => /^02/.test(o.textContent))?.value`);
  await s.evaluer(`(() => { const t = document.querySelectorAll('[role="dialog"] select')[1]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(t, ${JSON.stringify(lot02)}); t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.evaluer(`${dlgBouton('/^\\s*Rattacher\\s*$/')}?.click()`);
  await s.dormir(600);
  ok(await s.evaluer(`/n.est pas l.entreprise du lot 02/.test(document.querySelector('[role="dialog"]')?.innerText || '')`), 'refus : le fournisseur n\'est pas l\'entreprise du lot 02 (SIREN différent)');
  await s.capturer(`${dossier}daliro-facture-refus-1024.jpg`, { qualite: 55 });
  const lot01 = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')[1].options].find(o => /^01/.test(o.textContent))?.value`);
  await s.evaluer(`(() => { const t = document.querySelectorAll('[role="dialog"] select')[1]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(t, ${JSON.stringify(lot01)}); t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.evaluer(`${dlgBouton('/^\\s*Rattacher\\s*$/')}?.click()`);
  await s.dormir(800);
  ok(await s.evaluer(`/F-45812/.test(document.querySelector('#esp-dossier')?.innerText || '')`), 'la facture est rattachée au lot 01 et paraît dans la liste');
  ok(await s.evaluer(`/14[\\s\\u202f\\u00a0]260,00/.test(document.querySelector('#esp-dossier')?.innerText || '')`), 'le déboursé du lot 01 porte 14 260 € facturés');
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
