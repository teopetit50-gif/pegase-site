"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Mon mot de passe » — la carte de /compte (02/09/2026)

   Le seul morceau client de « Mon compte » : un bouton qui déplie le
   module de connexion en mode « definir » (changer son mot de passe,
   updateUser). Compte SANS mot de passe (mdp_defini absent — gérant
   invité par Teo, ou connexion par code de secours) : le module est
   déplié d'office, avec un mot qui explique pourquoi. Une fois
   enregistré : un merci, et le module se replie.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import ConnexionInline from "@/components/compte/ConnexionInline";

export default function MotDePasseCarte({ email, mdpDefini }: { email: string; mdpDefini: boolean }) {
  const [ouvert, setOuvert] = useState(!mdpDefini);
  const [fait, setFait] = useState(false);

  return (
    <div className="r-carte mt-4 !p-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
        Mon mot de passe
      </div>
      {fait ? (
        <p className="mt-3 text-[15px] leading-[24px] text-[#3d3d3d]" role="status">
          Mot de passe enregistré. C&apos;est celui-ci qui ouvre votre compte, sur le site comme sur
          le cockpit.
        </p>
      ) : ouvert ? (
        <div className="mt-4">
          {!mdpDefini ? (
            <p className="mb-4 text-[15px] leading-[24px] text-[#3d3d3d]">
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
          <p className="mt-3 text-[15px] leading-[24px] text-[#3d3d3d]">
            Le même mot de passe ouvre votre compte sur le site et sur le cockpit.
          </p>
          <div className="mt-4">
            <button type="button" className="r-btn r-btn--fil" onClick={() => setOuvert(true)}>
              Changer mon mot de passe
            </button>
          </div>
        </>
      )}
    </div>
  );
}
