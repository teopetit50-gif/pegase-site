import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import VueEnsemble from "@/components/espace2/tamila/VueEnsemble";
import { aiguiller, lireObjet } from "@/components/espace2/aiguillage";
import { RACINE } from "@/components/espace2/modules";

/* /espace2/tamila — la vue d'ensemble des dossiers du cabinet (30/10/2026,
   refonte des pages métiers) : « My issues » de Linear. Elle remplace
   l'écran repris de /espace (EcranTamila), gardé sous « ?ancien=1 » tant
   que Teo n'a pas validé la nouvelle page.

   Les lignes du point du matin ne nomment aucun dossier (voulu, b4_14) :
   elles arrivent ici, sur la liste. « ?objet=tamila_dossier:<id> » (les
   demandes à valider, contrat de components/espace2/aiguillage.ts) mène à
   la page du dossier. */

export const metadata: Metadata = {
  title: "Dossiers du cabinet",
  description: "Les dossiers Tamila du cabinet : délais de procédure calculés et confirmés, audiences, expertises et relances, du plus pressé au moins pressé.",
};

const ICI = `${RACINE}/tamila`;

type Params = Record<string, string | string[] | undefined>;
const premierDe = (p: Params, nom: string): string | null => {
  const v = p[nom];
  return typeof v === "string" ? v : (v?.[0] ?? null);
};

export default async function PageTamila({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  if (premierDe(p, "ancien") === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  const objet = lireObjet({ get: (nom) => premierDe(p, nom) });
  if (objet) {
    const cible = aiguiller({ module: "tamila", objet_type: objet.type, objet_id: objet.id });
    if (cible && cible.split("?")[0] !== ICI) redirect(cible);
  }
  return (
    <Suspense>
      <VueEnsemble />
    </Suspense>
  );
}
