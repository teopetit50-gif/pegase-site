/* rapport-controle.mjs — le rapport du contrôle du dossier (b5_16), PDF annoté et Excel (session B5, 06/10/2026).
   Sur l'exemple (Surélévation Dubois, indice B) : clique « Rapport PDF annoté » puis « Tableau Excel », récupère les
   fichiers fabriqués dans le navigateur (URL.createObjectURL est écouté), les écrit dans omega/recette-b5/ et les
   vérifie avec les outils du système : pdfinfo / pdftotext (pages, texte, accents), unzip -t (le .xlsx est un zip
   sain) et le XML de la feuille (lignes, constats, citations).
   usage : node omega/recette-b5/rapport-controle.mjs [origine] */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b5-rapport', densite: 1 });
console.log('— le rapport du contrôle : Surélévation Dubois, indice B');
ok(await s.aller(base + '/espace/lorani?projet=00000000-0000-4000-8000-00000000b005'), 'page chargée');
await s.dormir(700);
await s.evaluer(`(() => { window.__fichiers = []; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { window.__fichiers.push(b); return orig.call(URL, b); }; HTMLAnchorElement.prototype.click = function () { window.__noms = [...(window.__noms || []), this.download]; }; return true; })()`);

const recuperer = async (bouton, attente) => {
  await s.evaluer(`[...document.querySelectorAll('.lor-rapport .r-btn')].find(b => /${bouton}/.test(b.textContent))?.click()`);
  for (let i = 0; i < attente; i++) {
    await s.dormir(500);
    const n = await s.evaluer(`window.__fichiers.length`);
    if (n > 0) break;
  }
  const r = await s.evaluer(`(async () => { const b = window.__fichiers.shift(); if (!b) return null; const a = new Uint8Array(await b.arrayBuffer()); let t = ''; for (let i = 0; i < a.length; i += 0x8000) t += String.fromCharCode(...a.subarray(i, i + 0x8000)); return { nom: (window.__noms || []).slice(-1)[0], type: b.type, b64: btoa(t) }; })()`);
  return r;
};

const pdf = await recuperer('PDF', 40);
ok(pdf && pdf.type === 'application/pdf' && /^controle-26-018-indice-B\.pdf$/.test(pdf.nom), `PDF fabriqué : ${pdf?.nom} (${pdf ? Math.round(pdf.b64.length * 0.75 / 1024) : 0} Ko)`);
if (pdf) {
  const chemin = `${dossier}rapport-controle-exemple.pdf`;
  writeFileSync(chemin, Buffer.from(pdf.b64, 'base64'));
  const info = execFileSync('pdfinfo', [chemin]).toString();
  const pages = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
  ok(pages >= 4, `pdfinfo lit le PDF : ${pages} pages (rapport + pages citées annotées)`);
  ok(/Title:\s+Contrôle du dossier — Surélévation Dubois/.test(info), 'titre du document avec ses accents');
  const texte = execFileSync('pdftotext', ['-layout', chemin, '-']).toString();
  ok(/2 constats ouverts, dont 1 bloquant/.test(texte) && /Corrigés depuis l'indice A/.test(texte), 'le résumé : 2 ouverts dont 1 bloquant, corrigés depuis l’indice A');
  ok(/Correction proposée : Ramener le recul sur limite séparative/.test(texte) && /PC2, p\. 1 : « 3,20 m »/.test(texte), 'chaque constat avec sa correction proposée et ses citations (page, texte lu)');
  ok(/Règle : au moins 4 m, article URm1 7 \(PLU-H URm1, p\. 41\)/.test(texte.replace(/\s+/g, ' ')), 'la règle du PLU et son article');
  ok(/PC2, page 1 — constat/.test(texte) && /CCTP 02, page 9 — constat/.test(texte), 'les pages citées suivent, légendées avec les numéros des constats');
}

const xl = await recuperer('Excel', 10);
ok(xl && /spreadsheetml/.test(xl.type) && /^controle-26-018-indice-B\.xlsx$/.test(xl.nom), `Excel fabriqué : ${xl?.nom}`);
if (xl) {
  const chemin = `${dossier}rapport-controle-exemple.xlsx`;
  writeFileSync(chemin, Buffer.from(xl.b64, 'base64'));
  const test = execFileSync('unzip', ['-t', chemin]).toString();
  ok(/No errors detected/.test(test), 'unzip -t : le .xlsx est un zip sain');
  const feuille = execFileSync('unzip', ['-p', chemin, 'xl/worksheets/sheet1.xml']).toString();
  const lignes = (feuille.match(/<row /g) || []).length;
  ok(lignes >= 6 && /Ramener le recul sur limite séparative/.test(feuille) && /« facade est »/.test(feuille) && /Corrigé à l&apos;indice B|Corrigé à l'indice B/.test(feuille), `feuille « Constats » : ${lignes} lignes, constats, citations et corrigés de l’indice A`);
  const classeur = execFileSync('unzip', ['-p', chemin, 'xl/workbook.xml']).toString();
  ok(/name="Constats"/.test(classeur) && /name="Pièces"/.test(classeur), 'deux feuilles : Constats, Pièces');
}
s.soucis.filter((x) => !/CERT|insights|404|favicon/.test(x)).forEach((x) => ok(false, x));
s.fermer();
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
