/* dossier-date.mjs — le dossier daté du projet, exportable en une fois (session B5, 11/10/2026).
   Sur l'exemple (Façade rue Mercière : visas, situations, décennales, OS, réserves, comptes rendus) : clique « Exporter
   le dossier daté », récupère l'archive fabriquée dans le navigateur, la vérifie (unzip -t), puis le registre PDF
   (pdfinfo / pdftotext : rubriques, dates, refus et décisions) et l'Excel (feuille « Registre » et une feuille par lot).
   usage : node omega/recette-b5/dossier-date.mjs [origine] */
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ouvrirSession } from '../../outils/chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3012';
const dossier = new URL('.', import.meta.url).pathname;
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: 'b5-dossier-date', densite: 1 });
console.log('— le dossier daté : Façade rue Mercière');
ok(await s.aller(base + '/espace/lorani?projet=00000000-0000-4000-8000-00000000b004'), 'page chargée');
await s.dormir(700);
await s.evaluer(`(() => { window.__fichiers = []; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { window.__fichiers.push(b); return orig.call(URL, b); }; HTMLAnchorElement.prototype.click = function () { window.__noms = [...(window.__noms || []), this.download]; }; return true; })()`);
await s.evaluer(`[...document.querySelectorAll('.r-btn')].find(b => /Exporter le dossier daté/.test(b.textContent))?.click()`);
for (let i = 0; i < 20; i++) { await s.dormir(300); if (await s.evaluer(`window.__fichiers.length`)) break; }
const z = await s.evaluer(`(async () => { const b = window.__fichiers.shift(); if (!b) return null; const a = new Uint8Array(await b.arrayBuffer()); let t = ''; for (let i = 0; i < a.length; i += 0x8000) t += String.fromCharCode(...a.subarray(i, i + 0x8000)); return { nom: (window.__noms || []).slice(-1)[0], type: b.type, b64: btoa(t) }; })()`);
s.fermer();
ok(z && z.type === 'application/zip' && /^dossier-date-25-031-\d{4}-\d{2}-\d{2}\.zip$/.test(z.nom), `archive fabriquée : ${z?.nom}`);
if (z) {
  const chemin = `${dossier}dossier-date-exemple.zip`;
  writeFileSync(chemin, Buffer.from(z.b64, 'base64'));
  ok(/No errors detected/.test(execFileSync('unzip', ['-t', chemin]).toString()), 'unzip -t : archive saine');
  const tmp = mkdtempSync('/tmp/b5-dossier-');
  execFileSync('unzip', ['-q', chemin, '-d', tmp]);
  const rep = join(tmp, readdirSync(tmp)[0]);
  ok(readdirSync(rep).sort().join(',') === 'registre.pdf,registre.xlsx', `deux fichiers : ${readdirSync(rep).join(', ')}`);
  const texte = execFileSync('pdftotext', ['-layout', join(rep, 'registre.pdf'), '-']).toString().replace(/\s+/g, ' ');
  ok(/Dossier daté — Façade rue Mercière/.test(texte), 'pdftotext : titre accentué');
  ok(/Visas rendus et refus/.test(texte) && /Visé sans observation/.test(texte) && /À viser/.test(texte), 'les visas, rendus et à rendre, avec leur date');
  ok(/Décennale/.test(texte) && /Non conforme/.test(texte) && /Réserve n° \d/.test(texte) && /Situation n° 3/.test(texte) && /OS n° \d/.test(texte), 'décennales, réserves, situations et OS, chacun daté');
  ok(/\d{2}\/\d{2}\/\d{4} · lot 01/.test(texte), 'chaque ligne porte sa date et son lot');
  const wb = execFileSync('unzip', ['-p', join(rep, 'registre.xlsx'), 'xl/workbook.xml']).toString();
  const f2 = execFileSync('unzip', ['-p', join(rep, 'registre.xlsx'), 'xl/worksheets/sheet2.xml']).toString();
  ok(/name="Registre"/.test(wb) && /name="Lot 01"/.test(wb) && /name="Lot 02"/.test(wb), 'Excel : « Registre » puis une feuille par lot (Lot 01, Lot 02)');
  const f3 = execFileSync('unzip', ['-p', join(rep, 'registre.xlsx'), 'xl/worksheets/sheet3.xml']).toString();
  const lotDe = (f) => [...f.matchAll(/<c r="C\d+"[^>]*><is><t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).filter((x) => x !== 'Lot');
  ok(lotDe(f2).length > 0 && lotDe(f2).every((x) => x === '01') && lotDe(f3).every((x) => x === '02') && /Pierres de Bourgogne/.test(f2), `la feuille « Lot 01 » ne porte que le lot 01 (${lotDe(f2).length} lignes), « Lot 02 » que le lot 02 (${lotDe(f3).length})`);
}
console.log(echecs ? `\n${echecs} échec(s)` : '\ntout passe');
process.exit(echecs ? 1 : 0);
