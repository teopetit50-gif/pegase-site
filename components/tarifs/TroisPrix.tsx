/* ══════════════════════════════════════════════════════════════════════
   Les prix publics d'Omega — 25/11/2026 (Teo, d'après « Nos prix », v7,
   et « Ce qui change par rapport à la version 7 », 24/11).

   Logiciel et agents sont deux facturations indépendantes : le bloc ne
   les additionne JAMAIS en un total « tout compris ».

   Le même jour, L'AFFICHAGE À LA ODOO (relevé sur odoo.com/fr_FR/pricing) :
   un 0 € en première carte (l'audit), le prix d'UNE personne en très gros
   avec les centimes en exposant, « dès 199 » pour les agents. L'installation
   sort des cartes : une ligne dessous, le détail dans « Comment nous
   chiffrons » et la FAQ. Pas de prix barré ni d'affichage à l'année.

   Ce qui n'est PAS écrit ici, faute de décision : l'assistant IA (vendu
   à part ou inclus avec un quota), le compte « léger », le paiement à
   l'année. Ce qui ne s'écrit jamais : le barème interne des agents, les
   marges, la majoration des fichiers en désordre, la TVA antillaise
   (doctrine §17 bis).
   ══════════════════════════════════════════════════════════════════════ */

import { Check } from "lucide-react";
import { Scene } from "@/components/charte/Cartes";
import { cn } from "@/lib/cn";

type Chiffre = { avant: string | null; entier: string; centimes: string | null };

export type Prix = {
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
      "Nous passons votre activité en revue. Vous repartez avec un prix écrit.",
    points: [
      "Les modules et les packs dont vous avez besoin",
      "Une proposition écrite, prix compris",
      "Le calendrier de mise en service",
    ],
  },
  {
    nom: "ERX",
    chiffre: { avant: null, entier: "34", centimes: ",90" },
    unite: "HT / personne / mois",
    lu: "34,90\u00a0€ HT par utilisateur et par mois",
    sous: "Dès le premier utilisateur, sans minimum",
    texte:
      "Ventes, achats, stock, banque, comptabilité et documents, sur les mêmes données. Le même prix pour tout le monde.",
    points: [
      "Les six modules inclus",
      "Un compte par utilisateur\u00a0: chaque validation est tracée",
      "50\u00a0Go de documents compris",
      "Hébergement, sauvegardes et supervision inclus",
    ],
    fort: true,
  },
  /* 27/11/2026 — LES PACKS REMPLACENT LES AGENTS (pitch deck « Omega —
     Pitch deck » du 27/11, slide 9 ; Teo : « tout remplacer »). Plus
     d'agent à 199 € par mois ni de recharges : quatre packs de dix
     automatisations, une installation « à partir de » par palier, puis
     l'IA à la pièce. Le prix de la pièce n'est PAS écrit (Teo, 27/11 :
     « on n'est pas sûr, c'est à l'audit qu'on verra ce que ça coûte
     réellement au client »). */
  {
    nom: "Packs d'automatisations",
    chiffre: { avant: "dès", entier: "1\u00a0750", centimes: null },
    unite: "HT / pack, une fois",
    lu: "Installation d'un pack à partir de 1\u00a0750\u00a0€ HT, payée une seule fois",
    sous: "Installation, puis l'IA à la pièce",
    texte:
      "Quatre packs de dix automatisations\u00a0: relances d'impayés, clients dormants, demandes entrantes, factures fournisseurs.",
    points: [
      "3, 6 ou 10 automatisations au choix par pack",
      "Installées par nos agents constructeurs",
      "En place en 2 à 4 semaines",
      "Le prix à la pièce est fixé à l'audit",
    ],
  },
];

export const NOTE_INSTALLATION =
  "L'installation d'un pack se paie une seule fois\u00a0: à partir de 1\u00a0750\u00a0€ HT pour 3 automatisations, 2\u00a0900\u00a0€ HT pour 6, 4\u00a0000\u00a0€ HT pour les 10. Le prix ferme est écrit dans votre devis, après l'audit.";

export const NOTE_TVA =
  "Prix hors taxes. La TVA s'y ajoute au taux qui s'applique à votre entreprise.";

/* le grand chiffre à la Odoo : « dès » en petit, l'entier en très gros,
   les centimes et l'euro en exposant, l'unité sous les centimes.
   25/11/2026 — charte de l'accueil : graisse 450 au lieu du gras, les
   cotes du prix de la grille de l'accueil (tarifs.css, `.tf-chiffre`). */
export function GrandChiffre({ p }: { p: Prix }) {
  const c = p.chiffre;
  return (
    <p className="tf-chiffre">
      <span className="sr-only">{p.lu}</span>
      {c.avant ? (
        <span aria-hidden className="tf-chiffre-avant">
          {c.avant}
        </span>
      ) : null}
      <span aria-hidden className="tf-chiffre-entier">
        {c.entier}
      </span>
      <span aria-hidden className="tf-chiffre-suite">
        <span className="tf-chiffre-cts">{c.centimes ? `${c.centimes} €` : "€"}</span>
        {p.unite ? <span className="tf-chiffre-unite">{p.unite}</span> : null}
      </span>
    </p>
  );
}

/* 25/11/2026 — charte de l'accueil : trois colonnes jointives séparées
   par des filets (la grille de prix de l'accueil), le prix posé dans une
   scène #eeeee8 de rayon 12 — tramée pour le logiciel, l'offre mise en
   avant —, puis le texte et les points. Plus de cartes blanches. Les
   textes et PRIX_PUBLICS ne changent pas. */
export default function TroisPrix() {
  return (
    <div className="tf-prix">
      <div className="tf-prix-grille">
        {PRIX_PUBLICS.map((p) => (
          <article key={p.nom} className={cn("tf-prix-col", p.fort && "tf-prix-col--fort")}>
            <h3 className="tf-prix-nom">{p.nom}</h3>
            <Scene basse trame={p.fort} className="tf-prix-scene">
              <GrandChiffre p={p} />
              <p className="tf-prix-sous">{p.sous}</p>
            </Scene>
            <p className="tf-prix-texte">{p.texte}</p>
            <ul className="tf-prix-points">
              {p.points.map((t) => (
                <li key={t}>
                  <Check aria-hidden strokeWidth={2} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="tf-prix-notes">
        <p>{NOTE_INSTALLATION}</p>
        <p className="tf-prix-tva">{NOTE_TVA}</p>
      </div>
    </div>
  );
}
