/* ══════════════════════════════════════════════════════════════════════
   « Ce que vivent les cabinets » — la mosaïque de témoignages de la
   référence (titre et chapô côte à côte, colonnes 1 → 2 → 4, cartes à
   avatar, nom, rôle et texte, et la carte vide en pointillés avec son
   « + »), recopiée classe par classe. Ici, AUCUN avis : les treize
   situations types de la page du 24/09 (textes.ts, SITUATIONS), chacune
   marquée « Situation type » ; l'avatar porte l'icône de la situation.
   Le chapô assemble les deux seuls chiffres sourcés de la page
   (CHIFFRES_SOURCES).
   ══════════════════════════════════════════════════════════════════════ */
import { Plus } from "lucide-react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { CHIFFRES_SOURCES, SITUATIONS } from "./textes";

export default function Situations() {
  return (
    <section data-monde="clair" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-tir-foreground tracking-tight md:text-5xl">
            <MotsApparition texte="Ce que vivent les cabinets" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
            {CHIFFRES_SOURCES.map((c, i) => (
              <span key={c.chiffre}>
                {i > 0 && " · "}
                {c.chiffre} {c.texte} ({c.source})
              </span>
            ))}
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150} className="mt-14 columns-1 gap-6 md:columns-2 lg:columns-4">
          {SITUATIONS.map(({ quand, cabinet, sujet, Icone, recit }) => (
            <div key={quand + sujet} className="my-4 break-inside-avoid rounded-2xl border border-tir-border bg-tir-background p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="relative flex overflow-hidden rounded-full size-10 shrink-0">
                  <span className="flex size-full items-center justify-center rounded-full bg-tir-muted text-tir-foreground">
                    <Icone className="size-4" aria-hidden="true" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tir-foreground text-sm">
                    {quand} · {sujet}
                  </p>
                  <p className="text-tir-muted-foreground text-xs">Situation type · {cabinet}</p>
                </div>
              </div>
              <p className="mt-3 text-tir-muted-foreground text-sm leading-relaxed">{recit}</p>
            </div>
          ))}
          <div aria-hidden="true" className="my-4 flex h-44 break-inside-avoid items-center justify-center rounded-3xl border-2 border-tir-border border-dashed bg-transparent">
            <Plus className="size-7 text-tir-muted-foreground/40" />
          </div>
        </Apparition>
      </div>
    </section>
  );
}
