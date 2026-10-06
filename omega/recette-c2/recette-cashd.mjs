/* recette-cashd.mjs — l'écran /espace/cashd aux cinq largeurs (session C2,
   06/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran,
   aucun mot anglais surveillé, l'encours échu au total, la balance âgée, les
   débiteurs, les relances écrites ; une capture légère dans omega/recette-c2/.
   Puis les enchaînements sur l'exemple : la fiche de la SCI (pièces, palier
   atteint, palier suivant), un règlement noté sur F-2026-101 (soldée, sa
   relance coupée, l'échu baisse), la pause de l'hôtel (sa mise en demeure
   coupée), le virement sans référence rapproché, un export collé (compte des
   lignes, colonnes reconnues).
   usage : node omega/recette-c2/recette-cashd.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Overdue|Payment|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Reminder|Customer)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];
const plat = (t) => (t || '').replace(/[  ]/g, ' ');

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-cashd', densite: 1 });
  console.log(`— /espace/cashd à ${largeur}`);
  ok(await s.aller(base + '/espace/cashd'), 'page chargée');
  await s.dormir(700);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: [...document.querySelectorAll('.esp-kpi')].map(k => (k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent)),
             items: document.querySelectorAll('section[aria-label="Débiteurs"] .esp-item').length,
             segments: document.querySelectorAll('.c2-segment').length,
             relances: document.querySelectorAll('#c2-relances .c2-relances > li').length,
             pieces: document.querySelectorAll('#c2-fiche .c2-pieces tbody tr').length };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Relances', `titre : ${mesure.h1}`);
  ok(/Encours échu = 17 810,00 €/.test(plat(mesure.kpis.join(' | '))), `encours échu au total : ${plat(mesure.kpis[0])}`);
  ok(mesure.items === 5, `${mesure.items} débiteurs listés (5 attendus)`);
  ok(mesure.segments === 4, `balance âgée : ${mesure.segments} tranches non vides (4 attendues)`);
  ok(mesure.relances === 5, `${mesure.relances} relances écrites (5 attendues)`);
  ok(mesure.pieces === 3, `la fiche ouverte d'office (SCI Lefèvre) porte ${mesure.pieces} pièces (3 attendues)`);
  console.log('    compteurs :', plat(mesure.kpis.join(' · ')));
  await s.capturer(`${dossier}cashd-${largeur}.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-gestes', densite: 1 });
  console.log('— /espace/cashd : la fiche, un règlement, une pause, un rapprochement, un dépôt (exemple)');
  ok(await s.aller(base + '/espace/cashd'), 'page chargée');
  await s.dormir(500);
  const fiche = await s.evaluer(`(() => { const f = document.querySelector('#c2-fiche'); return { titre: f.querySelector('.esp-carte-titre')?.textContent, lignes: [...f.querySelectorAll('.c2-pieces tbody tr')].map(r => r.innerText.replace(/\\s+/g, ' ')) }; })()`);
  ok(fiche.titre === 'SCI Lefèvre Patrimoine', `fiche ouverte : ${fiche.titre}`);
  ok(fiche.lignes.some((l) => /F-2026-101/.test(l) && /45 j de retard/.test(l) && /Rappel courtois/.test(l) && /Suivant : relance ferme/.test(l)), 'F-2026-101 : 45 jours de retard, rappel courtois atteint, relance ferme ensuite');
  ok(fiche.lignes.some((l) => /D-2026-033/.test(l) && /5 j sans réponse/.test(l)), 'le devis porte ses jours sans réponse');
  /* noter un règlement de 12 000 € sur F-2026-101 */
  await s.evaluer(`(() => { const r = [...document.querySelectorAll('#c2-fiche .c2-pieces tbody tr')].find(x => /F-2026-101/.test(x.innerText)); [...r.querySelectorAll('button')].find(b => /Règlement/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, montant: d.querySelector('input[inputmode="decimal"]')?.value } : null; })()`);
  ok(dlg && dlg.titre === 'Noter un règlement' && dlg.montant === '12000', `dialogue « ${dlg?.titre} », montant prérempli ${dlg?.montant}`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const apres = await s.evaluer(`(() => ({ kpi: document.querySelector('.esp-kpi .esp-kpi-valeur')?.textContent, fait: document.querySelector('#c2-fiche .esp-avis')?.innerText || '', coupee: [...document.querySelectorAll('#c2-relances .c2-relances > li')].find(x => /SCI Lefèvre/.test(x.innerText) && /Rappel courtois/.test(x.innerText))?.innerText || '' }))()`);
  ok(/C.est fait/.test(apres.fait) && /coupée/.test(apres.fait), `le règlement est noté et lettré : « ${apres.fait.slice(0, 90)} »`);
  ok(plat(apres.kpi) === '5 810,00 €', `l'encours échu baisse à ${plat(apres.kpi)}`);
  ok(/Coupée/.test(apres.coupee) && /facture réglée/.test(apres.coupee), 'la relance prête de F-2026-101 est coupée avant l\'envoi');
  await s.capturer(`${dossier}cashd-reglement-1440.jpg`, { qualite: 55 });
  /* l'hôtel en pause : sa mise en demeure coupée */
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Débiteurs"] .esp-item')].find(b => /Hôtel des Brotteaux/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('#c2-fiche .esp-actions button')].find(b => /Mettre en pause/.test(b.textContent)).click()`);
  await s.dormir(400);
  const gris = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))?.disabled`);
  ok(gris === true, 'sans motif, la pause ne se valide pas');
  await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Le directeur a appelé : virement promis vendredi'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const pause = await s.evaluer(`(() => ({ pastille: document.querySelector('#c2-fiche .esp-carte-tete .esp-pastille')?.textContent, reprendre: [...document.querySelectorAll('#c2-fiche .esp-actions button')].some(b => /Reprendre/.test(b.textContent)), med: [...document.querySelectorAll('#c2-relances .c2-relances > li')].find(x => /Hôtel/.test(x.innerText))?.innerText || '' }))()`);
  ok(pause.pastille === 'En pause' && pause.reprendre, 'l\'hôtel est en pause ; seul « Reprendre les relances » est proposé');
  ok(/Mise en demeure/.test(pause.med) && /Coupée/.test(pause.med), 'sa mise en demeure prête est coupée');
  /* le virement sans référence */
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Règlements à rapprocher"] button')].find(b => /Factures probables/.test(b.textContent)).click()`);
  await s.dormir(300);
  const prop = await s.evaluer(`document.querySelector('section[aria-label="Règlements à rapprocher"] .c2-propositions')?.innerText || ''`);
  ok(/F-2026-088/.test(prop) && /Peintures Giraud/.test(prop), `la facture probable est proposée : ${prop.replace(/\\s+/g, ' ').slice(0, 80)}`);
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Règlements à rapprocher"] .c2-propositions button')].find(b => /Lettrer/.test(b.textContent)).click()`);
  await s.dormir(600);
  const rapproche = await s.evaluer(`(() => ({ section: !!document.querySelector('section[aria-label="Règlements à rapprocher"]'), kpi: document.querySelector('.esp-kpi .esp-kpi-valeur')?.textContent }))()`);
  ok(!rapproche.section && plat(rapproche.kpi) === '3 960,00 €', `rapproché : plus rien à rapprocher, l'échu tombe à ${plat(rapproche.kpi)}`);
  /* un export collé */
  await s.evaluer(`[...document.querySelectorAll('.esp-tete button')].find(b => /Déposer un export/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'N° facture;Code client;Client;Date de facture;Échéance;Montant TTC;Reste dû;Commentaire\\nF-2026-160;C-ROUX;Menuiserie Roux;01/09/2026;01/10/2026;1 200,00;1 200,00;x\\nF-2026-161;C-ROUX;Menuiserie Roux;02/09/2026;02/10/2026;800,00;800,00;y'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(300);
  const lu = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { avis: d.querySelector('.esp-avis')?.innerText || '', bouton: [...d.querySelectorAll('button')].find(b => /Déposer/.test(b.textContent))?.textContent.trim(), actif: ![...d.querySelectorAll('button')].find(b => /Déposer/.test(b.textContent))?.disabled }; })()`);
  ok(/2 lignes lues/.test(lu.avis) && /Ignorées : Commentaire/.test(lu.avis) && lu.actif, `export collé : « ${lu.avis.slice(0, 120)} »`);
  await s.capturer(`${dossier}cashd-depot-1440.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: 'c2-mobile', densite: 1 });
  console.log('— /espace/cashd : la relance dépliée et la fiche à 390');
  ok(await s.aller(base + '/espace/cashd'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`document.querySelector('#c2-relances details')?.setAttribute('open', '')`);
  await s.dormir(200);
  const r = await s.evaluer(`(() => { const w = document.documentElement.clientWidth; const pre = document.querySelector('#c2-relances .c2-corps'); return { deb: document.documentElement.scrollWidth - w, texte: pre?.innerText || '' }; })()`);
  ok(r.deb === 0, `relance dépliée : pas de débordement (${r.deb})`);
  ok(/Sauf erreur de notre part/.test(r.texte) && /C-LEFEVRE, secteur Immobilier/.test(r.texte), 'le texte de la relance se lit en entier');
  await s.evaluer(`document.querySelector('#c2-relances').scrollIntoView()`);
  await s.dormir(200);
  await s.capturer(`${dossier}cashd-relance-390.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-palier4', densite: 1 });
  console.log('— /espace/cashd : échéancier, contestation partielle, plafond, tableur (exemple)');
  ok(await s.aller(base + '/espace/cashd'), 'page chargée');
  await s.dormir(500);
  const prev = await s.evaluer(`document.querySelector('.c2-prevision')?.innerText || ''`);
  ok(/Encaissements attendus/.test(prev) && /30 jours/.test(prev) && /60 jours/.test(prev), `prévision : « ${plat(prev).slice(0, 110)} »`);
  ok(await s.evaluer(`[...document.querySelectorAll('section[aria-label="Débiteurs"] .esp-lien-bouton')].some(b => /Tableur/.test(b.textContent))`), 'la balance s\'exporte vers un tableur');
  const pil = await s.evaluer(`document.querySelector('section[aria-label="Pilotage"]')?.innerText || ''`);
  ok(/Taux de réponse par palier/i.test(pil) && /Rappel courtois/.test(pil) && /Arrêtés de la balance/i.test(pil) && /Tableur/.test(pil), 'pilotage : taux de réponse par palier et arrêtés téléchargeables');
  /* l'échéancier de F-2026-101 en trois mensualités */
  await s.evaluer(`(() => { const r = [...document.querySelectorAll('#c2-fiche .c2-pieces tbody tr')].find(x => /F-2026-101/.test(x.innerText)); [...r.querySelectorAll('button')].find(b => /Échéancier/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  const ech = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { titre: d.querySelector('h2')?.textContent, lignes: d.querySelectorAll('input[type="date"]').length, total: d.querySelector('.c2-sous')?.textContent || '', gris: [...d.querySelectorAll('button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))?.disabled }; })()`);
  ok(/Échéancier de F-2026-101/.test(ech.titre) && ech.lignes === 3 && /12 000,00/.test(plat(ech.total)) && ech.gris === true, `trois mensualités proposées (total ${plat(ech.total)}), motif exigé`);
  await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Accord avec Mme Lefèvre par téléphone'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const apresEch = await s.evaluer(`(() => ({ fait: document.querySelector('#c2-fiche .esp-avis')?.innerText || '', ligne: [...document.querySelectorAll('#c2-fiche .c2-pieces tbody tr')].find(x => /F-2026-101/.test(x.innerText))?.innerText || '' }))()`);
  ok(/Échéancier posé/.test(apresEch.fait) && /échéancier \(au lieu du/.test(apresEch.ligne), 'l\'échéancier remplace l\'échéance d\'origine, qui reste lisible');
  /* la contestation partielle de l'hôtel */
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Débiteurs"] .esp-item')].find(b => /Hôtel des Brotteaux/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const r = [...document.querySelectorAll('#c2-fiche .c2-pieces tbody tr')].find(x => /F-2026-050/.test(x.innerText)); [...r.querySelectorAll('button')].find(b => /Contestation partielle/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const i = d.querySelector('input[inputmode="decimal"]'); set.call(i, '1000'); i.dispatchEvent(new Event('input', { bubbles: true })); const t = d.querySelector('textarea'); const st = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; st.call(t, 'Le client conteste la ligne pose'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const conteste = await s.evaluer(`[...document.querySelectorAll('#c2-fiche .c2-pieces tbody tr')].find(x => /F-2026-050/.test(x.innerText))?.innerText || ''`);
  ok(/dont 1 000,00 € contestés/.test(plat(conteste)), 'la part contestée se lit sur la facture');
  const kpi = await s.evaluer(`document.querySelector('.esp-kpi .esp-kpi-valeur')?.textContent`);
  ok(plat(kpi) === '4 810,00 €', `l'échu ne compte plus la part contestée ni la facture sous échéancier : ${plat(kpi)}`);
  /* le plafond proposé */
  await s.evaluer(`[...document.querySelectorAll('#c2-fiche .esp-actions button')].find(b => /Plafond/.test(b.textContent)).click()`);
  await s.dormir(500);
  const pl = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { desc: d.querySelector('p')?.textContent || '', valeur: d.querySelector('input[inputmode="decimal"]')?.value } : null; })()`);
  ok(pl && /historique/.test(pl.desc) && Number(pl.valeur) > 0, `un plafond est proposé depuis l'historique : ${pl?.valeur} €`);
  await s.capturer(`${dossier}cashd-plafond-1440.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\nRecette CASHD : tout est vert.');
process.exit(echecs ? 1 : 0);
