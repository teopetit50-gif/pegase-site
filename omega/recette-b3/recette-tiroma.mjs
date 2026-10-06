/* recette-tiroma.mjs — l'écran /espace/tiroma aux cinq largeurs (session B3,
   05/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran,
   aucun mot anglais surveillé, les quatre compteurs et les cinq cartes sont
   là, et une capture légère (jpeg, densité 1) dans omega/recette-b3/. Puis
   trois enchaînements sur l'exemple : ajouter un fauteuil (le dialogue, le
   bouton gris sans nom, la liste qui grandit), classer un type à classer
   (« RDV LV » → famille), passer le cabinet à blanc puis en mode réel.
   usage : node omega/recette-b3/recette-tiroma.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3013';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Chair|Patient list|Appointment)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];
const CARTES = ['Créneaux à sauver', 'Plans sans rendez-vous', 'Avant les rendez-vous', 'Charge des fauteuils', 'Demi-journées vides', 'Absences probables', 'Équipe absente', 'Appels', 'Synthèse de la semaine', 'Réinscription', 'Pilotage', 'Rappels aux patients', "Liste d'attente", 'Le cabinet'];

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b3-tiroma', densite: 1 });
  console.log(`— /espace/tiroma à ${largeur}`);
  ok(await s.aller(base + '/espace/tiroma'), 'page chargée');
  await s.dormir(700);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: document.querySelector('.esp-kpis')?.querySelectorAll('.esp-kpi').length ?? 0,
             cartes: [...document.querySelectorAll('.esp-carte[aria-label]')].map(e => e.getAttribute('aria-label')),
             ruban: document.querySelector('.esp-ruban')?.textContent };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Cabinet dentaire', `titre : ${mesure.h1}`);
  ok(mesure.kpis === 4, `quatre compteurs (${mesure.kpis})`);
  ok(CARTES.every((c) => mesure.cartes.includes(c)), `les quatorze cartes : ${mesure.cartes.join(' · ')}`);
  ok(mesure.ruban === "Données d'exemple", `ruban : ${mesure.ruban}`);
  ok(/Marguerite Delannoy/.test(mesure.texte) && /Plan accepté/.test(mesure.texte), 'un créneau à sauver porte son premier candidat (plan accepté)');
  ok(/Fauteuil 2/.test(mesure.texte) && /Après-midi vide/.test(mesure.texte), 'la charge dit la demi-journée vide du fauteuil 2');
  await s.capturer(`${dossier}tiroma-${largeur}.jpg`, { qualite: 55 });
  if (largeur === 1440) {
    await s.evaluer(`document.getElementById('tiroma-charge')?.scrollIntoView({ block: 'start' })`);
    await s.dormir(400);
    await s.capturer(`${dossier}tiroma-charge-1440.jpg`, { qualite: 55 });
  }
  s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b3-fauteuil', densite: 1 });
  console.log('— /espace/tiroma : ajouter un fauteuil (exemple)');
  ok(await s.aller(base + '/espace/tiroma'), 'page chargée');
  await s.dormir(500);
  const avant = await s.evaluer(`[...document.querySelectorAll('section[aria-label="Le cabinet"] .esp-item-titre, section[aria-label="Le cabinet"] .esp-item strong')].filter(e => /^Fauteuil/.test(e.textContent)).length`);
  const clic = await s.evaluer(`(() => { const b = [...document.querySelectorAll('button')].find(b => /Ajouter un fauteuil/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(clic === true, 'bouton « Ajouter un fauteuil » cliqué');
  await s.dormir(500);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null;
    const i = d.querySelector('input.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true }));
    return { titre: d.querySelector('h2')?.textContent }; })()`);
  ok(!!dlg && /Ajouter un fauteuil/.test(dlg.titre), 'le dialogue s\'ouvre');
  await s.dormir(200);
  const gris = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Ajouter/.test(b.textContent))?.disabled`);
  ok(gris === true, 'sans nom, « Ajouter » reste gris');
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Fauteuil 4'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.capturer(`${dossier}tiroma-fauteuil-1440.jpg`, { qualite: 55 });
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Ajouter/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apres = await s.evaluer(`[...document.querySelectorAll('section[aria-label="Le cabinet"] .esp-item strong')].filter(e => /^Fauteuil/.test(e.textContent)).length`);
  ok(apres === avant + 1, `la liste passe de ${avant} à ${apres} fauteuils (en mémoire)`);
  const fait = await s.evaluer(`/C.est fait/.test(document.querySelector('section[aria-label="Le cabinet"]')?.innerText || '')`);
  ok(fait, 'l\'avis « C\'est fait » s\'affiche');

  console.log('— /espace/tiroma : classer un type de rendez-vous (exemple)');
  const classer = await s.evaluer(`(() => { const r = [...document.querySelectorAll('section[aria-label="Le cabinet"] table tr')].find(t => /RDV LV/.test(t.textContent)); const b = r && [...r.querySelectorAll('button')].find(b => /Classer/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(classer === true, 'bouton « Classer » de « RDV LV » cliqué');
  await s.dormir(500);
  await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, 'prothese_pose'); sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Valider/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const ligne = await s.evaluer(`(() => { const r = [...document.querySelectorAll('section[aria-label="Le cabinet"] table tr')].find(t => /RDV LV/.test(t.textContent)); return r ? r.innerText : null; })()`);
  ok(ligne && /Prothèse — pose/.test(ligne) && /Validé/.test(ligne), `« RDV LV » est classé : ${ligne?.replace(/\\s+/g, ' ').slice(0, 80)}`);

  console.log('— /espace/tiroma : noter l\'accord de la mutuelle (exemple)');
  const mut = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section[aria-label="Plans sans rendez-vous"] .esp-item')].find(i => /Nadège Hilaire/.test(i.textContent)); const b = c && [...c.querySelectorAll('button')].find(b => /Noter la mutuelle/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(mut === true, 'bouton « Noter la mutuelle » cliqué sur le plan de Nadège Hilaire');
  await s.dormir(500);
  await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, 'accord'); sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Noter/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const accord = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section[aria-label="Plans sans rendez-vous"] .esp-item')].find(i => /Nadège Hilaire/.test(i.textContent)); return c ? /Accord de mutuelle reçu/.test(c.textContent) : null; })()`);
  ok(accord === true, 'le plan de Nadège Hilaire porte « Accord de mutuelle reçu » (en mémoire)');

  console.log('— /espace/tiroma : inscrire un patient en liste d\'attente, puis le retirer (exemple)');
  const avantAtt = await s.evaluer(`document.querySelectorAll('section[aria-label="Liste d\\'attente"] .esp-liste > li').length`);
  ok(await s.evaluer(`(() => { const b = [...document.querySelectorAll('section[aria-label="Liste d\\'attente"] button')].find(b => /Inscrire un patient/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`) === true, 'bouton « Inscrire un patient » cliqué');
  await s.dormir(400);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Nes'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(600);
  const choixPat = await s.evaluer(`(() => { const b = [...document.querySelectorAll('[role="dialog"] ul[aria-label="Patients trouvés"] button')].find(b => /Rosalie Nestor/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(choixPat === true, 'la recherche propose Rosalie Nestor, choisie');
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Inscrire/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apresAtt = await s.evaluer(`document.querySelectorAll('section[aria-label="Liste d\\'attente"] .esp-liste > li').length`);
  ok(apresAtt === avantAtt + 1, `la liste passe de ${avantAtt} à ${apresAtt} patients (en mémoire)`);
  ok(await s.evaluer(`(() => { const li = [...document.querySelectorAll('section[aria-label="Liste d\\'attente"] .esp-liste > li')].find(l => /Rosalie Nestor/.test(l.textContent)); const b = li && [...li.querySelectorAll('button')].find(b => /Retirer/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`) === true, 'bouton « Retirer » de Rosalie Nestor cliqué');
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Retirer/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const finAtt = await s.evaluer(`document.querySelectorAll('section[aria-label="Liste d\\'attente"] .esp-liste > li').length`);
  ok(finAtt === avantAtt, `elle est retirée : ${finAtt} patients`);
  await s.evaluer(`document.getElementById('tiroma-attente')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-attente-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : noter un appel depuis un créneau à sauver (exemple, b3_12)');
  const avantApp = await s.evaluer(`document.querySelectorAll('section[aria-label="Appels"] ul[aria-label="Appels à reprendre"] > li').length`);
  ok(await s.evaluer(`(() => { const li = [...document.querySelectorAll('section[aria-label="Créneaux à sauver"] ol > li')].find(l => /Rosalie Nestor/.test(l.textContent)); const b = li && [...li.querySelectorAll('button')].find(b => /Noter l.appel/.test(b.textContent)); if (!b) return null; b.focus(); b.click(); return true; })()`) === true, 'bouton « Noter l\'appel » de Rosalie Nestor (créneau) cliqué');
  await s.dormir(500);
  ok(await s.evaluer(`!!document.querySelector('[role="dialog"]') && /Rosalie Nestor/.test(document.querySelector('[role="dialog"]').textContent)`), 'le dialogue « Noter l\'appel » s\'ouvre sur elle');
  await s.evaluer(`document.querySelector('[role="dialog"] input[type="radio"][value="rappeler"]')?.click()`);
  await s.dormir(300);
  ok(await s.evaluer(`!!document.querySelector('[role="dialog"] input[type="date"]')`), '« À rappeler » demande une date');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Noter/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apresApp = await s.evaluer(`document.querySelectorAll('section[aria-label="Appels"] ul[aria-label="Appels à reprendre"] > li').length`);
  ok(apresApp === avantApp + 1, `les appels à reprendre passent de ${avantApp} à ${apresApp} (en mémoire)`);
  ok(await s.evaluer(`(() => { const li = [...document.querySelectorAll('section[aria-label="Créneaux à sauver"] ol > li')].find(l => /Rosalie Nestor/.test(l.textContent)); return li ? /À rappeler/.test(li.textContent) : null; })()`) === true, 'le créneau dit « À rappeler » sous Rosalie Nestor');
  await s.evaluer(`document.getElementById('tiroma-appels')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-appels-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : les absences probables (exemple, b3_17)');
  const abs = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Absences probables"]'); if (!c) return null;
    const li = [...c.querySelectorAll('ul[aria-label="Rendez-vous à risque d\\'absence"] > li')];
    return { n: li.length, premier: li[0]?.innerText || '', texte: c.innerText }; })()`);
  ok(abs && abs.n === 3, `trois rendez-vous à risque (${abs?.n})`);
  ok(abs && /A annoncé son absence/.test(abs.premier), 'l\'absence annoncée vient en tête');
  ok(abs && /2 rendez-vous manqués en 18 mois/.test(abs.texte), 'chaque risque dit sa raison');
  await s.evaluer(`document.getElementById('tiroma-absences')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-absences-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : l\'équipe absente, les soins à basculer (exemple, b3_18)');
  const eq = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Équipe absente"]'); if (!c) return null;
    return { n: c.querySelectorAll('ul[aria-label^="Soins à basculer"] > li').length, texte: c.innerText }; })()`);
  ok(eq && eq.n === 2, `deux soins à basculer pendant l'absence d'Élodie (${eq?.n})`);
  ok(eq && /Vers Fauteuil 2 \(avec Karine\)/.test(eq.texte), 'le soin de Sylvie Marlin bascule vers le Fauteuil 2, avec Karine');
  ok(eq && /Aucun fauteuil libre/.test(eq.texte), 'la chirurgie sans fauteuil libre le dit');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Équipe absente"] button')].find(b => /Noter une absence/.test(b.textContent))?.click()`);
  await s.dormir(500);
  ok(await s.evaluer(`/Noter une absence/.test(document.querySelector('[role="dialog"]')?.textContent || '')`), 'le dialogue « Noter une absence » s\'ouvre');
  await s.evaluer(`(() => { const sel = document.querySelector('[role="dialog"] select.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, 'm-2'); sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.evaluer(`document.querySelector('[role="dialog"] input[type="radio"][value="maladie"]')?.click()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Noter/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const eq2 = await s.evaluer(`document.querySelector('section[aria-label="Équipe absente"]')?.innerText || ''`);
  ok(!(await s.evaluer(`!!document.querySelector('[role="dialog"]')`)) && /Karine — Fauteuil 2/.test(eq2) && /Arrêt/.test(eq2), 'l\'absence de Karine (arrêt) est notée, le dialogue se ferme');
  await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Équipe absente"]'); const b = [...c.querySelectorAll('button')].filter(b => /Clore l.absence/.test(b.textContent)).pop(); b?.click(); })()`);
  await s.dormir(400);
  ok(!/Karine — Fauteuil 2/.test(await s.evaluer(`document.querySelector('section[aria-label="Équipe absente"]')?.innerText || ''`)), '« Clore l\'absence » la retire');
  await s.evaluer(`document.getElementById('tiroma-equipe')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-equipe-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : les demi-journées vides (exemple, b3_19)');
  const dj = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Demi-journées vides"]'); if (!c) return null;
    return { n: c.querySelectorAll('ul[aria-label="Demi-journées à remplir"] > li').length, texte: c.innerText }; })()`);
  ok(dj && dj.n === 3, `trois demi-journées à remplir (${dj?.n})`);
  ok(dj && /Dr Mathis Rousseau/.test(dj.texte) && /4 h 30 libres sur 5 h/.test(dj.texte), 'le titulaire voit le praticien et les heures libres');
  ok(dj && /3 patients en liste d'attente/.test(dj.texte) && /habituelles/.test(dj.texte), 'la liste d\'attente et la source « habitude » sont dites');
  await s.evaluer(`document.getElementById('tiroma-demi-journees')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-demi-journees-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : la synthèse de la semaine (exemple, b3_15)');
  const syn = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Synthèse de la semaine"]'); if (!c) return null;
    return { lignes: c.querySelectorAll('tbody tr').length, texte: c.innerText }; })()`);
  ok(syn && syn.lignes === 2, `deux centres dans la synthèse (${syn?.lignes})`);
  ok(syn && /4,2 %/.test(syn.texte) && !/(Dorville|Delannoy|Bazile)/.test(syn.texte), 'le taux de manqués des deux centres (4,2 %), sans nom de patient');
  await s.evaluer(`document.getElementById('tiroma-synthese')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-synthese-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : la réinscription (exemple, b3_16)');
  const rei = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Réinscription"]'); if (!c) return null;
    return { texte: c.innerText, sans: c.querySelectorAll('ul[aria-label="Patients vus sans prochain rendez-vous"] > li').length }; })()`);
  ok(rei && /74,6 %/.test(rei.texte) && /\+2,8 pt sur la période d'avant/.test(rei.texte), 'le taux de réinscription (74,6 %) et son écart (+2,8 pt)');
  ok(rei && rei.sans === 3, `trois patients vus sans prochain rendez-vous (${rei?.sans})`);
  await s.evaluer(`document.getElementById('tiroma-reinscription')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-reinscription-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : le pilotage du titulaire (exemple, b3_13)');
  const pil = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Pilotage"]'); if (!c) return null;
    return { texte: c.innerText, relancer: c.querySelectorAll('ul[aria-label="Devis à relancer"] > li').length, tableaux: c.querySelectorAll('table').length }; })()`);
  ok(pil && /Devis acceptés/.test(pil.texte) && /63,2 %/.test(pil.texte), 'le taux d\'acceptation des devis est affiché (63,2 %)');
  ok(pil && /\+7,3 pts sur la période d'avant/.test(pil.texte), 'avec l\'écart sur la période d\'avant (+7,3 pts)');
  ok(pil && pil.tableaux === 2, 'deux tableaux : par panier, manqués par praticien');
  ok(pil && pil.relancer === 3, `trois devis à relancer (${pil?.relancer})`);
  await s.evaluer(`document.getElementById('tiroma-pilotage')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-pilotage-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : noter le moyen de contact d\'un patient (exemple, b3_14)');
  const avantCt = await s.evaluer(`document.querySelectorAll('section[aria-label="Rappels aux patients"] ul[aria-label="Moyens de contact"] > li').length`);
  ok(await s.evaluer(`(() => { const b = [...document.querySelectorAll('section[aria-label="Rappels aux patients"] button')].find(b => /Ajouter un moyen de contact/.test(b.textContent)); if (!b) return null; b.focus(); b.click(); return true; })()`) === true, 'bouton « Ajouter un moyen de contact » cliqué');
  await s.dormir(400);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input.rv-champ'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Nes'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(700);
  ok(await s.evaluer(`(() => { const b = [...document.querySelectorAll('[role="dialog"] ul[aria-label="Patients trouvés pour le contact"] button')].find(b => /Rosalie Nestor/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`) === true, 'Rosalie Nestor trouvée, choisie');
  await s.dormir(200);
  await s.evaluer(`(() => { const i = [...document.querySelectorAll('[role="dialog"] input.rv-champ')].find(x => x.getAttribute('inputmode') === 'email'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'rosalie.nestor@exemple.test'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Noter/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apresCt = await s.evaluer(`document.querySelectorAll('section[aria-label="Rappels aux patients"] ul[aria-label="Moyens de contact"] > li').length`);
  ok(apresCt === avantCt + 1, `les moyens de contact passent de ${avantCt} à ${apresCt} (en mémoire)`);
  ok(await s.evaluer(`/Essai/.test(document.querySelector('section[aria-label="Rappels aux patients"] .esp-carte-tete')?.innerText || '')`), 'la carte dit le mode « Essai »');
  ok(await s.evaluer(`/aucun prestataire agréé HDS/.test(document.querySelector('section[aria-label="Rappels aux patients"]')?.innerText || '')`), 'un rappel retenu dit pourquoi : « aucun prestataire agréé HDS »');
  await s.evaluer(`document.getElementById('tiroma-rappels')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-rappels-1440.jpg`, { qualite: 55 });

  console.log('— /espace/tiroma : repasser à blanc puis en mode réel (exemple)');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Le cabinet"] button')].find(b => /Repasser à blanc/.test(b.textContent))?.click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const blanc = await s.evaluer(`/À blanc/.test(document.querySelector('section[aria-label="Le cabinet"] .esp-carte-tete')?.innerText || '')`);
  ok(blanc, 'le cabinet est « À blanc »');
  await s.evaluer(`[...document.querySelectorAll('section[aria-label="Le cabinet"] button')].find(b => /Passer en mode réel/.test(b.textContent))?.click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Confirmer/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const reel = await s.evaluer(`/Mode réel/.test(document.querySelector('section[aria-label="Le cabinet"] .esp-carte-tete')?.innerText || '')`);
  ok(reel, 'le cabinet repasse en « Mode réel »');
  await s.evaluer(`document.querySelector('section[aria-label="Le cabinet"]')?.scrollIntoView({ block: 'start' })`);
  await s.dormir(400);
  await s.capturer(`${dossier}tiroma-cabinet-1440.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
