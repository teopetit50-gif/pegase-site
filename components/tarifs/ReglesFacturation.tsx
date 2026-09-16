import { Boxes, FileSignature, Gauge, UserCheck } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   ReglesFacturation — « Ce que nous ne facturons jamais » (14/09/2026)

   LE MODÈLE « HOW-IT-WORKS » (Teo, composant de référence fourni). La
   section quittait quatre cartes blanches plates, surmontées d'une note et
   d'un H2 alignés à gauche, pour la composition de la référence :

     · en-tête CENTRÉ, titre puis chapô en 18 px ;
     · un RAIL de pastilles numérotées, reliées par un filet, aligné sur
       les colonnes des cartes ;
     · des cartes à coins 16, tuile d'icône de 48 px, titre, texte, puis
       une liste de points à puce ronde cerclée.

   Écarts assumés :

   1. La référence décrit un PROCÉDÉ en trois étapes ; ici il y a QUATRE
      règles, et elles ne s'enchaînent pas. La grille passe donc à quatre
      colonnes (filet à 12,5 % sur 75 % de large, pour tomber au centre de
      la première et de la dernière pastille), et les numéros ne disent
      plus un ordre : ils reprennent les « Règle 1 … Règle 4 » que les
      cartes portaient déjà depuis le 28/08.
   2. Les points de chaque carte ne sont PAS de nouvelles promesses : ils
      redécoupent des phrases déjà écrites sur la page — le texte de la
      règle lui-même, la réponse « Puis-je changer de palier ensuite ? »
      de la FAQ, et la note légale sous la grille. Aucune affirmation
      nouvelle, c'est la règle maison.
   3. `hover:scale-105` de la référence est réduit à `hover:-translate-y-1`
      + ombre : quatre cartes côte à côte qui grossissent au survol
      empiètent sur leurs voisines à 1024 px, où la gouttière tombe à
      24 px.
   4. Les jetons shadcn (`bg-card`, `bg-muted`, `text-primary`,
      `ring-background`) ne peignent rien ici : les couleurs de `.resa`
      sont écrites (#ffffff, #f5f5f5, #050505, filet #e3e3e3).
   ══════════════════════════════════════════════════════════════════════ */

export type Regle = {
  titre: string;
  texte: string;
  points: string[];
};

type Icone = ComponentType<{ className?: string; strokeWidth?: number }>;

/* 15/09 — LA SECTION CHANGE DE CONTENU, PAS DE FORME (Teo : « sa section
   doit être remplacée par comment nous chiffrons, et là tu expliques
   comment on chiffre »). « Ce que nous ne facturons jamais » énonçait
   quatre interdits ; depuis que la page n'affiche plus de montant, la
   question que le visiteur se pose n'est plus « que me facturez-vous en
   plus ? » mais « sur quoi allez-vous me chiffrer ? ». Les deux règles
   qui répondaient vraiment à ça (ni par utilisateur, ni au résultat)
   sont devenues les points de la première étape ; les deux autres
   (engagement, réversibilité) vivent déjà dans le comparatif et la FAQ.
   Les numéros disent maintenant un ORDRE, ce que le rail suggérait déjà. */
const ICONES: Icone[] = [Boxes, Gauge, UserCheck, FileSignature];

export default function ReglesFacturation({
  titre,
  chapo,
  regles,
  className,
}: {
  titre: string;
  chapo: string;
  regles: Regle[];
  className?: string;
}) {
  return (
    <div className={cn("r-wrap py-14 sm:py-20", className)}>
      {/* ——— en-tête centré ——— */}
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <h2 className="r-h2 text-balance">{titre}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-[17px] leading-[26px] text-[#616161]">
          {chapo}
        </p>
      </div>

      {/* ——— le rail de pastilles numérotées : caché tant que les cartes
             ne sont pas en ligne, sinon le filet relie une colonne à
             elle-même ——— */}
      <div className="relative mx-auto mb-8 hidden w-full xl:block">
        {/* le filet va du centre de la 1re pastille au centre de la 4e :
            une colonne vaut (100 % − 3 × 24 px) / 4, sa moitié
            12,5 % − 9 px. Sans ce retrait, la gouttière décale les
            pastilles des cartes qu'elles surmontent. Le rail et la sous-grille
            n'apparaissent qu'à partir de xl : à 1024 px quatre colonnes de
            210 px hachent les titres en trois lignes, les cartes restent
            donc en 2 × 2 jusque-là. */}
        <div
          aria-hidden
          className="absolute left-[calc(12.5%_-_9px)] right-[calc(12.5%_-_9px)] top-1/2 h-px -translate-y-1/2 bg-[#e3e3e3]"
        />
        <div className="relative grid grid-cols-4 gap-6">
          {regles.map((r, i) => (
            <div
              key={r.titre}
              aria-hidden
              className="flex size-8 items-center justify-center justify-self-center rounded-full bg-[#ececec] text-sm font-semibold text-[#050505] ring-4 ring-[#f5f5f5]"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* ——— les quatre cartes ——— */}
      {/* dès lg les quatre cartes partagent leurs rangées (sous-grille) :
          sans elle, une règle dont le texte fait trois lignes décale sa
          liste de points de 23 px par rapport à ses voisines */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_auto_auto_1fr] xl:gap-y-0">
        {regles.map((r, i) => {
          const Icone = ICONES[i % ICONES.length];
          return (
            <div
              key={r.titre}
              data-reveal
              className="rounded-2xl border border-[#e3e3e3] bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#050505]/30 hover:shadow-lg xl:row-span-4 xl:grid xl:grid-rows-subgrid"
            >
              <div>
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#050505]">
                  <Icone className="size-6" strokeWidth={1.75} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161] xl:hidden">
                  Règle {i + 1}
                </p>
              </div>
              <h3 className="mb-2 mt-2 font-[family-name:var(--font-jakarta)] text-xl font-medium tracking-[-0.01em] text-[#050505] xl:mt-0">
                {r.titre}
              </h3>
              <p className="mb-6 text-[15px] leading-[23px] text-[#3d3d3d]">{r.texte}</p>
              <ul className="space-y-3">
                {r.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-[6px] flex size-4 flex-none items-center justify-center rounded-full bg-[#050505]/12"
                    >
                      <span className="size-2 rounded-full bg-[#050505]" />
                    </span>
                    <span className="text-[14px] leading-[21px] text-[#616161]">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
