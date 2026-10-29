import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import EcranLorani from "@/components/espace/lorani/EcranLorani";
import Habille from "@/components/espace2/Habille";
import VueEnsemble from "@/components/espace2/lorani/VueEnsemble";
import { aiguiller, lireObjet } from "@/components/espace2/aiguillage";
import { RACINE } from "@/components/espace2/modules";

/* /espace2/lorani — la vue d'ensemble des permis (29/10/2026, refonte des
   pages métiers) : la liste des Initiatives de Linear. Elle remplace
   l'écran repris de /espace (EcranLorani), gardé sous « ?ancien=1 » tant
   que Teo n'a pas validé la nouvelle page.

   Les anciens liens restent vivants (inventaire lorani.md, § 1.1 et O5) :
   les alertes, le point du matin et les courriels déjà partis portent
   « /espace/lorani?permis=<id> » ou « ?projet=<id> » (proxy.ts les mène
   ici). Ils sont renvoyés, avant tout rendu, vers la page du permis ou du
   projet ; « ?objet=<objet_type>:<id> » (contrat de components/espace2/
   aiguillage.ts) passe par l'aiguillage. « ?ancien=1 » passe avant : l'écran
   d'avant lit lui-même ?permis= et ?projet=. */

export const metadata: Metadata = {
  title: "Calendrier des permis",
  description: "Chaque permis suivi jusqu'à la purge des recours : délai d'instruction, pièces réclamées, décision tacite, affichage, recours des tiers.",
};

const ICI = `${RACINE}/lorani`;

type Params = Record<string, string | string[] | undefined>;
const premierDe = (p: Params, nom: string): string | null => {
  const v = p[nom];
  return typeof v === "string" ? v : (v?.[0] ?? null);
};

export default async function PageLorani({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  if (premierDe(p, "ancien") === "1") {
    return (
      <Habille>
        <EcranLorani />
      </Habille>
    );
  }
  const permis = premierDe(p, "permis");
  if (permis) redirect(`${ICI}/permis/${encodeURIComponent(permis)}`);
  const projet = premierDe(p, "projet");
  if (projet) redirect(`${ICI}/projets/${encodeURIComponent(projet)}`);
  const objet = lireObjet({ get: (nom) => premierDe(p, nom) });
  if (objet) {
    const cible = aiguiller({ module: "lorani", objet_type: objet.type, objet_id: objet.id });
    if (cible && cible.split("?")[0] !== ICI) redirect(cible);
  }
  return (
    <Suspense>
      <VueEnsemble />
    </Suspense>
  );
}
