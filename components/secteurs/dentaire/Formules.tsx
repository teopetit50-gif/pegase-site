"use client";
/* ══════════════════════════════════════════════════════════════════════
   « Le prix dépend du nombre de fauteuils » (#pricing) — les quatre
   formules et le bandeau de la page du 24/09 (textes.ts, FORMULES ;
   Formules.tsx d'alors), dans la grille de cinq cartes de la référence
   (deux puis trois, trame de points, titre, texte, scène). La référence
   n'a pas de formules : chaque carte reprend son bloc tel quel — pastille
   numérotée, « Sur audit », les points en lignes du fil d'activité, le
   détail qui s'ouvre (« Voir le détail » / « Réduire »), le bouton. Le
   bandeau porte la bascule mensuel / annuel (interrupteur de la
   référence) et « Prix fixé à l'audit ». AUCUN MONTANT, comme avant.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { Check, X } from "lucide-react";
import { useState } from "react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { RESERVER } from "./outils";
import { FORMULES, type Formule } from "./textes";

const BOUTON_PLEIN = "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium text-sm outline-none transition-all bg-tir-primary text-tir-primary-foreground shadow-xs hover:bg-tir-primary/90 h-8 gap-1.5 rounded-md px-3";
const BOUTON_CREUX = "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium text-sm outline-none transition-all border bg-tir-background shadow-xs hover:bg-tir-accent hover:text-tir-accent-foreground h-8 gap-1.5 rounded-md px-3";

function Carte({ f, rang, annuel, large }: { f: Formule; rang: number; annuel: boolean; large?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={`relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background ${large ? "lg:col-span-2" : ""}`}>
      <div className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="relative p-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg border border-[#E0DCFE] bg-[#F1ECFE] px-[5px] py-px font-medium text-[#6B47D8] text-[12px] leading-4">{String(rang + 1).padStart(2, "0")}</span>
          {f.conseillee && <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-px font-medium text-[10px] text-emerald-700">Le plus complet</span>}
        </div>
        <h3 className="mt-3 font-semibold text-tir-foreground text-lg leading-tight">{f.nom}</h3>
        <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">{f.texte}</p>
      </div>
      <div className="relative flex-1 px-8 pb-8">
        <div className="flex items-end gap-x-[5px]">
          <span className="font-semibold text-[18px] text-tir-foreground leading-6 tracking-[-0.36px]">Sur audit</span>
        </div>
        <span className="font-medium text-[11px] text-tir-muted-foreground leading-4 tracking-[-0.22px]">
          {annuel ? "Facturé à l'année, prix fixé à l'audit" : "Facturé au mois, prix fixé à l'audit"}
        </span>
        <div className="relative mt-4 pl-12">
          <div className="absolute top-0 bottom-0 left-6 border-tir-foreground/15 border-l border-dashed" />
          {f.points.map((p, i) => (
            <div key={p} className={i > 0 ? "relative mt-1.5" : "relative"}>
              <div className="-left-9 absolute top-0 z-10 flex size-6 items-center justify-center rounded-md bg-blue-100 ring-1 ring-blue-200/60">
                <Check className="size-3.5 text-blue-700" aria-hidden="true" />
              </div>
              <div className="ml-1 rounded-md border border-tir-border bg-tir-card px-2.5 py-1.5 shadow-sm">
                <p className="text-[11px] text-tir-foreground leading-snug">{p}</p>
              </div>
            </div>
          ))}
          <div className="relative mt-1.5 pt-1">
            <div className="-left-6 absolute top-0 h-1/2 w-6 rounded-bl-full border-tir-foreground/15 border-b border-l border-dashed" />
            <button type="button" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)} className="flex items-center gap-1 text-[10px] text-tir-muted-foreground hover:text-tir-foreground">
              {ouvert ? "Réduire" : "Voir le détail"}
            </button>
          </div>
          {ouvert && (
            <div className="mt-2 space-y-1.5">
              {f.detail.map((d) => (
                <div key={d.libelle} className="ml-1 flex items-center gap-1.5 text-[11px]">
                  {d.inclus ? <Check className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" /> : <X className="size-3.5 shrink-0 text-tir-muted-foreground/40" aria-hidden="true" />}
                  <span className={d.inclus ? "text-tir-foreground" : "text-tir-muted-foreground"}>{d.libelle}</span>
                  {d.indice && <span className="inline-flex items-center rounded-full bg-blue-500 px-1.5 py-px font-medium text-[10px] text-white leading-none">{d.indice}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6">
          <Link href={RESERVER} className={f.conseillee ? BOUTON_PLEIN : BOUTON_CREUX}>
            Réserver un audit
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Formules() {
  const [annuel, setAnnuel] = useState(true);
  return (
    <section id="pricing" data-monde="clair" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-tir-foreground tracking-tight md:text-5xl">
            <MotsApparition texte="Le prix dépend du nombre de fauteuils" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
            Le prix dépend du nombre de fauteuils : il se fixe à l&apos;audit, pas sur une grille.
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150} className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Carte f={FORMULES[0]} rang={0} annuel={annuel} large />
          <Carte f={FORMULES[1]} rang={1} annuel={annuel} />
          <Carte f={FORMULES[2]} rang={2} annuel={annuel} />
          <Carte f={FORMULES[3]} rang={3} annuel={annuel} />
          <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background">
            <div className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="relative p-8">
              <span className="inline-flex items-center rounded-lg border border-[#C7F4D3] bg-[#DDF9E4] px-[5px] py-px font-medium text-[#075A39] text-[12px] leading-4">Inclus dans chaque formule</span>
              <h3 className="mt-3 font-semibold text-tir-foreground text-lg leading-tight">Le point du matin arrive là où vous êtes</h3>
              <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">
                Chaque jour ouvré à 7 h, par WhatsApp ou par e-mail, sur le téléphone du titulaire et de l&apos;assistante. Rien à ouvrir, rien à installer.
              </p>
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pb-8">
                <div className="w-[185px] rounded-xl border border-tir-border/40 bg-white p-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-tir-foreground leading-tight">{annuel ? "Annuel" : "Mensuel"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={annuel}
                      aria-label="Basculer entre facturation mensuelle et annuelle"
                      onClick={() => setAnnuel(!annuel)}
                      className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${annuel ? "bg-blue-500" : "bg-zinc-300"}`}
                    >
                      <span className={`inline-block size-2.5 rounded-full bg-white shadow-sm transition-transform ${annuel ? "translate-x-3" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <p className="mt-0.5 text-[9.5px] text-tir-muted-foreground leading-snug">{annuel ? "Facturé à l'année, prix fixé à l'audit" : "Facturé au mois, prix fixé à l'audit"}</p>
                  <div className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-tir-border/60 px-2 py-1 font-medium text-[10px] text-tir-foreground">
                    {annuel ? "Mensuel" : "Annuel"}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-500 px-1.5 py-px font-medium text-[10px] text-white leading-none">Prix fixé à l&apos;audit</span>
              </div>
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}
