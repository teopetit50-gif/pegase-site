/* recette-tamila.mjs — l'écran /espace/tamila aux cinq largeurs (session B4,
   05/10/2026). Pour chaque largeur (390 / 768 / 1024 / 1440 / 1700) : la page
   charge, aucun débordement horizontal, aucun élément plus large que l'écran,
   aucun mot anglais parmi ceux qu'on surveille, les cinq compteurs et la liste
   des dossiers, une capture légère (jpeg, densité 1) dans omega/recette-b4/.
   Puis quatre enchaînements sur l'exemple : ouvrir le dossier en tête et lire
   le calcul d'un délai (art. 908 + 915-4) ; confirmer ce délai ; déclarer un
   acte déposé ; poser une muraille ; ouvrir un nouveau dossier.
   usage : node omega/recette-b4/recette-tamila.mjs [origine] */
import { mkdirSync } from 'node:fs';
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
  ok(mesure.cartes >= 8, `${mesure.cartes} cartes dans le dossier ouvert`);
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

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
