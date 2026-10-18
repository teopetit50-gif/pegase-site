/* ══════════════════════════════════════════════════════════════════════
   Les forces d'un dossier de contestation bancaire, lues comme la base
   les lit (private.loc_forces_contestation, migration b2_09) : pour
   l'exemple, et pour montrer à l'agence, avant d'ouvrir, ce qui fera
   tenir le dossier devant la banque.
   ══════════════════════════════════════════════════════════════════════ */

import type { Dossier, Facture, ForceDossier } from "./types";

export function forcesLocales(d: Dossier, f: Facture): ForceDossier[] {
  const c = d.contrat;
  const depart = d.etats.find((e) => e.moment === "depart")?.statut ?? null;
  const retour = d.etats.find((e) => e.moment === "retour")?.statut ?? null;
  const chemins = new Set<string>();
  for (const e of d.etats) {
    for (const p of e.photos) if (p.prise_le) chemins.add(p.chemin);
    for (const dm of e.dommages) for (const p of dm.preuves) if (p.prise_le) chemins.add(p.chemin);
  }
  const lignes = d.lignesFactures.filter((l) => l.facture_id === f.id);
  for (const l of lignes) for (const p of l.preuves ?? []) if (p.prise_le && p.chemin) chemins.add(p.chemin);
  const photos = chemins.size;
  const horsBareme = lignes.filter((l) => !l.bareme_ligne_id).length;
  const nonContradictoire = d.propositions.find((p) => p.id === f.proposition_id)?.non_contradictoire ?? false;
  const etat = (s: string | null, quoi: "départ" | "retour") =>
    s === "signe" ? `L'état des lieux de ${quoi} est signé par le locataire`
      : s === "refuse" ? (quoi === "retour" ? "Le locataire a refusé de signer au retour : le refus est constaté et daté" : "Le locataire a refusé de signer l'état des lieux de départ (refus constaté)")
      : s === "brouillon" ? `L'état des lieux de ${quoi} n'est pas signé`
      : `Pas d'état des lieux de ${quoi} dans Tavaro`;
  return [
    {
      code: "contrat", ok: !!c.piece_id || !!c.conditions_version,
      libelle: c.piece_id ? "Le contrat signé est au dossier"
        : c.conditions_version ? `Les conditions acceptées sont identifiées (version ${c.conditions_version}) ; le contrat scanné manque`
        : "Ni contrat scanné ni version des conditions : la clause de responsabilité est difficile à prouver",
    },
    { code: "edl_depart", ok: depart === "signe", libelle: etat(depart, "départ") },
    { code: "edl_retour", ok: retour === "signe" || retour === "refuse", libelle: etat(retour, "retour") },
    { code: "photos", ok: photos > 0, libelle: photos > 0 ? `${photos} photo${photos > 1 ? "s datées" : " datée"}` : "Aucune photo datée : le dommage repose sur la parole de l'agence" },
    {
      code: "bareme", ok: horsBareme === 0,
      libelle: horsBareme === 0 ? "Chaque ligne de la facture applique le barème publié" : `${horsBareme} ligne${horsBareme > 1 ? "s" : ""} hors barème : joignez le devis ou la facture de réparation`,
    },
    { code: "contradictoire", ok: !nonContradictoire, libelle: nonContradictoire ? "Le retour a été constaté hors de la présence du locataire" : "Le constat de retour est contradictoire" },
    { code: "envoi", ok: !!f.envoi_id, libelle: f.envoi_id ? "La facture a été adressée au locataire par courriel, avant le débit" : "Pas de trace d'envoi de la facture au locataire dans Tavaro" },
  ];
}

export const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const plusJours = (jour: string, n: number) => new Date(Date.parse(jour + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
export const joursAvant = (jour: string) => Math.round((Date.parse(jour + "T12:00:00Z") - Date.parse(jourLocal() + "T12:00:00Z")) / 86_400_000);
