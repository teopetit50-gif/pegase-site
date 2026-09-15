"use client";

/* ══════════════════════════════════════════════════════════════════════
   Graphique — le tracé recharts de /offres/nouvelles-affaires, sorti de
   Chiffres.tsx le 14/09/2026 (chantier rapidité).

   POURQUOI CE FICHIER EXISTE. recharts pèse 380 ko une fois construit,
   et il était dans le paquet de la page : le navigateur devait le
   télécharger et l'exécuter AVANT d'afficher quoi que ce soit de la
   page — pour un tracé qui vit tout en bas, hors du premier écran.
   Isolé ici, il part dans son propre morceau, que Chiffres demande
   seulement quand la section entre dans la fenêtre.

   Le dessin ne change pas d'un pixel : tout ce qui suit est le contenu
   exact de l'ancien <ResponsiveContainer>, marges, teintes, dégradés et
   commentaires compris. Le cadre de hauteur (h-80 / md:h-96) reste chez
   l'appelant — c'est lui qui réserve la place, donc rien ne saute quand
   le tracé arrive.
   ══════════════════════════════════════════════════════════════════════ */

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CHIFFRES as C } from "@/lib/produits/reprise";

/* Deux teintes relevées dans la config de graphique de la référence. */
const BLEU = "#2563eb";
const BLEU_CLAIR = "#60a5fa";

/* Le site source passait `var(--color-border)` / `var(--color-popover)` aux
   styles en ligne de recharts. Ces variables naissaient de son `@theme` et
   N'EXISTENT PAS ici : la grille et l'infobulle seraient rendues sans trait
   ni fond, sans la moindre erreur. Valeurs du monde clair, en clair. */
const BORD = "#d9d9d9";
const POP = "#fafafa";

export default function Graphique({ etroit }: { etroit: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={C.graphique.series} /* Marges latérales : sans elles, la première et la dernière
           graduation sont rognées par le bord du cadre. */
        /* La marge doit valoir au moins la moitié du libellé le plus large,
           sinon la première et la dernière graduation sont rognées :
           « 0–30 j » perdait son « 0 » avec 10 px. */
        margin={{ top: 8, right: etroit ? 22 : 28, left: etroit ? 22 : 28, bottom: 8 }}>
        <defs>
          <linearGradient id="rp-deg-dormants" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BLEU} stopOpacity={0.5} />
            <stop offset="95%" stopColor={BLEU} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="rp-deg-actifs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BLEU_CLAIR} stopOpacity={0.5} />
            <stop offset="95%" stopColor={BLEU_CLAIR} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={BORD} strokeOpacity={0.5} />
        <XAxis
          dataKey="tranche"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval={etroit ? 1 : 0}
          className="[&_text]:fill-[#737373]"
          style={{ fontSize: etroit ? 10 : 12 }}
        />
        <Tooltip
          cursor={{ stroke: BORD }}
          contentStyle={{
            background: POP,
            border: `1px solid ${BORD}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="dormants"
          name="Clients éteints"
          stackId="1"
          stroke={BLEU}
          fill="url(#rp-deg-dormants)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="actifs"
          name="Clients actifs"
          stackId="1"
          stroke={BLEU_CLAIR}
          fill="url(#rp-deg-actifs)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
