"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Mon mot de passe » — le bloc de /compte (02/09/2026, à plat depuis
   le 14/09)

   Un bouton qui déplie le module de connexion en mode « definir »
   (changer son mot de passe, updateUser). Compte SANS mot de passe
   (mdp_defini absent — gérant invité par Teo, ou connexion par code de
   secours) : le module est déplié d'office, avec un mot qui explique
   pourquoi. Une fois enregistré : un merci, et le module se replie.

   14/09 — plus de carte dans la carte : le bloc vit à plat dans le
   panneau « Sécurité et accès » de la carte de verre (CompteVue), qui
   dit déjà « Connecté avec … » dans son sous-titre. Une .r-carte
   encastrée ici coûtait 60 px de haut et un cadre de plus pour une phrase
   et un bouton.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import ConnexionInline from "@/components/compte/ConnexionInline";

export default function MotDePasseCarte({ email, mdpDefini }: { email: string; mdpDefini: boolean }) {
  const [ouvert, setOuvert] = useState(!mdpDefini);
  const [fait, setFait] = useState(false);

  return (
    <div className="cp-mdp">
      {fait ? (
        <p className="cp-ok" role="status">
          Mot de passe enregistré. C&apos;est celui-ci qui ouvre votre compte, sur le site comme sur
          le cockpit.
        </p>
      ) : ouvert ? (
        <div>
          {!mdpDefini ? (
            <p className="cp-texte mb-4">
              Votre compte n&apos;a pas encore de mot de passe&nbsp;: choisissez-le maintenant, il
              vous servira à chaque connexion.
            </p>
          ) : null}
          <ConnexionInline
            modeInitial="definir"
            emailInitial={email}
            onConnecte={() => setFait(true)}
            onAnnuler={mdpDefini ? () => setOuvert(false) : undefined}
          />
        </div>
      ) : (
        <>
          <p className="cp-texte">
            Le même mot de passe ouvre votre compte sur le site et sur le cockpit.
          </p>
          <div className="mt-3">
            <button type="button" className="r-btn r-btn--fil" onClick={() => setOuvert(true)}>
              Changer mon mot de passe
            </button>
          </div>
        </>
      )}
    </div>
  );
}
