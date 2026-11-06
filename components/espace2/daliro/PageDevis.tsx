"use client";

/* Un devis dicté en pleine page : la page du ticket de Linear (./FicheDevis), seule dans la carte. */

import { RACINE } from "../modules";
import { DalCarte } from "./DalCadre";
import { FicheDevis } from "./FicheDevis";
import { DEVIS_EXEMPLE } from "./exemplesDevis";
import "./dal-inbox.css";

export default function PageDevis({ id }: { id: string }) {
  const devis = DEVIS_EXEMPLE.find((d) => d.id === id) ?? null;
  return (
    <DalCarte>
      {devis ? (
        <FicheDevis devis={devis} retour={{ libelle: "Devis dictés", href: `${RACINE}/daliro/appels?filtre=devis` }} />
      ) : (
        <div className="dal-ap-vide">
          <p>Ce devis n&apos;existe pas ou plus.</p>
        </div>
      )}
    </DalCarte>
  );
}
