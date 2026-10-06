/* recette-tavaro.mjs — l'écran /espace/tavaro aux cinq largeurs (session B2,
   06/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran,
   aucun mot anglais surveillé, une capture légère dans omega/recette-b2/.
   Puis les enchaînements sur l'exemple : ouvrir le retour à chiffrer, saisir
   un retour avec un dommage sans photo (l'avis ambre), puis avec photo, et
   voir la proposition « À valider » ; passer une facture en litige ; demander
   un avoir (montant borné) ; relancer l'impayé ; publier un barème (direction
   seule : « Vous » est valideur, le bouton est gris). Les avis de contravention
   (vague 3, b2_03) : la liste par échéance, un avis saisi qui se rapproche
   tout seul du contrat, la désignation consignée, le classement réservé à
   la direction. L'état des lieux (b2_05) : le départ signé se lit dans le
   dossier, l'état de retour se fait (quatre vues, signature au doigt) et
   le chiffrage annonce « déjà au départ » pour la rayure notée. La
   facture électronique (b2_06) : la préparation 2027, la forme
   électronique d'une facture pro sans SIREN, le SIREN contrôlé.
   usage : node omega/recette-b2/recette-tavaro.mjs [origine] */
import { mkdirSync } from 'node:fs';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const ANGLAIS = /\b(Loading|Submit|Cancel|Approve|Reject|Delete|Save|Error|Pending|Due|Invoice|Supplier|Settings|Logout|Sign in|Dashboard|Today|Yesterday|Tomorrow|Damage|Vehicle|Rental|Contract|Fuel)\b/;
const LARGEURS = [390, 768, 1024, 1440, 1700];

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: `b2-tavaro`, densite: 1 });
  console.log(`— /espace/tavaro à ${largeur}`);
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(600);
  const mesure = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    return { deb: document.documentElement.scrollWidth - w, larges, texte: document.querySelector('.esp')?.innerText || '', h1: document.querySelector('.esp h1')?.textContent,
             kpis: [...document.querySelectorAll('.esp-kpi')].map(k => (k.querySelector('.esp-kpi-etiquette')?.textContent + ' = ' + k.querySelector('.esp-kpi-valeur')?.textContent)),
             items: document.querySelectorAll('ul[aria-label="Contrats de location"] .esp-item').length, bareme: document.querySelectorAll('section[aria-label="Barème de remise en état"] tbody tr').length };
  })()`);
  ok(mesure.deb === 0, `pas de débordement horizontal (${mesure.deb})`);
  ok(mesure.larges.length === 0, `aucun élément plus large que l'écran ${mesure.larges.length ? JSON.stringify(mesure.larges) : ''}`);
  const anglais = mesure.texte.match(ANGLAIS);
  ok(!anglais, anglais ? `mot anglais à l'écran : « ${anglais[0]} »` : 'aucun mot anglais surveillé à l\'écran');
  ok(mesure.h1 === 'Location : retours et factures', `titre : ${mesure.h1}`);
  ok(mesure.items === 8, `${mesure.items} contrats listés (8 attendus)`);
  ok(mesure.bareme === 12, `${mesure.bareme} lignes de barème (12 attendues)`);
  console.log('    compteurs :', mesure.kpis.join(' · '));
  await s.capturer(`${dossier}tavaro-${largeur}.jpg`, { qualite: 55 });
  s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b2-retour', densite: 1 });
  console.log('— /espace/tavaro : chiffrer un retour (exemple)');
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(400);
  const premier = await s.evaluer(`document.querySelector('#esp-dossier .esp-mono')?.textContent`);
  ok(premier === 'C-2026-0412', `le contrat ouvert d'office est le retour à chiffrer (${premier})`);
  const clic = await s.evaluer(`(() => { const b = [...document.querySelectorAll('#esp-dossier .esp-actions .r-btn')].find(b => /Chiffrer le retour/.test(b.textContent)); if (!b || b.disabled) return null; b.click(); return true; })()`);
  ok(clic === true, '« Chiffrer le retour » est actif et cliqué');
  await s.dormir(500);
  const dlg = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? { titre: d.querySelector('h2')?.textContent, km: d.querySelector('input[inputmode="numeric"]')?.value, huitiemes: d.querySelectorAll('select').length } : null; })()`);
  ok(dlg && /Chiffrer le retour du contrat C-2026-0412/.test(dlg.titre) && dlg.km === '12650' && dlg.huitiemes >= 2, `dialogue « ${dlg?.titre} », compteur prérempli ${dlg?.km}, carburant en huitièmes`);
  /* carburant 8 → 5, un dommage sans photo */
  await s.evaluer(`(() => { const sel = [...document.querySelectorAll('[role="dialog"] select')]; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel[1], '5'); sel[1].dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Ajouter un dommage/.test(b.textContent))?.click()`);
  await s.dormir(300);
  await s.evaluer(`(() => { const sel = [...document.querySelectorAll('[role="dialog"] .tav-ligne-saisie select')].pop(); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, 'RAYURE_PORTIERE'); sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(300);
  const avis = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { ambre: !!d.querySelector('.esp-avis[data-teinte="ambre"]'), texte: d.querySelector('.esp-avis[data-teinte="ambre"]')?.textContent || '' }; })()`);
  ok(avis.ambre && /sans photo/.test(avis.texte), 'un dommage sans photo : l\'avis ambre prévient avant le clic');
  await s.capturer(`${dossier}tavaro-retour-1440.jpg`, { qualite: 55 });
  /* on retire le dommage sans photo, on chiffre : carburant 3/8 + km 50 + retard 2 jours */
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] .tav-ligne-saisie button')].find(b => b.getAttribute('aria-label') === 'Retirer cette ligne')?.click()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Chiffrer le retour')?.click()`);
  await s.dormir(1200);
  const apres = await s.evaluer(`(() => { const d = document.querySelector('#esp-dossier'); return { fait: /C.est fait/.test(d.innerText), aValider: /Devant l.agence/.test(d.innerText), total: [...d.querySelectorAll('.tav-total')].pop()?.innerText.replace(/\\s+/g, ' '), lignes: d.querySelectorAll('.esp-tableau tbody tr').length, separation: /Vous avez chiffré ce retour/.test(d.innerText) }; })()`);
  ok(apres.fait && apres.aValider, 'le retour est chiffré et la proposition est devant l\'agence');
  ok(/112,20/.test(apres.total || ''), `total TTC 112,20 € (36 + 12,50 + 45 HT : 3/8, 50 km, un jour de retard entamé ; TVA 20 %) : ${apres.total}`);
  ok(apres.lignes === 3, `${apres.lignes} lignes (carburant, kilomètres, retard)`);
  ok(apres.separation, 'la séparation saisie / approbation est dite : vous avez chiffré, une autre personne décide');
  const chiffrerGris = await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-actions .r-btn')].find(b => /chiffrer le retour/i.test(b.textContent))?.disabled`);
  ok(chiffrerGris === true, 'une proposition devant l\'agence : « Rechiffrer » est gris');
  await s.capturer(`${dossier}tavaro-chiffre-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b2-facture', densite: 1 });
  console.log('— /espace/tavaro : litige, avoir, relance, barème (exemple)');
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(400);
  const ouvrir = (numero) => s.evaluer(`(() => { const b = [...document.querySelectorAll('.esp-item')].find(b => /${numero}/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`);
  ok(await ouvrir('C-2026-0351') === true, 'ouverture du contrat facturé C-2026-0351');
  await s.dormir(400);
  const factures = await s.evaluer(`(() => { const f = [...document.querySelectorAll('#esp-dossier .tav-facture')]; return f.map(x => ({ ref: x.querySelector('.esp-mono')?.textContent, litige: [...x.querySelectorAll('.r-btn')].find(b => /Litige/.test(b.textContent))?.disabled, avoir: [...x.querySelectorAll('.r-btn')].find(b => /avoir/.test(b.textContent))?.disabled })); })()`);
  ok(factures.length === 2 && factures[0].ref === 'FA-2026-000118' && factures[1].ref === 'FA-2026-000119', `deux factures : ${factures.map(f => f.ref).join(', ')}`);
  ok(factures[0].litige === false && factures[1].litige === true, 'la facture envoyée peut passer en litige ; celle déjà en litige non');
  ok(/PDF et photos datées joints/.test(await s.evaluer(`document.querySelector('#esp-dossier .tav-facture')?.innerText ?? ''`)), 'la facture dit que le PDF et les photos datées sont joints au courriel');
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .tav-facture')[0].querySelectorAll('.r-btn')].find(b => /Litige/.test(b.textContent)).click()`);
  await s.dormir(400);
  const litigeGris = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Mettre en litige/.test(b.textContent))?.disabled`);
  ok(litigeGris === true, 'sans la contestation du client, « Mettre en litige » reste gris');
  await s.evaluer(`(() => { const t = document.querySelector('[role="dialog"] textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Le client conteste les kilomètres : il a photographié le compteur au retour.'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Mettre en litige/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const enLitige = await s.evaluer(`(() => { const f = document.querySelectorAll('#esp-dossier .tav-facture')[0]; return { pastille: [...f.querySelectorAll('.esp-pastille')].some(p => /En litige/.test(p.textContent)), fil: /Facture en litige FA-2026-000118/.test(document.querySelector('#esp-dossier').innerText) }; })()`);
  ok(enLitige.pastille && enLitige.fil, 'la facture passe « En litige » et le fil du dossier le dit');
  await s.capturer(`${dossier}tavaro-litige-1440.jpg`, { qualite: 55 });
  /* l'avoir : montant borné */
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .tav-facture')[1].querySelectorAll('.r-btn')].find(b => /avoir/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input[inputmode="decimal"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '500'); i.dispatchEvent(new Event('input', { bubbles: true })); const t = document.querySelector('[role="dialog"] textarea'); const st = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; st.call(t, 'Impact visible sur la photo de départ.'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(300);
  const borne = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { rouge: !!d.querySelector('.esp-avis[data-teinte="rouge"]'), gris: [...d.querySelectorAll('button')].find(b => /Demander l.avoir/.test(b.textContent))?.disabled }; })()`);
  ok(borne.rouge && borne.gris === true, 'un avoir de 500 € sur une facture de 110 € : avis rouge, bouton gris');
  await s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input[inputmode="decimal"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '110'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Demander l.avoir/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const avoir = await s.evaluer(`(() => { const t = document.querySelector('#esp-dossier').innerText; return { attente: /Devant la direction/.test(t), total: /annulation complète/.test(t), pastille: /Avoir devant la direction/.test(t) }; })()`);
  ok(avoir.attente && avoir.total && avoir.pastille, 'l\'avoir de 110 € (annulation complète) attend la direction, la facture le dit');
  await s.capturer(`${dossier}tavaro-avoir-1440.jpg`, { qualite: 55 });
  /* la relance de l'impayé */
  ok(await ouvrir('C-2026-0322') === true, 'ouverture du contrat impayé C-2026-0322');
  await s.dormir(400);
  const impaye = await s.evaluer(`(() => { const f = document.querySelector('#esp-dossier .tav-facture'); return { retard: [...f.querySelectorAll('.esp-pastille')].some(p => /Échéance dépassée/.test(p.textContent)), relances: [...f.querySelectorAll('.esp-pastille')].some(p => /1 relance/.test(p.textContent)) }; })()`);
  ok(impaye.retard && impaye.relances, 'la facture pro impayée porte « Échéance dépassée » et « 1 relance »');
  await s.evaluer(`[...document.querySelector('#esp-dossier .tav-facture').querySelectorAll('.r-btn')].find(b => /Relancer/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Envoyer la relance/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const relance = await s.evaluer(`(() => { const t = document.querySelector('#esp-dossier').innerText; return /2 relances/.test(t) && /Facture relancée FA-2026-000071/.test(t); })()`);
  ok(relance, 'la relance part : « 2 relances » et le fil le dit');
  /* le barème : « Vous » est valideur, la direction seule publie */
  const bareme = await s.evaluer(`(() => { const c = document.querySelector('section[aria-label="Barème de remise en état"]'); return { publier: [...c.querySelectorAll('.r-btn')].find(b => /Publier un barème/.test(b.textContent))?.disabled, retirer: [...c.querySelectorAll('.r-btn')].find(b => /Retirer/.test(b.textContent))?.disabled, vigueur: /en vigueur depuis/.test(c.innerText) }; })()`);
  ok(bareme.publier === true && bareme.retirer === true && bareme.vigueur, 'le barème en vigueur se lit ; publier et retirer sont réservés à la direction (gris pour un valideur)');
  await s.capturer(`${dossier}tavaro-bareme-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b2-avis', densite: 1 });
  console.log('— /espace/tavaro : avis de contravention (exemple)');
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(400);
  const sect = `document.querySelector('section[aria-label="Avis de contravention"]')`;
  const etat = await s.evaluer(`(() => { const c = ${sect}; const l = [...c.querySelectorAll('.tav-avis')]; return { n: l.length, premier: l[0]?.innerText ?? '', urgent: /urgent/.test(c.querySelector('.esp-carte-tete').innerText), classer: [...c.querySelectorAll('.r-btn')].filter(b => /^Classer$/.test(b.textContent.trim())).every(b => b.disabled) }; })()`);
  ok(etat.n === 3, `${etat.n} avis à traiter (3 attendus)`);
  ok(/À rattacher/.test(etat.premier) && /2 j pour désigner/.test(etat.premier), 'le premier est le plus urgent : à rattacher, 2 jours');
  ok(etat.urgent, 'la tête de la carte compte l\'urgent');
  ok(etat.classer, 'classer est réservé à la direction (gris pour un valideur)');
  /* saisir un avis : la Clio, avant-hier à 14 h 12, pendant le contrat C-2026-0412 */
  await s.evaluer(`[...${sect}.querySelectorAll('.r-btn')].find(b => /Enregistrer un avis/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`(() => {
    const d = document.querySelector('[role="dialog"]');
    const j = (n) => { const x = new Date(Date.now() - n * 86400000); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const champs = [...d.querySelectorAll('input')];
    const v = ['2026 1004 1412 77', 'ga 123 bc', j(2), '14:12', 'Excès de vitesse inférieur à 20 km/h', 'A6, Auxerre', '135', j(1)];
    v.forEach((x, i) => { set.call(champs[i], x); champs[i].dispatchEvent(new Event('input', { bubbles: true })); });
  })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /^\\s*Enregistrer\\s*$/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const apres = await s.evaluer(`(() => { const c = ${sect}; return { fait: c.querySelector('.esp-avis')?.innerText ?? '', n: c.querySelectorAll('.tav-avis').length }; })()`);
  ok(/rapproché du contrat C-2026-0412/.test(apres.fait) && apres.n === 4, `l'avis saisi se rapproche tout seul : « ${apres.fait.slice(0, 90)} »`);
  /* désigner : prérempli depuis la locataire, il manque la naissance et le permis */
  await s.evaluer(`(() => { const a = [...${sect}.querySelectorAll('.tav-avis')].find(x => /2026 1004 1412 77/.test(x.innerText)); [...a.querySelectorAll('.r-btn')].find(b => /Désigner/.test(b.textContent)).click(); })()`);
  await s.dormir(400);
  const pre = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const i = [...d.querySelectorAll('input')]; return { nom: i[0].value, prenom: i[1].value, gris: [...d.querySelectorAll('button')].find(b => /Consigner/.test(b.textContent)).disabled }; })()`);
  ok(pre.nom === 'Durand' && pre.prenom === 'Marie' && pre.gris, 'la désignation est préremplie (Marie Durand) et reste grise tant qu\'il manque la naissance et le permis');
  await s.evaluer(`(() => {
    const d = document.querySelector('[role="dialog"]'); const i = [...d.querySelectorAll('input')];
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    [[2, '1985-03-02'], [3, 'Lyon'], [5, '12AB34567']].forEach(([k, v]) => { set.call(i[k], v); i[k].dispatchEvent(new Event('input', { bubbles: true })); });
  })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Consigner/.test(b.textContent))?.click()`);
  await s.dormir(800);
  await s.evaluer(`[...${sect}.querySelectorAll('.esp-filtre')].find(b => /Traités/.test(b.textContent)).click()`);
  await s.dormir(300);
  const designe = await s.evaluer(`[...${sect}.querySelectorAll('.tav-avis')].find(x => /2026 1004 1412 77/.test(x.innerText))?.innerText ?? ''`);
  ok(/Désigné : Marie Durand/.test(designe) && /dans le délai/.test(designe), 'l\'avis passe dans « Traités » : désigné, dans le délai');
  await s.evaluer(`(() => { const a = [...${sect}.querySelectorAll('.tav-avis')].find(x => /2026 1004 1412 77/.test(x.innerText)); [...a.querySelectorAll('.r-btn')].find(b => /Refacturer les frais/.test(b.textContent)).click(); })()`);
  await s.dormir(700);
  const refacture = await s.evaluer(`(() => ({ fait: ${sect}.querySelector('.esp-avis')?.innerText ?? '', avis: [...${sect}.querySelectorAll('.tav-avis')].find(x => /2026 1004 1412 77/.test(x.innerText))?.innerText ?? '' }))()`);
  ok(/proposés à la facturation/.test(refacture.fait) && /Frais de dossier refacturés au locataire/.test(refacture.avis), 'les frais de dossier de l\'avis désigné sont proposés à la facturation, par la validation');
  const efface = await s.evaluer(`[...${sect}.querySelectorAll('.tav-avis')].find(x => /2025 0812 6604 51/.test(x.innerText))?.innerText ?? ''`);
  ok(/identité effacée le/.test(efface) && /DES-2025-074410/.test(efface), 'désigné il y a plus d\'un an : l\'identité est effacée, la référence reste');
  await s.capturer(`${dossier}tavaro-avis-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b2-edl', densite: 1 });
  console.log('— /espace/tavaro : état des lieux contradictoire (exemple)');
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(400);
  const sect = `document.querySelector('#esp-dossier section[aria-label="États des lieux"]')`;
  const lu = await s.evaluer(`(() => { const c = ${sect}; return c ? c.innerText : ''; })()`);
  ok(/Signé par Marie Durand/.test(lu) && /Flanc droit/.test(lu) && /Caution 800,00/.test(lu) && /prise/.test(lu), 'le départ signé se lit : signataire, rayure du flanc droit, caution prise');
  ok(/empreinte [0-9a-f]{8}…/.test(lu), 'l\'empreinte du contenu signé est montrée');
  /* l'état de retour : sans les quatre vues, le bouton reste gris ; avec, la signature */
  await s.evaluer(`[...${sect}.querySelectorAll('.r-btn')].find(b => /Faire l.état de retour/.test(b.textContent)).click()`);
  await s.dormir(500);
  const gris = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer et faire signer/.test(b.textContent))?.disabled`);
  ok(gris === true, 'sans les quatre côtés en photo, « Enregistrer et faire signer » reste gris');
  const photo = new URL('photos/nette.jpg', import.meta.url).pathname;
  const floue = new URL('photos/floue.jpg', import.meta.url).pathname;
  /* envoyer rend le message CDP entier : le résultat est sous .result */
  const doc = (await s.envoyer('DOM.getDocument', { depth: -1 })).result;
  /* la photo floue est refusée dès le choix du fichier (b2_07) */
  {
    const { nodeId } = (await s.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#edl-avant' })).result;
    await s.envoyer('DOM.setFileInputFiles', { nodeId, files: [floue] });
    await s.dormir(900);
    const refus = await s.evaluer(`document.querySelector('[role="dialog"]').innerText`);
    ok(/Photo floue refusée/.test(refus) && /floue\.jpg » est floue/.test(refus) && /Photos manquantes : Avant/.test(refus), 'une photo floue est refusée dès son choix : nommée, mesurée, la vue reste manquante');
  }
  for (const vue of ['avant', 'arriere', 'flanc_gauche', 'flanc_droit']) {
    const { nodeId } = (await s.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: `#edl-${vue}` })).result;
    await s.envoyer('DOM.setFileInputFiles', { nodeId, files: [photo] });
  }
  await s.dormir(300);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer et faire signer/.test(b.textContent))?.click()`);
  await s.dormir(700);
  const signature = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { canvas: !!d.querySelector('canvas'), nom: d.querySelector('input')?.value, gris: [...d.querySelectorAll('button')].find(b => /Signer l.état/.test(b.textContent))?.disabled }; })()`);
  ok(signature.canvas && signature.nom === 'Marie Durand' && signature.gris === true, 'la signature : nom prérempli, zone de signature, « Signer » gris tant que rien n\'est tracé');
  const r = await s.evaluer(`(() => { const c = document.querySelector('[role="dialog"] canvas').getBoundingClientRect(); return { x: c.left + 40, y: c.top + 60 }; })()`);
  await s.envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 8; i++) await s.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + i * 25, y: r.y + (i % 2 ? 20 : -10), button: 'left', buttons: 1 });
  await s.envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x + 200, y: r.y, button: 'left', clickCount: 1 });
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Signer l.état/.test(b.textContent))?.click()`);
  await s.dormir(900);
  const apres = await s.evaluer(`(() => ({ texte: ${sect}.innerText, fait: document.querySelector('#esp-dossier .esp-avis[data-teinte="vert"]')?.innerText ?? '' }))()`);
  ok(/signé par Marie Durand : il ne change plus/.test(apres.fait) && (apres.texte.match(/Signé par Marie Durand/g) ?? []).length === 2, 'le retour est signé : les deux états portent la signature');
  /* le chiffrage : carburant du départ verrouillé, la rayure du flanc droit annoncée « pas facturée » */
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .esp-actions .r-btn')].find(b => /Chiffrer le retour/.test(b.textContent)).click()`);
  await s.dormir(500);
  const verrou = await s.evaluer(`[...document.querySelectorAll('[role="dialog"] select')][0]?.disabled`);
  ok(verrou === true, 'le carburant au départ est repris de l\'état signé et verrouillé');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Ajouter un dommage/.test(b.textContent))?.click()`);
  await s.dormir(300);
  await s.evaluer(`(() => { const sel = [...document.querySelectorAll('[role="dialog"] .tav-ligne-saisie select')]; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel[0], 'flanc_droit'); sel[0].dispatchEvent(new Event('change', { bubbles: true })); set.call(sel[1], 'RAYURE_PORTIERE'); sel[1].dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await s.dormir(300);
  const deja = await s.evaluer(`document.querySelector('[role="dialog"] .tav-ligne-saisie')?.innerText ?? ''`);
  ok(/Déjà noté sur l.état de départ signé/.test(deja) && /ne sera pas facturé/.test(deja), 'une rayure dans une zone déjà notée au départ : « ne sera pas facturé » avant le clic');
  await s.capturer(`${dossier}tavaro-edl-1440.jpg`, { qualite: 55 });
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b2-fe', densite: 1 });
  console.log('— /espace/tavaro : facture électronique (exemple)');
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(400);
  const prep = await s.evaluer(`document.querySelector('section[aria-label="Facture électronique : préparation 2027"]')?.innerText ?? ''`);
  ok(/prêt pour le 1er septembre 2027/.test(prep) && /2 clients professionnels sans SIREN valide/.test(prep) && /à préparer/.test(prep), 'la préparation 2027 se lit : deux clients pros sans SIREN, « à préparer »');
  await s.evaluer(`[...document.querySelectorAll('.esp-item')].find(b => /C-2026-0322/.test(b.textContent)).click()`);
  await s.dormir(400);
  await s.evaluer(`[...document.querySelectorAll('#esp-dossier .tav-facture .r-btn')].find(b => /Forme électronique/.test(b.textContent)).click()`);
  await s.dormir(600);
  const forme = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); return { texte: d.innerText, xml: d.querySelector('.tav-xml pre')?.textContent ?? '' }; })()`);
  ok(/à compléter avant envoi/.test(forme.texte) && /le SIREN du client professionnel/.test(forme.texte), 'une facture pro sans SIREN : « à compléter », le SIREN du client manque');
  ok(/urn:cen\.eu:en16931:2017/.test(forme.xml) && /<ram:ID>FA-2026-000071<\/ram:ID>/.test(forme.xml) && /<ram:ID>S1<\/ram:ID>/.test(forme.xml), 'le XML CII se lit : contexte EN 16931, cadre S1, numéro de la facture');
  const saisir = (v) => s.evaluer(`(() => { const i = document.querySelector('[role="dialog"] input[inputmode="numeric"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '${v}'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const bouton = () => s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer le SIREN/.test(b.textContent))?.disabled`);
  await saisir('123 456 789');
  await s.dormir(200);
  ok(await bouton() === true && /clé de contrôle de ce SIREN est fausse/.test(await s.evaluer(`document.querySelector('[role="dialog"]').innerText`)), 'un SIREN à la clé fausse : bouton gris, l\'écran le dit');
  await saisir('552 100 554');
  await s.dormir(200);
  ok(await bouton() === false, 'un SIREN valide : le bouton s\'active');
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Enregistrer le SIREN/.test(b.textContent)).click()`);
  await s.dormir(700);
  ok(/les prochaines factures le porteront/.test(await s.evaluer(`document.querySelector('[role="dialog"]').innerText`)), 'le SIREN est enregistré ; la facture émise ne change pas');
  await s.capturer(`${dossier}tavaro-fe-1440.jpg`, { qualite: 55 });
  await s.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await s.dormir(400);
  const prep2 = await s.evaluer(`document.querySelector('section[aria-label="Facture électronique : préparation 2027"]')?.innerText ?? ''`);
  ok(/1 client professionnel sans SIREN valide/.test(prep2), 'la préparation se met à jour : un seul client pro sans SIREN');
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
