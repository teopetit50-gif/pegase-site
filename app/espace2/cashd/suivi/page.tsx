import type { Metadata } from "next";
import { Suspense } from "react";
import EcranCashd from "@/components/espace/cashd/EcranCashd";
import BoiteDebiteurs from "@/components/espace2/cashd/BoiteDebiteurs";
import { HabilleSb } from "@/components/espace2/Habille";

/* /espace2/cashd/suivi — « Débiteurs et relances », la seconde page de
   CASHD, sur la boîte de réception (« Inbox ») de Linear (28/10/2026,
   demande de Teo, modèle des secondes pages de chaque SaaS) : la liste à
   gauche, la page de l'élément choisi à droite (BoiteDebiteurs).
     · ?vue=debiteurs (par défaut) : un débiteur par ligne, sa page à droite
       (?compte=<id>, le lien des autres écrans) ;
     · ?vue=relances : une relance par ligne, son texte et ses gestes à
       droite (?relance=<id>), « Vos textes » en ?textes=1.
   Envois et Trésorerie, qui ne sont pas des boîtes, restent l'écran de
   travail d'avant (EcranCashd, C2, au gabarit Supabase du 22/10). */

export const metadata: Metadata = {
  title: "Débiteurs et relances",
  description: "CASHD : chaque débiteur, sa fiche, ses relances écrites, les envois et la trésorerie ; vos textes de relance.",
};

const VUES = ["debiteurs", "relances", "envois", "tresorerie"] as const;

/* ?vue= est lu ici, côté serveur, pour qu'un lien du volet change la vue */
export default async function PageCashdSuivi({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const v = VUES.find((x) => x === vue) ?? "debiteurs";
  if (v === "envois" || v === "tresorerie")
    return (
      <HabilleSb>
        <EcranCashd vue={v} gabarit="sb" />
      </HabilleSb>
    );
  return (
    <Suspense>
      <BoiteDebiteurs vue={v} />
    </Suspense>
  );
}
