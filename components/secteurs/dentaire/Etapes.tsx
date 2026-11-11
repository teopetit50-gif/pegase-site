/* ══════════════════════════════════════════════════════════════════════
   « De l'annulation au fauteuil occupé » — les quatre étapes de la page
   du 24/09 (textes.ts, ETAPES), dans les cartes de la mosaïque de la
   référence (même titre et chapô côte à côte, mêmes colonnes, mêmes
   cartes à avatar, nom, rôle et texte que « Ce que vivent les
   cabinets ») : la référence n'a pas de section pour ces quatre étapes,
   elles reprennent donc l'un de ses blocs tel quel.
   ══════════════════════════════════════════════════════════════════════ */
import { Armchair, CalendarDays, CalendarX, ClipboardList, Stethoscope } from "lucide-react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { ETAPES } from "./textes";

/* 11/11/2026 — cinq étapes depuis le brief tiroma-v2 : la demande ouvre le fil */
const ICONES = [CalendarDays, Stethoscope, CalendarX, ClipboardList, Armchair];

export default function Etapes() {
  return (
    <section id="workflow" data-monde="clair" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-tir-foreground tracking-tight md:text-5xl">
            <MotsApparition texte="De l'annulation au fauteuil occupé" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
            Tiroma suit ce qui se passe entre deux rendez-vous, sans changer de logiciel et sans double saisie.
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150} className="mt-14 columns-1 gap-6 md:columns-2 lg:columns-4">
          {ETAPES.map(({ titre, texte }, i) => {
            const Icone = ICONES[i];
            return (
              <div key={titre} className="my-4 break-inside-avoid rounded-2xl border border-tir-border bg-tir-background p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="relative flex overflow-hidden rounded-full size-10 shrink-0">
                    <span className="flex size-full items-center justify-center rounded-full bg-tir-muted text-tir-foreground">
                      <Icone className="size-4" aria-hidden="true" />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-tir-foreground text-sm">{titre}</p>
                    <p className="text-tir-muted-foreground text-xs">Votre matinée</p>
                  </div>
                </div>
                <p className="mt-3 text-tir-muted-foreground text-sm leading-relaxed">{texte}</p>
              </div>
            );
          })}
        </Apparition>
      </div>
    </section>
  );
}
