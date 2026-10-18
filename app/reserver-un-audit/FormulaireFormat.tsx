"use client";

import { useRouter } from "next/navigation";
import type { SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  useEstimationUrl,
  useModeleUrl,
  useSiteUrl,
} from "@/components/reservation/ModeleUrl";
import { SECTEURS } from "@/lib/creneaux";
import { enregistrerPrereservation } from "@/lib/prereservation";
import { lienReservation, type Formule } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <FormulaireFormat> — le formulaire de la tête de page (18/10/2026)

   Mêmes champs que la page de démo de Scale, dans le même ordre : deux
   colonnes pour prénom et nom, entreprise et fonction, e-mail et pays ;
   puis deux menus pleine largeur (« Quelle description correspond à votre
   entreprise ? », « Comment avez-vous connu Omega ? ») ; puis le format.
   Tout est obligatoire, comme sur la référence.

   CE QUI SE PASSE À L'ENVOI : les coordonnées sont rangées dans la session
   du navigateur (lib/prereservation.ts), puis le visiteur arrive sur
   /reserver avec le format choisi. Le calendrier s'ouvre, et le formulaire
   de réservation reprend nom, entreprise, e-mail et secteur. Aucune donnée
   personnelle ne passe par l'adresse de la page.

   SANS JAVASCRIPT, le formulaire ne peut pas enregistrer les coordonnées :
   la navigation native part en GET sur /reserver avec le seul format. Le
   visiteur retapera ses coordonnées là-bas, ce qui reste acceptable.
   ══════════════════════════════════════════════════════════════════════ */

/* Les réponses proposées pour « Comment avez-vous connu Omega ? ». */
const ORIGINES = [
  "Une recommandation",
  "LinkedIn",
  "Instagram ou Facebook",
  "Une recherche en ligne",
  "Autre",
];

/* Les collectivités et pays où Omega travaille : Omega est basé aux Antilles
   françaises, ce menu ne reprend donc pas la liste mondiale de la référence. */
const PAYS = [
  "Guadeloupe",
  "Martinique",
  "Autre collectivité française",
  "France hexagonale",
  "Autre pays",
];

type Props = { formules: Formule[] };

export default function FormulaireFormat({ formules }: Props) {
  const router = useRouter();
  const slug = useModeleUrl();
  const { postes, pieces } = useEstimationUrl();
  const site = useSiteUrl();

  function envoyer(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const texte = (cle: string) => String(d.get(cle) ?? "").trim();

    enregistrerPrereservation({
      prenom: texte("prenom"),
      nom: texte("nom"),
      entreprise: texte("entreprise"),
      email: texte("email"),
      secteur: texte("secteur"),
      lignes: [
        `Fonction : ${texte("fonction")}`,
        `Pays : ${texte("pays")}`,
        `Connu d'Omega par : ${texte("origine")}`,
      ],
    });

    router.push(
      lienReservation(
        texte("format"),
        slug || undefined,
        {
          postes: postes.length ? postes.join(",") : undefined,
          pieces: pieces ? String(pieces) : undefined,
        },
        site?.id,
      ),
    );
  }

  return (
    <form action="/reserver" method="get" onSubmit={envoyer} className="rdv-formulaire">
      <div className="rdv-champs">
        <Saisie nom="prenom" libelle="Prénom" autoComplete="given-name" />
        <Saisie nom="nom" libelle="Nom" autoComplete="family-name" />
        <Saisie nom="entreprise" libelle="Entreprise" autoComplete="organization" />
        <Saisie nom="fonction" libelle="Fonction" autoComplete="organization-title" />
        <Saisie nom="email" libelle="E-mail professionnel" type="email" autoComplete="email" />
        <Liste nom="pays" libelle="Pays" options={PAYS.map((p) => ({ valeur: p, libelle: p }))} />
        <Liste
          nom="secteur"
          libelle="Quelle description correspond à votre entreprise ?"
          pleine
          options={SECTEURS.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))}
        />
        <Liste
          nom="origine"
          libelle="Comment avez-vous connu Omega ?"
          pleine
          options={ORIGINES.map((o) => ({ valeur: o, libelle: o }))}
        />
        <Liste
          nom="format"
          libelle="Format d'audit"
          pleine
          options={formules.map((f) => ({ valeur: f.id, libelle: `${f.nom} · ${f.duree}` }))}
        />
      </div>

      <button type="submit" className="rdv-bouton">
        Continuer
        <span aria-hidden className="rdv-bouton-icone">
          <ArrowRight strokeWidth={1.8} size={18} />
        </span>
      </button>

      <p className="rdv-petit">
        Vos coordonnées vous attendent sur la page suivante, où vous choisissez votre créneau.
      </p>
    </form>
  );
}

/* Un champ de saisie : le libellé est lu par les lecteurs d'écran ; à l'écran,
   c'est le texte gris dans le champ, comme sur la référence. */
function Saisie({
  nom,
  libelle,
  type = "text",
  autoComplete,
}: {
  nom: string;
  libelle: string;
  type?: "text" | "email";
  autoComplete?: string;
}) {
  return (
    <div className="rdv-champ-bloc">
      <label htmlFor={`rdv-${nom}`} className="rdv-sr">
        {libelle}
      </label>
      <input
        id={`rdv-${nom}`}
        name={nom}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={`${libelle}*`}
        className="rdv-champ"
      />
    </div>
  );
}

/* Un menu : la première ligne sert d'intitulé (désactivée, comme la référence). */
function Liste({
  nom,
  libelle,
  options,
  pleine,
}: {
  nom: string;
  libelle: string;
  options: { valeur: string; libelle: string }[];
  pleine?: boolean;
}) {
  return (
    <div className={pleine ? "rdv-champ-bloc rdv-champ-bloc--pleine" : "rdv-champ-bloc"}>
      <label htmlFor={`rdv-${nom}`} className="rdv-sr">
        {libelle}
      </label>
      <select
        id={`rdv-${nom}`}
        name={nom}
        required
        defaultValue=""
        className="rdv-champ rdv-champ--menu"
      >
        <option value="" disabled>
          {libelle}*
        </option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}
