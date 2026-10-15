/* recette-tavaro.mjs — l'écran /espace/tavaro aux cinq largeurs (session B2,
   06/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran,
   aucun mot anglais surveillé, une capture légère dans omega/recette-b2/.
   Puis les enchaînements sur l'exemple : ouvrir le retour à chiffrer, saisir
   un retour avec un dommage sans photo (l'avis ambre), puis avec photo, et
   voir la proposition « À valider » ; passer une facture en litige ; demander
   un avoir (montant borné) ; relancer l'impayé ; publier un barème (direction
   seule : « Vous » est valideur, le bouton est gris).
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
             items: document.querySelectorAll('.esp-item').length, bareme: document.querySelectorAll('section[aria-label="Barème de remise en état"] tbody tr').length };
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

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
