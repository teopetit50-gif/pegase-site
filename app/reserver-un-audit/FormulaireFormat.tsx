"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  useEstimationUrl,
  useModeleUrl,
  useSiteUrl,
} from "@/components/reservation/ModeleUrl";
import MenuSobre from "@/app/reserver-un-audit/MenuSobre";
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

   VALIDATION : le formulaire ne passe pas par les bulles natives du
   navigateur (noValidate), qui se placent mal sur les menus dessinés. Au
   clic sur « Continuer », chaque champ vide reçoit « Ce champ est
   obligatoire. » en rouge, comme sur la référence, et le focus va sur le
   premier. Un e-mail mal formé reçoit le même traitement.

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

/* Tous les champs de la page, dans l'ordre où ils s'affichent. */
const OBLIGATOIRES = [
  "prenom",
  "nom",
  "entreprise",
  "fonction",
  "email",
  "pays",
  "secteur",
  "origine",
  "format",
];

const E_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Props = { formules: Formule[] };

export default function FormulaireFormat({ formules }: Props) {
  const router = useRouter();
  const slug = useModeleUrl();
  const { postes, pieces } = useEstimationUrl();
  const site = useSiteUrl();
  const formulaire = useRef<HTMLFormElement>(null);
  const [manquants, setManquants] = useState<string[]>([]);
  const [mailFaux, setMailFaux] = useState(false);

  /* après un envoi refusé, le focus va sur le premier champ en erreur */
  useEffect(() => {
    if (manquants.length) {
      formulaire.current?.querySelector<HTMLElement>(".rdv-champ--erreur")?.focus();
    }
  }, [manquants]);

  function envoyer(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const texte = (cle: string) => String(d.get(cle) ?? "").trim();

    const sansValeur = OBLIGATOIRES.filter((cle) => !texte(cle));
    const mailMalForme = !sansValeur.includes("email") && !E_MAIL.test(texte("email"));
    const refus = mailMalForme ? [...sansValeur, "email"] : sansValeur;
    if (refus.length) {
      setManquants(refus);
      setMailFaux(mailMalForme);
      return;
    }
    setManquants([]);
    setMailFaux(false);

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

  const erreur = (cle: string) => manquants.includes(cle);

  return (
    <form
      ref={formulaire}
      action="/reserver"
      method="get"
      noValidate
      onSubmit={envoyer}
      className="rdv-formulaire"
    >
      <div className="rdv-champs">
        <Saisie nom="prenom" libelle="Prénom" autoComplete="given-name" erreur={erreur("prenom")} />
        <Saisie nom="nom" libelle="Nom" autoComplete="family-name" erreur={erreur("nom")} />
        <Saisie nom="entreprise" libelle="Entreprise" autoComplete="organization" erreur={erreur("entreprise")} />
        <Saisie nom="fonction" libelle="Fonction" autoComplete="organization-title" erreur={erreur("fonction")} />
        <Saisie
          nom="email"
          libelle="E-mail professionnel"
          type="email"
          autoComplete="email"
          erreur={erreur("email")}
          messageErreur={mailFaux ? "Adresse e-mail invalide." : undefined}
        />
        <MenuSobre
          nom="pays"
          libelle="Pays"
          erreur={erreur("pays")}
          options={PAYS.map((p) => ({ valeur: p, libelle: p }))}
        />
        <MenuSobre
          nom="secteur"
          libelle="Quelle description correspond à votre entreprise ?"
          pleine
          erreur={erreur("secteur")}
          options={SECTEURS.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))}
        />
        <MenuSobre
          nom="origine"
          libelle="Comment avez-vous connu Omega ?"
          pleine
          erreur={erreur("origine")}
          options={ORIGINES.map((o) => ({ valeur: o, libelle: o }))}
        />
        <MenuSobre
          nom="format"
          libelle="Format d'audit"
          pleine
          erreur={erreur("format")}
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
  erreur,
  messageErreur,
}: {
  nom: string;
  libelle: string;
  type?: "text" | "email";
  autoComplete?: string;
  erreur?: boolean;
  messageErreur?: string;
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
        aria-invalid={erreur ? true : undefined}
        className={`rdv-champ${erreur ? " rdv-champ--erreur" : ""}`}
      />
      {erreur ? <p className="rdv-erreur">{messageErreur ?? "Ce champ est obligatoire."}</p> : null}
    </div>
  );
}
