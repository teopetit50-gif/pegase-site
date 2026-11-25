/* ══════════════════════════════════════════════════════════════════════
   Les prix publics d'Omega — 25/11/2026 (Teo, d'après « Nos prix », v7,
   et « Ce qui change par rapport à la version 7 », 24/11).

   Logiciel et agents sont deux facturations indépendantes : le bloc ne
   les additionne JAMAIS en un total « tout compris ».

   Le même jour, L'AFFICHAGE À LA ODOO (relevé sur odoo.com/fr_FR/pricing) :
   un 0 € en première carte (l'audit), le prix d'UNE personne en très gros
   avec les centimes en exposant, « dès 69 » pour les agents. L'installation
   sort des cartes : une ligne dessous, le détail dans « Comment nous
   chiffrons » et la FAQ. Pas de prix barré ni d'affichage à l'année.

   Ce qui n'est PAS écrit ici, faute de décision : l'assistant IA (vendu
   à part ou inclus avec un quota), le compte « léger », le paiement à
   l'année. Ce qui ne s'écrit jamais : le barème interne des agents, les
   marges, la majoration des fichiers en désordre, la TVA antillaise
   (doctrine §17 bis).
   ══════════════════════════════════════════════════════════════════════ */

import { Check } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Chiffre = { avant: string | null; entier: string; centimes: string | null };

type Prix = {
  nom: string;
  chiffre: Chiffre;
  unite: string | null;
  /* la phrase entière, pour les lecteurs d'écran */
  lu: string;
  sous: string;
  texte: string;
  points: string[];
  fort?: boolean;
};

export const PRIX_PUBLICS: Prix[] = [
  {
    nom: "Audit",
    chiffre: { avant: null, entier: "0", centimes: null },
    unite: null,
    lu: "Audit offert",
    sous: "30 minutes, offert et sans engagement",
    texte:
      "Nous passons votre activité en revue avec vous, puis votre prix est écrit avant que vous signiez.",
    points: [
      "Les modules et les agents utiles chez vous",
      "Une proposition écrite, prix compris",
      "Le calendrier de démarrage",
    ],
  },
  {
    nom: "Logiciel de gestion",
    chiffre: { avant: null, entier: "34", centimes: ",90" },
    unite: "HT / personne / mois",
    lu: "34,90\u00a0€ HT par personne et par mois",
    sous: "Sans minimum, dès la première personne",
    texte:
      "Ventes, achats, stock, banque, comptabilité et documents partagent les mêmes données. Le prix est le même pour tous.",
    points: [
      "Les six modules compris",
      "Un compte par personne\u00a0: vous savez qui a validé chaque facture",
      "50\u00a0Go de documents compris",
      "Hébergement, sauvegardes et surveillance du service compris",
    ],
    fort: true,
  },
  {
    nom: "Agents IA",
    chiffre: { avant: "dès", entier: "69", centimes: null },
    unite: "HT / agent / mois",
    lu: "À partir de 69\u00a0€ HT par agent et par mois",
    sous: "Prix fixé à l'audit, selon le volume traité",
    texte: "Chaque agent est payé au travail qu'il fait pour vous\u00a0: une facture lue, une relance envoyée.",
    points: [
      "−10\u00a0% dès 3 agents, −15\u00a0% dès 5",
      "Vous êtes prévenu à 75\u00a0%, puis à 90\u00a0% du forfait",
      "Mensuel, sans engagement",
      "Remboursé pendant 30 jours",
    ],
  },
];

export const NOTE_INSTALLATION =
  "L'installation se paie une seule fois\u00a0: dès 1\u00a0200\u00a0€ HT pour le logiciel et dès 290\u00a0€ HT par agent. Pour les agents, rien n'est débité avant la fin de leur installation.";

export const NOTE_TVA =
  "Prix hors taxes. La TVA s'y ajoute au taux qui s'applique à votre entreprise.";

/* le grand chiffre à la Odoo : « dès » en petit, l'entier en très gros,
   les centimes et l'euro en exposant, l'unité sous les centimes */
function GrandChiffre({ p }: { p: Prix }) {
  const c = p.chiffre;
  return (
    <p className="mt-4 flex items-start gap-1.5">
      <span className="sr-only">{p.lu}</span>
      {c.avant ? (
        <span aria-hidden className="self-end pb-1.5 text-base text-[#616161]">
          {c.avant}
        </span>
      ) : null}
      <span aria-hidden className="text-6xl font-bold leading-none tracking-[-0.03em] text-[#050505]">
        {c.entier}
      </span>
      <span aria-hidden className="flex flex-col items-start pt-1">
        <span className="text-2xl font-bold leading-none text-[#050505]">
          {c.centimes ? `${c.centimes}\u00a0€` : "€"}
        </span>
        {p.unite ? <span className="mt-1.5 whitespace-nowrap text-xs leading-tight text-[#616161]">{p.unite}</span> : null}
      </span>
    </p>
  );
}

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
              <GrandChiffre p={p} />
              <p className="mt-2 text-sm text-[#616161]">{p.sous}</p>
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
      <p className="mt-6 text-center text-sm text-[#3d3d3d]">{NOTE_INSTALLATION}</p>
      <p className="mt-2 text-center text-xs text-[#767676]">{NOTE_TVA}</p>
    </div>
  );
}
