"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import MenuSobre from "@/app/reserver-un-audit/MenuSobre";
import PriseDeCreneau from "@/components/reservation/PriseDeCreneau";
import { SECTEURS } from "@/lib/creneaux";
import { FORMATS, ORIGINES, PAYS, controlerDemande, type Demande } from "@/lib/demande-audit";
import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <FormulaireFormat> — le formulaire de la tête de page (18/10/2026)

   Mêmes champs que la page de démo de Scale, dans le même ordre : deux
   colonnes pour prénom et nom, entreprise et fonction, e-mail et pays ;
   puis deux menus pleine largeur, puis le format. Tout est obligatoire.

   CE QUI SE PASSE À « CONTINUER » : si tout est rempli, l'agenda de
   réservation s'ouvre sous le formulaire, sur cette page (le même composant
   que /reserver). Le visiteur y choisit lui-même son créneau parmi les
   disponibilités réelles. Ses coordonnées sont reprises dans l'étape suivante
   de l'agenda : il ne les retape pas. La confirmation, avec la date et le lien
   de visioconférence, part par mail une fois le créneau bloqué.

   VALIDATION : pas de bulles natives (noValidate) : elles se placent mal sur
   les menus dessinés. Chaque champ vide reçoit « Ce champ est obligatoire. » en
   rouge, comme sur la référence, et le focus va sur le premier.

   SANS JAVASCRIPT, l'agenda ne s'ouvre pas : le texte sous le bouton donne donc
   l'adresse de contact.
   ══════════════════════════════════════════════════════════════════════ */

const E_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function FormulaireFormat() {
  const formulaire = useRef<HTMLFormElement>(null);
  const agenda = useRef<HTMLDivElement>(null);
  const [manquants, setManquants] = useState<string[]>([]);
  const [mailFaux, setMailFaux] = useState(false);
  const [demande, setDemande] = useState<Demande | null>(null);

  /* après un envoi refusé, le focus va sur le premier champ en erreur */
  useEffect(() => {
    if (manquants.length) {
      formulaire.current?.querySelector<HTMLElement>(".rdv-champ--erreur")?.focus();
    }
  }, [manquants]);

  /* une demande complète : l'agenda s'ouvre et on y va */
  useEffect(() => {
    if (demande) agenda.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [demande]);

  function continuer(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const brut = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, unknown>;
    const controle = controlerDemande(brut);
    if (!controle.ok) {
      setManquants(controle.champs);
      /* un e-mail rempli mais mal formé : « invalide », pas « obligatoire » */
      setMailFaux(controle.champs.includes("email") && !!String(brut.email ?? "").trim() && !E_MAIL.test(String(brut.email)));
      return;
    }
    setManquants([]);
    setMailFaux(false);
    setDemande(controle.demande);
  }

  const erreur = (cle: string) => manquants.includes(cle);

  return (
    <>
      <form ref={formulaire} noValidate onSubmit={continuer} className="rdv-formulaire">
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
            options={FORMATS.map((f) => ({ valeur: f.id, libelle: `${f.nom} · ${f.duree}` }))}
          />
        </div>

        <button type="submit" className="rdv-bouton">
          Continuer
          <span aria-hidden className="rdv-bouton-icone">
            <ArrowRight strokeWidth={1.8} size={18} />
          </span>
        </button>

        <p className="rdv-petit">
          Vous choisirez ensuite votre créneau dans l&apos;agenda qui s&apos;ouvre sous ce formulaire.
          Sans JavaScript, écrivez-nous directement à {COURRIEL}.
        </p>
      </form>

      {demande ? (
        <div ref={agenda} id="rdv-agenda" className="rdv-agenda">
          <div className="resa">
            <PriseDeCreneau
              key={JSON.stringify(demande)}
              parcours="audit"
              formuleInitiale={demande.format}
              coordonnees={{
                prenom: demande.prenom,
                nom: demande.nom,
                email: demande.email,
                entreprise: demande.entreprise,
                secteur: demande.secteur,
                lignes: [
                  `Fonction : ${demande.fonction}`,
                  `Pays : ${demande.pays}`,
                  `Connu d'Omega par : ${demande.origine}`,
                ],
              }}
            />
          </div>
        </div>
      ) : null}
    </>
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
