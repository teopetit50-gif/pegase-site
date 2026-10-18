/* recette-tavaro-analyses.mjs — les analyses du parc sur /espace/tavaro
   (session B3, renfort Tavaro, 06/10/2026). Aux cinq largeurs (390 / 768 /
   1024 / 1440 / 1700) : la page charge, aucun débordement horizontal, aucun
   élément plus large que l'écran, les cinq cartes (véhicules inactifs,
   réservations et contrats à risque, montée en gamme, plan de flotte) sont
   là avec leurs chiffres. Puis le contrôle des pièces au comptoir sur
   l'exemple (permis non conforme → « Pièce non conforme »), et l'axe-core
   (WCAG 2.1 A/AA) à 390 et 1440 sur les cartes et le dialogue.
   usage : node omega/recette-b3/recette-tavaro-analyses.mjs [origine] */
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3013';
const dossier = new URL('.', import.meta.url).pathname;
mkdirSync(dossier, { recursive: true });
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const CARTES = ['Véhicules inactifs', 'Réservations à risque', 'Contrats à risque', 'Montée en gamme', 'Plan de flotte'];
const analyser = (s, cible) => s.evaluer(`(async () => {
  const r = await axe.run(${cible}, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, aide: v.help, cibles: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
})()`);
function dire(nom, violations) {
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations) console.log(`    ${graves.includes(v) ? '!' : '·'} [${v.impact}] ${v.id} ×${v.n} — ${v.aide}\n        ${v.cibles.join('\n        ')}`);
  ok(graves.length === 0, `${nom} : ${graves.length} écart(s) grave(s), ${violations.length - graves.length} mineur(s)`);
}

for (const largeur of [390, 768, 1024, 1440, 1700]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b3-tavaro', densite: 1 });
  console.log(`— /espace/tavaro à ${largeur}`);
  ok(await s.aller(base + '/espace/tavaro'), 'page chargée');
  await s.dormir(900);
  const m = await s.evaluer(`(() => {
    const w = document.documentElement.clientWidth;
    const dansCadre = (e) => !!e.closest('.esp-tableau-cadre') && e !== e.closest('.esp-tableau-cadre');
    const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !dansCadre(e); })
      .slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.') + '→' + Math.round(e.getBoundingClientRect().right));
    const carte = (n) => document.querySelector('section[aria-label="' + n + '"]');
    return { deb: document.documentElement.scrollWidth - w, larges,
             cartes: ${JSON.stringify(CARTES)}.filter(n => carte(n)),
             inactifs: carte('Véhicules inactifs')?.querySelectorAll('li').length ?? 0,
             resas: carte('Réservations à risque')?.querySelectorAll('li').length ?? 0,
             contrats: carte('Contrats à risque')?.querySelectorAll('li').length ?? 0,
             offres: carte('Montée en gamme')?.querySelectorAll('li').length ?? 0,
             plan: carte('Plan de flotte')?.innerText ?? '' };
  })()`);
  ok(m.deb === 0, `pas de débordement horizontal (${m.deb})`);
  ok(m.larges.length === 0, `aucun élément plus large que l'écran ${m.larges.length ? JSON.stringify(m.larges) : ''}`);
  ok(m.cartes.length === 5, `les cinq cartes : ${m.cartes.join(' · ')}`);
  ok(m.inactifs === 3 && m.resas === 3 && m.contrats === 2 && m.offres === 2, `3 véhicules, 3 réservations, 2 contrats, 2 offres (${m.inactifs}, ${m.resas}, ${m.contrats}, ${m.offres})`);
  ok(/Plan de flotte \d{4}/.test(m.plan) && /2 vers GRENOBLE/.test(m.plan), 'le plan de flotte : l\'an prochain, deux citadines de Lyon vers Grenoble');
  if (largeur === 1440) {
    await s.evaluer(`document.getElementById('tavaro-inactifs')?.scrollIntoView({ block: 'start' })`);
    await s.dormir(400);
    await s.capturer(`${dossier}tavaro-analyses-1440.jpg`, { qualite: 55 });
    await s.evaluer(`document.getElementById('tavaro-plan-de-flotte')?.scrollIntoView({ block: 'start' })`);
    await s.dormir(400);
    await s.capturer(`${dossier}tavaro-plan-1440.jpg`, { qualite: 55 });
  }
  if (largeur === 390) {
    await s.evaluer(`document.getElementById('tavaro-contrats-risque')?.scrollIntoView({ block: 'start' })`);
    await s.dormir(300);
    await s.capturer(`${dossier}tavaro-analyses-390.jpg`, { qualite: 55 });
  }
  s.soucis.filter((x) => !/CERT|insights|404|favicon|vercel/i.test(x)).forEach((x) => ok(false, x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b3-tavaro-controle', densite: 1 });
  console.log('— /espace/tavaro : le contrôle des pièces au comptoir (exemple, b3t_02)');
  await s.aller(base + '/espace/tavaro');
  await s.dormir(900);
  ok(await s.evaluer(`(() => { const li = [...document.querySelectorAll('section[aria-label="Contrats à risque"] li')].find(l => /LY-2026-1043/.test(l.textContent)); const b = li && [...li.querySelectorAll('button')].find(b => /Noter le contrôle/.test(b.textContent)); if (!b) return null; b.click(); return true; })()`) === true,
     '« Noter le contrôle » du contrat LY-2026-1043');
  await s.dormir(500);
  ok(await s.evaluer(`/Contrôle des pièces — LY-2026-1043/.test(document.querySelector('[role="dialog"]')?.textContent || '')`), 'le dialogue s\'ouvre sur le contrat');
  await s.evaluer(axe + ';true');
  dire('tavaro 1440, dialogue du contrôle', await analyser(s, `document.querySelector('[role="dialog"]')`));
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] input[type="radio"]')].find(i => i.name === 'controle-Permis de conduire' && i.value === 'non_conforme')?.click()`);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] input[type="radio"]')].find(i => i.name === 'controle-Permis de moins de trois ans' && i.value === 'oui')?.click()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Noter le contrôle/.test(b.textContent))?.click()`);
  await s.dormir(800);
  const li = await s.evaluer(`[...document.querySelectorAll('section[aria-label="Contrats à risque"] li')].find(l => /LY-2026-1043/.test(l.textContent))?.innerText || ''`);
  ok(!(await s.evaluer(`!!document.querySelector('[role="dialog"]')`)) && /Pièce non conforme/.test(li) && /Ne pas remettre les clés/.test(li), 'permis non conforme : « Pièce non conforme », pas de clés sans pièces');
  ok(/Score 10/.test(li), `le score passe de 6 à 10 (pièces à contrôler −1, non conforme +3, permis récent +2) : ${li.split('\n')[0]}`);
  s.fermer();
}

for (const largeur of [390, 1440]) {
  const s = await ouvrirSession({ largeur, hauteur: largeur < 768 ? 844 : 900, marque: 'b3-axe-tavaro', densite: 1 });
  console.log(`— axe : les analyses du parc à ${largeur}`);
  await s.aller(base + '/espace/tavaro');
  await s.dormir(900);
  await s.evaluer(axe + ';true');
  for (const n of CARTES) dire(`${n} ${largeur}`, await analyser(s, `document.querySelector('section[aria-label="${n}"]')`));
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
