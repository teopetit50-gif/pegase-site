/* recette-cashd.mjs — les écrans CASHD de l'espace 2 aux cinq largeurs
   (session C2 ; écrite le 06/10/2026 pour /espace/cashd, réécrite le
   25/10/2026 pour /espace2).

   Depuis le 22/10, /espace2/cashd/suivi rend chaque vue en page Supabase :
   Débiteurs (grille et fiche dans le volet de droite), Relances (relances
   écrites, bons de commande, vos textes), Envois (journal à filtres),
   Trésorerie (balance âgée, prévision, pilotage, taux, à rapprocher). On
   passe d'une vue à l'autre par le volet de gauche (?vue=…) : la navigation
   reste côté client, l'état de l'exemple survit d'une vue à l'autre. Plus
   d'onglets ni de compteurs en tête : l'encours échu se lit au pied de la
   grille des débiteurs et sur le tableau de bord /espace2/cashd.

   Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : le tableau de
   bord, les quatre vues et les cinq pages de fonction chargent, sans
   débordement (une grille qui défile dans son propre cadre est permise),
   sans mot anglais surveillé ; puis les enchaînements sur l'exemple : la
   fiche, un règlement, une pause, un rapprochement, un dépôt, l'échéancier,
   la contestation partielle, le plafond, vos textes (et l'adresse de
   paiement, c2_40), les gestes de la fiche, une réponse à trancher, l'envoi
   à la main, les rappels sous accord, le texte du jour d'échéance, les taux.

   usage : node omega/recette-c2/recette-cashd.mjs [origine] [session.json]
   Avec un fichier de session Supabase (réponse de
   POST /auth/v1/token?grant_type=password, jamais commité), la recette pose
   le cookie de session, bascule sur la base réelle et relit les pages sans
   rien écrire (voir le bloc « base réelle » en fin de fichier). */
import { mkdirSync, readFileSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const fichierSession = process.argv[3] ?? null;
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Overdue|Payment|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Reminder|Customer)\b/;
const SUIVI = '/espace2/cashd/suivi';
const LARGEURS = [390, 768, 1024, 1440, 1700];
const plat = (t) => (t || '').replace(/[\u202f\u00a0]/g, ' ');
const F = 'aside[aria-label="Fiche du compte"]';
const T = '.sb-textes';
const TITRES = { debiteurs: 'Débiteurs', relances: 'Relances', envois: 'Envois', tresorerie: 'Trésorerie' };
const FONCTIONS = [['', 'Tableau de bord'], ['/balance', 'Balance âgée'], ['/litiges', 'Litiges et pauses'], ['/risque', 'Risque client'], ['/devis', 'Devis sans réponse'], ['/encaissements', 'Encaissements']];

/* une vue par le volet de gauche : un lien Next, la page ne se recharge pas */
const titre = `document.querySelector('main h1')?.textContent.trim()`;
const vue = async (s, cle) => {
  await s.evaluer(`document.querySelector('a[href="${SUIVI}?vue=${cle}"]')?.click()`);
  for (let i = 0; i < 80; i++) {
    await s.dormir(250);
    if (await s.evaluer(`${titre} === ${JSON.stringify(TITRES[cle])} && !document.querySelector('.esp-charge')`)) break;
  }
  await s.dormir(300);
};
const saisir = (selecteur, valeur, type = 'HTMLTextAreaElement') => `(() => { const e = document.querySelector(${JSON.stringify(selecteur)}); const set = Object.getOwnPropertyDescriptor(${type}.prototype, 'value').set; set.call(e, ${JSON.stringify(valeur)}); e.dispatchEvent(new Event(${type === 'HTMLSelectElement' ? "'change'" : "'input'"}, { bubbles: true })); })()`;
/* un élément plus large que l'écran, hors d'un cadre qui défile (ou coupe) dans les limites de l'écran */
const DEBORDE = `(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { if (getComputedStyle(p).overflowX !== 'visible' && p.getBoundingClientRect().right <= w + 1) return true; } return false; };
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '' };
  })()`;
const mesurer = async (s, nom) => {
  const m = await s.evaluer(DEBORDE);
  ok(m.deb === 0 && m.larges.length === 0, `${nom} : pas de débordement (${m.deb}) ${m.larges.length ? JSON.stringify(m.larges) : ''}`);
  const anglais = m.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `${nom} : mot anglais « ${anglais[0]} »` : `${nom} : aucun mot anglais surveillé`);
};
const soucis = (s) => s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
const pied = (s) => s.evaluer(`document.querySelector('.sb-donnees-pied')?.innerText || ''`);
const ouvrirCompte = async (s, nom) => {
  await s.evaluer(`[...document.querySelectorAll('.sb-grille-donnees tbody tr')].find(r => r.innerText.includes(${JSON.stringify(nom)}))?.click()`);
  await s.dormir(400);
};
const boutonValider = `[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider\\s*$/.test(b.textContent))`;
const valider = async (s) => { await s.evaluer(`${boutonValider}?.click()`); await s.dormir(600); };

if (!fichierSession) {

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-cashd', densite: 1 });
  console.log(`— /espace2/cashd à ${largeur}`);
  for (const [chemin, nom] of FONCTIONS) {
    ok(await s.aller(base + '/espace2/cashd' + chemin), `${nom} : page chargée`);
    await mesurer(s, nom);
    if (!chemin) {
      const t = plat(await s.evaluer(`document.querySelector('main')?.innerText || ''`));
      ok(/17 810,00 €/.test(t), 'tableau de bord : l\'encours échu au total (17 810,00 €)');
    }
  }
  ok(await s.aller(base + SUIVI), 'Débiteurs : page chargée');
  await s.dormir(500);
  await mesurer(s, 'Débiteurs');
  const d = await s.evaluer(`(() => ({ h1: ${titre}, lignes: document.querySelectorAll('.sb-grille-donnees tbody tr').length, essai: !!document.querySelector('.sb-badge[data-teinte="ambre"]'), fiche: document.querySelector('${F} .esp-carte-titre')?.textContent, pieces: document.querySelectorAll('${F} .c2-pieces tbody tr').length }))()`);
  ok(d.h1 === 'Débiteurs' && d.lignes === 5, `${d.lignes} débiteurs listés sous le titre « ${d.h1} » (5 attendus)`);
  ok(/Total : 5 comptes · 17 810,00 € échus sur 26 210,00 €/.test(plat(await pied(s))), `l'encours échu au total, au pied de la grille : ${plat(await pied(s))}`);
  ok(d.essai, 'le mode essai est dit');
  ok(d.fiche === 'SCI Lefèvre Patrimoine' && d.pieces === 3, `la fiche ouverte d'office (${d.fiche}) porte ${d.pieces} pièces (3 attendues)`);
  await s.capturer(`${dossier}cashd-${largeur}.jpg`, { qualite: 55 });
  for (const [cle, compte, attendu, dit] of [
    ['relances', `document.querySelectorAll('#c2-relances .c2-relances > li').length + '/' + !!document.querySelector('${T}')`, '5/true', 'cinq relances écrites, et vos textes'],
    ['envois', `document.querySelectorAll('.sb-journal-table tbody tr').length`, '1', 'la relance partie'],
    ['tresorerie', `document.querySelectorAll('.c2-segment').length + '/' + !!document.querySelector('section[aria-label="Pilotage"]')`, '4/true', 'quatre tranches, le pilotage'],
  ]) {
    await vue(s, cle);
    const nom = TITRES[cle];
    ok(await s.evaluer(titre) === nom, `${nom} : ouverte par le volet`);
    await mesurer(s, nom);
    const n = String(await s.evaluer(compte));
    ok(n === attendu, `${nom} : ${n} (attendu ${attendu} — ${dit})`);
    if (largeur === 390 || largeur === 1440) await s.capturer(`${dossier}cashd-${cle}-${largeur}.jpg`, { qualite: 55 });
  }
  soucis(s);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-gestes', densite: 1 });
  console.log('— la fiche, un règlement, une pause, un rapprochement, un dépôt (exemple)');
  ok(await s.aller(base + SUIVI), 'page chargée');
  await s.dormir(500);
  const fiche = await s.evaluer(`(() => { const f = document.querySelector('${F}'); return { titre: f?.querySelector('.esp-carte-titre')?.textContent, lignes: [...(f?.querySelectorAll('.c2-pieces tbody tr') ?? [])].map(r => r.innerText.replace(/\\s+/g, ' ')) }; })()`);
  ok(fiche.titre === 'SCI Lefèvre Patrimoine', `fiche ouverte : ${fiche.titre}`);
  ok(fiche.lignes.some((l) => /F-2026-101/.test(l) && /45 j de retard/.test(l) && /Rappel courtois/.test(l) && /Suivant : relance ferme/.test(l)), 'F-2026-101 : 45 jours de retard, rappel courtois atteint, relance ferme ensuite');
  ok(fiche.lignes.some((l) => /D-2026-033/.test(l) && /5 j sans réponse/.test(l)), 'le devis porte ses jours sans réponse');
  /* noter un règlement de 12 000 € sur F-2026-101 */
  await s.evaluer(`(() => { const r = [...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => /F-2026-101/.test(x.innerText)); [...r.querySelectorAll('button')].find(b => /Règlement/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, montant: d.querySelector('input[inputmode="decimal"]')?.value } : null; })()`);
  ok(dlg && dlg.titre === 'Noter un règlement' && dlg.montant === '12000', `dialogue « ${dlg?.titre} », montant prérempli ${dlg?.montant}`);
  await valider(s);
  const faitReglement = await s.evaluer(`document.querySelector('${F} .esp-avis')?.innerText || ''`);
  ok(/C.est fait/.test(faitReglement) && /coupée/.test(faitReglement), `le règlement est noté et lettré : « ${faitReglement.slice(0, 90)} »`);
  ok(/5 810,00 € échus/.test(plat(await pied(s))), `l'encours échu baisse : ${plat(await pied(s))}`);
  await vue(s, 'relances');
  const coupee = await s.evaluer(`[...document.querySelectorAll('#c2-relances .c2-relances > li')].find(x => /SCI Lefèvre/.test(x.innerText) && /Rappel courtois/.test(x.innerText))?.innerText || ''`);
  ok(/Coupée/.test(coupee) && /facture réglée/.test(coupee), 'la relance prête de F-2026-101 est coupée avant l\'envoi');
  await s.capturer(`${dossier}cashd-reglement-1440.jpg`, { qualite: 55 });
  /* l'hôtel en pause : sa mise en demeure coupée */
  await vue(s, 'debiteurs');
  await ouvrirCompte(s, 'Hôtel des Brotteaux');
  await s.evaluer(`[...document.querySelectorAll('${F} .esp-actions button')].find(b => /Mettre en pause/.test(b.textContent)).click()`);
  await s.dormir(400);
  ok(await s.evaluer(`${boutonValider}?.disabled`) === true, 'sans motif, la pause ne se valide pas');
  await s.evaluer(saisir('[role="dialog"] textarea', 'Le directeur a appelé : virement promis vendredi'));
  await s.dormir(200);
  await valider(s);
  const pauseFiche = await s.evaluer(`(() => ({ pastille: document.querySelector('${F} .esp-carte-tete .esp-pastille')?.textContent, reprendre: [...document.querySelectorAll('${F} .esp-actions button')].some(b => /Reprendre/.test(b.textContent)), ligne: [...document.querySelectorAll('.sb-grille-donnees tbody tr')].find(r => /Hôtel/.test(r.innerText))?.innerText || '' }))()`);
  ok(pauseFiche.pastille === 'En pause' && pauseFiche.reprendre && /En pause/.test(pauseFiche.ligne), 'l\'hôtel est en pause, dans la grille comme dans sa fiche ; seul « Reprendre les relances » est proposé');
  await vue(s, 'relances');
  const med = await s.evaluer(`[...document.querySelectorAll('#c2-relances .c2-relances > li')].find(x => /Hôtel/.test(x.innerText))?.innerText || ''`);
  ok(/Mise en demeure/.test(med) && /Coupée/.test(med), 'sa mise en demeure prête est coupée');
  /* le virement sans référence */
  await vue(s, 'tresorerie');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Règlements à rapprocher"] button')].find(b => /Factures probables/.test(b.textContent)).click()`);
  await s.dormir(300);
  const prop = await s.evaluer(`document.querySelector('section[aria-label="Règlements à rapprocher"] .c2-propositions')?.innerText || ''`);
  ok(/F-2026-088/.test(prop) && /Peintures Giraud/.test(prop), `la facture probable est proposée : ${prop.replace(/\s+/g, ' ').slice(0, 80)}`);
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Règlements à rapprocher"] .c2-propositions button')].find(b => /Lettrer/.test(b.textContent)).click()`);
  await s.dormir(600);
  const reste = await s.evaluer(`!!document.querySelector('section[aria-label="Règlements à rapprocher"]')`);
  await vue(s, 'debiteurs');
  ok(!reste && /3 960,00 € échus/.test(plat(await pied(s))), `rapproché : plus rien à rapprocher, l'échu tombe (${plat(await pied(s))})`);
  /* un export collé */
  await s.evaluer(`[...document.querySelectorAll('main button')].find(b => /Déposer un export/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(saisir('[role="dialog"] textarea', 'N° facture;Code client;Client;Date de facture;Échéance;Montant TTC;Reste dû;Commentaire\nF-2026-160;C-ROUX;Menuiserie Roux;01/09/2026;01/10/2026;1 200,00;1 200,00;x\nF-2026-161;C-ROUX;Menuiserie Roux;02/09/2026;02/10/2026;800,00;800,00;y'));
  await s.dormir(300);
  const lu = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const b = [...d.querySelectorAll('button')].find(b => /Déposer/.test(b.textContent)); return { avis: d.querySelector('.esp-avis')?.innerText || '', actif: !!b && !b.disabled }; })()`);
  ok(/2 lignes lues/.test(lu.avis) && /Ignorées : Commentaire/.test(lu.avis) && lu.actif, `export collé : « ${lu.avis.slice(0, 120)} »`);
  await s.capturer(`${dossier}cashd-depot-1440.jpg`, { qualite: 55 });
  soucis(s);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: 'c2-mobile', densite: 1 });
  console.log('— la relance dépliée et la fiche à 390');
  ok(await s.aller(base + SUIVI + '?vue=relances'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(`document.querySelector('#c2-relances details')?.setAttribute('open', '')`);
  await s.dormir(200);
  const r = await s.evaluer(`(() => { const w = document.documentElement.clientWidth; const pre = document.querySelector('#c2-relances .c2-corps'); return { deb: document.documentElement.scrollWidth - w, texte: pre?.innerText || '', droite: Math.round(pre?.getBoundingClientRect().right ?? 0) }; })()`);
  ok(r.deb === 0 && r.droite <= 390, `relance dépliée : pas de débordement (${r.deb}, bord droit ${r.droite})`);
  ok(/Sauf erreur de notre part/.test(r.texte) && /C-LEFEVRE, secteur Immobilier/.test(r.texte), 'le texte de la relance se lit en entier');
  await s.evaluer(`document.querySelector('#c2-relances').scrollIntoView()`);
  await s.dormir(200);
  await s.capturer(`${dossier}cashd-relance-390.jpg`, { qualite: 55 });
  await vue(s, 'debiteurs');
  const f = await s.evaluer(`(() => { const a = document.querySelector('${F}'); const r = a?.getBoundingClientRect(); return a ? { gauche: Math.round(r.left), droite: Math.round(r.right), titre: a.querySelector('.esp-carte-titre')?.textContent } : null; })()`);
  ok(f && f.gauche >= 0 && f.droite <= 390 && f.titre === 'SCI Lefèvre Patrimoine', `la fiche tient dans l'écran (${f?.gauche} → ${f?.droite})`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-palier4', densite: 1 });
  console.log('— échéancier, contestation partielle, plafond, tableur (exemple)');
  ok(await s.aller(base + SUIVI + '?vue=tresorerie'), 'page chargée');
  await s.dormir(500);
  const prev = await s.evaluer(`document.querySelector('.c2-prevision')?.innerText || ''`);
  ok(/Encaissements attendus/.test(prev) && /30 jours/.test(prev) && /60 jours/.test(prev), `prévision : « ${plat(prev).slice(0, 110)} »`);
  const pil = await s.evaluer(`document.querySelector('section[aria-label="Pilotage"]')?.innerText || ''`);
  ok(/Taux de réponse par palier/i.test(pil) && /Rappel courtois/.test(pil) && /Arrêtés de la balance/i.test(pil) && /Tableur/.test(pil), 'pilotage : taux de réponse par palier et arrêtés téléchargeables');
  await vue(s, 'debiteurs');
  ok(await s.evaluer(`[...document.querySelectorAll('.sb-donnees-outils button')].some(b => /Tableur/.test(b.textContent))`), 'la balance s\'exporte vers un tableur');
  /* l'échéancier de F-2026-101 en trois mensualités */
  await s.evaluer(`(() => { const r = [...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => /F-2026-101/.test(x.innerText)); [...r.querySelectorAll('button')].find(b => /Échéancier/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  const ech = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { titre: d.querySelector('h2')?.textContent, lignes: d.querySelectorAll('input[type="date"]').length, total: d.querySelector('.c2-sous')?.textContent || '', gris: ${boutonValider}?.disabled }; })()`);
  ok(/Échéancier de F-2026-101/.test(ech.titre) && ech.lignes === 3 && /12 000,00/.test(plat(ech.total)) && ech.gris === true, `trois mensualités proposées (total ${plat(ech.total)}), motif exigé`);
  await s.evaluer(saisir('[role="dialog"] textarea', 'Accord avec Mme Lefèvre par téléphone'));
  await s.dormir(200);
  await valider(s);
  const apresEch = await s.evaluer(`(() => ({ fait: document.querySelector('${F} .esp-avis')?.innerText || '', ligne: [...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => /F-2026-101/.test(x.innerText))?.innerText || '' }))()`);
  ok(/Échéancier posé/.test(apresEch.fait) && /échéancier \(au lieu du/.test(apresEch.ligne), 'l\'échéancier remplace l\'échéance d\'origine, qui reste lisible');
  /* la contestation partielle de l'hôtel */
  await ouvrirCompte(s, 'Hôtel des Brotteaux');
  await s.evaluer(`(() => { const r = [...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => /F-2026-050/.test(x.innerText)); [...r.querySelectorAll('button')].find(b => /Contestation partielle/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  await s.evaluer(saisir('[role="dialog"] input[inputmode="decimal"]', '1000', 'HTMLInputElement'));
  await s.evaluer(saisir('[role="dialog"] textarea', 'Le client conteste la ligne pose'));
  await s.dormir(200);
  await valider(s);
  const conteste = await s.evaluer(`[...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => /F-2026-050/.test(x.innerText))?.innerText || ''`);
  ok(/dont 1 000,00 € contestés/.test(plat(conteste)), 'la part contestée se lit sur la facture');
  ok(/4 810,00 € échus/.test(plat(await pied(s))), `l'échu ne compte plus la part contestée ni la facture sous échéancier : ${plat(await pied(s))}`);
  /* le plafond proposé */
  await s.evaluer(`[...document.querySelectorAll('${F} .esp-actions button')].find(b => /Plafond/.test(b.textContent)).click()`);
  await s.dormir(500);
  const pl = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { desc: d.querySelector('p')?.textContent || '', valeur: d.querySelector('input[inputmode="decimal"]')?.value } : null; })()`);
  ok(pl && /historique/.test(pl.desc) && Number(pl.valeur) > 0, `un plafond est proposé depuis l'historique : ${pl?.valeur} €`);
  await s.capturer(`${dossier}cashd-plafond-1440.jpg`, { qualite: 55 });
  soucis(s);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-textes', densite: 1 });
  console.log('— vos textes, l\'adresse de paiement, le bon de commande, le solde, l\'accord oral (exemple)');
  ok(await s.aller(base + SUIVI + '?vue=relances'), 'page chargée');
  await s.dormir(500);
  const lire = () => s.evaluer(`(() => { const t = document.querySelector('${T}'); return { pastille: t.querySelector('.c2-tete-droite .esp-pastille')?.textContent || '', apercu: t.querySelector('.c2-corps')?.innerText || '', avis: [...t.querySelectorAll('.esp-avis')].map(a => a.innerText).join(' | '), enregistrer: [...t.querySelectorAll('button')].find(b => /Enregistrer ce texte/.test(b.textContent))?.disabled, variantes: t.querySelectorAll('select')[2]?.options.length, reglages: [...t.querySelectorAll('button')].find(b => /Enregistrer ces réglages/.test(b.textContent))?.disabled }; })()`);
  let v = await lire();
  ok(/Texte par défaut/.test(v.pastille) && /Sauf erreur de notre part/.test(v.apercu) && /C-LEFEVRE/.test(v.apercu) && !/\{/.test(v.apercu) && v.variantes === 3,
     `le rappel par défaut, rempli sur l'exemple, en trois variantes possibles (${v.pastille})`);
  ok(await s.evaluer(`[...document.querySelectorAll('${T} .sb-modeles button')].length`) === 6, 'les six modèles sont listés');
  const corps = await s.evaluer(`document.querySelector('${T} textarea').value`);
  await s.evaluer(saisir(`${T} textarea`, corps.replace('{lignes}', '')));
  await s.dormir(200);
  v = await lire();
  ok(/exige dans le corps : \{lignes\}/.test(v.avis) && v.enregistrer === true, 'sans {lignes}, le texte ne s\'enregistre pas');
  await s.evaluer(saisir(`${T} textarea`, corps.replace('Sauf erreur de notre part', "Petit mot de l'atelier. Sauf erreur de notre part")));
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('${T} button')].find(b => /Enregistrer ce texte/.test(b.textContent)).click()`);
  await s.dormir(400);
  v = await lire();
  ok(/Votre texte/.test(v.pastille) && /Petit mot de l'atelier/.test(v.apercu) && /Texte enregistré/.test(v.avis), 'le texte de l\'organisation est enregistré et se lit dans l\'aperçu');
  await s.evaluer(`[...document.querySelectorAll('${T} button')].find(b => /Revenir au texte par défaut/.test(b.textContent)).click()`);
  await s.dormir(400);
  v = await lire();
  ok(/Texte par défaut/.test(v.pastille) && !/Petit mot/.test(v.apercu), 'rendu au texte par défaut');
  /* c2_40 : l'adresse de paiement, reprise sous la facture dans l'aperçu */
  ok(!/Régler en ligne/.test(v.apercu), 'sans adresse de paiement, l\'aperçu n\'en montre pas');
  await s.evaluer(saisir(`${T} input[placeholder^="https://"]`, 'http://paiement.example/f/{numero}', 'HTMLInputElement'));
  await s.dormir(200);
  v = await lire();
  ok(v.reglages === true && /commence par https:\/\//.test(await s.evaluer(`document.querySelector('${T}').innerText`)) && !/Régler en ligne/.test(v.apercu), 'une adresse sans https:// ne s\'enregistre pas, et l\'écran le dit');
  await s.evaluer(saisir(`${T} input[placeholder^="https://"]`, 'https://paiement.example/f/{numero}?montant={montant}', 'HTMLInputElement'));
  await s.dormir(200);
  v = await lire();
  ok(/F-2026-101[^\n]*\n\s+Régler en ligne : https:\/\/paiement\.example\/f\/F-2026-101\?montant=12000\.00/.test(v.apercu) && v.reglages === false,
     'l\'adresse de paiement se lit sous la facture dans l\'aperçu, {numero} et {montant} remplacés');
  await s.evaluer(`[...document.querySelectorAll('${T} button')].find(b => /Enregistrer ces réglages/.test(b.textContent)).click()`);
  await s.dormir(400);
  ok(/Réglages enregistrés/.test(await s.evaluer(`document.querySelector('${T}').innerText`)), 'l\'adresse de paiement s\'enregistre');
  await s.evaluer(`document.querySelector('${T} .sb-modele-apercu')?.scrollIntoView({ block: 'center' })`);
  await s.dormir(200);
  await s.capturer(`${dossier}cashd-lien-paiement-1440.jpg`, { qualite: 55 });
  await s.evaluer(saisir(`${T} input[placeholder^="https://"]`, '', 'HTMLInputElement'));
  await s.evaluer(saisir(`${T} input[placeholder="1 500 (par défaut)"]`, '10000', 'HTMLInputElement'));
  await s.dormir(200);
  v = await lire();
  ok(/Compte tenu du montant en jeu/.test(v.apercu) && !/simple oubli/.test(v.apercu), 'au-delà de 10 000 €, la relance demande la date de règlement');
  // c2_35 : la marge de validation et la remise du courrier se règlent ici ; hors bornes, l'enregistrement est retenu
  const jours = await s.evaluer(`(() => { const t = document.querySelector('${T}'); return { marge: !!t.querySelector('input[placeholder="3 (par défaut)"]'), remise: !!t.querySelector('input[placeholder="2 (par défaut)"]') }; })()`);
  ok(jours.marge && jours.remise, 'la marge de validation (3 jours ouvrés) et la remise du courrier (2 jours) se règlent, défauts affichés');
  await s.evaluer(saisir(`${T} input[placeholder="3 (par défaut)"]`, '40', 'HTMLInputElement'));
  await s.dormir(200);
  const borne = await s.evaluer(`(() => { const t = document.querySelector('${T}'); return { bouton: [...t.querySelectorAll('button')].find(b => /Enregistrer ces réglages/.test(b.textContent))?.disabled, avis: t.innerText.includes('De 0 à 15 jours') }; })()`);
  ok(borne.bouton === true && borne.avis, 'au-delà de 15 jours, les réglages ne s\'enregistrent pas, et l\'écran le dit');
  await s.evaluer(saisir(`${T} input[placeholder="3 (par défaut)"]`, '', 'HTMLInputElement'));
  await s.dormir(200);
  await s.evaluer(saisir(`${T} select`, 'devis_rappel', 'HTMLSelectElement'));
  await s.evaluer(saisir(`${T} select:has(option[value="btp"])`, 'btp', 'HTMLSelectElement'));
  await s.dormir(300);
  v = await lire();
  ok(/date d.intervention/.test(v.apercu) && !/relance/i.test(v.apercu), 'au métier du bâtiment, le rappel de devis parle chantier et date d\'intervention, sans le mot « relance »');
  ok(!/Régler en ligne/.test(v.apercu), 'un devis ne porte pas d\'adresse de paiement');
  await s.capturer(`${dossier}cashd-textes-1440.jpg`, { qualite: 55 });
  /* une autre langue : le texte et la ligne de facture en allemand */
  await s.evaluer(saisir(`${T} input[aria-label="Nouvelle langue (deux lettres)"]`, 'de', 'HTMLInputElement'));
  await s.dormir(150);
  await s.evaluer(`[...document.querySelectorAll('${T} button')].find(b => /autre langue/.test(b.textContent)).click()`);
  await s.dormir(300);
  await s.evaluer(saisir(`${T} .c2-lignes-langue input`, 'Rechnung {numero} vom {date}', 'HTMLInputElement'));
  await s.dormir(200);
  const lg = await s.evaluer(`(() => { const z = document.querySelector('${T} .c2-lignes-langue'); return { motif: z?.querySelector('.c2-motif')?.textContent || '', gris: z?.querySelector('button')?.disabled }; })()`);
  ok(/\{reste\}/.test(lg.motif) && lg.gris === true, 'en allemand, une ligne de facture sans {reste} ne s\'enregistre pas');
  await s.evaluer(saisir(`${T} .c2-lignes-langue input`, 'Rechnung {numero} vom {date}: {reste} offen', 'HTMLInputElement'));
  await s.dormir(200);
  await s.evaluer(`document.querySelector('${T} .c2-lignes-langue button').click()`);
  await s.dormir(300);
  ok(/Ligne de facture en DE enregistrée/.test(await s.evaluer(`document.querySelector('${T}').innerText`)), 'la ligne de facture en allemand s\'enregistre');
  /* qui valide : trois paliers, un palier sans rôle refusé */
  const Q = `${T} section[aria-label="Qui valide"]`;
  const q = () => s.evaluer(`(() => { const t = document.querySelector('${Q}'); return { paliers: t.querySelectorAll('fieldset').length, avis: t.querySelector('.esp-avis')?.innerText || '', gris: [...t.querySelectorAll('button')].find(b => /Enregistrer les paliers/.test(b.textContent))?.disabled }; })()`);
  let qv = await q();
  ok(qv.paliers === 3 && qv.gris === false, 'trois paliers proposés : valideur, administrateur, direction');
  await s.evaluer(`[...document.querySelectorAll('${Q} fieldset')][2].querySelector('input[type="checkbox"]:checked')?.click()`);
  await s.dormir(200);
  qv = await q();
  ok(/au moins un rôle/.test(qv.avis) && qv.gris === true, 'un palier sans rôle ne s\'enregistre pas');
  await s.evaluer(`[...document.querySelectorAll('${Q} fieldset')][2].querySelectorAll('input[type="checkbox"]')[2].click()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('${Q} button')].find(b => /Enregistrer les paliers/.test(b.textContent)).click()`);
  await s.dormir(400);
  ok(/Paliers enregistrés/.test(await s.evaluer(`document.querySelector('${T}').innerText`)), 'les paliers s\'enregistrent');
  await s.evaluer(`[...document.querySelectorAll('${Q} input[type="checkbox"]')].find(i => /portefeuille/.test(i.parentElement.textContent)).click()`);
  await s.dormir(300);
  ok(/ne voit plus que ses comptes/.test(await s.evaluer(`document.querySelector('${T}').innerText`)), 'le portefeuille par chargé s\'active');
  /* les gestes de la fiche */
  await vue(s, 'debiteurs');
  const geste = async (numero, bouton) => {
    await s.evaluer(`(() => { const r = [...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => x.innerText.includes(${JSON.stringify(numero)})); [...r.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(bouton)}).click(); })()`);
    await s.dormir(400);
  };
  const ligne = (numero) => s.evaluer(`[...document.querySelectorAll('${F} .c2-pieces tbody tr')].find(x => x.innerText.includes(${JSON.stringify(numero)}))?.innerText || ''`);
  await geste('F-2026-101', 'Bon de commande');
  ok(await s.evaluer(`${boutonValider}?.disabled`) === true, 'sans adresse ni motif, le bon de commande ne se consigne pas');
  await s.evaluer(saisir('[role="dialog"] input[type="email"]', 'achats@lefevre-patrimoine.test', 'HTMLInputElement'));
  await s.evaluer(saisir('[role="dialog"] textarea', 'Bon de commande attendu du service des achats'));
  await s.dormir(200);
  await valider(s);
  ok(/Attend un bon de commande/.test(await ligne('F-2026-101')), 'F-2026-101 attend son bon de commande');
  await vue(s, 'relances');
  const cmd = await s.evaluer(`document.querySelector('section[aria-label="Bons de commande attendus"]')?.innerText || ''`);
  ok(/achats@lefevre-patrimoine.test/.test(cmd) && /À valider/.test(cmd) && /bon de commande attendu pour la facture F-2026-101/.test(cmd), 'le service des achats reçoit sa relance, à valider');
  await vue(s, 'debiteurs');
  await geste('F-2026-101', 'Bon reçu');
  await valider(s);
  ok(!/Attend un bon de commande/.test(await ligne('F-2026-101')), 'le bon reçu, la facture reprend son cycle');
  await geste('F-2026-140', 'Solde');
  await s.evaluer(saisir('[role="dialog"] textarea', 'Écart de règlement accepté'));
  await s.dormir(200);
  await valider(s);
  ok(/Solde abandonné/.test(await ligne('F-2026-140')), 'le solde abandonné se lit sur la facture');
  await geste('D-2026-033', 'Accord oral');
  await s.evaluer(saisir('[role="dialog"] textarea', 'Accord de M. Lefèvre au téléphone'));
  await s.dormir(200);
  await valider(s);
  ok(/Accepté de vive voix/.test(await ligne('D-2026-033')), 'l\'accord oral sur le devis est consigné');
  await vue(s, 'envois');
  const env = await s.evaluer(`document.querySelector('.sb-journal-table tbody')?.innerText || ''`);
  ok(/Courriel/.test(env) && /Partie/.test(env), `le journal des envois : destinataire, objet, canal, état (${plat(env).replace(/\s+/g, ' ').slice(0, 80)})`);
  soucis(s);
  s.fermer();
}

for (const largeur of [1440, 390]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-reponses', densite: 1 });
  console.log(`— une réponse à trancher, une pièce jointe (exemple, ${largeur})`);
  ok(await s.aller(base + SUIVI), 'page chargée');
  await s.dormir(500);
  await ouvrirCompte(s, 'Hôtel des Brotteaux');
  const rep = await s.evaluer(`document.querySelector('${F} [aria-label="Réponses à trancher"]')?.innerText || ''`);
  ok(/Règlement annoncé/.test(rep) && /le virement a ete effectue/.test(rep) && /en pause le temps du règlement/.test(rep), 'la réponse lue est proposée, avec le passage reconnu');
  const m = await s.evaluer(DEBORDE);
  ok(m.deb === 0 && m.larges.length === 0, `fiche avec réponse : pas de débordement (${m.deb}) ${m.larges.length ? JSON.stringify(m.larges) : ''}`);
  await s.evaluer(`[...document.querySelectorAll('${F} [aria-label="Réponses à trancher"] button')].find(b => /Accepter/.test(b.textContent)).click()`);
  await s.dormir(600);
  const apres = await s.evaluer(`({ pastille: document.querySelector('${F} .esp-carte-tete .esp-pastille')?.textContent, reste: !!document.querySelector('${F} [aria-label="Réponses à trancher"]') })`);
  ok(apres.pastille === 'En pause' && !apres.reste, 'acceptée, la proposition met le compte en pause et quitte la liste');
  await s.evaluer(`[...document.querySelectorAll('${F} [aria-label="Pièces du dossier"] button')].find(b => /Joindre une pièce/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input[type="file"]'); const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4'], 'F-2026-050.pdf', { type: 'application/pdf' })); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(200);
  await valider(s);
  const pj = await s.evaluer(`document.querySelector('${F} [aria-label="Pièces du dossier"]')?.innerText || ''`);
  ok(/F-2026-050/.test(pj) && /PDF de la facture/.test(pj) && /F-2026-050\.pdf/.test(pj), 'la pièce est jointe à la facture et se lit dans le dossier');
  if (largeur === 390) await s.capturer(`${dossier}cashd-reponse-390.jpg`, { qualite: 55 });
  soucis(s);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-vue', densite: 1 });
  console.log('— une vue ouverte par l\'adresse (?vue=), une fiche par ?compte=');
  ok(await s.aller(base + SUIVI + '?vue=tresorerie'), 'page chargée');
  await s.dormir(500);
  const v = await s.evaluer(`${titre} + '/' + !!document.querySelector('section[aria-label="Balance âgée"]')`);
  ok(v === 'Trésorerie/true', `?vue=tresorerie ouvre la Trésorerie (${v})`);
  const anciens = await s.evaluer(`[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^\\/espace(\\/|$|\\?)/.test(h) || /ancien=/.test(h))`);
  ok(Array.isArray(anciens) && anciens.length === 0, `aucun lien vers l'ancien dessin ${anciens?.length ? JSON.stringify(anciens.slice(0, 5)) : ''}`);
  await vue(s, 'envois');
  ok(/vue=envois/.test(await s.evaluer('location.search')), 'la vue choisie reste dans l\'adresse');
  /* une page de fonction mène à la fiche d'un compte (lienCompte, ?compte=) */
  ok(await s.aller(base + '/espace2/cashd/litiges'), 'Litiges et pauses : page chargée');
  const lien = await s.evaluer(`[...document.querySelectorAll('main a[href*="compte="]')].map(a => a.getAttribute('href'))[0] || ''`);
  ok(/^\/espace2\/cashd\/suivi\?vue=debiteurs&compte=/.test(lien), `un compte mène à sa fiche (${lien.slice(0, 70)})`);
  if (lien) {
    await s.evaluer(`document.querySelector('main a[href="${lien}"]').click()`);
    for (let i = 0; i < 30 && !(await s.evaluer(`!!document.querySelector('${F} .esp-carte-titre')`)); i++) await s.dormir(300);
    await s.dormir(400);
    const nom = await s.evaluer(`document.querySelector('${F} .esp-carte-titre')?.textContent || ''`);
    const choisi = await s.evaluer(`document.querySelector('.sb-grille-donnees tbody tr[aria-selected="true"]')?.innerText.split('\\n')[0] || ''`);
    ok(nom && nom !== 'SCI Lefèvre Patrimoine' && choisi.startsWith(nom), `la fiche de ce compte s'ouvre (${nom})`);
  }
  s.fermer();
}

for (const largeur of [1440, 390]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-main', densite: 1 });
  console.log(`— une relance validée, envoyée à la main (exemple, ${largeur})`);
  ok(await s.aller(base + SUIVI + '?vue=relances'), 'page chargée');
  await s.dormir(600);
  await s.evaluer(`[...document.querySelectorAll('#c2-relances li')].find(li => li.textContent.includes('Peintures Giraud') && li.textContent.includes('Validée'))?.querySelector('summary')?.click()`);
  await s.dormir(300);
  const g = await s.evaluer(`(() => { const b = document.querySelector('.c2-envoi-main'); return b ? [...b.querySelectorAll('button')].map(x => x.textContent.trim()).join('|') + '/' + !!b.querySelector('select') : ''; })()`);
  ok(g === "Copier le texte|Noter l'envoi à la main/true", `la relance validée offre copier, le canal et « noter l'envoi » (${g})`);
  const m = await s.evaluer(DEBORDE);
  ok(m.deb === 0 && m.larges.length === 0, `pas de débordement (${m.deb}) ${m.larges.length ? JSON.stringify(m.larges) : ''}`);
  await s.evaluer(saisir('.c2-envoi-main select', 'courrier', 'HTMLSelectElement'));
  await s.dormir(150);
  await s.evaluer(`[...document.querySelectorAll('.c2-envoi-main button')].find(b => b.textContent.includes('Noter'))?.click()`);
  await s.dormir(400);
  const reste = await s.evaluer(`[...document.querySelectorAll('#c2-relances li')].some(li => li.textContent.includes('Peintures Giraud') && li.textContent.includes('Validée'))`);
  ok(reste === false, 'notée, elle quitte les relances à envoyer');
  await vue(s, 'envois');
  const e = await s.evaluer(`[...document.querySelectorAll('.sb-journal-table tbody tr')].map(tr => tr.innerText.replace(/\\s+/g, ' ')).join(' || ')`);
  ok(/Peintures Giraud.*Courrier, à la main/.test(e || ''), `elle figure dans les envois, « Courrier, à la main » (${(e || '').slice(0, 120)}…)`);
  const filtre = await s.evaluer(`[...document.querySelectorAll('.sb-journal-filtres label')].map(l => l.innerText.replace(/\\s+/g, ' ')).join(' | ')`);
  ok(/Courrier, à la main 1/.test(filtre), `le filtre des canaux la compte (${filtre})`);
  if (largeur === 390) await s.capturer(`${dossier}cashd-envoi-main-390.jpg`, { qualite: 55 });
  s.fermer();
}

for (const largeur of [1440, 390]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-auto', densite: 1 });
  console.log(`— rappels envoyés sans validation, sous accord (exemple, ${largeur})`);
  ok(await s.aller(base + SUIVI + '?vue=relances'), 'page chargée');
  await s.dormir(600);
  const etat = () => s.evaluer(`document.querySelector('.c2-auto .c2-auto-etat')?.textContent.replace(/\\s+/g, ' ').trim() || ''`);
  const e0 = await etat();
  ok(/^Coupé/.test(e0), `par défaut, coupé (${e0.slice(0, 60)})`);
  const t = await s.evaluer(`document.querySelector('.c2-auto')?.textContent || ''`);
  ok(/mise en demeure/.test(t) && /lettre recommandée/.test(t) && /seconde personne/.test(t), 'le réglage dit que la mise en demeure et la LRE attendent toujours une personne, et qu\'une seconde personne active l\'accord');
  await s.evaluer(`[...document.querySelectorAll('.c2-auto button')].find(b => b.textContent.includes('Proposer'))?.click()`);
  await s.dormir(300);
  const e1 = await etat();
  ok(/^Proposé/.test(e1), `proposé, en attente d'activation (${e1.slice(0, 70)})`);
  const m = await s.evaluer(DEBORDE);
  ok(m.deb === 0 && m.larges.length === 0, `pas de débordement (${m.deb}) ${m.larges.length ? JSON.stringify(m.larges) : ''}`);
  await s.evaluer(`[...document.querySelectorAll('.c2-auto button')].find(b => b.textContent.includes('Couper'))?.click()`);
  await s.dormir(300);
  ok(/^Coupé/.test(await etat()), 'coupé de nouveau');
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'c2-ech', densite: 1 });
  console.log('— le texte du rappel du jour d\'échéance (exemple)');
  ok(await s.aller(base + SUIVI + '?vue=relances'), 'page chargée');
  await s.dormir(600);
  const opts = await s.evaluer(`[...document.querySelectorAll('${T} select')[0].options].map(o => o.textContent).join('|')`);
  ok(/^Rappel du jour d'échéance\|Rappel courtois/.test(opts), `le palier « Rappel du jour d'échéance » est proposé (${opts.slice(0, 60)}…)`);
  /* le modèle se choisit aussi dans la liste des modèles (gabarit Emails de Supabase) */
  await s.evaluer(`[...document.querySelectorAll('${T} .sb-modeles button')].find(b => /jour d'échéance/.test(b.textContent))?.click()`);
  await s.dormir(300);
  const ap = await s.evaluer(`document.querySelector('${T} pre.c2-corps')?.innerText || ''`);
  ok(/échéance du jour/.test(ap) && /à régler le/.test(ap) && !/jours de retard/.test(ap), 'son aperçu dit « à régler », sans retard');
  ok(await s.evaluer(`document.querySelector('${T} .sb-modeles button[aria-current="true"]')?.textContent.includes("jour d'échéance")`), 'le modèle choisi est marqué dans la liste');
  s.fermer();
}

for (const largeur of [1440, 390]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-taux', densite: 1 });
  console.log(`— les taux de change, vue Trésorerie (exemple, ${largeur})`);
  ok(await s.aller(base + SUIVI + '?vue=tresorerie'), 'page chargée');
  await s.dormir(600);
  const S = 'section[aria-label="Taux de change"]';
  const l0 = await s.evaluer(`[...document.querySelectorAll('${S} .c2-taux li')].map(li => li.innerText.replace(/\\s+/g, ' ')).join(' | ')`);
  ok(/CHF.*BCE/.test(l0) && /USD.*Saisi/.test(l0), `les taux retenus, avec leur source (${l0.slice(0, 90)})`);
  await s.evaluer(saisir(`${S} input[maxlength="3"]`, 'gbp', 'HTMLInputElement'));
  await s.evaluer(saisir(`${S} input[inputmode="decimal"]`, '1,1588', 'HTMLInputElement'));
  await s.dormir(150);
  await s.evaluer(`[...document.querySelectorAll('${S} button')].find(b => b.textContent.includes('Saisir'))?.click()`);
  await s.dormir(300);
  const l1 = await s.evaluer(`document.querySelector('${S}').innerText`);
  ok(/GBP/.test(l1) && /1 GBP = 1,1588 €/.test(l1) && /l'emporte sur la BCE/.test(l1), 'un taux saisi s\'ajoute, et l\'écran dit qu\'il l\'emporte ce jour-là');
  const m = await s.evaluer(DEBORDE);
  ok(m.deb === 0 && m.larges.length === 0, `pas de débordement (${m.deb}) ${m.larges.length ? JSON.stringify(m.larges) : ''}`);
  s.fermer();
}

} else {

/* ——— base réelle : le compte du banc, en lecture seule ———
   Le cookie de session est posé comme @supabase/ssr l'écrit (« base64- » +
   base64url du JSON, en morceaux de 3 180 caractères), la source passe sur
   « reelle » (localStorage espace.source), puis chaque page est relue :
   aucune erreur rouge, aucun refus de la base, les mêmes cadres qu'en
   exemple remplis par les portes. Rien n'est écrit. */
const session = JSON.parse(readFileSync(fichierSession, 'utf8'));
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').hostname.split('.')[0];
const nomCookie = `sb-${ref}-auth-token`;
const b64url = (x) => Buffer.from(x, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const valeur = 'base64-' + b64url(JSON.stringify(session));
const morceaux = [];
if (encodeURIComponent(valeur).length <= 3180) morceaux.push({ name: nomCookie, value: valeur });
else {
  let reste = valeur; let i = 0;
  while (reste.length) {
    let tete = reste.slice(0, 3180);
    while (encodeURIComponent(tete).length > 3180) tete = tete.slice(0, -1);
    morceaux.push({ name: `${nomCookie}.${i++}`, value: tete });
    reste = reste.slice(tete.length);
  }
}
console.log(`— base réelle : ${session.user?.email}, cookie en ${morceaux.length} morceau(x)`);
const attendre = async (s) => { for (let i = 0; i < 60; i++) { await s.dormir(500); if (!(await s.evaluer(`!!document.querySelector('.esp-charge')`))) break; } await s.dormir(1200); };
const refus = (s) => s.evaluer(`(window.__erreurs || []).filter(e => /permission denied|does not exist|42501|42883|PGRST/.test(e))`);
const rouges = (s) => s.evaluer(`[...document.querySelectorAll('.esp-avis[data-teinte="rouge"]')].map(a => a.textContent.trim().slice(0, 200))`);
for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'c2-reel', densite: 1 });
  console.log(`— base réelle à ${largeur}`);
  await s.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('espace.source', 'reelle'); } catch {} window.__erreurs = []; const o = console.error; console.error = (...a) => { try { window.__erreurs.push(a.map(x => (x && x.message) ? x.message : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch {} o.apply(console, a); };` });
  for (const m of morceaux) await s.envoyer('Network.setCookie', { name: m.name, value: m.value, url: base, path: '/' });
  const pages = [...FONCTIONS.map(([c, n]) => ['/espace2/cashd' + c, n]), ...Object.entries(TITRES).map(([c, n]) => [`${SUIVI}?vue=${c}`, n])];
  for (const [chemin, nom] of pages) {
    ok(await s.aller(base + chemin), `${nom} : page chargée`);
    await attendre(s);
    await mesurer(s, nom);
    const r = await rouges(s);
    ok(r.length === 0, r.length ? `${nom} : avis rouge ${r.join(' / ')}` : `${nom} : aucun avis rouge`);
    const x = await refus(s);
    ok(x.length === 0, x.length ? `${nom} : refus de la base ${x.join(' / ')}` : `${nom} : aucun refus de la base`);
    if (chemin.endsWith('vue=debiteurs')) {
      const d = await s.evaluer(`({ lignes: document.querySelectorAll('.sb-grille-donnees tbody tr').length, pied: document.querySelector('.sb-donnees-pied')?.innerText || '', fiche: document.querySelector('${F} .esp-carte-titre')?.textContent || '' })`);
      console.log(`    ${d.lignes} débiteur(s) · ${plat(d.pied)} · fiche : ${d.fiche || '—'}`);
      ok(d.lignes === 0 || !!d.fiche, 'la fiche du premier compte se lit');
      if (largeur === 1440) await s.capturer(`${dossier}cashd-reel-1440.jpg`, { qualite: 55 });
    }
    if (chemin.endsWith('vue=relances')) {
      const t = await s.evaluer(`({ textes: !!document.querySelector('${T}'), lien: !!document.querySelector('${T} input[placeholder^="https://"]') })`);
      ok(t.textes && t.lien, 'vos textes se lisent, avec le champ de l\'adresse de paiement');
    }
  }
  soucis(s);
  s.fermer();
}

}

console.log(echecs ? `\n${echecs} échec(s)` : '\nRecette CASHD : tout est vert.');
process.exit(echecs ? 1 : 0);
