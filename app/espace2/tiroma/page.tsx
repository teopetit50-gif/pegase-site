import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import EcranTiroma from "@/components/espace/tiroma/EcranTiroma";
import Habille from "@/components/espace2/Habille";
import Aujourdhui from "@/components/espace2/tiroma/Aujourdhui";
import { aiguiller, lireObjet } from "@/components/espace2/aiguillage";
import { RACINE } from "@/components/espace2/modules";

/* /espace2/tiroma — Aujourd'hui (02/11/2026, refonte des pages métiers) :
   la page « My issues » de Linear, la page du jour du cabinet. Elle
   remplace l'écran repris de /espace (EcranTiroma), gardé sous
   « ?ancien=1 » tant que Teo n'a pas validé la nouvelle page.

   Contrat des pages métiers (components/espace2/aiguillage.ts) : un repère
   « ?objet=<objet_type>:<id> » écrit par les moteurs est renvoyé, avant
   tout rendu, vers la sous-page qui montre l'objet (le fil d'un créneau,
   la carte d'un plan, un fauteuil). Un objet sans sous-page reste ici. */

export const metadata: Metadata = {
  title: "Cabinet dentaire",
  description: "Le cabinet lu en une page : créneaux à sauver, plans sans rendez-vous, vérifications avant les rendez-vous, charge des fauteuils.",
};

const ICI = `${RACINE}/tiroma`;

type Params = Record<string, string | string[] | undefined>;
const premierDe = (p: Params, nom: string): string | null => {
  const v = p[nom];
  return typeof v === "string" ? v : (v?.[0] ?? null);
};

export default async function PageTiroma({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const objet = lireObjet({ get: (nom) => premierDe(p, nom) });
  if (objet) {
    const cible = aiguiller({ module: "tiroma", objet_type: objet.type, objet_id: objet.id });
    if (cible && cible.split("?")[0] !== ICI) redirect(cible);
  }
  if (premierDe(p, "ancien") === "1") {
    return (
      <Habille>
        <EcranTiroma />
      </Habille>
    );
  }
  return (
    <Suspense>
      <Aujourdhui />
    </Suspense>
  );
}
