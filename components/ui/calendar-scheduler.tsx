"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   calendar-scheduler — le planificateur ruixen (14/09/2026), posé à
   l'étape 1 de la prise de créneau (components/reservation/PriseDeCreneau)

   Reprise de `ruixen/calendar-scheduler` : une carte sans filet, deux
   panneaux bordés côte à côte — le calendrier à gauche, les heures en
   grille à deux colonnes à droite — et un pied Réinitialiser / Continuer.

   Écarts avec l'original, tous voulus :
   · CONTRÔLÉ, pas autonome. L'original tenait `date` et `time` en état
     local avec dix heures fixes en anglais ; ici tout vient du module de
     réservation : le mois affiché (borné du mois courant à J+70), les
     jours libres (l'agenda réel), les heures du jour choisi (calculées
     par créneauxDuJour), et le créneau retenu en epoch ms — c'est lui que
     la fonction SQL reçoit. Le composant ne fait que présenter.
   · Français : locale date-fns `fr`, semaine au lundi, en-têtes L M M J V
     S D et légende de mois capitalisée, comme l'ancien calendrier.
   · Le titre « Schedule a Meeting » est parti : le module pose déjà son
     « Choisissez votre créneau » juste au-dessus.
   · Le crédit « made by ruixen.com » est parti — jamais nommer nos outils
     sur le site.
   · Largeur : `w-full max-w-[600px]` au lieu de `w-[600px]`, et les deux
     panneaux s'empilent sous 640 px (passe mobile).
   ══════════════════════════════════════════════════════════════════════ */

export type Creneau = { valeur: number; libelle: string };

export interface CalendarSchedulerProps {
  /* le mois affiché, et ses bornes de navigation */
  month: Date;
  onMonthChange: (month: Date) => void;
  startMonth: Date;
  endMonth: Date;
  /* le « aujourd'hui » de l'agenda (jour de Guadeloupe) */
  today: Date;
  /* le jour choisi, et la règle qui dit si un jour a des créneaux */
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  jourLibre: (date: Date) => boolean;
  /* le jour choisi en toutes lettres, en tête des heures */
  jourLabel?: string;
  /* les heures du jour choisi ; vide tant qu'aucun jour n'est choisi */
  creneaux: Creneau[];
  creneau: number | null;
  onCreneauChange: (creneau: number) => void;
  onReset: () => void;
  onConfirm: () => void;
  className?: string;
}

function CalendarScheduler({
  month,
  onMonthChange,
  startMonth,
  endMonth,
  today,
  date,
  onDateChange,
  jourLibre,
  jourLabel,
  creneaux,
  creneau,
  onCreneauChange,
  onReset,
  onConfirm,
  className,
}: CalendarSchedulerProps) {
  return (
    <Card className={cn("w-full max-w-[600px] border-none bg-transparent p-0 shadow-none", className)}>
      <CardContent className="flex flex-col gap-4 p-0 sm:flex-row">
        {/* ——— le calendrier ——— */}
        <div className="flex flex-1 justify-center rounded-md border border-[#e3e3e3] bg-white p-2">
          <Calendar
            mode="single"
            locale={fr}
            weekStartsOn={1}
            month={month}
            onMonthChange={onMonthChange}
            startMonth={startMonth}
            endMonth={endMonth}
            today={today}
            selected={date}
            onSelect={onDateChange}
            disabled={(d) => !jourLibre(d)}
            showOutsideDays={false}
            formatters={{
              formatWeekdayName: (d) => format(d, "EEEEE", { locale: fr }).toUpperCase(),
              formatCaption: (d) => {
                const m = format(d, "LLLL yyyy", { locale: fr });
                return m.charAt(0).toUpperCase() + m.slice(1);
              },
            }}
            className="rounded-md"
          />
        </div>

        {/* ——— les heures ——— */}
        <div className="max-h-[320px] flex-1 overflow-y-auto rounded-md border border-[#e3e3e3] bg-white p-2">
          <p className="mb-2 text-sm font-medium text-[#616161] first-letter:uppercase">
            {jourLabel ?? "Choisissez une heure"}
          </p>
          {creneaux.length === 0 ? (
            <p className="text-sm leading-[21px] text-[#616161]">
              {date
                ? "Plus aucun créneau ce jour-là."
                : "Choisissez un jour dans le calendrier — les jours grisés sont complets ou fermés."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {creneaux.map((cr) => (
                <Button
                  key={cr.valeur}
                  type="button"
                  variant={creneau === cr.valeur ? "default" : "outline"}
                  size="sm"
                  aria-pressed={creneau === cr.valeur}
                  className={cn("num w-full", creneau === cr.valeur && "ring-2 ring-[#050505] ring-offset-1")}
                  onClick={() => onCreneauChange(cr.valeur)}
                >
                  {cr.libelle}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-0 pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={!date && creneau === null}>
          Réinitialiser
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} disabled={!date || creneau === null}>
          Continuer
        </Button>
      </CardFooter>
    </Card>
  );
}

export { CalendarScheduler };
