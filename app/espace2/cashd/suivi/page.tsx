import type { Metadata } from "next";
import EcranCashd from "@/components/espace/cashd/EcranCashd";
import { HabilleSb } from "@/components/espace2/Habille";

/* /espace2/cashd/suivi — l'écran de travail CASHD (C2) : ses vues
   (débiteurs, relances, envois, trésorerie), « Vos textes » et la fiche
   d'un compte, repris tels quels sous le tableau de bord /espace2/cashd
   (11/10/2026, C1 avec C2). */

export const metadata: Metadata = {
  title: "Débiteurs et relances",
  description: "CASHD : chaque débiteur, sa fiche, ses relances écrites, les envois et la trésorerie ; vos textes de relance.",
};

const VUES = ["debiteurs", "relances", "envois", "tresorerie"] as const;

/* 22/10 — chaque vue est une page Supabase (gabarit="sb") ; ?vue= est lu ici,
   côté serveur, pour qu'un lien du volet change la vue */
export default async function PageCashdSuivi({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const v = VUES.find((x) => x === vue) ?? "debiteurs";
  return (
    <HabilleSb>
      <EcranCashd vue={v} gabarit="sb" />
    </HabilleSb>
  );
}
