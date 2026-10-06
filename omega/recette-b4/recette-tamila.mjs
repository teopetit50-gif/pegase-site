/* recette-tamila.mjs — l'écran /espace/tamila aux cinq largeurs (session B4,
   05/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran,
   aucun mot anglais parmi ceux qu'on surveille, les cinq compteurs et la liste
   des dossiers, une capture légère (jpeg, densité 1) dans omega/recette-b4/.
   Puis quatre enchaînements sur l'exemple : ouvrir le dossier en tête et lire
   le calcul d'un délai (art. 908 + 915-4) ; confirmer ce délai ; déclarer un
   acte déposé ; poser une muraille ; ouvrir un nouveau dossier ; passer le
   cabinet au coffre Scaleway et ré-envelopper ses dossiers (b4_05) ; les
   honoraires : saisir du temps, facturer, convention manquante (b4_06) ;
   les conflits d'intérêts et la vigilance LCB-FT (b4_07) ; la facture
   imprimable et l'en-tête du cabinet (b4_09) ; les avis RPVA reçus par
   courriel, à rattacher (b4_10), avec axe-core sur la carte et le dialogue ;
   le temps proposé à la saisie et le forfait consommé (b4_12) ; le contrôle
   des conflits lancé de lui-même à l'ajout d'une partie.
   usage : node omega/recette-b4/recette-tamila.mjs [origine] */
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3010';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Deadline|Case|Hearing|Party|Export)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b4-tamila', densite: 1 });
  console.log(`— /espace/tamila à ${largeur}`);
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(700);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1; })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: document.querySelectorAll('.esp-kpi').length, items: document.querySelectorAll('.esp-item').length, cartes: document.querySelectorAll('#esp-dossier .esp-carte').length };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Dossiers du cabinet', `titre : ${mesure.h1}`);
  ok(mesure.kpis === 5, `${mesure.kpis} compteurs`);
  ok(mesure.items === 6, `${mesure.items} dossiers dans la liste`);
  ok(mesure.cartes >= 9, `${mesure.cartes} cartes dans le dossier ouvert`);
  await s.capturer(`${dossier}tamila-${largeur}.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-delai', densite: 1 });
  console.log('— le calcul d\'un délai, sa confirmation, l\'acte déposé');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  const ref = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`);
  ok(ref === '2026-0377', `le dossier ouvert d'office est celui qui presse : échéance à J-6 (${ref})`);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0412/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const ref2 = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`);
  ok(ref2 === '2026-0412', `ouverture du dossier SCI du Moulin (${ref2})`);
  const depli = await s.evaluer(`(() => { const l = [...document.querySelectorAll('.tam-ligne')].find(l => /Remettre ses conclusions/.test(l.textContent)); const b = l?.querySelector('.tam-depli'); if (!b) return null; b.click(); return true; })()`);
  ok(depli === true, 'clic sur « Comment la date est calculée » du délai pour conclure');
  await s.dormir(300);
  const calcul = await s.evaluer(`document.querySelector('.tam-calcul')?.textContent || ''`);
  ok(/art\. 908/.test(calcul) && /915-4/.test(calcul), 'le calcul cite l\'art. 908 et l\'augmentation de l\'art. 915-4 (client en Guadeloupe)');
  await s.capturer(`${dossier}tamila-calcul-1440.jpg`, { qualite: 55 });
  const conf = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.tam-ligne-actions .r-btn')].find(b => /Confirmer/.test(b.textContent)); if (!b) return null; if (b.disabled) return 'gris'; b.click(); return true; })()`);
  ok(conf === true, 'bouton « Confirmer » (le gérant est avocat) ouvert');
  await s.dormir(400);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, calcul: !!d.querySelector('.tam-calcul') } : null; })()`);
  ok(dlg && /Confirmer le délai/.test(dlg.titre) && dlg.calcul, `dialogue « ${dlg?.titre} », le calcul est relu avant de signer`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Approuver\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const confirme = await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-pastille')].some(p => /Confirmé/.test(p.textContent)) && /C.est fait/.test(document.querySelector('#esp-dossier').innerText)`);
  ok(confirme, 'le délai passe « Confirmé » (en mémoire), « C\'est fait »');
  const kpi = await s.evaluer(`[...document.querySelectorAll('.esp-kpi')].find(k => /à confirmer/.test(k.textContent))?.querySelector('.esp-kpi-valeur')?.textContent`);
  ok(kpi === '1', `le compteur « à confirmer » descend à ${kpi}`);
  const acte = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.tam-ligne-actions .r-btn')].find(b => /Acte déposé/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(acte === true, 'clic sur « Acte déposé »');
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const clos = await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-pastille')].filter(p => /Acte déposé/.test(p.textContent)).length`);
  ok(clos >= 1, 'le délai est clos sur l\'acte déposé');
  await s.capturer(`${dossier}tamila-acte-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-muraille', densite: 1 });
  console.log('— la muraille et le nouveau dossier');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0412/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const mur = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-carte-tete .r-btn')].find(b => /Muraille/.test(b.textContent)); if (!b) return null; if (b.disabled) return 'gris'; b.click(); return true; })()`);
  ok(mur === true, 'le gérant peut poser une muraille');
  await s.dormir(400);
  await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select'); const o = [...sel.options].find(o => /Haddad/.test(o.textContent)); sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(200);
  const rouge = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Poser la muraille/.test(b.textContent))?.className`);
  ok(/r-btn--rouge/.test(rouge || ''), 'le bouton de pose est rouge (geste qui écarte)');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Poser la muraille/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const enPlace = await s.evaluer(`/murailles/i.test(document.querySelector('#esp-dossier').textContent) && [...document.querySelectorAll('#esp-dossier .esp-pastille')].some(p => /En place/.test(p.textContent)) && /Haddad est écarté/.test(document.querySelector('#esp-dossier').textContent)`);
  ok(enPlace, 'la muraille est en place, Me Haddad écarté');
  await s.capturer(`${dossier}tamila-muraille-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('.esp-tete .r-btn')].find(b => /Nouveau dossier/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const gris = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Ouvrir le dossier/.test(b.textContent))?.disabled`);
  ok(gris === true, 'sans référence ni intitulé, « Ouvrir le dossier » reste gris');
  await s.evaluer(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const [ref, , intit] = [...document.querySelectorAll('[role="dialog"] input.rv-champ')]; set.call(ref, '2026-0440'); ref.dispatchEvent(new Event('input', { bubbles: true })); set.call(intit, 'Dupuis c/ Garage du Centre'); intit.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(300);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Ouvrir le dossier/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const nouveau = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`);
  ok(nouveau === '2026-0440', `le nouveau dossier est ouvert et sélectionné (${nouveau})`);
  const items = await s.evaluer(`document.querySelectorAll('.esp-item').length`);
  ok(items === 7, `${items} dossiers dans la liste`);
  await s.capturer(`${dossier}tamila-nouveau-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: 'b4-coffre', densite: 1 });
  console.log('— le coffre à clés (à 390 : le dialogue doit tenir sur un téléphone)');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  const bouton = await s.evaluer(`[...document.querySelectorAll('.esp-tete .r-btn')].find(b => /Coffre/.test(b.textContent))?.textContent?.trim()`);
  ok(bouton === 'Coffre à clés', `le gérant voit le bouton du coffre (${bouton})`);
  await s.evaluer(`[...document.querySelectorAll('.esp-tete .r-btn')].find(b => /Coffre/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const local = await s.evaluer(`document.querySelector('[role="dialog"]')?.innerText || ''`);
  ok(/Phrase du cabinet/.test(local) && /Sous la phrase\s*6 dossiers/.test(local), 'état : phrase du cabinet, 6 dossiers sous la phrase');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Passer au coffre Scaleway/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const bascule = await s.evaluer(`document.querySelector('[role="dialog"]')?.innerText || ''`);
  ok(/Bascule en cours/.test(bascule) && /Paris/.test(bascule), 'le coffre est activé : bascule en cours, clé maître à Paris');
  const deb = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth + 1; })()`);
  ok(deb, 'le dialogue tient dans la largeur du téléphone');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Ré-envelopper 6 dossiers/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const progres = await s.evaluer(`!!document.querySelector('[role="dialog"] progress')`);
  ok(progres, 'l\'avancement du ré-enveloppement s\'affiche');
  await s.dormir(1200);
  const fini = await s.evaluer(`document.querySelector('[role="dialog"]')?.innerText || ''`);
  ok(/Toutes les clés au coffre/.test(fini) && /Au coffre\s*6 dossiers/.test(fini), 'toutes les clés au coffre, 6 dossiers');
  await s.capturer(`${dossier}tamila-coffre-390.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Fermer/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const tete = await s.evaluer(`[...document.querySelectorAll('.esp-tete .r-btn')].find(b => /Coffre/.test(b.textContent))?.textContent?.trim()`);
  ok(tete === 'Coffre Scaleway', `l'en-tête dit « ${tete} »`);
  const debPage = await s.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  ok(debPage === 0, `pas de débordement horizontal avec le bouton du coffre (${debPage})`);
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-honoraires', densite: 1 });
  console.log('— les honoraires (b4_06)');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0412/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const carte = () => s.evaluer(`document.querySelector('section[aria-label="Honoraires"]')?.innerText || ''`);
  const t0 = await carte();
  ok(/Signée le/.test(t0) && /250,00\s€ HT de l.heure/.test(t0), 'la convention signée, au temps passé, 250 € de l\'heure');
  ok(/312,50\s€ HT/.test(t0), 'à facturer : 1 h 15 de recherche × 250 € = 312,50 € HT (le quart d\'heure non facturable n\'y est pas)');
  ok(/H-2026-000041/.test(t0) && /Reste dû 485,00\s€/.test(t0), 'la facture H-2026-000041, reste dû 485 €');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Honoraires"] .r-btn')].find(b => /Saisir du temps/.test(b.textContent))?.click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const [h, m] = [...document.querySelectorAll('[role="dialog"] input[type="number"]')]; set.call(h, '1'); h.dispatchEvent(new Event('input', { bubbles: true })); set.call(m, '30'); m.dispatchEvent(new Event('input', { bubbles: true })); const ta = document.querySelector('[role="dialog"] textarea'); const setT = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; setT.call(ta, 'Préparation de l\\'audience de mise en état'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Saisir/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const t1 = await carte();
  ok(/1 h 30 de rédaction saisies/.test(t1) && /687,50\s€ HT/.test(t1), 'saisi : 1 h 30 de plus, à facturer 687,50 € HT');
  ok(/Préparation de l.audience de mise en état/.test(t1), 'la description se relit (chiffrée en base réelle)');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Honoraires"] .r-btn')].find(b => /Facturer/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const apercu = await s.evaluer(`document.querySelector('[role="dialog"]')?.innerText || ''`);
  ok(/687,50\s€/.test(apercu) && /825,00\s€/.test(apercu), 'l\'aperçu : 687,50 € HT, 825 € TTC');
  await s.capturer(`${dossier}tamila-facture-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Émettre la facture/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const t2 = await carte();
  ok(/H-2026-000042/.test(t2) && /0,00\s€ HT/.test(t2), 'la facture H-2026-000042 est émise, plus rien à facturer');
  await s.evaluer(`document.querySelector('section[aria-label="Honoraires"]')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}tamila-honoraires-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0398/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const t3 = await carte();
  ok(/Pas de convention d.honoraires signée/.test(t3), 'un dossier ouvert depuis deux mois sans convention est signalé (loi 1971, art. 10)');
  const gris = await s.evaluer(`[...document.querySelectorAll('section[aria-label="Honoraires"] .r-btn')].find(b => /Facturer/.test(b.textContent))?.disabled`);
  ok(gris === true, 'sans convention, « Facturer » reste gris');
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: 'b4-honoraires-390', densite: 1 });
  console.log('— la carte des honoraires à 390');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0412/.test(b.textContent))?.click()`);
  await s.dormir(600);
  await s.evaluer(`document.querySelector('section[aria-label="Honoraires"]')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  const m = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Honoraires"]'); const w = document.documentElement.clientWidth; const larges = [...c.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1; }).length; return { larges, deb: document.documentElement.scrollWidth - w }; })()`);
  ok(m.larges === 0 && m.deb === 0, `la carte tient dans 390 px (${m.larges} élément(s) trop large(s), débordement ${m.deb})`);
  await s.capturer(`${dossier}tamila-honoraires-390.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-conflits', densite: 1 });
  console.log('— les conflits d\'intérêts et la vigilance (b4_07)');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0430/.test(b.textContent))?.click()`);
  await s.dormir(600);
  const carte = () => s.evaluer(`document.querySelector('section[aria-label="Conflits d\\'intérêts et vigilance"]')?.innerText || ''`);
  const t0 = await carte();
  ok(/Jamais/.test(t0) && /2 sur 2/.test(t0), 'jamais contrôlé, deux parties indexées');
  ok(/vigilance LCB-FT n.est pas posée/.test(t0), 'la vigilance est à poser');
  ok(/Les noms ne sont jamais conservés en clair ; une empreinte reste pour détecter un conflit avec un ancien client\./.test(t0), 'la notice : pas de nom en clair, une empreinte reste pour les anciens clients');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Conflits d\\'intérêts et vigilance"] .r-btn')].find(b => /Contrôler les conflits/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const t1 = await carte();
  ok(/Moulin \(SCI du\)/.test(t1) && /1 conflit/.test(t1) && /Conflit : client dans le dossier 2026-0412/.test(t1), 'l\'adversaire « Moulin (SCI du) » est client dans 2026-0412 : un conflit, malgré l\'écriture différente');
  ok(/M\. Jean Garnier[\s\S]*Aucune correspondance/.test(t1), 'le client, jamais vu : aucune correspondance');
  ok(/1 conflit sans décision/.test(t1), 'un conflit sans décision est signalé (RIN art. 4)');
  await s.evaluer(`document.querySelector('section[aria-label="Conflits d\\'intérêts et vigilance"]')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}tamila-conflits-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Conflits d\\'intérêts et vigilance"] .esp-lien-bouton')].find(b => /Décider/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const options = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')][0] ? [...[...document.querySelectorAll('[role="dialog"] select')][0].options].map(o => o.value).join(',') : ''`);
  ok(options === 'conflit_leve,refus', `un conflit se lève ou le dossier se refuse, rien d'autre (${options})`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const t2 = await carte();
  ok(/Conflit levé/.test(t2) && !/conflit sans décision/.test(t2), 'le conflit est levé, plus rien à décider');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Conflits d\\'intérêts et vigilance"] .r-btn')].find(b => /Vigilance LCB-FT/.test(b.textContent))?.click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select'); sel.value = 'oui'; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(300);
  const champs = await s.evaluer(`document.querySelectorAll('[role="dialog"] select, [role="dialog"] input').length`);
  ok(champs === 6, `assujetti : activité, deux dates, pièce, risque (${champs} champs)`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const t3 = await carte();
  ok(/Transaction immobilière/.test(t3) && /identifiez le client et le bénéficiaire effectif/.test(t3), 'assujetti sans identification : encore à faire');
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-facture-imprimee', densite: 1 });
  console.log('— la facture imprimable (b4_09)');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0412/.test(b.textContent))?.click()`);
  await s.dormir(600);
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Honoraires"] .esp-lien-bouton')].find(b => /Imprimer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const apercu = () => s.evaluer(`document.querySelector('iframe.tam-facture-apercu')?.contentDocument?.body?.innerText || ''`);
  const f0 = await apercu();
  ok(/Facture/.test(f0) && /H-2026-000041/.test(f0), 'l\'aperçu de la facture H-2026-000041');
  ok(/SIREN 552100554/.test(f0) && /TVA FR40552100554/.test(f0) && /barreau de Paris/.test(f0), 'les mentions du cabinet : SIREN, TVA, barreau');
  ok(/SCI du Moulin/.test(f0), 'le client, déchiffré dans le navigateur');
  ok(/Rédaction — Rédaction des conclusions d.appelant/.test(f0) && /625,00/.test(f0) && /250,00/.test(f0), 'le détail du temps : 2 h 30 de rédaction × 250 € = 625 €');
  ok(/Reste à payer\s*485,00/.test(f0) && /Provisions reçues, déduites/.test(f0), 'provision déduite, reste à payer 485 €');
  ok(/indemnité forfaitaire de 40 €/.test(f0) && /L\.441-10/.test(f0) && /Échéance le/.test(f0), 'échéance, pénalités de retard et indemnité de 40 € (L.441-10, D.441-5)');
  await s.evaluer(`(() => { const ta = [...document.querySelectorAll('[role="dialog"] textarea')][0]; const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(ta, '3 chemin des Moulins\\n97100 Basse-Terre'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(500);
  ok(/97100 Basse-Terre/.test(await apercu()), 'l\'adresse du client tapée pour l\'impression apparaît sur la facture');
  await s.capturer(`${dossier}tamila-facture-imprimee-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] .esp-lien-bouton')].find(b => /Modifier l.en-tête/.test(b.textContent))?.click()`);
  await s.dormir(300);
  await s.evaluer(`(() => { const l = [...document.querySelectorAll('[role="dialog"] label')].find(l => /^Toque/.test(l.textContent)); const i = l.querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'P 0456'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer l.en-tête/.test(b.textContent))?.click()`);
  await s.dormir(500);
  ok(/toque P 0456/.test(await apercu()), 'le gérant modifie l\'en-tête : la toque change sur la facture');
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-avis-entrants', densite: 1 });
  console.log('— les avis RPVA reçus par courriel, à rattacher (b4_10)');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(600);
  const carte = () => s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Avis RPVA à rattacher"]'); return c ? { texte: c.innerText, lignes: c.querySelectorAll('.tam-ligne').length } : null; })()`);
  const c0 = await carte();
  ok(c0 && c0.lignes === 2, `la file montre ${c0?.lignes} avis à rattacher`);
  ok(/transite en clair chez le prestataire de courriel/.test(c0?.texte ?? '') && /sept jours au plus/.test(c0?.texte ?? ''), 'la mention honnête : le clair transite chez le prestataire, sept jours au plus');
  ok(/Dossier 2026-0412 \(même n° RG\)/.test(c0?.texte ?? ''), 'le dossier proposé par le n° RG cité (26/01234 → 2026-0412)');
  const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  await s.evaluer(axe + ';true');
  const analyser = (cible) => s.evaluer(`(async () => { const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
    return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')); })()`);
  const g1 = await analyser(`document.querySelector('section[aria-label="Avis RPVA à rattacher"]')`);
  ok(g1.length === 0, `axe sur la carte : ${g1.length ? g1.join(' ; ') : 'aucun écart grave'}`);
  await s.evaluer(`(e => { e?.focus(); e?.click(); })([...document.querySelectorAll('section[aria-label="Avis RPVA à rattacher"] .tam-ligne')][0]?.querySelector('.esp-lien-bouton'))`);
  await s.dormir(600);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const sel = d?.querySelector('select'); return d ? { titre: d.querySelector('h2')?.textContent, choisi: sel?.selectedOptions[0]?.textContent, citation: !!d.querySelector('.tam-citation') } : null; })()`);
  ok(dlg && /Rattacher l.avis/.test(dlg.titre) && /2026-0412/.test(dlg.choisi) && dlg.citation, `dialogue « ${dlg?.titre} », dossier présélectionné : ${dlg?.choisi}`);
  const g2 = await analyser(`document.querySelector('[role="dialog"]')`);
  ok(g2.length === 0, `axe sur le dialogue : ${g2.length ? g2.join(' ; ') : 'aucun écart grave'}`);
  await s.capturer(`${dossier}tamila-avis-entrant-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Chiffrer et rattacher/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const c1 = await carte();
  ok(c1 && c1.lignes === 1 && /Avis rattaché au dossier 2026-0412/.test(c1.texte) && /copie reçue par courriel est effacée/.test(c1.texte), 'rattaché : l\'avis quitte la file, la copie en clair est annoncée effacée');
  const ouvert = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`);
  ok(ouvert === '2026-0412', `le dossier rattaché s'ouvre (${ouvert})`);
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Avis RPVA à rattacher"] .esp-lien-bouton')].find(b => /Écarter/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Écarter\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(800);
  ok(await carte() === null, 'le dernier avis écarté : la file disparaît');
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-temps-propose', densite: 1 });
  console.log('— le temps proposé à la saisie, le forfait consommé (b4_12)');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(600);
  const hono = () => s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Honoraires"]'); return c ? c.innerText : ''; })()`);
  const ref = await s.evaluer(`document.querySelector('#esp-dossier .esp-carte-titre .esp-mono')?.textContent`);
  ok(ref === '2026-0377', `dossier au forfait ouvert d'office (${ref})`);
  const h0 = await hono();
  ok(/Forfait consommé/.test(h0) && /85 % du temps prévu/.test(h0), 'forfait : 85 % du temps prévu');
  ok(/17 h 00 passées sur 20 h 00 prévues/.test(h0) && /176,47\s€ HT de l.heure/.test(h0), '17 h sur 20 h, taux effectif 176,47 € de l\'heure');
  ok(/Plus de 80 % du temps prévu/.test(h0), 'l\'alerte à 80 %');
  const jauge = await s.evaluer(`(() => { const j = document.querySelector('section[aria-label="Honoraires"] .tam-jauge'); return j ? j.getAttribute('aria-valuenow') + '/' + j.dataset.teinte : null; })()`);
  ok(jauge === '85/ambre', `la jauge : ${jauge}`);
  ok(/Proposé à la saisie/.test(h0) && /Signifier les conclusions aux parties non constituées : déposé le/.test(h0), 'l\'acte déposé il y a cinq jours est proposé');
  ok(!/Accusé de dépôt/.test(h0.split('Proposé à la saisie')[1]?.split('Temps passé')[0] ?? ''), 'l\'accusé de dépôt n\'est pas proposé une seconde fois');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Temps proposé à la saisie"] .esp-lien-bouton, [aria-label="Temps proposé à la saisie"] .esp-lien-bouton')].find(b => /Ignorer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const h1 = await hono();
  ok(!/Proposé à la saisie/.test(h1) && /ne vous sera plus proposé/.test(h1), 'ignorée : la proposition disparaît');
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0412/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const h2 = await hono();
  ok(/Traitement : Ordonnance du conseiller de la mise en état du/.test(h2), 'dossier 2026-0412 : l\'ordonnance reçue est proposée');
  ok(!/Forfait consommé/.test(h2), 'au temps passé, pas de jauge de forfait');
  const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  await s.evaluer(axe + ';true');
  const graves = (cible) => s.evaluer(`(async () => { const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
    return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')); })()`);
  const g1 = await graves(`document.querySelector('section[aria-label="Honoraires"]')`);
  ok(g1.length === 0, `axe sur la carte Honoraires : ${g1.length ? g1.join(' ; ') : 'aucun écart grave'}`);
  await s.evaluer(`(e => { e?.focus(); e?.click(); })([...document.querySelectorAll('[aria-label="Temps proposé à la saisie"] .esp-lien-bouton')].find(b => /Saisir/.test(b.textContent)))`);
  await s.dormir(600);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const v = (l) => [...d.querySelectorAll('label')].find(x => x.textContent.startsWith(l))?.querySelector('input,select,textarea')?.value; return { titre: d.querySelector('h2')?.textContent, nature: v('Nature'), heures: v('Heures'), minutes: v('Minutes'), description: v('Ce qui a été fait') }; })()`);
  ok(dlg && dlg.nature === 'correspondance' && dlg.heures === '0' && dlg.minutes === '15' && /Ordonnance/.test(dlg.description), `formulaire pré-rempli : ${dlg?.nature}, ${dlg?.heures} h ${dlg?.minutes}`);
  const g2 = await graves(`document.querySelector('[role="dialog"]')`);
  ok(g2.length === 0, `axe sur le dialogue : ${g2.length ? g2.join(' ; ') : 'aucun écart grave'}`);
  await s.capturer(`${dossier}tamila-temps-propose-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Saisir\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const h3 = await hono();
  ok(!/Proposé à la saisie/.test(h3) && /0 h 15 de correspondance saisies/.test(h3), 'saisie : le temps entre au dossier, la proposition disparaît');
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b4-conflit-auto', densite: 1 });
  console.log('— le contrôle des conflits, automatique à l\'ajout d\'une partie');
  ok(await s.aller(base + '/espace/tamila'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /2026-0398/.test(b.textContent))?.click()`);
  await s.dormir(600);
  const carte = () => s.evaluer(`document.querySelector('section[aria-label="Conflits d\\'intérêts et vigilance"]')?.innerText || ''`);
  const ajouter = async (nom, qualite) => {
    await s.evaluer(`[...document.querySelectorAll('section[aria-label="Parties"] .r-btn')].find(b => /Ajouter/.test(b.textContent))?.click()`);
    await s.dormir(400);
    await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const champ = (l) => [...d.querySelectorAll('label')].find(x => x.textContent.startsWith(l))?.querySelector('input,select');
      const i = champ('Nom'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(nom)}); i.dispatchEvent(new Event('input', { bubbles: true }));
      const q = champ('Qualité'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(q, ${JSON.stringify(qualite)}); q.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await s.dormir(200);
    await s.evaluer(`document.querySelector('[role="dialog"] .r-btn--noir')?.click()`);
    await s.dormir(1300);
  };
  await ajouter('Moulin (SCI du)', 'adverse');
  const t1 = await carte();
  ok(/Contrôle automatique de « Moulin \(SCI du\) » : 1 conflit/.test(t1), 'l\'adversaire ajouté est contrôlé sans geste : un conflit (cliente dans 2026-0412)');
  ok(/Conflit : client dans le dossier 2026-0412/.test(t1) && /Décider/.test(t1), 'le conflit est nommé, la décision est proposée');
  const alerte = await s.evaluer(`[...document.querySelectorAll('section[aria-label="Conflits d\\'intérêts et vigilance"] [role="alert"]')].length`);
  ok(alerte >= 1, 'annoncé comme une alerte');
  await ajouter('Mme Paule Neuve', 'client');
  const t2 = await carte();
  ok(/Nouvelle partie contrôlée d.elle-même : aucun conflit/.test(t2) && /Paule Neuve[\s\S]*Aucune correspondance/.test(t2), 'un client jamais vu : contrôlé de lui-même, aucun conflit');
  ok(/Moulin \(SCI du\)/.test(t2), 'le conflit précédent reste affiché');
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
