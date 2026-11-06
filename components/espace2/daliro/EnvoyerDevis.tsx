"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — « Envoyer le devis au client », l'encart en bas d'un devis
   (06/11/2026, demande de Teo : « en bas, une petite colonne magnifique
   pour renvoyer à la page mail, avec un mail prérempli avec le devis ; il
   n'y a plus qu'à mettre l'adresse email du mec »)

   L'encart montre le mail déjà écrit (destinataire à compléter, objet, la
   pièce jointe) ; le bouton dépose le brouillon (./mailDevis) et ouvre la
   page Mails sur la carte « Nouveau mail », curseur dans le champ « À ».
   Un devis dont une ligne attend son prix ne part pas : l'encart le dit et
   le bouton attend.
   ══════════════════════════════════════════════════════════════════════ */

import { useRouter } from "next/navigation";
import { RACINE } from "../modules";
import { DalIcone } from "./DalIcone";
import { mailDuDevis, poserMailDevis } from "./mailDevis";
import type { Devis } from "./exemplesDevis";
import "./dal-envoi.css";

export function EnvoyerDevis({ devis: d }: { devis: Devis }) {
  const routeur = useRouter();
  const m = mailDuDevis(d);
  const manque = d.lignes.some((l) => l.prix === null);
  const dejaParti = d.etat === "envoye" || d.etat === "signe";
  const ouvrir = () => {
    poserMailDevis(m);
    routeur.push(`${RACINE}/daliro/mails?ecrire=devis`);
  };
  return (
    <section className="dal-env" aria-labelledby="dal-env-titre">
      <div className="dal-env-tete">
        <span className="dal-env-pastille" aria-hidden="true">
          <DalIcone nom="Email" taille={16} />
        </span>
        <div className="dal-env-entete">
          <h3 id="dal-env-titre">{dejaParti ? "Renvoyer le devis au client" : "Envoyer le devis au client"}</h3>
          <p>
            {manque
              ? "Le mail est écrit, mais une ligne attend encore son prix : chiffrez-la, puis envoyez."
              : `Le mail est prêt, devis joint. Il ne reste qu'à mettre l'adresse mail ${m.client === "Client" ? "du client" : `de ${m.client}`}.`}
          </p>
        </div>
      </div>

      <div className="dal-env-mail" aria-label="Aperçu du mail">
        <div className="dal-env-ligne">
          <span className="dal-env-cle">À</span>
          <span className="dal-env-vide">Adresse du client, à saisir</span>
        </div>
        <div className="dal-env-ligne">
          <span className="dal-env-cle">Objet</span>
          <span className="dal-env-valeur">{m.objet}</span>
        </div>
        <p className="dal-env-extrait">{m.corps.split("\n").slice(2, 5).join(" ").trim()}</p>
        <div className="dal-env-piece">
          <span className="dal-env-piece-icone" aria-hidden="true">
            <DalIcone nom="PdfFile" taille={16} />
          </span>
          <span className="dal-env-piece-nom">{m.piece.nom}</span>
          <span className="dal-env-piece-meta">
            {d.lignes.length} ligne{d.lignes.length > 1 ? "s" : ""} · {m.ttc} TTC
          </span>
        </div>
      </div>

      <div className="dal-env-pied">
        <button type="button" className="dal-env-bouton" onClick={ouvrir} disabled={manque}>
          <DalIcone nom="Send" taille={14} />
          <span>Ouvrir le mail prêt</span>
        </button>
        <span className="dal-env-note">S&apos;ouvre dans Mails : relisez, ajoutez l&apos;adresse, envoyez.</span>
      </div>
    </section>
  );
}
