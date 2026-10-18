"use client";

/* ══════════════════════════════════════════════════════════════════════
   La fiche d'un fournisseur FILED (06/10/2026) — partagée par le dossier
   d'un document (DossierVue) et la vue « Fournisseurs ».
   ══════════════════════════════════════════════════════════════════════ */

import { BadgeCheck, RefreshCw, UserCheck } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte, dateHeure } from "../format";
import type { Fournisseur } from "../types";

/* le registre qu'on interroge : VIES si le fournisseur a une TVA, sinon Sirene (comme le balayage de B7) */
export function registreDe(f: Fournisseur): { nom: "vies" | "sirene"; identifiant: string } | null {
  if (f.tva) return { nom: "vies", identifiant: f.tva };
  if (f.siren) return { nom: "sirene", identifiant: f.siren };
  return null;
}

/* La fiche du fournisseur : son statut, et ce qu'on sait de son identité
   (NOTES-B7 § 9 b) — « Vérifiée le … par VIES / Sirene », « attestée par
   une personne », « Non vérifiée », « Invalide : <motif> ». */
const REGISTRES: Record<string, string> = { vies: "VIES", sirene: "Sirene", humain: "une personne" };
export const STATUTS_FOURNISSEUR: Record<Fournisseur["statut"], { libelle: string; teinte: "ambre" | "vert" | "rouge" | "gris" }> = {
  a_confirmer: { libelle: "À confirmer", teinte: "ambre" },
  actif: { libelle: "Actif", teinte: "vert" },
  bloque: { libelle: "Bloqué", teinte: "rouge" },
  refuse: { libelle: "Refusé", teinte: "gris" },
};

export function identiteDe(f: Fournisseur): { teinte: "vert" | "rouge" | "ambre" | "gris"; texte: string } {
  const v = f.identite_verdict ?? null;
  const quand = f.identite_verifiee_le ? dateHeure(f.identite_verifiee_le) : null;
  const par = REGISTRES[f.identite_source ?? v?.registre ?? ""] ?? f.identite_source ?? v?.registre ?? "un registre";
  const preuve = v?.preuve ?? null;
  const motif = preuve && typeof preuve === "object" ? (preuve.motif ?? preuve.message ?? preuve.etat) : null;
  if (v?.resultat === "invalide") return { teinte: "rouge", texte: `Invalide${quand ? ` (${par}, le ${quand})` : ""}${motif ? ` : ${String(motif)}` : ""}` };
  if (v?.resultat === "indisponible") return { teinte: "ambre", texte: `Registre indisponible${quand ? ` le ${quand}` : ""} : nouvel essai automatique` };
  if (f.identite_source === "humain") return { teinte: "vert", texte: `Attestée par une personne${quand ? ` le ${quand}` : ""}${motif ? ` : ${String(motif)}` : ""}` };
  if (quand) return { teinte: "vert", texte: `Vérifiée le ${quand} par ${par}` };
  return { teinte: "gris", texte: "Non vérifiée" };
}

export default function FicheFournisseur({ fournisseur: f, deposantOrigine, registre, envoi, onConfirmer, onAttester, onReverifier }: {
  fournisseur: Fournisseur;
  deposantOrigine: boolean;
  registre: "vies" | "sirene" | null;
  envoi: boolean;
  onConfirmer: () => void;
  onAttester: () => void;
  onReverifier: () => void;
}) {
  const s = STATUTS_FOURNISSEUR[f.statut] ?? STATUTS_FOURNISSEUR.actif;
  const id = identiteDe(f);
  const valide = f.identite_verdict?.resultat === "valide" || (!!f.identite_verifiee_le && !f.identite_verdict);
  return (
    <div>
      <div className="esp-section-titre">Fournisseur</div>
      {f.statut === "a_confirmer" ? (
        <Avis teinte="ambre">
          <strong>Fournisseur nouveau.</strong> Ses factures restent bloquées tant qu&apos;une personne n&apos;a pas confirmé qu&apos;il s&apos;agit bien d&apos;un fournisseur de l&apos;entreprise.
          {deposantOrigine ? " Vous avez déposé sa première pièce : une autre personne confirme." : ""}
        </Avis>
      ) : null}
      <dl className="esp-def" style={{ marginTop: f.statut === "a_confirmer" ? 10 : 0 }}>
        <Def etiquette="Nom">
          <span className="esp-item-haut"><span>{f.nom}</span><Pastille teinte={s.teinte}>{s.libelle}</Pastille></span>
        </Def>
        {f.siren || f.tva ? (
          <Def etiquette="Identifiants">
            {f.siren ? <div>SIREN <span className="esp-mono">{f.siren}</span></div> : null}
            {f.tva ? <div>TVA <span className="esp-mono">{f.tva}</span></div> : null}
          </Def>
        ) : null}
        <Def etiquette="Identité">
          <span className="esp-item-haut"><Pastille teinte={id.teinte}>{id.teinte === "vert" ? "Vérifiée" : id.teinte === "rouge" ? "Invalide" : id.teinte === "ambre" ? "En attente" : "Non vérifiée"}</Pastille>{id.teinte !== "gris" ? <span>{id.texte}</span> : null}</span>
        </Def>
        {f.confirme_le ? <Def etiquette="Confirmé">le {dateCourte(f.confirme_le)}</Def> : null}
      </dl>
      <div className="esp-actions" style={{ marginTop: 10 }}>
        {f.statut === "a_confirmer" ? (
          <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={deposantOrigine} title={deposantOrigine ? "Vous avez déposé la pièce d'origine : une autre personne confirme." : undefined} onClick={onConfirmer}>
            <UserCheck width={13} height={13} aria-hidden="true" /> Confirmer ce fournisseur
          </button>
        ) : null}
        {registre ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={onReverifier}>
            {envoi ? <Loader variant="spin" /> : <RefreshCw width={13} height={13} aria-hidden="true" />} Revérifier auprès de {registre === "vies" ? "VIES" : "Sirene"}
          </button>
        ) : null}
        {!valide ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={onAttester}>
            <BadgeCheck width={13} height={13} aria-hidden="true" /> Attester l&apos;identité
          </button>
        ) : null}
      </div>
    </div>
  );
}
