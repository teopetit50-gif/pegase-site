/* rapport-offres.mjs — l'analyse des offres (b5_26) : l'onglet, puis le rapport PDF et l'Excel (session B5, 11/10/2026).
   Sur l'exemple (Maison Lemoine, lot 03, trois offres) : le classement, les postes chiffrés par une seule entreprise,
   le tableau poste par poste ; le rapport PDF (pdfinfo / pdftotext : classement, relevés, proposition, cadre de
   signature) et l'Excel (unzip -t, trois feuilles) ; écarter puis retenir ; rien ne dépasse à 390 px.
   usage : node omega/recette-b5/rapport-offres.mjs [origine] */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
const url = base + '/espace/lorani?projet=00000000-0000-4000-8000-00000000b001';
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const carte = `[...document.querySelectorAll('.esp-section-titre')].find(t => /Analyse des offres/.test(t.textContent))?.closest('.esp-carte-corps')`;

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b5-offres', densite: 1 });
  console.log('— l’analyse des offres : Maison Lemoine, lot 03');
  ok(await s.aller(url), 'page chargée');
  await s.dormir(700);
  const a = await s.evaluer(`(() => { const c = ${carte}; const t = (c?.innerText || '').replace(/[\\u202f\\u00a0]/g, ' '); const lignes = [...(c?.querySelectorAll('[aria-label="Classement des offres"] tbody tr') || [])].map(r => r.innerText.replace(/[\\u202f\\u00a0]/g, ' ').replace(/\\s+/g, ' ')); return {
    tete: /Lot 03 — Menuiseries extérieures · DCE lot 03/.test(t) && /Analysée/.test(t), estimation: /Estimation : 39 800 € HT · seuil d’écart par ligne : 20 %/.test(t),
    une: /Chiffré par une seule entreprise sur 3 : poste 3\\.3/.test(t), lignes: lignes.length, premier: /^1 Menuiseries de Loire .*33 600 € 36 800 € -7,5 %/.test(lignes[0] || ''),
    calcul: /Poste 3\\.1 : 820 × 24 = 19 680 €, l’offre écrit 19 780 €/.test(t), reserve: /Réserve : Hors pose des appuis de fenêtre/.test(t),
    manque: c?.querySelectorAll('td[data-etat="manque"]').length, ecart: c?.querySelectorAll('td[data-etat="ecart"]').length }; })()`);
  ok(a.tete && a.estimation && a.une && a.lignes === 3 && a.premier && a.calcul && a.reserve,
     `classement comparable (Menuiseries de Loire 1re à 36 800 €), poste 3.3 chiffré par une seule entreprise, erreur de calcul et réserve relevées (${JSON.stringify(a)})`);
  ok(a.manque === 2 && a.ecart >= 1, `poste par poste : 2 cases « non chiffré » en rouge, ${a.ecart} écart(s) à l’estimation en ambre`);
  await s.evaluer(`${carte}?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-offres-1440.jpg`, { qualite: 55 });

  /* le rapport */
  await s.evaluer(`(() => { window.__fichiers = []; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { window.__fichiers.push(b); return orig.call(URL, b); }; HTMLAnchorElement.prototype.click = function () { window.__noms = [...(window.__noms || []), this.download]; }; return true; })()`);
  const recuperer = async (bouton) => {
    await s.evaluer(`[...(${carte}?.querySelectorAll('.r-btn') || [])].find(b => /${bouton}/.test(b.textContent))?.click()`);
    for (let i = 0; i < 20; i++) { await s.dormir(300); if (await s.evaluer(`window.__fichiers.length`)) break; }
    return s.evaluer(`(async () => { const b = window.__fichiers.shift(); if (!b) return null; const a = new Uint8Array(await b.arrayBuffer()); let t = ''; for (let i = 0; i < a.length; i += 0x8000) t += String.fromCharCode(...a.subarray(i, i + 0x8000)); return { nom: (window.__noms || []).slice(-1)[0], type: b.type, b64: btoa(t) }; })()`);
  };
  const pdf = await recuperer('Rapport d’analyse PDF');
  ok(pdf && pdf.type === 'application/pdf' && /^analyse-offres-26-014-lot-03\.pdf$/.test(pdf.nom), `PDF fabriqué : ${pdf?.nom}`);
  if (pdf) {
    const chemin = `${dossier}rapport-offres-exemple.pdf`;
    writeFileSync(chemin, Buffer.from(pdf.b64, 'base64'));
    const info = execFileSync('pdfinfo', [chemin]).toString();
    const texte = execFileSync('pdftotext', ['-layout', chemin, '-']).toString().replace(/\s+/g, ' ');
    ok(/Title:\s+Rapport d'analyse des offres — Maison Lemoine/.test(info), 'pdfinfo : titre accentué lu');
    ok(/1\. Menuiseries de Loire · annoncé 33 600 € HT · recalculé 33 600 € · comparable 36 800 €/.test(texte.replace(/ /g, ' ')), 'pdftotext : le classement, en euros');
    ok(/Chiffré par une seule entreprise sur 3 : 3\.3/.test(texte) && /Poste 3\.4 : écart de 31 % à l’estimation/.test(texte), 'pdftotext : poste 3.3 et écart de 31 % sur le 3.4');
    ok(/Proposition d'attribution/.test(texte) && /L'architecte, maître d'œuvre \(nom, signature\)/.test(texte), 'pdftotext : proposition d’attribution et cadre de signature');
  }
  const xl = await recuperer('Tableau Excel');
  ok(xl && /^analyse-offres-26-014-lot-03\.xlsx$/.test(xl.nom), `Excel fabriqué : ${xl?.nom}`);
  if (xl) {
    const chemin = `${dossier}rapport-offres-exemple.xlsx`;
    writeFileSync(chemin, Buffer.from(xl.b64, 'base64'));
    const t = execFileSync('unzip', ['-t', chemin]).toString();
    ok(/No errors detected/.test(t), 'unzip -t : le .xlsx est un zip sain');
    const wb = execFileSync('unzip', ['-p', chemin, 'xl/workbook.xml']).toString();
    const f2 = execFileSync('unzip', ['-p', chemin, 'xl/worksheets/sheet2.xml']).toString();
    ok(/name="Classement"/.test(wb) && /name="Par poste"/.test(wb) && /name="Relevés"/.test(wb), 'trois feuilles : Classement, Par poste, Relevés');
    ok(/3\.3/.test(f2) && /Porte d’entrée/.test(f2) && /<v>9430<\/v>/.test(f2), 'la feuille « Par poste » porte les montants (9 430 € d’Alu Ouest sur le 3.4)');
  }

  /* écarter, puis retenir */
  await s.evaluer(`[...(${carte}?.querySelectorAll('tbody tr') || [])].find(r => /Ateliers Bois/.test(r.textContent))?.querySelectorAll('.r-btn--fil')[0]?.click()`);
  await s.dormir(500);
  const e1 = await s.evaluer(`(() => { const d = document.querySelector('[role="dialog"]'); const b = [...(d?.querySelectorAll('button') || [])].find(x => /^\\s*Écarter\\s*$/.test(x.textContent)); return { titre: d?.querySelector('h2')?.textContent, gris: b?.disabled }; })()`);
  ok(e1.titre === 'Écarter l’offre' && e1.gris === true, `dialogue « ${e1.titre} » : sans motif, « Écarter » reste grisé`);
  await s.evaluer(`(() => { const ta = document.querySelector('[role="dialog"] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Offre incomplète : porte d’entrée non chiffrée'); ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await s.dormir(200);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(x => /^\\s*Écarter\\s*$/.test(x.textContent))?.click()`);
  await s.dormir(600);
  ok(await s.evaluer(`/Écartée : Offre incomplète/.test(${carte}?.innerText || '')`), 'Ateliers Bois écartée, le motif est montré');
  await s.evaluer(`[...(${carte}?.querySelectorAll('tbody tr') || [])].find(r => /Menuiseries de Loire/.test(r.textContent))?.querySelector('.r-btn--noir')?.click()`);
  await s.dormir(500);
  await s.evaluer(`[...document.querySelectorAll('[role="dialog"] button')].find(x => /^\\s*Retenir\\s*$/.test(x.textContent))?.click()`);
  await s.dormir(700);
  const r = await s.evaluer(`(() => { const t = ${carte}?.innerText || ''; return { attribuee: /Attribuée/.test(t), retenue: /Retenue/.test(t), boutons: [...(${carte}?.querySelectorAll('tbody .r-btn') || [])].filter(b => !b.disabled).length }; })()`);
  ok(r.attribuee && r.retenue && r.boutons === 0, `retenue : la consultation passe « Attribuée », plus aucune décision possible (${JSON.stringify(r)})`);
  ok(await s.evaluer(`/Menuiseries de Loire/.test([...document.querySelectorAll('.esp-section-titre')].find(t => /Chantier/.test(t.textContent))?.closest('.esp-carte-corps')?.innerText || '')`),
     'le marché du lot 03 apparaît au chantier, au nom de Menuiseries de Loire');
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: 'b5-offres-390', densite: 2 });
  console.log('— à 390 px');
  ok(await s.aller(url), 'page chargée');
  await s.dormir(700);
  const m = await s.evaluer(`(() => { const w = document.documentElement.clientWidth; const larges = [...document.querySelectorAll('.esp *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !e.closest('.esp-tableau-cadre'); }).slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.')); return { deb: document.documentElement.scrollWidth - w, larges }; })()`);
  ok(m.deb <= 0 && m.larges.length === 0, `rien ne dépasse hors des tableaux défilants (${JSON.stringify(m)})`);
  await s.evaluer(`${carte}?.scrollIntoView({ block: 'start' })`);
  await s.dormir(300);
  await s.capturer(`${dossier}lorani-offres-390.jpg`, { qualite: 55 });
  s.fermer();
}

console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
