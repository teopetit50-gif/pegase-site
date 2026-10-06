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

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
