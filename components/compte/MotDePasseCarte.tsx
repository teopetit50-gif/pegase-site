"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Mot de passe » — le bloc de /compte (02/09/2026 ; en modale depuis
   le 15/09)

   Un bouton qui ouvre le module de connexion en mode « definir »
   (changer son mot de passe, updateUser). Une fois enregistré : un
   merci, et la modale se referme.

   15/09 — MÊME DIALOGUE QUE LE PROFIL (components/ui/dialog.tsx, reprise
   de `@originui/dialog`, 21st.dev). Deux raisons, dans cet ordre : le
   module déplié dans la carte lui faisait 260 px de haut pour un geste
   qu'on fait une fois par an ; et une page en deux colonnes se lit
   d'autant mieux que ses cartes gardent une hauteur stable — un bloc qui
   grandit sous le pointeur décale tout ce qui le suit dans sa colonne.

   Compte SANS mot de passe (mdp_defini absent — gérant invité par Teo,
   ou connexion par code de secours) : la carte le DIT et propose
   « Choisir mon mot de passe ». La modale ne s'ouvre pas d'office : une
   modale qui s'ouvre seule au chargement se referme par réflexe, sans
   être lue (même arbitrage que ProfilCarte).

   Le module rend ses PROPRES <form> : il ne doit jamais être posé à
   l'intérieur d'un autre (revue du 02/09, n° 3) — ici il est seul dans
   le corps du dialogue, qui n'a donc pas de pied à lui : les boutons du
   module font le travail, et `onAnnuler` ferme la modale.
   ══════════════════════════════════════════════════════════════════════ */

import { KeyRound } from "lucide-react";
import { useState } from "react";
import ConnexionInline from "@/components/compte/ConnexionInline";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogIcone,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MotDePasseCarte({
  email,
  mdpDefini,
}: {
  email: string;
  mdpDefini: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [fait, setFait] = useState(false);

  return (
    <div className="cp-mdp">
      {fait ? (
        <p className="cp-ok" role="status">
          Mot de passe enregistré. C&apos;est celui-ci qui ouvre votre compte, sur le site comme
          dans l&apos;espace client.
        </p>
      ) : (
        <p className="cp-texte">
          {mdpDefini
            ? "Le même mot de passe ouvre votre compte sur le site et dans l'espace client."
            : "Votre compte n'a pas encore de mot de passe : choisissez-le une fois, il vous servira à chaque connexion."}
        </p>
      )}

      <div className="mt-3">
        <Dialog
          open={ouvert}
          onOpenChange={(o) => {
            setOuvert(o);
            if (o) setFait(false);
          }}
        >
          <DialogTrigger asChild>
            <button type="button" className="r-btn r-btn--fil">
              {mdpDefini ? "Changer le mot de passe" : "Choisir mon mot de passe"}
            </button>
          </DialogTrigger>

          <DialogContent>
            <DialogIcone>
              <KeyRound size={18} strokeWidth={1.75} aria-hidden="true" />
            </DialogIcone>
            <DialogHeader>
              <DialogTitle>
                {mdpDefini ? "Changer mon mot de passe" : "Choisir mon mot de passe"}
              </DialogTitle>
              <DialogDescription>
                Il ouvre votre compte sur le site et dans votre espace client, avec la même
                adresse.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <ConnexionInline
                modeInitial="definir"
                emailInitial={email}
                cadre={false}
                /* le panneau titre déjà : sinon deux titres empilés */
                sansTitre
                onConnecte={() => {
                  setFait(true);
                  setOuvert(false);
                }}
                onAnnuler={() => setOuvert(false)}
              />
            </DialogBody>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
