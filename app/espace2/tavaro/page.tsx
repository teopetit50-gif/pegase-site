import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import EcranTavaro from "@/components/espace/tavaro/EcranTavaro";
import Habille from "@/components/espace2/Habille";
import VueEnsemble from "@/components/espace2/tavaro/VueEnsemble";
import { aiguiller, lireObjet } from "@/components/espace2/aiguillage";
import { RACINE } from "@/components/espace2/modules";

/* /espace2/tavaro — la vue d'ensemble de TAVARO (02/11/2026, refonte des
   pages métiers) : la page « Home » d'une équipe de Linear. Elle remplace
   l'écran repris de /espace (EcranTavaro), gardé sous « ?ancien=1 » tant
   que Teo n'a pas validé la nouvelle page.

   Contrat des pages métiers (components/espace2/aiguillage.ts) : un repère
   « ?objet=<objet_type>:<id> » écrit par les moteurs est renvoyé, avant
   tout rendu, vers la sous-page qui montre l'objet. Un objet sans sous-page
   (les analyses du matin : réservations, véhicules inactifs) reste ici. */

export const metadata: Metadata = {
  title: "Location : retours et factures",
  description: "Les contrats de location, le retour chiffré sur le barème, la facture validée par l'agence, les avoirs, les litiges et les relances.",
};

const ICI = `${RACINE}/tavaro`;

type Params = Record<string, string | string[] | undefined>;
const premierDe = (p: Params, nom: string): string | null => {
  const v = p[nom];
  return typeof v === "string" ? v : (v?.[0] ?? null);
};

export default async function PageTavaro({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const objet = lireObjet({ get: (nom) => premierDe(p, nom) });
  if (objet) {
    const cible = aiguiller({ module: "tavaro", objet_type: objet.type, objet_id: objet.id });
    if (cible && cible.split("?")[0] !== ICI) redirect(cible);
  }
  if (premierDe(p, "ancien") === "1") {
    return (
      <Habille>
        <EcranTavaro />
      </Habille>
    );
  }
  return (
    <Suspense>
      <VueEnsemble />
    </Suspense>
  );
}
