/* ══════════════════════════════════════════════════════════════════════
   Les prix publics d'Omega — 25/11/2026 (Teo, d'après « Nos prix », v7,
   et « Ce qui change par rapport à la version 7 », 24/11).

   Le client voit deux prix par mois, le logiciel et ses agents, puis une
   installation payée une fois. Ce sont deux facturations indépendantes :
   le bloc ne les additionne JAMAIS en un total « tout compris ».

   Ce qui n'est PAS écrit ici, faute de décision : l'assistant IA (vendu
   à part ou inclus avec un quota), le compte « léger », le paiement à
   l'année, un prix « à partir de » par agent. Ce qui ne s'écrit jamais :
   le barème interne des agents, les marges, la majoration des fichiers en
   désordre, la TVA antillaise (doctrine §17 bis).
   ══════════════════════════════════════════════════════════════════════ */

import { Check } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Prix = {
  nom: string;
  montant: string;
  unite: string;
  texte: string;
  points: string[];
  fort?: boolean;
};

export const PRIX_PUBLICS: Prix[] = [
  {
    nom: "Logiciel de gestion",
    montant: "34,90\u00a0€",
    unite: "HT par personne et par mois",
    texte:
      "Ventes, achats, stock, banque, comptabilité et documents partagent les mêmes données. Le prix est le même pour tous, dès la première personne.",
    points: [
      "Sans minimum de personnes",
      "Les six modules compris",
      "Un compte par personne\u00a0: vous savez qui a validé chaque facture",
      "50\u00a0Go de documents compris",
    ],
    fort: true,
  },
  {
    nom: "Agents IA",
    montant: "69 à 890\u00a0€",
    unite: "HT par agent et par mois",
    texte:
      "Chaque agent est payé au travail qu'il fait pour vous. Son prix est fixé à l'audit, selon le volume qu'il traite.",
    points: [
      "−10\u00a0% dès 3 agents, −15\u00a0% dès 5",
      "Vous êtes prévenu à 75\u00a0%, puis à 90\u00a0% du forfait",
      "Mensuel, sans engagement",
      "Remboursé pendant 30 jours",
    ],
  },
  {
    nom: "Installation",
    montant: "dès 1\u00a0200\u00a0€",
    unite: "HT pour le logiciel, une seule fois",
    texte:
      "Nous reprenons vos données, l'IA paramètre le logiciel, puis votre expert-comptable vérifie les réglages. Le prix du logiciel dépend de la taille de votre entreprise.",
    points: [
      "1\u00a0200, 2\u00a0400 ou 4\u00a0900\u00a0€ HT pour le logiciel",
      "290, 590 ou 1\u00a0190\u00a0€ HT par agent",
      "Aucun débit avant la fin de l'installation",
    ],
  },
];

export const NOTE_TVA =
  "Prix hors taxes. La TVA s'y ajoute au taux qui s'applique à votre entreprise.";

export default function TroisPrix() {
  return (
    <div className="mx-auto max-w-md md:max-w-none">
      <div className="grid gap-6 md:grid-cols-3">
        {PRIX_PUBLICS.map((p) => (
          <Card
            key={p.nom}
            className={cn(
              "flex h-full flex-col rounded-xl border-[#e3e3e3] shadow-none",
              p.fort && "border-[#050505] shadow-md ring-1 ring-[#050505]/15",
            )}
          >
            <CardHeader className="pb-4 pt-7">
              <CardTitle className="font-[family-name:var(--font-jakarta)] text-xl">{p.nom}</CardTitle>
              <p className="mt-3 text-4xl font-bold tracking-[-0.02em] text-[#050505]">{p.montant}</p>
              <p className="mt-1 text-sm text-[#616161]">{p.unite}</p>
              <CardDescription className="pt-3 text-[15px] leading-relaxed text-[#3d3d3d]">
                {p.texte}
              </CardDescription>
            </CardHeader>
            <div className="mt-auto px-6 pb-7">
              <ul className="space-y-2.5 border-t border-[#e3e3e3] pt-5 text-sm">
                {p.points.map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[#050505]" strokeWidth={2} />
                    <span className="text-[#3d3d3d]">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-[#767676]">{NOTE_TVA}</p>
    </div>
  );
}
