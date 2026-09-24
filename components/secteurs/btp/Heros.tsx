"use client";
/* Héros de Vertex, porté depuis son bundle (module 6557 de page-*.js, relevé le 24/09/2026) : même arbre, mêmes
   classes, même pile animée (framer-motion : top −32 px et échelle −5 % par rang, 0,6 s, courbe [.32,.72,0,1],
   rotation toutes les 6 s, onglet = remonter la fiche). Seules changent les données : un chantier par fiche au lieu
   d'un contact, et des glyphes de métier à la place des visages.

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/hero.tsx`.
   Couleurs converties en valeurs arbitraires (règle 3 — ce site n'a pas le `@theme` de la source, et ses
   utilitaires ne peindraient rien, en silence ; `bg-muted` peindrait même le gris #9b9ba3 du site) :
     bg-background, bg-card → bg-[#ffffff] · text-foreground → text-[#171717] · text-muted-foreground →
     text-[#737373] · bg-muted → bg-[#f5f5f5] · border-border, ring-border, bg-border → #e6e6e6 ·
     border-foreground/N, ring-foreground/N → #171717/N · border-card → #ffffff.
   Les 14 utilitaires `dark:` sont retirés (règle 4, monde clair figé).
   Liens (règle 6) : « Réserver un audit » et « Voir la démo » mènent à /reserver-un-audit (voir textes.ts),
   en <Lien> pour une navigation sans rechargement ; « Conçu par Omega » visait https://omegaai.fr dans un
   nouvel onglet — on y est déjà : il mène à l'accueil, dans le même onglet.
   « J-2 » du chapô : insécable (insecable.tsx).
   Logo officiel (24/09) : l'avatar de « Daliro » dans le fil d'activité portait un glyphe de robot ; il
   porte le signe public/logos/daliro-mark.png (`SigneDaliro`, marque.tsx). */
import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, PencilLine, FilePlus, GitMerge, ListChecks, Ellipsis, LayoutGrid, CalendarDays, Building2, Send,
  Activity, ChevronRight, Handshake, Phone, CircleCheck, ChevronDown, User, AlignLeft, AtSign, MapPin, Briefcase,
  Clock, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/cn";
import Lien from "@/components/Lien";
import { Button } from "./bouton";
import { PoweredByOmega, SigneDaliro } from "./marque";
import { insecable } from "./insecable";
import { CHANTIERS, CONTACT, HERO, MARQUE, LIBELLES_FICHE as L, ONGLETS, type Chantier, type Activite } from "./textes";

/* Icônes Hugeicons de la référence (résumé, entreprise), recopiées du rendu serveur. */
function IconeResume({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.5" stroke="currentColor">
      <path d="M15 15L16.5 16.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.9391 19.0593C16.3536 18.4739 16.3536 17.5246 16.9391 16.9391C17.5246 16.3536 18.4739 16.3536 19.0593 16.9391L21.0609 18.9407C21.6464 19.5261 21.6464 20.4754 21.0609 21.0609C20.4754 21.6464 19.5261 21.6464 18.9407 21.0609L16.9391 19.0593Z" strokeLinecap="round" />
      <path d="M5.39321 3.57735L8.18155 4.51716C8.56707 4.65061 9.15209 4.56335 9.48335 4.32736L11.4394 2.93236C12.6909 2.04083 13.7267 2.57255 13.7278 4.11802L13.7385 6.73427C13.7403 7.17734 14.0485 7.72717 14.4239 7.96607L16.4225 9.2191C18.0034 10.212 17.8236 11.3875 16.0219 11.8442L13.5143 12.4774C13.0612 12.5916 12.5938 13.0591 12.4744 13.5175L11.8413 16.0256C11.3899 17.8224 10.2041 18.0021 9.21671 16.4262L7.96391 14.4272C7.72505 14.0518 7.17533 13.7436 6.73234 13.7418L4.11658 13.731C2.57665 13.7246 2.03977 12.6939 2.93114 11.4422L4.32588 9.48579C4.55657 9.15972 4.64382 8.57459 4.51039 8.189L3.57076 5.40014C3.06353 3.88424 3.88284 3.06477 5.39321 3.57735Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconeFeuille({ size = 12 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor">
      <path d="M7.64584 15.7108C7.23279 14.8966 7 13.9755 7 13C7 9.78484 9.5 7.5 13 7C17.0817 6.4169 18.8333 4.16667 20 3C23.5 16 17 19 13 19C11.9071 19 10.8825 18.7078 10 18.1973" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21C3.5 18 5.45791 16.1355 10 15C13.2167 14.1958 15.4634 12.1791 17 10.0549" strokeLinecap="round" />
    </svg>
  );
}

const ICONES_ONGLETS: Record<string, React.ReactNode> = {
  travaux: (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="4.8" height="4.8" x="3" y="3" rx="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect width="4.8" height="4.8" x="3" y="10.2" rx="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect width="4.8" height="4.8" x="10.2" y="10.2" rx="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.6 5.6h-4M12.6 3.6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "sous-traitants": (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="14" height="14" x="2" y="2" rx="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.77 6.85v5.38M9 5.77v6.46M12.23 9v3.23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  appro: (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M7.34 1.92c1.03-.59 2.3-.59 3.32 0l3.63 2.1c1.03.59 1.66 1.69 1.66 2.88v4.2c0 1.19-.63 2.29-1.66 2.88l-3.63 2.1c-1.03.59-2.3.59-3.32 0l-3.64-2.1c-1.03-.59-1.66-1.69-1.66-2.88V6.9c0-1.19.63-2.29 1.66-2.88l3.64-2.1ZM9 12.21V5.79m0 0L6.23 8.6M9 5.79l2.77 2.81" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  avancement: (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5.5 9.3l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function Hero() {
  const [ordre, setOrdre] = React.useState<Chantier[]>(CHANTIERS);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setOrdre((o) => { const n = [...o]; n.unshift(n.pop()!); return n; });
    }, 6000);
    return () => clearTimeout(t);
  }, [ordre]);
  const actif = ordre[0].id;
  return (
    <section className="relative bg-[#ffffff] py-16 md:py-24">
      <Entete />
      <div className="mt-12 px-4 lg:mt-16 lg:px-8">
        <Pile ordre={ordre} />
      </div>
      <Onglets
        actif={actif}
        choisir={(id) =>
          setOrdre((o) => {
            const i = o.findIndex((c) => c.id === id);
            return i <= 0 ? o : [...o.slice(i), ...o.slice(0, i)];
          })
        }
      />
    </section>
  );
}

function Entete() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
      <span className="mb-5 inline-flex items-center gap-x-1.5 rounded-full border border-[#e6e6e6] bg-[#ffffff] py-1 pr-3 pl-2 font-medium text-[#737373] text-xs">
        <Sparkles className="size-3 text-[#171717]" strokeWidth={1.75} />
        {HERO.pastille}
      </span>
      <h1 className="text-balance font-semibold text-4xl text-[#171717] tracking-tight md:text-5xl lg:text-6xl">{HERO.titre}</h1>
      <p className="mt-5 max-w-2xl text-balance text-base text-[#737373] md:text-lg">{insecable(HERO.texte)}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild><Lien href={CONTACT.audit}>{HERO.audit}</Lien></Button>
        <Button size="lg" variant="outline" asChild><Lien href={CONTACT.demo}>{HERO.demo}</Lien></Button>
      </div>
      <p className="mt-4 inline-flex items-center gap-1 text-[#737373] text-xs">
        {HERO.signature}{" "}
        <Lien href="/" className="underline underline-offset-4 transition-colors hover:text-[#171717]">
          <PoweredByOmega />
        </Lien>
      </p>
    </div>
  );
}

function Pile({ ordre }: { ordre: Chantier[] }) {
  return (
    <div className="relative mx-auto w-full max-w-7xl" style={{ paddingTop: (ordre.length - 1) * 32 }}>
      <div className="relative">
        {ordre.map((c, i) => (
          <motion.article
            key={c.id}
            className={cn("overflow-hidden rounded-2xl border border-[#171717]/15 bg-[#ffffff] shadow-xl", i === 0 ? "relative" : "absolute inset-x-0")}
            style={{ transformOrigin: "top center" }}
            initial={false}
            animate={{ top: i === 0 ? 0 : -(32 * i), scale: 1 - 0.05 * i, zIndex: ordre.length - i }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            aria-hidden={i !== 0}
          >
            <Barre c={c} />
            <Fiche c={c} />
          </motion.article>
        ))}
      </div>
    </div>
  );
}

function Barre({ c }: { c: Chantier }) {
  return (
    <div className="flex h-11 items-center gap-x-2 border-[#171717]/10 border-b bg-[#f5f5f5]/40 px-4">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rotate-45 rounded-[2px]", c.accentClass)} />
      <span className="font-medium text-[#171717] text-sm tracking-tight">{c.name}</span>
      <span className="text-[#737373] text-sm">·</span>
      <span className="truncate text-[#737373] text-sm tracking-tight">{c.role}</span>
    </div>
  );
}

function Onglets({ actif, choisir }: { actif: string; choisir: (id: string) => void }) {
  return (
    <div className="sticky bottom-5 z-20 mt-12 flex justify-center px-4 md:mt-16">
      <ul className="flex max-w-full gap-x-2 overflow-x-auto rounded-[15px] border border-[#e6e6e6] bg-[#ffffff] p-2.5 shadow-xl">
        {CHANTIERS.map((c) => {
          const on = actif === c.id;
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                onClick={() => choisir(c.id)}
                aria-pressed={on}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-x-1 rounded-[10px] border border-[#e6e6e6] py-[5px] pr-[11px] pl-[9px] text-sm transition-colors hover:bg-[#f5f5f5]/60",
                  on ? "bg-[#f5f5f5] text-[#171717]" : "text-[#737373]",
                )}
              >
                {ICONES_ONGLETS[c.id]}
                <span>{ONGLETS[c.id]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Fiche({ c }: { c: Chantier }) {
  return (
    <div className="relative w-full bg-[#ffffff]">
      <div className="grid grid-rows-[auto_auto] lg:grid-cols-[319px_1fr] lg:grid-rows-[auto_1fr]">
        <Identite c={c} />
        <Essentiel c={c} />
        <Details c={c} />
      </div>
    </div>
  );
}

function Identite({ c }: { c: Chantier }) {
  return (
    <div className="relative flex flex-col border-[#171717]/15 border-b bg-[#ffffff] p-6 lg:border-r">
      <div className="size-10 overflow-hidden rounded-full border border-[#e6e6e6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.glyphe} alt="" width={40} height={40} className="size-full object-cover" />
      </div>
      <div className="mt-3 font-semibold text-[#171717] text-lg leading-6 tracking-tight">{c.name}</div>
      <div className="mt-0.5 font-medium text-[#737373] text-sm tracking-tight">{c.role}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="inline-flex h-7 items-center gap-x-1.5 rounded-lg bg-[#ffffff] px-2.5 text-[#171717] shadow-sm ring-1 ring-[#e6e6e6] ring-inset">
          <span className="inline-flex shrink-0 text-[#737373]"><PencilLine className="size-3.5" strokeWidth={1.75} /></span>
          <span className="truncate font-medium text-sm tracking-tight">{L.ecrire}</span>
        </div>
        {[[FilePlus, L.note], [GitMerge, L.fusion], [ListChecks, L.tache], [Ellipsis, L.plus]].map(([I, l]) => {
          const Icone = I as typeof FilePlus;
          return (
            <div key={l as string} role="img" aria-label={l as string} className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#ffffff] text-[#737373] shadow-sm ring-1 ring-[#e6e6e6] ring-inset">
              <Icone className="size-3.5" strokeWidth={1.75} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Case({ label, droite, className, teinte, accent, children }: { label: string; droite?: React.ReactNode; className?: string; teinte?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-[#e6e6e6] bg-[#ffffff]", accent && "border-[#171717]/[0.10] shadow-sm", className)}>
      {teinte && <div className={cn("absolute inset-0", teinte)} />}
      <div className="relative flex h-full flex-col justify-between gap-y-4 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[#737373] text-xs tracking-normal">{label}</span>
          {droite}
        </div>
        {children}
      </div>
    </div>
  );
}

function Essentiel({ c }: { c: Chantier }) {
  return (
    <div className="hidden bg-[#ffffff] px-6 pt-8 pb-8 lg:row-span-2 lg:block">
      <div className="flex items-center gap-x-1.5 pl-1 font-semibold text-[#171717] text-sm tracking-tight">
        <LayoutGrid className="size-3.5 text-[#737373]" strokeWidth={1.75} />
        {L.essentiel}
      </div>
      <div className="mt-3 grid grid-cols-[176fr_176fr_218fr] grid-rows-[120px_120px] gap-[7px]">
        <Case label={L.resume} droite={<IconeResume className="text-violet-500" />} className="col-span-2" accent>
          <span className="line-clamp-2 font-medium text-[#171717] text-sm tracking-tight">{c.summary}</span>
        </Case>
        <Case
          label={L.fil}
          droite={<MessageSquare className="size-3.5 text-[#069]" strokeWidth={1.5} />}
          teinte="bg-[linear-gradient(55deg,rgba(0,102,153,0.06)_0%,rgba(0,102,153,0.02)_35%)]"
        >
          <span className="relative inline-block font-medium text-[#069] text-sm tracking-tight underline decoration-[#069] underline-offset-2">{c.fil}</span>
        </Case>
        <Case label={L.avenir} droite={<CalendarDays className="size-3.5 text-[#737373]" strokeWidth={1.75} />}>
          <div className="flex items-center justify-between gap-x-4">
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate font-medium text-[#171717] text-sm tracking-tight">{c.upcoming.title}</span>
              <span className="font-medium text-[#737373] text-xs">{c.upcoming.dateLine}</span>
            </div>
            <div className="flex w-6 flex-col rounded-lg border border-[#e6e6e6] bg-[#f5f5f5] p-0.5">
              <div className="text-center font-medium text-[6px] text-blue-500 leading-[8px] tracking-tight">{c.upcoming.day}</div>
              <div className="text-center font-medium text-[10px] text-[#171717] leading-[10px] tracking-tight">{c.upcoming.date}</div>
            </div>
          </div>
        </Case>
        <Case label={L.devis} droite={<Building2 className="size-3.5 text-[#737373]" strokeWidth={1.75} />}>
          <div className="flex items-center justify-between gap-x-4">
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate font-medium text-[#171717] text-sm tracking-tight">{c.company}</span>
              <span className="truncate font-medium text-[#737373] text-xs">{c.companyLocation}</span>
            </div>
            <div className="inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 ring-inset">
              <IconeFeuille size={12} />
            </div>
          </div>
        </Case>
        <Case label={L.planning} droite={<Send className="size-3.5 text-[#737373]" strokeWidth={1.75} />}>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-x-1.5">
              <span className="font-medium text-[#171717] text-sm tracking-tight">{L.etape} {c.outreach.step}</span>
              <span className="font-medium text-[#737373] text-xs">{c.outreach.label}</span>
            </div>
            <Jalons actif={c.outreach.step} total={c.outreach.total} />
          </div>
        </Case>
      </div>
      <div className="mt-12 flex items-center gap-x-1.5 pl-1 font-semibold text-[#171717] text-sm tracking-tight">
        <Activity className="size-3.5 text-[#737373]" strokeWidth={1.75} />
        {L.activite}
        <ChevronRight className="size-3.5 text-[#737373]" strokeWidth={1.75} />
      </div>
      <Activites liste={c.activities} />
    </div>
  );
}

function Jalons({ actif, total }: { actif: number; total: number }) {
  return (
    <div className="flex gap-x-0.5 pb-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 rounded-full",
            i % 2 === 0 ? "w-1.5 flex-1" : "w-1.5",
            i === actif ? "bg-emerald-500" : i < actif ? "bg-emerald-200" : "bg-[#e6e6e6]",
          )}
        />
      ))}
    </div>
  );
}

function Activites({ liste }: { liste: Activite[] }) {
  const icone = (t: Activite["type"]) => {
    const cls = "text-[#737373] size-3";
    if (t === "meeting") return <Handshake className={cls} strokeWidth={1.75} />;
    if (t === "event") return <CalendarDays className={cls} strokeWidth={1.75} />;
    return <Phone className={cls} strokeWidth={1.75} />;
  };
  return (
    <div className="relative">
      <div className="-bottom-1 absolute right-5 left-5 h-10 rounded-lg border border-[#e6e6e6]" />
      <div className="-bottom-0.5 absolute right-3 left-3 h-10 rounded-lg border border-[#e6e6e6] bg-[#ffffff]" />
      <div className="relative mt-3 overflow-hidden rounded-xl border border-[#e6e6e6] bg-[#ffffff]">
        <div className="flex flex-col gap-y-[1.5px] px-3 py-4">
          {liste.map((a, i) => (
            <React.Fragment key={`${a.actor}-${a.target}-${i}`}>
              {i > 0 && <div className="ml-[9.5px] h-[13px] w-px rounded-full bg-[#e6e6e6]" />}
              <div className="flex items-baseline justify-between gap-x-2">
                <div className="flex min-w-0 items-center">
                  <div className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-[#e6e6e6] bg-[#f5f5f5]">
                    {icone(a.type)}
                    {a.success && (
                      <span className="-right-1 -bottom-1 absolute flex size-3.5 items-center justify-center rounded-full border-2 border-[#ffffff] bg-emerald-100 text-emerald-700">
                        <CircleCheck className="size-3 fill-emerald-100" strokeWidth={2} />
                      </span>
                    )}
                  </div>
                  <div className="ml-3 flex min-w-0 items-center">
                    <div className="relative inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#171717]/10 bg-[#f0f0f0]">
                      {a.actor === MARQUE ? (
                        /* Daliro parle : son signe officiel, pas le glyphe de robot de la source. */
                        <SigneDaliro className="size-2.5 text-[#171717]" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={a.glyphe} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <span className="ml-1.5 font-medium text-[#171717] text-sm tracking-tight">{a.actor}</span>
                    <span className="ml-1 truncate font-medium text-[#737373] text-sm tracking-tight">
                      {a.action} <span className="underline">{a.target}</span>
                    </span>
                  </div>
                </div>
                <span className="shrink-0 font-medium text-[#737373] text-xs">{a.time}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ligne({ icone, label, valeur }: { icone: React.ReactNode; label: string; valeur: React.ReactNode }) {
  return (
    <div className="grid h-8 grid-cols-[124px_1fr] items-center lg:grid-cols-[110px_1fr]">
      <div className="flex items-center gap-x-1.5 text-[#737373]">
        <span className="inline-flex shrink-0">{icone}</span>
        <span className="truncate font-medium text-xs tracking-normal">{label}</span>
      </div>
      {typeof valeur === "string" ? <span className="truncate font-medium text-[#171717] text-sm tracking-tight">{valeur}</span> : valeur}
    </div>
  );
}

function Details({ c }: { c: Chantier }) {
  const i = "size-3.5";
  return (
    <div className="border-[#171717]/15 bg-[#ffffff] px-4 pt-3 pb-6 lg:border-r">
      <div className="flex items-center gap-x-1.5 text-[#737373]">
        <ChevronDown className={i} strokeWidth={1.75} />
        <span className="font-medium text-xs tracking-normal">{L.details}</span>
      </div>
      <Ligne icone={<User className={i} strokeWidth={1.75} />} label={L.nom} valeur={c.name} />
      <Ligne icone={<AlignLeft className={i} strokeWidth={1.75} />} label={L.nature} valeur={c.role} />
      <Ligne
        icone={<AtSign className={i} strokeWidth={1.75} />}
        label={L.equipe}
        valeur={<span className="inline-flex w-fit rounded-lg border border-blue-300/70 px-1.5 pb-px font-medium text-blue-500 text-sm tracking-tight">{c.equipe}</span>}
      />
      <Ligne icone={<MapPin className={i} strokeWidth={1.75} />} label={L.adresse} valeur={c.location} />
      <Ligne
        icone={<Briefcase className={i} strokeWidth={1.75} />}
        label={L.client}
        valeur={
          <span className="inline-flex items-center gap-x-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-[5px] bg-emerald-50 text-emerald-600">
              <IconeFeuille size={10} />
            </span>
            <span className="border-[#e6e6e6] border-b font-medium text-[#171717] text-sm tracking-tight">{c.company}</span>
          </span>
        }
      />
      <Ligne icone={<Clock className={i} strokeWidth={1.75} />} label={L.dernier} valeur={c.lastInteraction} />
    </div>
  );
}
