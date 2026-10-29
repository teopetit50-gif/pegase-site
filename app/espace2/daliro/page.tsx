import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import EcranDaliro from "@/components/espace/daliro/EcranDaliro";
import Habille from "@/components/espace2/Habille";
import VueEnsemble from "@/components/espace2/daliro/VueEnsemble";
import { aiguiller, lireObjet } from "@/components/espace2/aiguillage";
import { RACINE } from "@/components/espace2/modules";

/* /espace2/daliro — la vue d'ensemble de DALIRO (29/10/2026, refonte des
   pages métiers) : la page « Home » d'une équipe de Linear. Elle remplace
   l'écran repris de /espace (EcranDaliro), gardé sous « ?ancien=1 » tant
   que Teo n'a pas validé la nouvelle page.

   Contrat des pages métiers (components/espace2/aiguillage.ts) : un repère
   « ?objet=<objet_type>:<id> » écrit par les moteurs est renvoyé, avant
   tout rendu, vers la sous-page qui montre l'objet (la fiche d'un chantier,
   les avenants, À faire). Un objet sans sous-page reste ici. */

export const metadata: Metadata = {
  title: "Chantiers",
  description: "Les chantiers DALIRO : marché vérifié ligne à ligne, travaux supplémentaires chiffrés sur vos prix et signés avant exécution, passages confirmés à J-2, factures rattachées à leurs lots.",
};

const ICI = `${RACINE}/daliro`;

type Params = Record<string, string | string[] | undefined>;
const premierDe = (p: Params, nom: string): string | null => {
  const v = p[nom];
  return typeof v === "string" ? v : (v?.[0] ?? null);
};

export default async function PageDaliro({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const objet = lireObjet({ get: (nom) => premierDe(p, nom) });
  if (objet) {
    const cible = aiguiller({ module: "daliro", objet_type: objet.type, objet_id: objet.id });
    if (cible && cible.split("?")[0] !== ICI) redirect(cible);
  }
  if (premierDe(p, "ancien") === "1") {
    return (
      <Habille>
        <EcranDaliro />
      </Habille>
    );
  }
  return (
    <Suspense>
      <VueEnsemble />
    </Suspense>
  );
}
