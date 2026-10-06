/* recette-varelo.mjs — /espace/varelo aux cinq largeurs (session B1, 05/10/2026).
   Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page charge, aucun
   débordement horizontal, aucun élément plus large que l'écran, aucun mot
   anglais surveillé, une capture légère dans omega/recette-b1/. Puis les
   enchaînements du scénario sur les données d'exemple : les lots à valider
   avec leur preuve, « écarter cette paire » (le code repart seul, le lot
   suit), proposer un nom (une demande s'ouvre, le bouton reste gris sans nom
   différent), un rattachement refusé pour un code en attente, inscrire une
   société (territoire obligatoire), déposer un export (lecture des colonnes,
   lignes rejetées), lancer un passage (les codes à traiter ouvrent leurs
   objets), changer de nature, l'export CSV ; l'encours du groupe (vague 3 :
   plafond, dépassement, dépôt d'une balance âgée) ; les contrats du groupe
   à dénoncer (date limite, reconduction tacite, dénonciation, ajout).
   usage : node omega/recette-b1/recette-varelo.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Search|Upload|Download|Export|Import|Merge|Split|Rename|Company|Companies)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];
const clic = (sel, re) => `(() => { const b = [...document.querySelectorAll('${sel}')].find(b => ${re}.test(b.textContent)); if (!b) return null; b.click(); return true; })()`;
const dlg = () => `document.querySelector('[role="dialog"]')`;
const saisir = (sel, valeur) => `(() => { const t = document.querySelector('${sel}'); if (!t) return null; const proto = t.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : t.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(t, ${JSON.stringify(valeur)}); t.dispatchEvent(new Event(t.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`;

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b1-varelo`, densite: 1 });
  console.log(`— /espace/varelo à ${largeur}`);
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(600);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: [...document.querySelectorAll('.esp-kpi')].map(k => k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent),
             objets: document.querySelectorAll('.esp-item').length, paires: document.querySelectorAll('.vrl-paire').length, societes: document.querySelectorAll('.vrl-societe').length };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Référentiel du groupe', `titre : ${mesure.h1}`);
  ok(mesure.kpis.length === 4, `quatre compteurs : ${mesure.kpis.join(' · ')}`);
  ok(mesure.objets === 7 && mesure.paires === 4 && mesure.societes === 3, `7 objets fournisseurs, 4 paires à valider, 3 sociétés (${mesure.objets}/${mesure.paires}/${mesure.societes})`);
  await s.capturer(`${dossier}varelo-${largeur}.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b1-lots', densite: 1 });
  console.log('— les lots à valider : écarter une paire');
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(500);
  const lots = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Lots à valider'); if (!c) return null;
    return { texte: c.innerText, paires: c.querySelectorAll('.vrl-paire').length, ecarter: [...c.querySelectorAll('button')].filter(b => /Écarter cette paire/.test(b.textContent)).length, humaine: /se décide par sa demande/.test(c.innerText), preuve: /même SIREN 849300124/.test(c.innerText), iban: /IBAN différents/.test(c.innerText), probable: /Probable 86 %/.test(c.innerText), deux: /2 approbations/.test(c.innerText) }; })()`);
  ok(lots && lots.paires === 4 && lots.ecarter === 3 && lots.humaine, `quatre paires, trois écartables, la correction humaine « se décide par sa demande » (${JSON.stringify({ p: lots?.paires, e: lots?.ecarter, h: lots?.humaine })})`);
  ok(lots?.preuve && lots?.iban && lots?.probable && lots?.deux, 'les preuves sont dites : même SIREN, IBAN différents, probable 86 %, deux approbations pour la direction financière');
  const objetAvant = await s.evaluer(`document.querySelectorAll('.esp-item').length`);
  ok(await s.evaluer(`(() => { const p = [...document.querySelectorAll('.vrl-paire')].find(x => /4471/.test(x.textContent)); const b = p && [...p.querySelectorAll('button')].find(b => /Écarter cette paire/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`) === true, 'clic sur « Écarter cette paire » de la paire 4471 · SCIERIE JURA → F-00001');
  await s.dormir(400);
  ok(!!(await s.evaluer(`${dlg()} && /Écarter cette paire/.test(${dlg()}.querySelector('h2')?.textContent)`)), 'le dialogue s\'ouvre');
  await s.evaluer(saisir('[role="dialog"] textarea', 'Deux scieries homonymes, celle d\'Annecy est une autre société.'));
  await s.capturer(`${dossier}varelo-ecarter-1440.jpg`, { qualite: 55 });
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Écarter\\s*$/'));
  await s.dormir(800);
  const apres = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Lots à valider'); return { paires: c.querySelectorAll('.vrl-paire').length, fait: /La paire est écartée/.test(c.innerText), decisions: /écartée — Deux scieries homonymes/.test(c.innerText), objets: document.querySelectorAll('.esp-item').length }; })()`);
  ok(apres.paires === 3 && apres.fait, `la paire sort du lot (${apres.paires} restent), l'avis le dit`);
  ok(apres.decisions, 'la décision apparaît dans « Dernières décisions » avec son motif');
  ok(apres.objets === objetAvant + 1, `le code repart seul : un objet de plus (${objetAvant} → ${apres.objets})`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b1-objet', densite: 1 });
  console.log('— un objet : codes par société, proposer un nom, rattacher');
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(500);
  const detail = await s.evaluer(`(() => { const d = document.querySelector('#vrl-objet'); return { code: d.querySelector('.vrl-objet-code')?.textContent, nom: d.querySelector('.vrl-objet-nom')?.textContent, lignes: d.querySelectorAll('tbody tr').length, propose: /Proposé/.test(d.innerText), siren: /même SIREN/.test(d.innerText), attente: /1 proposition en attente/.test(d.innerText) }; })()`);
  ok(detail.code === 'F-00001' && detail.nom === 'Scieries du Jura', `l'objet ouvert d'office est celui qui attend (${detail.code} ${detail.nom})`);
  ok(detail.lignes === 3 && detail.propose && detail.siren && detail.attente, `trois codes de trois sociétés, dont un proposé par le SIREN, une proposition en attente`);
  const rattacherGris = await s.evaluer(`(() => { const d = document.querySelector('#vrl-objet'); const b = [...d.querySelectorAll('tbody button')].filter(b => /Rattacher ailleurs/.test(b.textContent)); return { n: b.length, gris: b.filter(x => x.disabled).length }; })()`);
  ok(rattacherGris.n === 3 && rattacherGris.gris === 1, 'le code proposé ne se rattache pas ailleurs (bouton gris), les deux autres si');
  await s.capturer(`${dossier}varelo-objet-1440.jpg`, { qualite: 55 });
  ok(await s.evaluer(clic('#vrl-objet .esp-actions button', '/Proposer un nom/')) === true, 'clic sur « Proposer un nom »');
  await s.dormir(400);
  const gris = await s.evaluer(`[...${dlg()}.querySelectorAll('button')].find(b => /^\\s*Proposer\\s*$/.test(b.textContent))?.disabled`);
  ok(gris === true, 'sans nom différent, « Proposer » reste gris');
  await s.evaluer(saisir('[role="dialog"] input.rv-champ', 'Scieries du Jura (groupe)'));
  await s.evaluer(saisir('[role="dialog"] textarea', 'Nom employé dans les devis.'));
  await s.dormir(200);
  ok((await s.evaluer(`[...${dlg()}.querySelectorAll('button')].find(b => /^\\s*Proposer\\s*$/.test(b.textContent))?.disabled`)) === false, 'avec un nom, « Proposer » s\'active');
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Proposer\\s*$/'));
  await s.dormir(800);
  const propose = await s.evaluer(`(() => { const d = document.querySelector('#vrl-objet'); const c = [...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Lots à valider'); return { fait: /C.est proposé/.test(d.innerText), attente: /2 propositions en attente/.test(d.innerText), lot: /Renommer un objet/.test(c.innerText) && /Scieries du Jura \\(groupe\\)/.test(c.innerText) && /nom proposé/.test(c.innerText) }; })()`);
  ok(propose.fait && propose.attente, 'la correction est proposée : l\'objet compte deux propositions en attente');
  ok(propose.lot, 'le lot « Renommer un objet » apparaît avec le nom proposé');
  ok(await s.evaluer(clic('#vrl-objet .esp-actions button', '/Proposer un nom/')) === true, 'second « Proposer un nom »');
  await s.dormir(300);
  await s.evaluer(saisir('[role="dialog"] input.rv-champ', 'Encore un autre nom'));
  await s.dormir(200);
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Proposer\\s*$/'));
  await s.dormir(700);
  ok(!!(await s.evaluer(`/Une proposition attend déjà une décision/.test(${dlg()}?.innerText || '')`)), 'une seconde proposition sur le même objet est refusée, l\'erreur est dite dans le dialogue');
  await s.capturer(`${dossier}varelo-proposer-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1024, hauteur: 900, marque: 'b1-societes', densite: 1 });
  console.log('— sociétés et pôles, dépôt d\'un export, passage');
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(500);
  const soc = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Sociétés et pôles'); return { poles: c.querySelectorAll('.vrl-pole').length, societes: c.querySelectorAll('.vrl-societe').length, fuseau: /Europe\\/Paris/.test(c.innerText), branchement: /À brancher/.test(c.innerText) && /En observation/.test(c.innerText) && /Active/.test(c.innerText) }; })()`);
  ok(soc.poles === 2 && soc.societes === 3 && soc.fuseau && soc.branchement, `deux pôles, trois sociétés, fuseau et état de branchement dits`);
  ok(await s.evaluer(clic('section[aria-label="Sociétés et pôles"] button', '/Inscrire une société/')) === true, 'clic « Inscrire une société »');
  await s.dormir(400);
  ok((await s.evaluer(`[...${dlg()}.querySelectorAll('button')].find(b => /Inscrire la société/.test(b.textContent))?.disabled`)) === true, 'sans nom, « Inscrire la société » reste gris');
  await s.evaluer(saisir('[role="dialog"] input.rv-champ', 'Bertin Agencement Antilles'));
  await s.evaluer(`(() => { const i = [...document.querySelectorAll('[role="dialog"] input.rv-champ')][1]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '12345'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  ok(!!(await s.evaluer(`/Un SIREN a neuf chiffres/.test(${dlg()}.innerText) && [...${dlg()}.querySelectorAll('button')].find(b => /Inscrire la société/.test(b.textContent))?.disabled`)), 'un SIREN à cinq chiffres est refusé avant l\'envoi');
  await s.evaluer(`(() => { const i = [...document.querySelectorAll('[role="dialog"] input.rv-champ')][1]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '849 300 157'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.evaluer(saisir('[role="dialog"] select.rv-champ', 'GP'));
  await s.dormir(200);
  await s.capturer(`${dossier}varelo-societe-1024.jpg`, { qualite: 55 });
  await s.evaluer(clic('[role="dialog"] button', '/Inscrire la société/'));
  await s.dormir(700);
  const inscrite = await s.evaluer(`(() => { const c = [...document.querySelectorAll('section')].find(x => x.getAttribute('aria-label') === 'Sociétés et pôles'); return { n: c.querySelectorAll('.vrl-societe').length, texte: /Bertin Agencement Antilles/.test(c.innerText) && /America\\/Guadeloupe/.test(c.innerText), fait: /est inscrite au groupe \\(Guadeloupe/.test(c.innerText) }; })()`);
  ok(inscrite.n === 4 && inscrite.texte && inscrite.fait, 'la société est inscrite, en Guadeloupe, à l\'heure de la Guadeloupe');

  ok(await s.evaluer(clic('.esp-tete button', '/Déposer un export/')) === true, 'clic « Déposer un export »');
  await s.dormir(400);
  ok((await s.evaluer(`[...${dlg()}.querySelectorAll('button')].find(b => /^\\s*Déposer\\s*$/.test(b.textContent))?.disabled`)) === true, 'sans lignes, « Déposer » reste gris');
  await s.evaluer(saisir('[role="dialog"] textarea', 'Code tiers;Raison sociale;SIREN;Colonne inconnue\nF0800;MENUISERIES DU LEMAN;849300165;x\n;Sans code;;\nF0801;;;\nF0800;Doublon;;\nF0802;Mauvais Siren;123456789;'));
  await s.dormir(300);
  const lecture = await s.evaluer(`(() => { const d = ${dlg()}; const p = [...d.querySelectorAll('.esp-pastille')].map(x => x.textContent); return { lignes: p.includes('5 lignes'), colonnes: p.includes('code') && p.includes('nom') && p.includes('siren'), ignoree: p.includes('1 colonne ignorée'), pret: ![...d.querySelectorAll('button')].find(b => /^\\s*Déposer\\s*$/.test(b.textContent))?.disabled }; })()`);
  ok(lecture.lignes && lecture.colonnes && lecture.ignoree && lecture.pret, 'cinq lignes lues, colonnes code / nom / siren reconnues par leurs synonymes, une colonne ignorée, « Déposer » actif');
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Déposer\\s*$/'));
  await s.dormir(900);
  const resultat = await s.evaluer(`(() => { const d = ${dlg()}; return { depose: /Export déposé/.test(d.innerText), rejets: d.querySelectorAll('tbody tr').length, motifs: /code local manquant/.test(d.innerText) && /nom manquant/.test(d.innerText) && /doublon dans le lot/.test(d.innerText), anomalie: /Anomalies\\s*1/.test(d.innerText.replace(/\\n/g, ' ')) }; })()`);
  ok(resultat.depose && resultat.rejets === 3 && resultat.motifs, 'le compte rendu : trois lignes rejetées avec leurs motifs (code manquant, nom manquant, doublon)');
  ok(resultat.anomalie, 'une anomalie (SIREN à clé fausse), le code gardé');
  await s.capturer(`${dossier}varelo-depot-1024.jpg`, { qualite: 55 });
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Fermer\\s*$/'));
  await s.dormir(400);
  const kpi = await s.evaluer(`[...document.querySelectorAll('.esp-kpi')].map(k => k.querySelector('.esp-kpi-sous')?.textContent).join(' | ')`);
  ok(/2 à traiter au prochain passage/.test(kpi), `les deux codes valides attendent le passage (${kpi.split(' | ')[0]})`);
  ok(await s.evaluer(clic('.esp-tete button', '/Lancer un passage/')) === true, 'clic « Lancer un passage »');
  await s.dormir(400);
  ok(!!(await s.evaluer(`/2 codes fournisseurs attendent ce passage/.test(${dlg()}.innerText)`)), 'le dialogue compte les codes qui attendent');
  await s.evaluer(clic('[role="dialog"] button', '/Lancer maintenant/'));
  await s.dormir(1200);
  const passe = await s.evaluer(`(() => ({ fait: /Passage terminé : 2 codes examinés, 2 objets créés/.test(document.querySelector('.esp')?.innerText || ''), objets: document.querySelectorAll('.esp-item').length }))()`);
  ok(passe.fait && passe.objets === 9, `le passage ouvre deux objets (${passe.objets} objets fournisseurs)`);
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 768, hauteur: 900, marque: 'b1-natures', densite: 1 });
  console.log('— changer de nature, chercher, exporter');
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(clic('.esp-filtres button', '/^Clients$/'));
  await s.dormir(400);
  const clients = await s.evaluer(`(() => ({ h2: document.querySelector('section[aria-label="Objets du groupe"] h2')?.textContent, n: document.querySelectorAll('.esp-item').length, code: document.querySelector('#vrl-objet .vrl-objet-code')?.textContent }))()`);
  ok(clients.h2 === 'Clients du groupe' && clients.n === 3 && clients.code === 'C-00001', `la nature « clients » : ${clients.n} objets, ${clients.code} ouvert`);
  await s.evaluer(saisir('input[type="search"]', 'vienne'));
  await s.dormir(400);
  const cherche = await s.evaluer(`(() => ({ n: document.querySelectorAll('.esp-item').length, nom: document.querySelector('#vrl-objet .vrl-objet-nom')?.textContent }))()`);
  ok(cherche.n === 1 && cherche.nom === 'Mairie de Vienne', `la recherche « vienne » ne garde que Mairie de Vienne`);
  await s.capturer(`${dossier}varelo-clients-768.jpg`, { qualite: 55 });
  const telecharge = await s.evaluer(`(() => { window.__csv = null; const o = URL.createObjectURL; URL.createObjectURL = (b) => { b.text().then(t => { window.__csv = t; }); return 'blob:essai'; }; HTMLAnchorElement.prototype.click = function () {}; const b = [...document.querySelectorAll('.esp-tete button')].find(b => /Exporter/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(telecharge === true, 'clic « Exporter (CSV) »');
  await s.dormir(600);
  const csv = await s.evaluer(`window.__csv`);
  ok(typeof csv === 'string' && /^\ufeff?code_groupe;nom_groupe;societe;code_local;nom_local;etat\n/.test(csv) && /C-00001;Hôtel des Alpes;/.test(csv), 'le CSV commence par son en-tête et porte C-00001');
  ok(!!(await s.evaluer(`/est exporté \\(4 lignes\\)/.test(document.querySelector('.esp')?.innerText || '')`)), 'l\'avis compte quatre lignes exportées');
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b1-encours', densite: 1 });
  console.log('— l\'encours du groupe (vague 3) : clients, plafond, balance âgée');
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(500);
  await s.evaluer(clic('.esp-filtres button', '/^Clients$/'));
  await s.dormir(400);
  const carte = `document.querySelector('section[aria-label="Encours du groupe, clients"]')`;
  const lu = await s.evaluer(`(() => { const c = ${carte}; if (!c) return null; const lignes = [...c.querySelectorAll('tbody tr')].map(tr => tr.innerText.replace(/\\s+/g, ' ')); return { lignes, texte: c.innerText.replace(/\\s+/g, ' ') }; })()`);
  ok(!!lu, 'la carte « Encours du groupe — clients » est là');
  ok(lu && /Hôtel des Alpes/.test(lu.lignes[0]) && /79\s000,00\s€/.test(lu.lignes[0]) && /Au-dessus du plafond/.test(lu.lignes[0]), `Hôtel des Alpes en tête : 79 000 € pour le groupe, au-dessus de son plafond (${lu?.lignes[0]})`);
  ok(lu && /ancienne de 12 jours/.test(lu.texte), 'la balance d\'Annecy est dite ancienne de 12 jours');
  ok(lu && /C-NOUV/.test(lu.texte) && /pas encore rangé/.test(lu.texte), 'une ligne sous un code pas encore rangé est dite');
  ok(await s.evaluer(clic(`section[aria-label="Encours du groupe, clients"] tbody button`, '/^Plafond$/')) === true, 'clic « Plafond » sur Hôtel des Alpes');
  await s.dormir(400);
  ok(!!(await s.evaluer(`/Plafond d.encours — Hôtel des Alpes/.test(${dlg()}?.innerText || '')`)), 'le dialogue du plafond s\'ouvre');
  await s.evaluer(saisir('[role="dialog"] input.rv-champ', '90 000'));
  await s.dormir(200);
  await s.evaluer(clic('[role="dialog"] button', '/Enregistrer/'));
  await s.dormir(700);
  const apres = await s.evaluer(`(() => { const c = ${carte}; return { ligne: [...c.querySelectorAll('tbody tr')].find(tr => /Hôtel des Alpes/.test(tr.innerText))?.innerText.replace(/\\s+/g, ' '), avis: document.querySelector('.esp [role="status"]')?.innerText || '' }; })()`);
  ok(apres.ligne && !/Au-dessus du plafond/.test(apres.ligne) && /90\s000,00\s€/.test(apres.ligne) && /en dessous/.test(apres.avis), `plafond relevé à 90 000 € : plus de dépassement (${apres.ligne})`);
  ok(await s.evaluer(clic(`section[aria-label="Encours du groupe, clients"] button`, '/Déposer une balance âgée/')) === true, 'clic « Déposer une balance âgée »');
  await s.dormir(400);
  await s.evaluer(saisir('[role="dialog"] textarea', 'Code tiers;Raison sociale;Non échu;1-30;> 90\nC0211;HOTEL DES ALPES;50 000,00;;20 000,00\nC9999;NOUVEAU CLIENT;1 000;;\n;Sans code;5;;\nC0304;Mairie;douze;;'));
  await s.dormir(300);
  const pret = await s.evaluer(`(() => { const d = ${dlg()}; const p = [...d.querySelectorAll('.esp-pastille')].map(x => x.textContent); return { lignes: p.includes('4 lignes'), colonnes: p.includes('code') && p.includes('non_echu') && p.includes('echu_30') && p.includes('echu_plus'), actif: ![...d.querySelectorAll('button')].find(b => /^\\s*Déposer\\s*$/.test(b.textContent))?.disabled }; })()`);
  ok(pret.lignes && pret.colonnes && pret.actif, 'quatre lignes lues, colonnes « Non échu », « 1-30 », « > 90 » reconnues, « Déposer » actif');
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Déposer\\s*$/'));
  await s.dormir(900);
  const res = await s.evaluer(`(() => { const d = ${dlg()}; const t = d.innerText.replace(/\\s+/g, ' '); return { t, rejets: d.querySelectorAll('tbody tr').length }; })()`);
  ok(/Balance déposée/.test(res.t) && /Retenues 2/.test(res.t) && res.rejets === 2 && /code local manquant/.test(res.t) && /montant illisible \(non_echu\)/.test(res.t), `deux lignes retenues, deux rejetées avec leur motif (${res.rejets})`);
  ok(/Codes inscrits au référentiel 1/.test(res.t), 'le code inconnu C9999 est inscrit au référentiel');
  await s.evaluer(clic('[role="dialog"] button', '/^\\s*Fermer\\s*$/'));
  await s.dormir(500);
  const fin = await s.evaluer(`(() => { const c = ${carte}; return [...c.querySelectorAll('tbody tr')].find(tr => /Hôtel des Alpes/.test(tr.innerText))?.innerText.replace(/\\s+/g, ' '); })()`);
  ok(fin && /101\s000,00\s€/.test(fin) && /Au-dessus du plafond/.test(fin), `la nouvelle balance du siège : 70 000 + 31 000 = 101 000 €, au-dessus des 90 000 (${fin})`);
  ok(!(await s.evaluer(`/Erreur|undefined|NaN/.test(${carte}.innerText)`)), 'aucun « NaN », « undefined » ni « Erreur » dans la carte');
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1024, hauteur: 900, marque: 'b1-contrats', densite: 1 });
  console.log('— les contrats du groupe à dénoncer (vague 3)');
  ok(await s.aller(base + '/espace/varelo'), 'page chargée');
  await s.dormir(500);
  const carte = `document.querySelector('section[aria-label="Contrats du groupe à dénoncer"]')`;
  const lu = await s.evaluer(`(() => { const c = ${carte}; if (!c) return null; return { lignes: [...c.querySelectorAll('tbody tr')].map(tr => tr.innerText.replace(/\\s+/g, ' ')), texte: c.innerText.replace(/\\s+/g, ' ') }; })()`);
  ok(!!lu, 'la carte « Contrats du groupe à dénoncer » est là');
  ok(lu && /Location de deux chariots/.test(lu.lignes[0]) && /dans 2 jours/.test(lu.lignes[0]) && /Moins de 30 jours/.test(lu.lignes[0]), `en tête, le contrat à dénoncer dans 2 jours (${lu?.lignes[0]})`);
  ok(lu && /À dénoncer sous 30 jours 2 contrats/.test(lu.texte), 'deux contrats à dénoncer sous 30 jours');
  ok(lu && lu.lignes.some(l => /Vérifications électriques/.test(l) && /reconduit \(échéance d.origine/.test(l)), 'le contrat dont l\'échéance est passée sans dénonciation est dit reconduit');
  ok(lu && lu.lignes.some(l => /Livraisons régionales/.test(l) && /2 contrats chez ce tiers, 2 sociétés/.test(l)), 'Transports Deschamps : deux contrats dans deux sociétés, une négociation de groupe');
  ok(lu && !lu.lignes.some(l => /Flotte automobile/.test(l)), 'le contrat déjà dénoncé n\'est pas « à surveiller »');
  ok(await s.evaluer(`(() => { const tr = [...${carte}.querySelectorAll('tbody tr')].find(t => /Livraisons régionales/.test(t.innerText)); const b = tr && [...tr.querySelectorAll('button')].find(b => /Dénoncé/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`) === true, 'clic « Dénoncé… » sur Livraisons régionales');
  await s.dormir(400);
  ok(!!(await s.evaluer(`/Noter la dénonciation — Livraisons régionales/.test(${dlg()}?.innerText || '')`)), 'le dialogue de la dénonciation s\'ouvre');
  await s.evaluer(saisir('[role="dialog"] input.rv-champ:not([type="date"])', 'Appel d\'offres transport du groupe'));
  await s.evaluer(clic('[role="dialog"] button', '/Noter la dénonciation/'));
  await s.dormir(600);
  const apres = await s.evaluer(`(() => { const c = ${carte}; return { lignes: [...c.querySelectorAll('tbody tr')].map(tr => tr.innerText.replace(/\\s+/g, ' ')), texte: c.innerText.replace(/\\s+/g, ' '), avis: document.querySelector('.esp [role="status"]')?.innerText || '' }; })()`);
  ok(!apres.lignes.some(l => /Livraisons régionales/.test(l)) && /À dénoncer sous 30 jours 1 contrat/.test(apres.texte) && /dans le délai/.test(apres.avis), 'noté : le contrat sort de la liste, un seul reste sous 30 jours');
  await s.evaluer(clic(`section[aria-label="Contrats du groupe à dénoncer"] .esp-filtres button`, '/^Dénoncés$/'));
  await s.dormir(300);
  const denonces = await s.evaluer(`[...${carte}.querySelectorAll('tbody tr')].map(tr => tr.innerText.replace(/\\s+/g, ' '))`);
  ok(denonces.length === 2 && denonces.some(l => /Livraisons régionales/.test(l) && /Dénoncé le/.test(l)), `le filtre « Dénoncés » : ${denonces.length} contrats`);
  await s.evaluer(clic(`section[aria-label="Contrats du groupe à dénoncer"] .esp-filtres button`, '/^À surveiller$/'));
  ok(await s.evaluer(clic(`section[aria-label="Contrats du groupe à dénoncer"] .esp-carte-tete button`, '/Ajouter un contrat/')) === true, 'clic « Ajouter un contrat »');
  await s.dormir(400);
  const gris = await s.evaluer(`[...${dlg()}.querySelectorAll('button')].find(b => /Enregistrer le contrat/.test(b.textContent))?.disabled`);
  ok(gris === true, 'vide, « Enregistrer le contrat » reste gris');
  const dans40 = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
  await s.evaluer(`(() => { const d = ${dlg()}; const champs = [...d.querySelectorAll('input.rv-champ')]; const poser = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; poser(champs[0], 'Maintenance des climatisations'); poser(champs[1], 'Froid Caraïbes'); poser(d.querySelector('input[type="date"]'), '${dans40}'); const p = champs.find(x => x.getAttribute('inputmode') === 'numeric' && x.value === '3'); poser(p, '1'); })()`);
  await s.dormir(300);
  await s.evaluer(clic('[role="dialog"] button', '/Enregistrer le contrat/'));
  await s.dormir(600);
  const ajoute = await s.evaluer(`[...${carte}.querySelectorAll('tbody tr')].find(tr => /Maintenance des climatisations/.test(tr.innerText))?.innerText.replace(/\\s+/g, ' ')`);
  ok(!!ajoute && /Froid Caraïbes/.test(ajoute) && /Moins de 30 jours/.test(ajoute), `le contrat ajouté (échéance J+40, préavis d'un mois) est à dénoncer sous 30 jours (${ajoute})`);
  ok(!(await s.evaluer(`/NaN|undefined|Invalid/.test(${carte}.innerText)`)), 'aucun « NaN », « undefined » ni « Invalid » dans la carte');
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
