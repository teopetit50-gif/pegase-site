"use client";

/* Un appel en pleine page : la page du ticket de Linear (./Appels, FicheAppel), seule dans la carte. */

import { RACINE } from "../modules";
import { DalCarte } from "./DalCadre";
import { FicheAppel } from "./Appels";
import { APPELS_EXEMPLE } from "./exemplesAppels";

export default function PageAppel({ id }: { id: string }) {
  const appel = APPELS_EXEMPLE.find((a) => a.id === id) ?? null;
  return (
    <DalCarte>
      {appel ? (
        <FicheAppel appel={appel} retour={{ libelle: "Appels", href: `${RACINE}/daliro/appels` }} />
      ) : (
        <div className="dal-ap-vide">
          <p>Cet appel n&apos;existe pas ou plus.</p>
        </div>
      )}
    </DalCarte>
  );
}
