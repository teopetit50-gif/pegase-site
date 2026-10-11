// Le courriel quotidien des alertes (lot socle 19ap) : mise en texte du résumé rendu par resume_alertes_du_jour.
// Module pur, testé à part ; index.ts l'envoie par Brevo.

export interface Resume {
  calcule_le: string;
  alertes: { id: string; niveau: string; source: string; titre: string; client_id: string | null; cree_le: string }[];
  alertes_total: number;
  battements_en_retard: { client_id: string; module: string; dernier_le: string; attendu_toutes: string }[];
  crons_en_echec: { tache: string; echecs: number; dernier_le: string; message: string | null }[];
  sauvegarde: { faite_le: string; restauration: string } | null;
  sauvegarde_en_retard: boolean;
  a_signaler: boolean;
}

const heure = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

export function sujet(r: Resume, environnement: string): string {
  const critiques = r.alertes.filter((a) => a.niveau === "critique").length;
  const parties = [
    critiques ? `${critiques} critique${critiques > 1 ? "s" : ""}` : "",
    r.alertes_total - critiques > 0 ? `${r.alertes_total - critiques} à surveiller` : "",
    r.battements_en_retard.length ? `${r.battements_en_retard.length} ouvrier(s) silencieux` : "",
    r.crons_en_echec.length ? `${r.crons_en_echec.length} tâche(s) en échec` : "",
    r.sauvegarde_en_retard ? "sauvegarde à vérifier" : "",
  ].filter(Boolean);
  return `[Omega ${environnement}] ${parties.join(", ") || "rien à signaler"}`;
}

export function corps(r: Resume, environnement: string): string {
  const l: string[] = [`Omega (${environnement}), résumé du ${heure(r.calcule_le)} (heure de Paris).`, ""];
  if (r.alertes.length) {
    l.push(
      `Alertes internes non acquittées : ${r.alertes_total}${
        r.alertes_total > r.alertes.length ? ` (les ${r.alertes.length} premières)` : ""
      }`,
    );
    for (const a of r.alertes) {
      l.push(
        `- [${a.niveau}] ${a.titre} (${a.source}, ${heure(a.cree_le)}${a.client_id ? `, client ${a.client_id}` : ""})`,
      );
    }
    l.push("");
  }
  if (r.battements_en_retard.length) {
    l.push("Ouvriers silencieux :");
    for (const b of r.battements_en_retard) {
      l.push(
        `- ${b.module} (client ${b.client_id}) : dernier signe ${
          heure(b.dernier_le)
        }, attendu toutes les ${b.attendu_toutes}`,
      );
    }
    l.push("");
  }
  if (r.crons_en_echec.length) {
    l.push("Tâches planifiées en échec (24 h) :");
    for (const c of r.crons_en_echec) {
      l.push(
        `- ${c.tache} : ${c.echecs} échec(s), le dernier ${heure(c.dernier_le)}${c.message ? ` — ${c.message}` : ""}`,
      );
    }
    l.push("");
  }
  if (r.sauvegarde_en_retard) {
    l.push(
      r.sauvegarde
        ? `Sauvegarde : la dernière date du ${
          heure(r.sauvegarde.faite_le)
        }, restauration « ${r.sauvegarde.restauration} ».`
        : "Sauvegarde : aucune sauvegarde enregistrée.",
    );
    l.push("");
  }
  l.push("Les alertes listées ici ne seront plus renvoyées. Les acquitter dans l'outil interne une fois traitées.");
  return l.join("\n");
}
