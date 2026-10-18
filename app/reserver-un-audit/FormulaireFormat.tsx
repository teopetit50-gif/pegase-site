"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import MenuSobre from "@/app/reserver-un-audit/MenuSobre";
import {
  DUREES_RDV,
  ERREURS,
  SECTEURS,
  aujourdhuiGp,
  chargerAgenda,
  creneauxDuJour,
  heureGp,
  jourGpLabel,
  reserver,
  type Agenda,
  type Demande as DemandeReservation,
} from "@/lib/creneaux";
import { FORMATS, ORIGINES, PAYS, controlerDemande, type Demande } from "@/lib/demande-audit";
import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <FormulaireFormat> — le formulaire de la tête de page (18/10/2026)

   Mêmes champs que la page de démo de Scale, dans le même ordre : deux
   colonnes pour prénom et nom, entreprise et fonction, e-mail et pays ;
   puis deux menus pleine largeur, puis le format.

   LE JOUR ET L'HORAIRE : dès qu'un format de visio est choisi (Cadrage,
   Audit process), deux menus apparaissent : le jour, puis l'horaire. Ils ne
   proposent que les créneaux réellement libres (agenda_public, le même calcul
   que /reserver). Le format « Audit + atelier » se chiffre sur devis : il n'y a
   pas d'horaire à choisir, la demande part telle quelle.

   « CONTINUER » bloque le créneau par la fonction de réservation existante
   (reserver), puis envoie la confirmation par mail (/api/reservation/confirmation),
   comme le fait /reserver. Le message reste en texte simple.

   VALIDATION : pas de bulles natives (noValidate). Chaque champ vide reçoit
   « Ce champ est obligatoire. » en rouge, et le focus va sur le premier.

   SANS JAVASCRIPT, rien ne part : le texte sous le bouton donne l'adresse de
   contact.
   ══════════════════════════════════════════════════════════════════════ */

const E_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Sur combien de jours on cherche un créneau libre (l'agenda couvre 70 jours). */
const JOURS_RECHERCHES = 70;

/* La date calendaire d'un jour décalé, en Guadeloupe. */
function dateDecalee(annee: number, mois: number, jour: number, decalage: number) {
  const d = new Date(Date.UTC(annee, mois - 1, jour + decalage, 12));
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate() };
}

export default function FormulaireFormat() {
  const formulaire = useRef<HTMLFormElement>(null);
  const [manquants, setManquants] = useState<string[]>([]);
  const [mailFaux, setMailFaux] = useState(false);

  const [formatChoisi, setFormatChoisi] = useState("");
  const [jourChoisi, setJourChoisi] = useState("");
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [agendaErreur, setAgendaErreur] = useState(false);

  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "ok" | "erreur">("repos");
  const [confirmation, setConfirmation] = useState<{ email: string; quand: string } | null>(null);
  const [motif, setMotif] = useState("");

  /* la durée du format choisi : null pour un format sur devis, sans horaire */
  const dureeMin = formatChoisi ? (DUREES_RDV[formatChoisi] ?? null) : null;
  const avecCreneau = dureeMin !== null;

  /* l'agenda se charge une fois, à l'ouverture de la page */
  useEffect(() => {
    chargerAgenda()
      .then(setAgenda)
      .catch(() => setAgendaErreur(true));
  }, []);

  /* les jours qui ont au moins un créneau libre pour la durée choisie */
  const jours = useMemo(() => {
    if (!agenda || !dureeMin) return [];
    const auj = aujourdhuiGp();
    const liste: { valeur: string; libelle: string }[] = [];
    for (let i = 0; i < JOURS_RECHERCHES; i++) {
      const d = dateDecalee(auj.annee, auj.mois, auj.jour, i);
      if (creneauxDuJour(agenda, d.annee, d.mois, d.jour, dureeMin).length) {
        liste.push({
          valeur: `${d.annee}-${d.mois}-${d.jour}`,
          libelle: jourGpLabel(d.annee, d.mois, d.jour),
        });
      }
    }
    return liste;
  }, [agenda, dureeMin]);

  /* les horaires libres du jour choisi */
  const horaires = useMemo(() => {
    if (!agenda || !dureeMin || !jourChoisi) return [];
    const [a, m, j] = jourChoisi.split("-").map(Number);
    return creneauxDuJour(agenda, a, m, j, dureeMin).map((instant) => ({
      valeur: String(instant),
      libelle: heureGp(instant),
    }));
  }, [agenda, dureeMin, jourChoisi]);

  /* après un envoi refusé, le focus va sur le premier champ en erreur */
  useEffect(() => {
    if (manquants.length) {
      formulaire.current?.querySelector<HTMLElement>(".rdv-champ--erreur")?.focus();
    }
  }, [manquants]);

  async function envoyer(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (envoi === "envoi" || envoi === "ok") return;

    const brut = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, unknown>;
    const controle = controlerDemande(brut);
    const champs = controle.ok ? [] : [...controle.champs];

    /* un format de visio exige un jour et un horaire */
    const horaire = String(brut.horaire ?? "");
    if (avecCreneau && !String(brut.jour ?? "")) champs.push("jour");
    if (avecCreneau && !horaire) champs.push("horaire");

    if (champs.length || !controle.ok) {
      setManquants(champs);
      setMailFaux(champs.includes("email") && !!String(brut.email ?? "").trim() && !E_MAIL.test(String(brut.email)));
      return;
    }
    setManquants([]);
    setMailFaux(false);
    setEnvoi("envoi");

    const d: Demande = controle.demande;
    const reservation: DemandeReservation = {
      parcours: avecCreneau ? "audit" : "devis",
      formule: d.format,
      profil: "equipe",
      nom: d.nom,
      prenom: d.prenom,
      email: d.email,
      entreprise: d.entreprise,
      secteur: d.secteur,
      message: [`Fonction : ${d.fonction}`, `Pays : ${d.pays}`, `Connu d'Omega par : ${d.origine}`]
        .filter((l) => !l.endsWith(" : "))
        .join("\n"),
      creneau: avecCreneau ? Number(horaire) : undefined,
    };

    try {
      const rep = await reserver(reservation);
      if (rep.ok) {
        /* l'accusé de réception part après coup : la réservation est déjà faite */
        void fetch("/api/reservation/confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rep.id }),
          keepalive: true,
        }).catch(() => {});
        const [a, m, j] = jourChoisi.split("-").map(Number);
        setConfirmation({
          email: d.email,
          quand: avecCreneau ? `${jourGpLabel(a, m, j)} à ${heureGp(Number(horaire))}` : "",
        });
        setEnvoi("ok");
        return;
      }
      setMotif(rep.erreur);
      setEnvoi("erreur");
    } catch {
      setMotif("reseau");
      setEnvoi("erreur");
    }
  }

  const erreur = (cle: string) => manquants.includes(cle);
  const bloque = envoi === "envoi" || envoi === "ok";

  return (
    <form ref={formulaire} noValidate onSubmit={envoyer} className="rdv-formulaire">
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
          onChoix={(valeur) => {
            setFormatChoisi(valeur);
            setJourChoisi("");
          }}
          options={FORMATS.map((f) => ({ valeur: f.id, libelle: `${f.nom} · ${f.duree}` }))}
        />

        {avecCreneau ? (
          <>
            <MenuSobre
              key={formatChoisi}
              nom="jour"
              libelle="Jour"
              erreur={erreur("jour")}
              onChoix={(valeur) => setJourChoisi(valeur)}
              options={jours}
            />
            <MenuSobre
              key={jourChoisi}
              nom="horaire"
              libelle="Horaire"
              erreur={erreur("horaire")}
              options={horaires}
            />
          </>
        ) : null}
      </div>

      {avecCreneau ? (
        <p className="rdv-petit">
          {agendaErreur
            ? `L'agenda ne répond pas pour l'instant. Réessayez dans un moment, ou écrivez-nous à ${COURRIEL}.`
            : !agenda
              ? "Chargement de l'agenda…"
              : jours.length === 0
                ? `Aucun créneau libre sur les dix prochaines semaines. Écrivez-nous à ${COURRIEL}.`
                : "Heures en Guadeloupe. Seuls les créneaux libres sont proposés."}
        </p>
      ) : null}

      <button type="submit" className="rdv-bouton" disabled={bloque}>
        {envoi === "envoi" ? "Réservation en cours…" : envoi === "ok" ? "Demande envoyée" : "Continuer"}
        <span aria-hidden className="rdv-bouton-icone">
          <ArrowRight strokeWidth={1.8} size={18} />
        </span>
      </button>


      {envoi === "ok" && confirmation ? (
        <p className="rdv-confirmation" role="status">
          {confirmation.quand ? `Votre créneau est réservé : ${confirmation.quand}. ` : "Votre demande de devis est enregistrée. "}
          Nous vous confirmons avoir envoyé un mail à <strong>{confirmation.email}</strong>.
        </p>
      ) : null}

      {envoi === "erreur" ? (
        <p className="rdv-erreur" role="alert">
          {ERREURS[motif] ?? `Nous n'avons pas pu enregistrer votre demande. Réessayez, ou écrivez-nous à ${COURRIEL}.`}
        </p>
      ) : null}
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
