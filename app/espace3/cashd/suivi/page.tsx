import type { Metadata } from "next";
import { Suspense } from "react";
import BoiteDebiteurs from "@/components/espace3/cashd/BoiteDebiteurs";
import TableauEnvois from "@/components/espace3/cashd/TableauEnvois";
import Tresorerie from "@/components/espace3/cashd/Tresorerie";

/* /espace3/cashd/suivi — « Débiteurs et relances », la seconde page de
   CASHD, sur la boîte de réception (« Inbox ») de Linear (28/10/2026,
   demande de Teo, modèle des secondes pages de chaque SaaS) : la liste à
   gauche, la page de l'élément choisi à droite (BoiteDebiteurs).
     · ?vue=debiteurs (par défaut) : un débiteur par ligne, sa page à droite
       (?compte=<id>, le lien des autres écrans) ;
     · ?vue=relances : une relance par ligne, son texte et ses gestes à
       droite (?relance=<id>), « Vos textes » en ?textes=1.
     · ?vue=envois : les relances en tableau, une colonne par état d'envoi
       (à valider, à envoyer, parties, réponse reçue, arrêtées), sur la vue
       « Board » de Linear (TableauEnvois, ?id=<relance> ouvre sa fiche).
   Trésorerie (?vue=tresorerie) est la page « Reporting » de Plain (28/10,
   Tresorerie.tsx) : balance âgée, prévision, pilotage, taux de change et
   règlements à rapprocher, avec les mêmes gestes que l'écran de travail. */

export const metadata: Metadata = {
  title: "Débiteurs et relances",
  description: "CASHD : chaque débiteur, sa fiche, ses relances écrites, les envois et la trésorerie ; vos textes de relance.",
};

const VUES = ["debiteurs", "relances", "envois", "tresorerie"] as const;

/* ?vue= est lu ici, côté serveur, pour qu'un lien du volet change la vue */
export default async function PageCashdSuivi({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const v = VUES.find((x) => x === vue) ?? "debiteurs";
  if (v === "envois")
    return (
      <Suspense>
        <TableauEnvois />
      </Suspense>
    );
  if (v === "tresorerie")
    return (
      <Suspense>
        <Tresorerie />
      </Suspense>
    );
  return (
    <Suspense>
      <BoiteDebiteurs vue={v} />
    </Suspense>
  );
}
