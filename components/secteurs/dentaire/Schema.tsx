/* ══════════════════════════════════════════════════════════════════════
   Schema — le parcours d'un créneau annulé, en nœuds et en traits
   (section Écrans, colonne de droite). Dans la référence, c'était le
   schéma d'un agent commercial ; la source l'a réécrit pour le cabinet :
   Tiroma lit l'agenda et les plans → annulation → créneau libéré → trois
   candidats → proposition à l'assistante → appel → rendez-vous confirmé →
   trois canaux → point du soir → fauteuil occupé.

   Pièces de la source : `C_fo` (Noeud), `C_fl` (Trait, un trait lumineux
   vertical), `C_fc` (Branches, des courbes qui se séparent ou se
   rejoignent, en pointillés qui défilent : `.dentaire-trait`).

   Rhabillage du 24/09 : les nœuds ne sont plus des perles bleues brillantes
   au texte blanc, mais des pastilles vert d'eau mates au texte foncé ; les
   deux nœuds vedettes (Tiroma, Fauteuil occupé) sont à plat, vert d'eau
   soutenu. Traits et courbes en vert d'eau.

   La marque provisoire de Tiroma reste ICI, dans le premier nœud, là où la
   source la posait (marque.tsx). Le bouton du dernier nœud (« Réserver une
   démo », un <button> vers omegaai.fr/reserver dans la source) est un lien
   vers /reserver-un-audit, libellé « Réserver un audit ».
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarX,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  ListChecks,
  Mail,
  MessageSquare,
  Phone,
  Stethoscope,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { MarqueTiroma } from "./marque";
import { RESERVER } from "./outils";

type NoeudProps = {
  titre: string;
  sous?: string;
  Icone?: LucideIcon;
  icone?: ReactNode;
  petit?: boolean;
  vedette?: boolean;
  appel?: string;
};

function Noeud({ titre, sous, Icone, icone, petit, vedette, appel }: NoeudProps) {
  return (
    <div
      className={`group relative mx-auto flex cursor-default flex-col items-center rounded-2xl text-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] ${petit ? "max-w-[170px] px-3 py-3" : "max-w-[320px] px-6 py-4"} ${vedette ? "border border-[#4f9587] bg-[#3b7a6e] shadow-[0_10px_25px_-8px_rgba(59,122,110,0.3)] hover:bg-[#30635a]" : "dentaire-perle hover:shadow-[0_0_22px_-4px_rgba(79,149,135,0.4)]"}`}
    >
      <div className="flex items-center justify-center gap-2">
        {icone ? (
          <div className={`transition-transform duration-200 group-hover:scale-110 ${petit ? "h-5 w-5" : "h-6 w-6"}`}>
            {icone}
          </div>
        ) : (
          Icone && (
            <Icone
              size={petit ? 16 : 20}
              className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${vedette ? "text-white" : "text-[#30635a]"}`}
            />
          )
        )}
        <span className={`font-medium ${vedette ? "text-white" : "text-[#23433e]"} ${petit ? "text-xs" : "text-base"}`}>{titre}</span>
      </div>
      {sous && (
        <div className={`mt-1 uppercase tracking-wide ${vedette ? "text-[#e3f0ed]/80" : "text-[#30635a]/80"} ${petit ? "text-[9px]" : "text-[10px]"}`}>
          {sous}
        </div>
      )}
      {appel && (
        <Link
          href={RESERVER}
          className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-white px-4 py-2 text-sm font-semibold text-[#29514a] transition-colors hover:bg-[#f3f8f7]"
        >
          {appel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function Trait({ hauteur = 48 }: { hauteur?: number }) {
  return (
    <div className="relative mx-auto w-px" style={{ height: hauteur }}>
      <div className="absolute inset-0 bg-[#72b0a4] opacity-70 blur-[3px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#a0ccc3] via-[#72b0a4] to-[#4f9587]/30" />
    </div>
  );
}

function Branches({ nombre, sens, hauteur = 70 }: { nombre: number; sens: "separe" | "rejoint"; hauteur?: number }) {
  const largeur = 100 / nombre;
  const chemins = Array.from({ length: nombre }, (_, i) => largeur * (i + 0.5)).map((x) =>
    sens === "separe" ? `M50,0 C50,50 ${x},50 ${x},100` : `M${x},0 C${x},50 50,50 50,100`,
  );
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="w-full"
      style={{ height: hauteur, filter: "drop-shadow(0 0 3px rgba(114,176,164,0.6))" }}
    >
      {chemins.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="rgba(160,204,195,0.9)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          className="dentaire-trait"
        />
      ))}
    </svg>
  );
}

export default function Schema() {
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[280px] max-w-[360px] py-2">
        <Noeud titre="Tiroma" icone={<MarqueTiroma className="h-full w-full text-[24px]" />} vedette />
        <Branches nombre={2} sens="separe" />
        <div className="grid grid-cols-2 gap-2">
          <Noeud petit titre="Agenda" sous="votre logiciel" Icone={CalendarDays} />
          <Noeud petit titre="Plans et devis" sous="lecture seule" Icone={ClipboardList} />
        </div>
        <Branches nombre={2} sens="rejoint" />
        <Noeud titre="Annulation reçue" sous="la veille · 19 h 04" Icone={CalendarX} />
        <Trait />
        <Noeud titre="Créneau libéré" sous="10 h 30 · fauteuil 2" Icone={CalendarDays} />
        <Branches nombre={3} sens="separe" />
        <div className="grid grid-cols-3 gap-2">
          <Noeud petit titre="Plan accepté" Icone={CircleCheck} />
          <Noeud petit titre="Liste d'attente" Icone={ListChecks} />
          <Noeud petit titre="Contrôle dû" Icone={Stethoscope} />
        </div>
        <Branches nombre={3} sens="rejoint" />
        <Noeud titre="Proposition à l'assistante" sous="le patient le mieux placé" Icone={Users} />
        <Trait />
        <Noeud titre="Appel du patient" sous="par l'assistante" Icone={Phone} />
        <Trait />
        <Noeud titre="Rendez-vous confirmé" sous="agenda à jour" Icone={CircleCheck} />
        <Branches nombre={3} sens="separe" />
        <div className="grid grid-cols-3 gap-2">
          <Noeud petit titre="WhatsApp" Icone={MessageSquare} />
          <Noeud petit titre="E-mail" Icone={Mail} />
          <Noeud petit titre="Tableau" Icone={ChartColumn} />
        </div>
        <Branches nombre={3} sens="rejoint" />
        <Noeud titre="Point du soir" sous="ce qui a été repris aujourd'hui" Icone={BellRing} />
        <Trait hauteur={56} />
        <Noeud titre="Fauteuil occupé" vedette appel="Réserver un audit" />
      </div>
    </div>
  );
}
