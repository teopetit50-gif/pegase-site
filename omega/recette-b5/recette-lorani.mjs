/* recette-lorani.mjs — /espace/lorani aux cinq largeurs (session B5, 05/10/2026).
   Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page charge, aucun
   débordement horizontal, aucun élément plus large que l'écran, aucun mot
   anglais surveillé, et une capture légère (jpeg, densité 1) dans
   omega/recette-b5/. Puis les enchaînements de l'exemple : confirmer une date
   lue (le calendrier change), écarter une lecture (motif obligatoire),
   confirmer une décision tacite, saisir l'affichage, saisir un recours puis
   son issue, ouvrir un dossier par ?permis=.
   usage : node omega/recette-b5/recette-lorani.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Permit|Deadline)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];
const chemin = '/espace/lorani';

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b5-lorani`, densite: 1 });
  console.log(`— ${chemin} à ${largeur}`);
  ok(await s.aller(base + chemin), 'page chargée');
  await s.dormir(600);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: [...document.querySelectorAll('.esp-kpi')].map(k => k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent),
             items: document.querySelectorAll('.esp-item').length, etapes: document.querySelectorAll('.lor-etape').length };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Calendrier des permis', `titre : ${mesure.h1}`);
  ok(mesure.items === 6 && mesure.etapes >= 4, `6 permis listés (${mesure.items}), calendrier du premier ouvert (${mesure.etapes} étapes) · ${mesure.kpis.join(' · ')}`);
  await s.capturer(`${dossier}lorani-${largeur}.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b5-enchainements', densite: 1 });
  console.log('— /espace/lorani : confirmer la date lue (lettre de délai), puis écarter');
  ok(await s.aller(base + chemin), 'page chargée');
  await s.dormir(400);
  const ouvert = await s.evaluer(`(() => { const t = document.querySelector('#esp-detail h2')?.textContent; const lu = !!document.querySelector('.lor-lecture'); return { t, lu, avant: document.querySelectorAll('.lor-etape').length }; })()`);
  ok(/Maison Lemoine/.test(ouvert.t) && ouvert.lu, `le permis ouvert d'office est celui qui attend : ${ouvert.t}, avec une date lue à confirmer`);
  await s.evaluer(`[...document.querySelectorAll('.lor-lecture .r-btn')].find(b => /Confirmer/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const i = d.querySelectorAll('input'); return { titre: d.querySelector('h2')?.textContent, champs: i.length, mois: i[0]?.value, gris: [...d.querySelectorAll('button')].find(b => /^\\s*Confirmer\\s*$/.test(b.textContent))?.disabled }; })()`);
  ok(dlg && /Confirmer délai/.test(dlg.titre) && dlg.champs === 2 && dlg.mois === '3' && dlg.gris === false, `dialogue « ${dlg?.titre} », valeurs lues préremplies (${dlg?.mois} mois), « Confirmer » actif`);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '4'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.capturer(`${dossier}lorani-confirmer-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Confirmer\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const apres = await s.evaluer(`(() => ({ fait: /C.est fait/.test(document.querySelector('#esp-detail')?.innerText || ''), corrige: /vos corrections/.test(document.querySelector('#esp-detail')?.innerText || ''), reste: document.querySelectorAll('.lor-lecture').length, regime: /délai de 4 mois notifié/.test(document.querySelector('#esp-detail')?.innerText || '') }))()`);
  ok(apres.fait && apres.corrige && apres.reste === 0 && apres.regime, 'la date est confirmée avec la correction (4 mois), plus rien à confirmer, le régime dit le délai notifié');

  console.log('— écarter une lecture : motif obligatoire');
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Clôture Martin/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const impl = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); return { tacite: /Non-opposition tacite née/.test(d.innerText), bouton: !![...d.querySelectorAll('.r-btn')].find(b => /Confirmer la décision implicite/.test(b.textContent)) }; })()`);
  ok(impl.tacite && impl.bouton, 'la DP montre la non-opposition tacite née, à confirmer');
  ok(await s.evaluer(`/ARE_DP06938326N0107\\.pdf[\\s\\S]{0,120}Reçu par courriel du guichet et rangé ici par son numéro de dossier/.test(document.querySelector('#esp-detail').innerText)`),
     'son accusé de réception électronique est dit « reçu par courriel du guichet et rangé par son numéro » (b5_11)');
  await s.evaluer(`[...document.querySelectorAll('#esp-detail .r-btn')].find(b => /Confirmer la décision implicite/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.capturer(`${dossier}lorani-implicite-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Confirmer\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const acc = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); return { accorde: /Accordé/.test(d.innerText), affichage: !![...d.querySelectorAll('.r-btn')].find(b => /Permis affiché sur le terrain/.test(b.textContent)) }; })()`);
  ok(acc.accorde && acc.affichage, 'la DP passe « Accordé », l\'affichage est à saisir');
  await s.evaluer(`[...document.querySelectorAll('#esp-detail .r-btn')].find(b => /Permis affiché sur le terrain/.test(b.textContent))?.click()`);
  await s.dormir(400);
  const aff = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, date: d.querySelector('input[type="date"]')?.value } : null; })()`);
  ok(aff && /affiché/.test(aff.titre) && /^\d{4}-\d{2}-\d{2}$/.test(aff.date), `dialogue « ${aff?.titre} », date du jour proposée`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Saisir\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const rec = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); return { fait: /le délai de recours des tiers court/.test(d.innerText), recours: !![...d.querySelectorAll('.r-btn')].find(b => /Recours reçu/.test(b.textContent)) }; })()`);
  ok(rec.fait && rec.recours, 'affichage saisi, « Recours reçu » proposé');
  await s.evaluer(`[...document.querySelectorAll('#esp-detail .r-btn')].find(b => /Recours reçu/.test(b.textContent))?.click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Saisir le recours/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const enCours = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); return { etat: /recours en cours/i.test(d.innerText), issue: !![...d.querySelectorAll('.r-btn')].find(b => /Saisir l.issue/.test(b.textContent)) }; })()`);
  ok(enCours.etat && enCours.issue, 'recours en cours : plus de purge, « Saisir l\'issue » proposé');
  await s.capturer(`${dossier}lorani-recours-1440.jpg`, { qualite: 55 });

  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Maison Lemoine/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const lem = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); return { pieces: /Pièces à fournir avant le/i.test(d.innerText), rappel: /10 jours avant \\(parti\\)/.test(d.innerText), bouton: !![...d.querySelectorAll('.r-btn')].find(b => /Pièces reçues par la mairie/.test(b.textContent)) }; })()`);
  ok(lem.pieces && lem.rappel && lem.bouton, 'Maison Lemoine : pièces à fournir, rappel J-10 parti, « Pièces reçues » à saisir');
  const deux = await s.evaluer(`(() => { const t = document.querySelector('#esp-detail').innerText; return /Plusieurs demandes de pièces/.test(t) && /À fournir : PC5, PC8/.test(t) && /461958/.test(t); })()`);
  ok(deux, 'Maison Lemoine : deux lettres de demande, « À fournir : PC5, PC8 », le délai court depuis la première (b5_07)');

  console.log('— les honoraires phase par phase (b5_12)');
  const hon = await s.evaluer(`(() => { const t = document.querySelector('.lor-honoraires'); if (!t) return null; const txt = t.closest('.esp-carte-corps').innerText; return { lignes: t.querySelectorAll('tbody tr').length, surveiller: /Dossier de permis : 37,5 h pour 45 h prévues \\(83 %\\), avant la fin de la phase/.test(txt), appel: /Achevé, appel à émettre/.test(txt), total: /33 000 € HT d.honoraires/.test(txt.replace(/ | /g, ' ')) }; })()`);
  ok(hon && hon.lignes === 6 && hon.surveiller && hon.appel && hon.total, `Maison Lemoine : six éléments, 33 000 € HT, le PC « à surveiller » (83 %), l'APD achevé « appel à émettre » (${JSON.stringify(hon)})`);
  await s.evaluer(`[...document.querySelectorAll('.esp-lien-bouton')].find(b => b.textContent.trim() === 'Saisir du temps')?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const i = [...d.querySelectorAll('input')].find(x => x.getAttribute('inputmode') === 'decimal'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '9'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  const dlgT = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { titre: /Saisir du temps/.test(d.innerText), choix: d.querySelector('select').selectedOptions[0]?.textContent, actif: [...d.querySelectorAll('button')].find(b => /Enregistrer/.test(b.textContent))?.disabled === false }; })()`);
  ok(dlgT.titre && /PC/.test(dlgT.choix || '') && dlgT.actif, `dialogue « Saisir du temps » : l'élément en cours proposé (${dlgT.choix}), « Enregistrer » actif à 9 h`);
  await s.capturer(`${dossier}lorani-temps-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const apresT = await s.evaluer(`(() => { const txt = document.querySelector('.lor-honoraires').closest('.esp-carte-corps').innerText; return { depasse: /Dossier de permis : 46,5 h pour 45 h prévues \\(103 %\\), les honoraires de la phase sont dépassés/.test(txt), ferme: !document.querySelector('[role="dialog"]') }; })()`);
  ok(apresT.depasse && apresT.ferme, 'après 9 h de plus : le PC passe « dépassé » (46,5 h pour 45 h, 103 %)');
  await s.evaluer(`[...document.querySelectorAll('.lor-honoraires tbody tr')].find(tr => /Dossier de permis/.test(tr.textContent))?.querySelector('.esp-lien-bouton')?.click()`);
  await s.dormir(600);
  ok(await s.evaluer(`/Achevé, appel à émettre/.test([...document.querySelectorAll('.lor-honoraires tbody tr')].find(tr => /Dossier de permis/.test(tr.textContent))?.innerText || '')`), '« Achevé » : le PC attend son appel d’honoraires');
  await s.evaluer(`document.querySelector('.lor-honoraires')?.scrollIntoView({ block: 'center' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-honoraires-1440.jpg`, { qualite: 55 });

  console.log('— le chantier : situations et visas (b5_13)');
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Façade rue Mercière/.test(b.textContent))?.click()`);
  await s.dormir(600);
  const ch = await s.evaluer(`(() => { const t = (document.querySelector('.lor-situation')?.closest('.esp-carte-corps')?.innerText || '').replace(/[\\u202f\\u00a0]/g, ' '); return { cartes: document.querySelectorAll('.lor-situation').length, depasse: /Situation n° 3 · Pierres de Bourgogne SARL[\\s\\S]*dépasse le marché et ses avenants de 8 100 €/.test(t), recule: /Situation n° 2 · Échafaudages Rhône[\\s\\S]*recule par rapport à la situation n° 1 \\(12 000 €\\)/.test(t), mois: /201 500 € HT cumulés sur 193 400 € \\(104 %\\) · 106 000 € ce mois/.test(t), retard: /En retard : rendre l’avis/.test(t) }; })()`);
  ok(ch.cartes === 2 && ch.depasse && ch.recule && ch.mois && ch.retard, `Façade rue Mercière : deux situations à viser, l'une dépasse le marché de 8 100 €, l'autre recule ; un visa en retard (${JSON.stringify(ch)})`);
  await s.evaluer(`[...document.querySelectorAll('.lor-situation')].find(c => /Situation n° 3/.test(c.textContent))?.querySelector('.r-btn--fil')?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const set = (el, v) => { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; set(d.querySelector('input[inputmode="decimal"]'), '190000'); set(d.querySelector('textarea'), 'Avenant n° 2 non signé : cumul ramené au marché'); })()`);
  await s.dormir(200);
  await s.capturer(`${dossier}lorani-situation-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Rectifier\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const rect = await s.evaluer(`(() => { const t = (document.querySelector('.lor-chantier')?.closest('.esp-carte-corps')?.innerText || '').replace(/[\\u202f\\u00a0]/g, ' '); return { cartes: document.querySelectorAll('.lor-situation').length, admis: /rectifiée \\(190 000 € admis\\)/.test(t), ferme: !document.querySelector('[role="dialog"]') }; })()`);
  ok(rect.cartes === 1 && rect.admis && rect.ferme, 'rectifiée : la situation n° 3 quitte la liste, le marché affiche « rectifiée (190 000 € admis) »');
  await s.evaluer(`[...document.querySelectorAll('.lor-chantier .esp-lien-bouton')].find(b => /En retard/.test(b.textContent))?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const sel = d.querySelector('select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'vao'); sel.dispatchEvent(new Event('change', { bubbles: true })); const ta = d.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Ancrages à justifier en pied de façade'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Rendre l’avis/.test(b.textContent))?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/Visé avec observations/.test([...document.querySelectorAll('.lor-chantier tbody tr')].find(tr => /Plan d’échafaudage/.test(tr.textContent))?.innerText || '')`), 'avis rendu : « Plan d’échafaudage » visé avec observations');
  await s.evaluer(`document.querySelector('.lor-situation')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-chantier-1440.jpg`, { qualite: 55 });

  console.log('— les décennales (b5_18) : Façade rue Mercière, chantier ouvert il y a 100 jours');
  const dec = await s.evaluer(`(() => { const c = [...document.querySelectorAll('.lor-constat')].filter(x => /contrat/.test(x.innerText)); const t = c.map(x => x.innerText).join(' | ').replace(/[\\u202f\\u00a0]/g, ' '); return { n: c.length, pierre: /Non conforme[\\s\\S]*Lot 01 · Pierres de Bourgogne SARL[\\s\\S]*Bloquant : Activité du lot 01 non couverte : Taille de pierre/.test(t), echue: /Échue[\\s\\S]*Lot 02 · Échafaudages Rhône[\\s\\S]*demandez à l’entreprise l’attestation/.test(t), doc: /Chantier ouvert le/.test(document.querySelector('#esp-detail').innerText) }; })()`);
  ok(dec.n === 2 && dec.pierre && dec.echue && dec.doc, `deux attestations : taille de pierre non couverte (bloquant), échafaudage échu ; date d’ouverture dite (${JSON.stringify(dec)})`);
  await s.evaluer(`[...document.querySelectorAll('.esp-lien-bouton')].find(b => b.getAttribute('aria-label') === 'Modifier les activités du lot 01')?.click()`);
  await s.dormir(500);
  const act = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { titre: d?.querySelector('h2')?.textContent, cochees: d?.querySelectorAll('input:checked').length, cases: d?.querySelectorAll('input[type="checkbox"]').length }; })()`);
  ok(act.titre === 'Activités du lot 01' && act.cochees === 2 && act.cases === 34, `dialogue « ${act.titre} » : 2 activités cochées sur 34`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] label')].find(l => /Taille de pierre/.test(l.textContent))?.querySelector('input')?.click()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Enregistrer\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/Conforme[\\s\\S]*Lot 01 · Pierres de Bourgogne SARL/.test([...document.querySelectorAll('.lor-constat')].find(x => /Pierres de Bourgogne/.test(x.innerText) && /contrat/.test(x.innerText))?.innerText || '')`),
     'le lot 01 ne demande plus la taille de pierre : l’attestation est recontrôlée, conforme');
  await s.evaluer(`[...document.querySelectorAll('.lor-constat')].find(x => /Pierres de Bourgogne/.test(x.innerText) && /contrat/.test(x.innerText))?.scrollIntoView({ block: 'center' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-decennales-1440.jpg`, { qualite: 55 });

  console.log('— les ordres de service et les réserves (b5_19) : Façade rue Mercière');
  const osm = await s.evaluer(`(() => { const c = [...document.querySelectorAll('.lor-os')]; const t = c.map(x => x.innerText).join(' | ').replace(/[\\u202f\\u00a0]/g, ' '); return { n: c.length, montant: /210 100 € HT à date \\(\\+13 % du marché initial de 186 000 €, avenants compris\\)/.test(t), delai: /délai 180 j \\+10 j d’OS \\+ 7 j d’arrêt/.test(t), avenant: /OS cumulés : \\+13 % du marché initial\\. Un avenant est à envisager/.test(t), reserves: /Réserves : Délai demandé : 15 jours|réserves : Délai demandé : 15 jours/.test(t), retour: /Retour de l’entreprise/.test(t) }; })()`);
  ok(osm.n === 2 && Object.values(osm).every(Boolean), `OS : 210 100 € HT à date (+13 %), +10 j d’OS + 7 j d’arrêt, avenant à envisager (marché privé, > 10 %), réserves de l’entreprise dites (${JSON.stringify(osm)})`);
  await s.evaluer(`[...document.querySelectorAll('.lor-os')].find(x => /Échafaudages Rhône/.test(x.innerText))?.querySelectorAll('.esp-lien-bouton')[1]?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const set = (el, v) => { const p = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }; set(d.querySelector('select'), 'travaux_supplementaires'); })()`);
  await s.dormir(200);
  await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; const i = d.querySelectorAll('input:not([type="date"])'); set(i[0], 'Prolongation de location de l’échafaudage'); set(i[1], '3000'); set(i[2], '21'); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Émettre\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/OS n° 2 · Travaux supplémentaires · Prolongation de location/.test([...document.querySelectorAll('.lor-os')].find(x => /Échafaudages Rhône/.test(x.innerText))?.innerText || '') && /27 000 € HT à date \\(\\+12,5 %/.test(([...document.querySelectorAll('.lor-os')].find(x => /Échafaudages Rhône/.test(x.innerText))?.innerText || '').replace(/[\\u202f\\u00a0]/g, ' '))`),
     'OS n° 2 émis pour l’échafaudage : +3 000 € HT, 27 000 € à date (+12,5 %), +21 j');
  const res = await s.evaluer(`(() => { const c = [...document.querySelectorAll('.lor-reserve')]; return { n: c.length, retard: c.filter(x => x.hasAttribute('data-retard')).length, levee: c.filter(x => x.dataset.statut === 'levee').length, statut: document.querySelector('.lor-reserve')?.closest('.esp-carte-corps')?.querySelector('[role="status"]')?.innerText }; })()`);
  ok(res.n === 3 && res.retard === 1 && res.levee === 1 && /Réception non prononcée\. 2 réserves non levées sur 3\./.test(res.statut), `réserves : 3 (1 en retard, 1 levée), « ${res.statut} »`);
  await s.evaluer(`[...document.querySelectorAll('.lor-reserve')].find(x => /Réserve n° 1/.test(x.innerText))?.querySelector('.r-btn--noir')?.click()`);
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Enregistrer\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/Levée le/.test([...document.querySelectorAll('.lor-reserve')].find(x => /Réserve n° 1/.test(x.innerText))?.innerText || '')`), 'réserve n° 1 : levée constatée');
  await s.evaluer(`[...document.querySelectorAll('.esp-lien-bouton')].find(b => b.textContent.trim() === 'Prononcer la réception')?.click()`);
  await s.dormir(500);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input[type="date"]'); const d = new Date(); d.setDate(d.getDate() - 1); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, d.toISOString().slice(0, 10)); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Enregistrer\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/Réception le .* · garantie de parfait achèvement jusqu’au .*\\. 1 réserve non levée sur 3\\./.test(document.querySelector('.lor-reserve')?.closest('.esp-carte-corps')?.querySelector('[role="status"]')?.innerText || '')`),
     'réception prononcée : la garantie de parfait achèvement court un an, 1 réserve non levée');
  await s.evaluer(`document.querySelector('.lor-os')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-os-reserves-1440.jpg`, { qualite: 55 });

  console.log('— le régime du permis : secteur protégé coché, le silence reste un accord ; un cas R*424-2 coché, le silence vaut rejet');
  await s.evaluer(`[...document.querySelectorAll('#esp-detail .esp-lien-bouton')].find(b => /Régime/.test(b.textContent))?.click()`);
  await s.dormir(500);
  const reg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, cases: d.querySelectorAll('input[type="checkbox"]').length } : null; })()`);
  ok(reg && /Régime du permis/.test(reg.titre) && reg.cases >= 10, `dialogue « ${reg?.titre} », ${reg?.cases} cases (cinq du régime + les cas de l'art. R*424-2)`);
  await s.evaluer(`(() => { const c = [...document.querySelectorAll('[role="dialog"] label')].find(l => l.textContent.includes('R*424-2, d'))?.querySelector('input'); c?.click(); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer le régime/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const regle = await s.evaluer(`(() => { const t = document.querySelector('#esp-detail')?.innerText || ''; const i = t.indexOf('sans réponse de la mairie'); return t.slice(i, i + 80); })()`);
  ok(regle.includes('rejet implicite (art. R*424-2, d)'), `le régime dit « rejet implicite (art. R*424-2, d) » après la saisie : « ${regle} »`);

  console.log('— le contrôle du dossier (b5_16) : Surélévation Dubois, indice B revérifiant l’indice A');
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /Surélévation Dubois/.test(b.textContent))?.click()`);
  await s.dormir(600);
  console.log('— le PLU depuis l’adresse (b5_17) : Surélévation Dubois, pas encore cherché');
  ok(await s.evaluer(`/Lorani localise l’adresse/.test(document.querySelector('#esp-detail')?.innerText || '')`), 'avant recherche : l’écran dit ce que Lorani va chercher');
  await s.evaluer(`[...document.querySelectorAll('.esp-lien-bouton')].find(b => b.textContent.trim() === 'Trouver le PLU')?.click()`);
  await s.dormir(400);
  ok(await s.evaluer(`/Adresse en cours de localisation/.test(document.querySelector('#esp-detail')?.innerText || '')`), 'recherche lancée : « Adresse en cours de localisation… »');
  await s.dormir(3200);
  const plu = await s.evaluer(`(() => { const t = document.querySelector('.lor-plu')?.innerText || ''; return { zone: /Zone URm1/.test(t), doc: /PLU-H MÉTROPOLE DE LYON/.test(t), type: /zone urbaine/.test(t), point: /Localisé par l’adresse : 8 Rue Francis de Pressensé 69100 Villeurbanne \\(confiance 96 %\\)/.test(t), sansLien: /déposez-le comme pièce « Règlement du PLU »/.test(t) }; })()`);
  ok(Object.values(plu).every(Boolean), `trouvé : zone URm1 (zone urbaine) du PLU-H, point et confiance dits, pas de lien direct (${JSON.stringify(plu)})`);
  const ctl = await s.evaluer(`(() => { const c = document.querySelector('.lor-controle-tete')?.closest('.esp-carte-corps'); const t = (c?.innerText || '').replace(/[\\u202f\\u00a0]/g, ' '); return { tete: document.querySelector('.lor-controle-tete')?.innerText, cartes: document.querySelectorAll('.lor-constat').length, bloquant: document.querySelectorAll('.lor-constat[data-gravite="bloquant"]').length, resume: /3 constats ouverts, dont 1 bloquant\\. 2 constats de l’indice A corrigés\\./.test(t), citation: /PC2, p\\. 1 : « 3,20 m »/.test(t), regle: /Règle : au moins 4 m, article URm1 7 \\(PLU-H URm1, p\\. 41\\)/.test(t), correction: /Correction proposée : Ramener le recul sur limite séparative/.test(t), releve: /relevé depuis l’indice A/.test(t), corriges: /Corrigés depuis l’indice A \\(2\\)/.test(t), decides: /Décidés \\(1\\)/.test(t) }; })()`);
  ok(/Dossier de permis · indice B/.test(ctl.tete) && ctl.cartes === 3 && ctl.bloquant === 1 && ctl.resume && ctl.citation && ctl.regle && ctl.correction && ctl.releve && ctl.corriges && ctl.decides,
     `indice B : 3 constats ouverts dont 1 bloquant (dont le métré du poste 2.2), page et texte cités, règle et article, correction proposée, 2 corrigés depuis l’indice A (${JSON.stringify(ctl)})`);
  await s.evaluer(`document.querySelector('.lor-controle-tete')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-controle-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('.lor-constat')].find(c => /recul sur limite/.test(c.textContent))?.querySelectorAll('.r-btn--fil')[1]?.click()`);
  await s.dormir(500);
  const ec = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const b = [...(d?.querySelectorAll('button') || [])].find(x => /^\\s*Écarter\\s*$/.test(x.textContent)); return { titre: d?.querySelector('h2')?.textContent, gris: b?.disabled }; })()`);
  ok(ec.titre === 'Écarter' && ec.gris === true, `dialogue « ${ec.titre} » : sans motif, « Écarter » reste grisé`);
  await s.evaluer(`(() => { const ta = document.querySelector('[role="dialog"] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Dérogation accordée par la mairie (art. L152-4)'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(x => /^\\s*Écarter\\s*$/.test(x.textContent))?.click()`);
  await s.dormir(700);
  const ap = await s.evaluer(`(() => { const t = document.querySelector('.lor-controle-tete')?.closest('.esp-carte-corps')?.textContent || ''; return { cartes: document.querySelectorAll('.lor-constat').length, decides: /Décidés \\(2\\)/.test(t), motif: /Motif : Dérogation accordée par la mairie/.test(t) }; })()`);
  ok(ap.cartes === 2 && ap.decides && ap.motif, `le recul est écarté avec son motif : 2 constats ouverts, 2 décidés (${JSON.stringify(ap)})`);
  await s.evaluer(`[...document.querySelectorAll('.esp-lien-bouton')].find(b => b.textContent.trim() === 'Revérifier à l’indice suivant')?.click()`);
  await s.dormir(500);
  const rv = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const i = d?.querySelectorAll('input:not([type="checkbox"])'); return { titre: d?.querySelector('h2')?.textContent, indice: i?.[1]?.value, cochees: d?.querySelectorAll('input[type="checkbox"]:checked').length }; })()`);
  ok(rv.titre === 'Revérifier à l’indice suivant' && rv.indice === 'C' && rv.cochees === 6, `dialogue « ${rv.titre} » : indice ${rv.indice} proposé, ${rv.cochees} pièces reprises de l’indice B`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(x => /Préparer le contrôle/.test(x.textContent))?.click()`);
  await s.dormir(700);
  ok(await s.evaluer(`/indice C/.test(document.querySelector('.lor-controle-tete')?.innerText || '') && /Pièces en lecture/.test(document.querySelector('.lor-controle-tete')?.innerText || '')`), 'le contrôle de l’indice C est préparé, en attente de lecture');
  await s.evaluer(`[...document.querySelectorAll('.lor-controle-tete .esp-lien-bouton')].find(b => /Lancer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const c3 = await s.evaluer(`(() => ({ tete: document.querySelector('.lor-controle-tete')?.innerText || '', cartes: document.querySelectorAll('.lor-constat').length, onglets: document.querySelectorAll('.lor-controles .esp-filtre').length }))()`);
  ok(/Contrôlé/.test(c3.tete) && c3.cartes === 2 && c3.onglets === 3, `lancé : l’indice C reconduit ce qui reste (2 ouverts), trois contrôles au projet (${JSON.stringify(c3)})`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1024, hauteur: 900, marque: 'b5-url', densite: 1 });
  console.log('— ouvrir par ?permis= (le lien des alertes)');
  ok(await s.aller(base + chemin + '?permis=00000000-0000-4000-8000-00000000c005'), 'page chargée');
  await s.dormir(600);
  const t = await s.evaluer(`(() => { const d = document.querySelector('#esp-detail'); return { titre: d.querySelector('h2')?.textContent, purge: /Purgé de tout recours/.test(d.innerText), chantier: /vous pouvez démarrer/.test(d.innerText), gracieux: /Recours gracieux/.test(d.innerText) }; })()`);
  ok(/Façade rue Mercière/.test(t.titre) && t.purge && t.chantier && t.gracieux, `le permis visé par l'URL est ouvert : ${t.titre}, purgé, chantier possible, recours gracieux rejeté dans l'historique`);
  await s.capturer(`${dossier}lorani-purge-1024.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1024, hauteur: 900, marque: 'b5-plu', densite: 1 });
  console.log('— le PLU trouvé (b5_17) : Maison Lemoine, ouverte par ?projet=');
  ok(await s.aller(base + chemin + '?projet=00000000-0000-4000-8000-00000000b001'), 'page chargée');
  await s.dormir(700);
  const p = await s.evaluer(`(() => { const d = document.querySelector('.lor-plu'); const a = d?.querySelector('a'); return { t: (d?.innerText || '').replace(/\\s+/g, ' '), href: a?.href || '', cible: a?.target, rel: a?.rel }; })()`);
  ok(/Zone UMa/.test(p.t) && /PLUI NANTES METROPOLE · PLUi/.test(p.t) && /Secteur de développement des centralités/.test(p.t) && /Prescriptions à cet endroit \(2\)/.test(p.t),
     `zone UMa du PLUi Nantes Métropole, libellé long, 2 prescriptions (${p.t.slice(0, 160)})`);
  ok(p.href.startsWith('https://metropole.nantes.fr/') && p.cible === '_blank' && /noopener/.test(p.rel), 'lien du règlement, dans un nouvel onglet, noopener');
  await s.evaluer(`document.querySelector('.lor-plu')?.scrollIntoView({ block: 'center' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-plu-1024.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: 'b5-controle-390', densite: 1 });
  console.log('— le contrôle du dossier à 390');
  ok(await s.aller(base + chemin + '?projet=00000000-0000-4000-8000-00000000b005'), 'page chargée');
  await s.dormir(700);
  await s.evaluer(`document.querySelector('.lor-controle-tete')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  const m = await s.evaluer(`(() => { const w = document.documentElement.clientWidth; const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !e.closest('.esp-tableau-cadre'); }).slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.')); return { deb: document.documentElement.scrollWidth - w, larges, cartes: document.querySelectorAll('.lor-constat').length }; })()`);
  ok(m.deb === 0 && m.larges.length === 0 && m.cartes === 3, `Surélévation Dubois à 390 : pas de débordement, 3 constats lisibles (${JSON.stringify(m)})`);
  await s.capturer(`${dossier}lorani-controle-390.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('.esp-lien-bouton')].find(b => b.textContent.trim() === 'Revérifier à l’indice suivant')?.click()`);
  await s.dormir(500);
  const d = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const r = d?.getBoundingClientRect(); const larges = [...(d?.querySelectorAll('*') || [])].filter(e => { const x = e.getBoundingClientRect(); return x.width > 0 && x.right > r.right + 1; }).length; return { ouvert: !!d, larges }; })()`);
  ok(d.ouvert && d.larges === 0, `dialogue de revérification à 390 : rien ne dépasse (${JSON.stringify(d)})`);
  await s.capturer(`${dossier}lorani-controle-dialogue-390.jpg`, { qualite: 55 });
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
