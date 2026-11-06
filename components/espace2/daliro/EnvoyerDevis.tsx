"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — « Envoyer le devis au client », l'encart en bas d'un devis
   (06/11/2026, demande de Teo : « en bas, une petite colonne magnifique
   pour renvoyer à la page mail, avec un mail prérempli avec le devis ; il
   n'y a plus qu'à mettre l'adresse email du mec »)

   L'encart montre le mail déjà écrit (objet, extrait, la pièce jointe) et
   un vrai champ « À » (Teo, 06/11 : « je ne peux pas marquer l'adresse ») :
   on y tape l'adresse du client, Entrée ou le bouton déposent le brouillon
   (./mailDevis) et ouvrent la page Mails sur la carte « Nouveau mail »,
   l'adresse déjà posée. Laissé vide, le curseur attend dans « À » là-bas.
   Un devis dont une ligne attend son prix ne part pas : l'encart le dit et
   le bouton attend.
   ══════════════════════════════════════════════════════════════════════ */

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { RACINE } from "../modules";
import { DalIcone } from "./DalIcone";
import { adresseValide, mailDuDevis, poserMailDevis } from "./mailDevis";
import type { Devis } from "./exemplesDevis";
import "./dal-envoi.css";

export function EnvoyerDevis({ devis: d }: { devis: Devis }) {
  const routeur = useRouter();
  const champ = useId();
  const [a, setA] = useState("");
  const m = mailDuDevis(d);
  const manque = d.lignes.some((l) => l.prix === null);
  const dejaParti = d.etat === "envoye" || d.etat === "signe";
  const ouvrir = () => {
    poserMailDevis({ ...m, a: a.trim() });
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
              : `Le mail est prêt, devis joint. Il ne reste qu'à taper l'adresse mail ${m.client === "Client" ? "du client" : `de ${m.client}`}.`}
          </p>
        </div>
      </div>

      <div className="dal-env-mail" aria-label="Aperçu du mail">
        <div className="dal-env-ligne dal-env-ligne--champ">
          <label className="dal-env-cle" htmlFor={champ}>
            À
          </label>
          <input
            id={champ}
            className="dal-env-champ"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={a}
            onChange={(e) => setA(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !manque) {
                e.preventDefault();
                ouvrir();
              }
            }}
            placeholder={m.client === "Client" ? "L'adresse mail du client" : `L'adresse mail de ${m.client}`}
            data-ok={adresseValide(a) || undefined}
          />
          {adresseValide(a) ? (
            <span className="dal-env-ok" aria-hidden="true">
              <DalIcone nom="IssueStatusDone" taille={14} />
            </span>
          ) : null}
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
          <span>{adresseValide(a) ? "Ouvrir le mail, prêt à partir" : "Ouvrir le mail prêt"}</span>
        </button>
        <span className="dal-env-note">S&apos;ouvre dans Mails : relisez, puis envoyez.</span>
      </div>
    </section>
  );
}
