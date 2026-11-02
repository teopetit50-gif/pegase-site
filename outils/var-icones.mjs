// Génère components/espace2/varelo/VarIcone.tsx à partir du sprite de Linear relevé
// (docs/refonte-metiers/releves/linear-commun) : les symboles demandés, tels quels.
// node outils/var-icones.mjs <dossier linear-commun>
import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
const sprite = readFileSync(`${dir}/sprite-icones.svg`, "utf8");
const md = readFileSync(`${dir}/icones-en-ligne.md`, "utf8");
const NOMS = `AddRelation Agent AssignTo AssignToMe Attachment AvatarEmpty BlockedByIssue BlockingIssue Calendar Checklist Comment CompletedDate Created Creator CurrentUser CustomView Cycle Estimate Favorite Folder FromDate Home Inbox Initiative IssueStatusBacklog IssueStatusDone IssueStatusReview IssueStatusStarted IssueStatusTodo IssueStatusTriage Label Link Lock Members MilestoneNone MilestoneStatusDone MilestoneStatusPlanned MilestoneStatusStarted MyIssues ParentIssue PdfFile Priority0 Priority1 Priority2 Priority3 Priority4 Project ProjectLead RecurringIssueCalendar Refresh Search Send StatusCanceled StatusDuplicate Subissue Subscribe Team UnassignedCircle Unassigned Updated Alert Alarm Box Brick Briefcase Calculator Camera Cart Chat Clock ConstructionBarrier Crane Dollar DollarBill Email Euro ExclamationMark Factory Flag Hourglass Image Ladder Mic MoneyStack NotePad Page Phone PieChart Policy Report Shield Signature Spreadsheet Stopwatch Storm Sun Trash Truck Umbrella Users Wall Wrench Write Joystick`.split(/\s+/);
const out = {};
for (const n of NOMS) {
  const m = sprite.match(new RegExp(`<symbol id="${n}" viewBox="0 0 16 16">(.*?)</symbol>`, "s"));
  if (!m) { console.error("absent du sprite :", n); continue; }
  if (!out[n]) out[n] = m[1];
}
const EN_LIGNE = { "Menu latéral": "Menu", "Étoile": "Etoile", "Points": "Points", "Lien (Copy": "LienUrl", "Plus": "Plus", "Ajouter une section": "Section", "Flèche": "Fleche", "Chevron": "Chevron", "Slack": "Slack", "Roue dentée": "Roue", "Triage": "Triage", "Issues": "Issues", "Cycles": "Cycles", "Archive": "Archive" };
for (const bloc of md.split(/^### /m).slice(1)) {
  const titre = bloc.split("\n")[0];
  const cle = Object.entries(EN_LIGNE).find(([k]) => titre.startsWith(k))?.[1];
  const svg = bloc.match(/<svg[^>]*>(.*?)<\/svg>/s);
  if (cle && svg) out[cle] = svg[1].replace(/fill-rule=/g, "fill-rule=").trim();
}
// hors relevé : tirés du bundle public de Linear (static.linear.app, FilterIcon.3hsjmS-s.js et
// startup-root.DE6adwa4.js) le 02/11/2026, à partir des débuts de tracé notés dans linear-projects.md
out.Filtre = '<path d="M14.25 3a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5h12.5ZM4 8a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 8Zm2.75 3.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"/>';
out.Affichage = '<path fill-rule="evenodd" clip-rule="evenodd" d="M7 2.5C8.11933 2.5 9.06613 3.23584 9.38477 4.25H14.75C15.1642 4.25 15.5 4.58579 15.5 5C15.5 5.41421 15.1642 5.75 14.75 5.75H9.38477C9.06613 6.76416 8.11933 7.5 7 7.5C5.88067 7.5 4.93387 6.76416 4.61523 5.75H2.25C1.83579 5.75 1.5 5.41421 1.5 5C1.5 4.58579 1.83579 4.25 2.25 4.25H4.61523C4.93387 3.23584 5.88067 2.5 7 2.5ZM7 4C6.44772 4 6 4.44772 6 5C6 5.55228 6.44772 6 7 6C7.55228 6 8 5.55228 8 5C8 4.44772 7.55228 4 7 4Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10 13.5C8.88067 13.5 7.93387 12.7642 7.61523 11.75H2.25C1.83579 11.75 1.5 11.4142 1.5 11C1.5 10.5858 1.83579 10.25 2.25 10.25H7.61523C7.93387 9.23584 8.88067 8.5 10 8.5C11.1193 8.5 12.0661 9.23584 12.3848 10.25H14.75C15.1642 10.25 15.5 10.5858 15.5 11C15.5 11.4142 15.1642 11.75 14.75 11.75H12.3848C12.0661 12.7642 11.1193 13.5 10 13.5ZM10 12C10.5523 12 11 11.5523 11 11C11 10.4477 10.5523 10 10 10C9.44772 10 9 10.4477 9 11C9 11.5523 9.44772 12 10 12Z"/>';
if (out.Menu) out.Volet = out.Menu + '<rect x="10" y="3.5" width="1.5" height="9" rx=".75"/>';
const lignes = Object.entries(out).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join("\n");
writeFileSync("components/espace2/varelo/VarIcone.tsx", `/* Les icônes de Linear, telles quelles (01/11/2026) : symboles du sprite et tracés en ligne
   relevés par la session références (docs/refonte-metiers/releves/linear-commun). Fichier
   généré par outils/var-icones.mjs, ne pas retoucher à la main. viewBox 0 0 16 16, fill = currentColor. */

const TRACES = {
${lignes}
} as const;

export type NomVarIcone = keyof typeof TRACES;

export function VarIcone({ nom, taille = 16, className, style }: { nom: NomVarIcone; taille?: number; className?: string; style?: React.CSSProperties }) {
  return <svg width={taille} height={taille} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: TRACES[nom] }} />;
}
`);
console.log(Object.keys(out).length, "icônes");
