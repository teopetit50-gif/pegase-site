import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import EcranVarelo from "@/components/espace/varelo/EcranVarelo";
import Habille from "@/components/espace2/Habille";
import VueCeMatin from "@/components/espace2/varelo/VueCeMatin";
import { aiguiller, lireObjet } from "@/components/espace2/aiguillage";
import { RACINE } from "@/components/espace2/modules";

/* /espace2/varelo — « Ce matin » (02/11/2026, refonte des pages métiers) : la page
   « Home » d'une équipe de Linear, au 1:1. L'écran d'avant (EcranVarelo) reste sous
   « ?ancien=1 » tant que Teo n'a pas validé les sous-pages.

   Contrat des pages métiers (components/espace2/aiguillage.ts) : un repère
   « ?objet=<objet_type>:<id> » est renvoyé, avant tout rendu, vers la sous-page qui
   montre l'objet (contrat, réception, échéance, dépôt, société, objet du groupe). */

export const metadata: Metadata = {
  title: "Référentiel du groupe",
  description: "Le point du matin du groupe : décisions à valider, trésoreries, réserves, reportings, contrats à dénoncer, encours et réciproques.",
};

const ICI = `${RACINE}/varelo`;

type Params = Record<string, string | string[] | undefined>;
const premierDe = (p: Params, nom: string): string | null => {
  const v = p[nom];
  return typeof v === "string" ? v : (v?.[0] ?? null);
};

export default async function PageVarelo({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const objet = lireObjet({ get: (nom) => premierDe(p, nom) });
  if (objet) {
    const cible = aiguiller({ module: "varelo", objet_type: objet.type, objet_id: objet.id });
    if (cible && cible.split("?")[0] !== ICI) redirect(cible);
  }
  if (premierDe(p, "ancien") === "1") {
    return (
      <Habille>
        <EcranVarelo />
      </Habille>
    );
  }
  return (
    <Suspense>
      <VueCeMatin />
    </Suspense>
  );
}
