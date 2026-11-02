// Génère components/espace2/tamila/TamIcone.tsx (02/11/2026, refonte TAMILA) :
// - les icônes de Linear, symboles du sprite et tracés en ligne relevés par la session références
//   (docs/refonte-metiers/releves/linear-commun, branche claude/refs-linear-49bf64), viewBox 16 ;
// - les icônes de Plain, tracés exacts des relevés plain-*.md (branche claude/refs-plain-attio-cal-a3a72b), viewBox 24.
// node outils/tam-icones.mjs <dossier linear-commun> <dossier releves plain>
import { readFileSync, writeFileSync } from "node:fs";
const [dir, plainDir] = process.argv.slice(2);
const sprite = readFileSync(`${dir}/sprite-icones.svg`, "utf8");
const md = readFileSync(`${dir}/icones-en-ligne.md`, "utf8");
const NOMS = `AddRelation Agent AssignTo AssignToMe Attachment AvatarEmpty Calendar Checklist Comment CompletedDate Created Creator CrossedOutCalendar CurrentUser CustomView Cycle Favorite Folder FromDate Home Inbox Initiative IssueStatusBacklog IssueStatusDone IssueStatusReview IssueStatusStarted IssueStatusTodo IssueStatusTriage Label Link Lock Members MyIssues PdfFile Priority0 Priority1 Priority2 Priority3 Priority4 Project ProjectLead Refresh Search Send StatusCanceled StatusDuplicate Subissue Subscribe Team UnassignedCircle Unassigned Updated Alert AlarmClock Alarm Briefcase Calculator Chat Clock Email Euro ExclamationMark Flag Hourglass Judge Page Policy Report Resolved Shield Signature Spreadsheet Users Trash Write Bank Book Database Gears Automation Process`.split(/\s+/);
const lin = {};
for (const n of NOMS) {
  const m = sprite.match(new RegExp(`<symbol id="${n}" viewBox="0 0 16 16">(.*?)</symbol>`, "s"));
  if (!m) { console.error("absent du sprite :", n); continue; }
  lin[n] = m[1];
}
const EN_LIGNE = { "Menu latéral": "Menu", "Étoile": "Etoile", "Points": "Points", "Lien (Copy": "LienUrl", "Plus": "Plus", "Ajouter une section": "Section", "Flèche": "Fleche", "Chevron": "Chevron", "Slack": "Slack", "Roue dentée": "Roue", "Triage": "Triage", "Issues": "Issues", "Cycles": "Cycles", "Archive": "Archive" };
for (const bloc of md.split(/^### /m).slice(1)) {
  const titre = bloc.split("\n")[0];
  const cle = Object.entries(EN_LIGNE).find(([k]) => titre.startsWith(k))?.[1];
  const svg = bloc.match(/<svg[^>]*>(.*?)<\/svg>/s);
  if (cle && svg) lin[cle] = svg[1].trim();
}
// hors sprite : bundle public de Linear (static.linear.app), mêmes tracés que outils/dal-icones.mjs
lin.Filtre = '<path d="M14.25 3a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5h12.5ZM4 8a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 8Zm2.75 3.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"/>';
lin.Affichage = '<path fill-rule="evenodd" clip-rule="evenodd" d="M7 2.5C8.11933 2.5 9.06613 3.23584 9.38477 4.25H14.75C15.1642 4.25 15.5 4.58579 15.5 5C15.5 5.41421 15.1642 5.75 14.75 5.75H9.38477C9.06613 6.76416 8.11933 7.5 7 7.5C5.88067 7.5 4.93387 6.76416 4.61523 5.75H2.25C1.83579 5.75 1.5 5.41421 1.5 5C1.5 4.58579 1.83579 4.25 2.25 4.25H4.61523C4.93387 3.23584 5.88067 2.5 7 2.5ZM7 4C6.44772 4 6 4.44772 6 5C6 5.55228 6.44772 6 7 6C7.55228 6 8 5.55228 8 5C8 4.44772 7.55228 4 7 4Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10 13.5C8.88067 13.5 7.93387 12.7642 7.61523 11.75H2.25C1.83579 11.75 1.5 11.4142 1.5 11C1.5 10.5858 1.83579 10.25 2.25 10.25H7.61523C7.93387 9.23584 8.88067 8.5 10 8.5C11.1193 8.5 12.0661 9.23584 12.3848 10.25H14.75C15.1642 10.25 15.5 10.5858 15.5 11C15.5 11.4142 15.1642 11.75 14.75 11.75H12.3848C12.0661 12.7642 11.1193 13.5 10 13.5ZM10 12C10.5523 12 11 11.5523 11 11C11 10.4477 10.5523 10 10 10C9.44772 10 9 10.4477 9 11C9 11.5523 9.44772 12 10 12Z"/>';
if (lin.Menu) lin.Volet = lin.Menu + '<rect x="10" y="3.5" width="1.5" height="9" rx=".75"/>';

// Plain : chaque bloc « - Nom (…) : `<path …/>` » des relevés
const plain = {};
const NOMS_PLAIN = { "Titre / vignette": "Batiment", "Favori": "Etoile", "Filters": "Filtres", "Display": "Ecran", "Plus": "Plus", "Loupe": "Loupe", "Tri (barre": "Tri", "×": "Croix", "Cercle « fil ouvert »": "Cercle", "Flèche de tri ↓": "TriBas", "Tier": "Tier", "Source (en-tête": "Source", "⋯": "Points", "Icône « à faire »": "AFaire", "Icône « faite »": "Faite" };
for (const f of ["plain-tenants.md", "plain-tasks.md"]) {
  const t = readFileSync(`${plainDir}/${f}`, "utf8");
  for (const ligne of t.split("\n")) {
    if (!ligne.startsWith("- ")) continue;
    const cle = Object.entries(NOMS_PLAIN).find(([k]) => ligne.slice(2).startsWith(k))?.[1];
    if (!cle || plain[cle]) continue;
    const traces = [...ligne.matchAll(/`(<path[^`]*)`/g)].map((m) => m[1]);
    if (!traces.length) continue;
    plain[cle] = traces[0];
    if (cle === "TriBas" && traces[1]) plain.TriHaut = traces[1];
    if (cle === "Source" && traces[1]) plain.Api = traces[1];
  }
}
const ecrire = (o) => Object.entries(o).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join("\n");
writeFileSync("components/espace2/tamila/TamIcone.tsx", `/* Les icônes de Linear et de Plain, telles quelles (02/11/2026, refonte TAMILA).
   Linear : symboles du sprite et tracés en ligne relevés (releves/linear-commun), viewBox 16.
   Plain : tracés exacts des relevés plain-tenants.md et plain-tasks.md, viewBox 24.
   Fichier généré par outils/tam-icones.mjs, ne pas retoucher à la main. fill = currentColor. */

const LINEAR = {
${ecrire(lin)}
} as const;

const PLAIN = {
${ecrire(plain)}
} as const;

export type NomTamIcone = keyof typeof LINEAR;
export type NomPlainIcone = keyof typeof PLAIN;

export function TamIcone({ nom, taille = 16, className, style }: { nom: NomTamIcone; taille?: number; className?: string; style?: React.CSSProperties }) {
  return <svg width={taille} height={taille} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: LINEAR[nom] }} />;
}

export function PlainIcone({ nom, taille = 18, className, style }: { nom: NomPlainIcone; taille?: number; className?: string; style?: React.CSSProperties }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: PLAIN[nom] }} />;
}
`);
console.log(Object.keys(lin).length, "icônes Linear,", Object.keys(plain).length, "icônes Plain :", Object.keys(plain).join(" "));
