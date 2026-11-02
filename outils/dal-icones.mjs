// Génère components/espace2/daliro/DalIcone.tsx à partir du sprite de Linear relevé
// (docs/refonte-metiers/releves/linear-commun) : les symboles demandés, tels quels.
// node outils/dal-icones.mjs <dossier linear-commun>
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
const lignes = Object.entries(out).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join("\n");
writeFileSync("components/espace2/daliro/DalIcone.tsx", `/* Les icônes de Linear, telles quelles (01/11/2026) : symboles du sprite et tracés en ligne
   relevés par la session références (docs/refonte-metiers/releves/linear-commun). Fichier
   généré par outils/dal-icones.mjs, ne pas retoucher à la main. viewBox 0 0 16 16, fill = currentColor. */

const TRACES = {
${lignes}
} as const;

export type NomDalIcone = keyof typeof TRACES;

export function DalIcone({ nom, taille = 16, className, style }: { nom: NomDalIcone; taille?: number; className?: string; style?: React.CSSProperties }) {
  return <svg width={taille} height={taille} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: TRACES[nom] }} />;
}
`);
console.log(Object.keys(out).length, "icônes");
