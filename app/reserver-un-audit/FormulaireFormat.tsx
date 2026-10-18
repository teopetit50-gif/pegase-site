"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import MenuSobre from "@/app/reserver-un-audit/MenuSobre";
import { SECTEURS } from "@/lib/creneaux";
import { FORMATS, ORIGINES, PAYS, controlerDemande } from "@/lib/demande-audit";
import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <FormulaireFormat> — la dernière page avant le mail d'audit (18/10/2026)

   Mêmes champs que la page de démo de Scale, dans le même ordre : deux
   colonnes pour prénom et nom, entreprise et fonction, e-mail et pays ;
   puis deux menus pleine largeur, puis le format. Tout est obligatoire.

   CE QUI SE PASSE À L'ENVOI : la demande part vers /api/audit/demande, qui
   envoie un mail à Omega et un mail de confirmation au visiteur. Le
   formulaire n'affiche le message vert, avec l'adresse, que si ce second mail
   est bien parti. Rien ne quitte la page sans ce message.

   VALIDATION : pas de bulles natives (noValidate) : elles se placent mal sur
   les menus dessinés. Chaque champ vide reçoit « Ce champ est obligatoire. » en
   rouge, comme sur la référence, et le focus va sur le premier.

   SANS JAVASCRIPT, la demande ne part pas, et le formulaire ne met aucune donnée
   dans l'adresse de la page : le texte sous le bouton donne donc l'adresse de
   contact.
   ══════════════════════════════════════════════════════════════════════ */

/* Le libellé de chaque champ obligatoire, pour les messages. */
const E_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function FormulaireFormat() {
  const formulaire = useRef<HTMLFormElement>(null);
  const [manquants, setManquants] = useState<string[]>([]);
  const [mailFaux, setMailFaux] = useState(false);
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "ok" | "erreur">("repos");
  const [destinataire, setDestinataire] = useState("");
  const [motif, setMotif] = useState("");

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
    if (!controle.ok) {
      setManquants(controle.champs);
      /* un e-mail rempli mais mal formé : « invalide », pas « obligatoire » */
      setMailFaux(controle.champs.includes("email") && !!String(brut.email ?? "").trim() && !E_MAIL.test(String(brut.email)));
      return;
    }
    setManquants([]);
    setMailFaux(false);
    setEnvoi("envoi");

    try {
      const r = await fetch("/api/audit/demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brut),
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; motif?: string } | null;
      if (r.ok && j?.ok) {
        setDestinataire(controle.demande.email);
        setEnvoi("ok");
        return;
      }
      setMotif(j?.motif ?? "");
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
          options={FORMATS.map((f) => ({ valeur: f.id, libelle: `${f.nom} · ${f.duree}` }))}
        />
      </div>

      {/* pot de miel : invisible pour une personne, rempli par un robot */}
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="rdv-sr" />

      <button type="submit" className="rdv-bouton" disabled={bloque}>
        {envoi === "envoi" ? "Envoi en cours…" : envoi === "ok" ? "Demande envoyée" : "Continuer"}
        <span aria-hidden className="rdv-bouton-icone">
          <ArrowRight strokeWidth={1.8} size={18} />
        </span>
      </button>

      <p className="rdv-petit">
        Vous recevrez un e-mail avec le lien pour choisir votre créneau. Sans JavaScript, écrivez-nous
        directement à {COURRIEL}.
      </p>

      {envoi === "ok" ? (
        <p className="rdv-message rdv-message--ok" role="status">
          Nous vous confirmons avoir envoyé un mail à <strong>{destinataire}</strong>. Vérifiez vos
          courriers indésirables si vous ne le voyez pas.
        </p>
      ) : null}

      {envoi === "erreur" ? (
        <p className="rdv-message rdv-message--erreur" role="alert">
          {motif === "limite"
            ? `Trop de demandes pour l'instant. Réessayez dans un moment, ou écrivez-nous à ${COURRIEL}.`
            : `Nous n'avons pas pu envoyer votre demande. Réessayez, ou écrivez-nous à ${COURRIEL}.`}
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
