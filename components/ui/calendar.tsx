"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";

/* ══════════════════════════════════════════════════════════════════════
   calendar — le calendrier originui sur react-day-picker v9 (14/09/2026)

   Copie de `originui/calendar`, réencrée pour ce site :
   · aucun jeton shadcn n'existe ici (`text-foreground`, `bg-primary`,
     `text-muted-foreground`…) — chaque couleur est écrite : encre #050505,
     gris #616161, survol #f5f5f5, jour choisi noir sur blanc, jour fermé
     #b5b5b5 (même gris que l'ancienne case `rv-cal-case--vide`) ;
   · le jour fermé n'est PAS barré (l'original mettait `line-through`) :
     ici « grisé » veut dire complet ou fermé, pas annulé ;
   · `Chevron` est typé, plus de `any` (eslint bloque le build).
   ══════════════════════════════════════════════════════════════════════ */

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

type ChevronProps = React.ComponentProps<typeof ChevronLeft> & {
  orientation?: "left" | "right" | "up" | "down";
  disabled?: boolean;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months: "relative flex flex-col sm:flex-row gap-4",
    month: "w-full",
    month_caption: "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
    caption_label: "text-sm font-semibold text-[#050505]",
    nav: "absolute top-0 flex w-full justify-between z-10",
    button_previous: cn(
      buttonVariants({ variant: "ghost" }),
      "size-9 text-[#616161] hover:text-[#050505] p-0",
    ),
    button_next: cn(
      buttonVariants({ variant: "ghost" }),
      "size-9 text-[#616161] hover:text-[#050505] p-0",
    ),
    weekday: "size-9 p-0 text-xs font-medium text-[#616161]",
    day_button:
      "num relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-[#050505] outline-offset-2 group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150 focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-[#f5f5f5] group-data-[selected]:bg-[#050505] hover:text-[#050505] group-data-[selected]:text-white group-data-[disabled]:text-[#b5b5b5] group-data-[outside]:text-[#b5b5b5] group-data-[outside]:group-data-[selected]:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#050505]/70 group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none group-[.range-middle]:rounded-none group-data-[selected]:group-[.range-middle]:bg-[#f5f5f5] group-data-[selected]:group-[.range-middle]:text-[#050505]",
    day: "group size-9 px-0 text-sm",
    range_start: "range-start",
    range_end: "range-end",
    range_middle: "range-middle",
    today:
      "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-[#050505] [&[data-selected]:not(.range-middle)>*]:after:bg-white [&[data-disabled]>*]:after:bg-[#b5b5b5] *:after:transition-colors",
    outside: "text-[#616161] data-selected:bg-[#f5f5f5]/50 data-selected:text-[#616161]",
    hidden: "invisible",
    week_number: "size-9 p-0 text-xs font-medium text-[#616161]",
  };

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: ({ orientation, disabled: _disabled, ...rest }: ChevronProps) => {
      void _disabled;
      if (orientation === "left") {
        return <ChevronLeft size={16} strokeWidth={2} {...rest} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} {...rest} aria-hidden="true" />;
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
