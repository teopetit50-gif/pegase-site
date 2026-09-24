"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — accordeon.tsx

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/accordion.tsx` : Radix habillé avec les classes relevées sur la
   référence (Base UI chez elle ; même rendu, clavier natif). Ce qui
   change : jetons clairs (#e5e5e5, #0a0a0a, #737373, anneau #a1a1a1) ;
   `rounded-lg` → 10 px ; `data-[state=…]:animate-accordion-down/up`
   (tw-animate-css, absent ici) → la classe `architectes-accordeon`,
   animée selon `data-state` dans architectes.css.
   ══════════════════════════════════════════════════════════════════════ */
import * as React from "react";
import * as A from "@radix-ui/react-accordion";
import { cn } from "@/lib/cn";

export function Accordion({ className, ...p }: React.ComponentProps<typeof A.Root>) {
  return (
    <A.Root data-slot="accordion" className={cn("flex w-full flex-col border-y border-[#e5e5e5]", className)} {...p} />
  );
}
export function AccordionItem({ className, ...p }: React.ComponentProps<typeof A.Item>) {
  return <A.Item data-slot="accordion-item" className={cn("not-last:border-b border-[#e5e5e5]", className)} {...p} />;
}
export function AccordionTrigger({ className, children, ...p }: React.ComponentProps<typeof A.Trigger>) {
  return (
    <A.Header className="flex">
      <A.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-[10px] border border-transparent text-left font-medium transition-all outline-none focus-visible:border-[#a1a1a1] focus-visible:ring-3 focus-visible:ring-[#a1a1a1]/50 aria-disabled:pointer-events-none aria-disabled:opacity-50 py-5 text-base text-[#0a0a0a] hover:no-underline cursor-pointer",
          className,
        )}
        {...p}
      >
        {children}
        <svg
          data-slot="accordion-trigger-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none ml-auto size-4 shrink-0 text-[#737373] transition-transform duration-200 group-data-[state=open]/accordion-trigger:rotate-180"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </A.Trigger>
    </A.Header>
  );
}
export function AccordionContent({ className, children, ...p }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Content data-slot="accordion-content" className="overflow-hidden text-sm architectes-accordeon" {...p}>
      <div
        className={cn(
          "pt-0 pb-5 text-base leading-relaxed text-[#737373] [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-[#0a0a0a]",
          className,
        )}
      >
        {children}
      </div>
    </A.Content>
  );
}
