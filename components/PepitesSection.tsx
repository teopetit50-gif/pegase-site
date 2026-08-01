"use client";

/* Section PÉPITES — « L'INDEX ÉDITORIAL » : le sommaire d'une collection.
   Zéro boîte, zéro verre — typographie énorme, lignes fines, pleine largeur.
   - 4 rangées : numéro Mono · NOM immense (metal-text) · tag secteur Mono ·
     flèche. La rangée BILLD porte en permanence le J-XX en or #e0b341
     (seule rangée datée — l'or n'existe que là).
   - Survol desktop / tap mobile (accordéon, une seule ouverte) : la rangée
     s'ouvre (grid-template-rows 0fr→1fr, ~350ms ease-out), révèle la
     description + bénéfice signature + lien, et le VISUEL MÉTIER : flux
     d'appels d'offres (PUBLIQ), calendrier de nuits (STAYD), calques marque
     blanche (COLLECT), 3 étapes Factur-X→portail→conforme (BILLD). Un wash
     accent balaie depuis la gauche, le nom glisse, la flèche pivote.
   - Rangées 05-08 : PRICEBOOK/CARGO/BOOKD/ENTRY en préparation, fines,
     non ouvrables (secteurs du brief projet).
   Accessibilité : boutons focusables, aria-expanded/aria-controls.
   Reduced-motion : ouverture sans animation, visuels figés au moment fort.
   Le mockup BILLD Factur-X est rendu dans un wrapper STRICTEMENT identique
   à celui de FeatureSection — il ne bouge pas d'un pixel. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import type { Famille } from "@/lib/content";

const SKY = "103, 202, 242";
const OR = "#e0b341";
const OR_RGB = "224, 179, 65";

const SECTEURS: Record<string, string> = {
  BILLD: "Échéance réglementaire",
  PUBLIQ: "BTP & artisans",
  STAYD: "Locations & conciergeries",
  COLLECT: "Cabinets comptables",
};

/* secteurs issus du brief projet (pegase-brief-projet.md) — pas de promesse */
const UPCOMING = [
  { name: "PRICEBOOK", secteur: "Base prix BTP" },
  { name: "CARGO", secteur: "Prévision import" },
  { name: "BOOKD", secteur: "Réservations activités" },
  { name: "ENTRY", secteur: "Billetterie WhatsApp" },
];

/* ——— compte à rebours réglementaire (vraie date, jamais en dur) ——— */
function useCountdown() {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date("2026-09-01T00:00:00+02:00").getTime();
    const compute = () =>
      setDays(Math.max(0, Math.ceil((target - Date.now()) / 86_400_000)));
    compute();
    const t = setInterval(compute, 3_600_000);
    return () => clearInterval(t);
  }, []);
  return days;
}

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

/* ——— visuel BILLD : les 3 étapes de mise en conformité ——— */
function EtapesBilld({ active, reduced }: { active: boolean; reduced: boolean }) {
  const steps = ["Factur-X", "portail public", "conforme"];
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-3 font-mono text-[13px] sm:text-[14px]">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-3">
          <span
            className={`rounded-md border px-3 py-1.5 transition-all duration-500 ${
              i === 2 ? "font-medium" : ""
            }`}
            style={{
              borderColor: i === 2 ? `${OR}66` : "rgba(255,255,255,0.12)",
              color: i === 2 ? OR : "rgba(255,255,255,0.65)",
              background: i === 2 ? `${OR}12` : "transparent",
              opacity: reduced || active ? 1 : 0,
              transform: reduced || active ? "none" : "translateY(6px)",
              transitionDelay: reduced ? "0ms" : `${i * 140}ms`,
            }}
          >
            {i === 2 ? "✓ conforme" : s}
          </span>
          {i < 2 && <span className="text-white/30">→</span>}
        </span>
      ))}
    </div>
  );
}

/* ——— visuel PUBLIQ : le flux d'appels d'offres (mini-terminal) ——— */
const AOS = [
  "AO-114 · Rénovation groupe scolaire — Basse-Terre",
  "AO-097 · Voirie communale — Le Moule",
  "AO-121 · Réseau EP — Sainte-Anne",
  "AO-132 · Extension cantine — Petit-Bourg",
  "AO-108 · Éclairage public — Baie-Mahault",
];
const LINE_H = 34;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function BadgeDossier({ pop }: { pop: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (pop)
      ref.current?.animate(
        [
          { transform: "scale(0.55)", opacity: 0 },
          { transform: "scale(1.1)", opacity: 1, offset: 0.7 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 420, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
      );
  }, [pop]);
  return (
    <span
      ref={ref}
      className="ml-auto shrink-0 whitespace-nowrap rounded-full border border-sky/40 bg-sky/10 px-2 py-0.5 text-[10px] font-medium text-sky"
    >
      ✓ dossier préparé
    </span>
  );
}

function FluxAO({ reduced }: { reduced: boolean }) {
  const [off, setOff] = useState(0);
  const [instant, setInstant] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const offRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      setPicked(1);
      return;
    }
    let alive = true;
    (async () => {
      let step = 0;
      await sleep(900);
      while (alive) {
        step++;
        if (step % 3 === 0) {
          setPicked(offRef.current + 1);
          await sleep(2100);
          if (!alive) break;
          setPicked(null);
          await sleep(500);
        }
        if (!alive) break;
        const next = offRef.current + 1;
        offRef.current = next;
        setOff(next);
        if (next >= AOS.length) {
          await sleep(760);
          if (!alive) break;
          setInstant(true);
          offRef.current = 0;
          setOff(0);
          await sleep(40);
          setInstant(false);
        }
        await sleep(1900);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reduced]);

  const lines = [...AOS, ...AOS];
  return (
    <div
      aria-hidden
      className="relative w-full max-w-[440px] overflow-hidden rounded-xl border border-white/[0.07] bg-[#07080b] px-3.5 py-2.5"
      style={{ height: 150 }}
    >
      <div
        className="font-mono"
        style={{
          transform: `translateY(${-off * LINE_H}px)`,
          transition: instant || reduced ? "none" : "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {lines.map((l, i) => {
          const isPicked = picked !== null && i === picked;
          const dim = picked !== null && !isPicked;
          const [id, ...rest] = l.split(" · ");
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-md px-2 text-[11.5px] transition-[opacity,background-color] duration-400 ${
                isPicked ? "bg-sky/[0.12]" : ""
              }`}
              style={{ height: LINE_H, opacity: dim ? 0.32 : 1 }}
            >
              <span className={isPicked ? "text-sky" : "text-sky/60"}>{id}</span>
              <span className={`truncate ${isPicked ? "text-white" : "text-white/55"}`}>
                {rest.join(" · ")}
              </span>
              {isPicked && <BadgeDossier pop={!reduced} />}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#07080b] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#07080b] to-transparent" />
    </div>
  );
}

/* ——— visuel STAYD : les nuits se remplissent à l'ouverture ——— */
function Calendrier({ active, reduced }: { active: boolean; reduced: boolean }) {
  const seed = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0];
  const on = active || reduced;
  return (
    <div aria-hidden className="grid w-fit grid-cols-7 gap-[6px]">
      {seed.map((filled, i) => (
        <span
          key={i}
          className={`h-[16px] w-[16px] rounded-[4px] transition-colors duration-300 ${
            filled ? "bg-sky/70" : on ? "bg-sky/50" : "bg-white/10"
          }`}
          style={{
            transitionDelay:
              filled || reduced ? "0ms" : `${(i % 7) * 60 + Math.floor(i / 7) * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ——— visuel COLLECT : les calques marque blanche glissent à l'ouverture ——— */
function Calques({ active, reduced }: { active: boolean; reduced: boolean }) {
  const slid = active || reduced;
  return (
    <div aria-hidden className="relative h-28 w-40">
      <div
        className="absolute inset-x-2 bottom-0 top-6 rounded-lg border border-sky/40 bg-sky/15 transition-transform duration-500 ease-out"
        style={{ transform: slid ? "translate(12px, 8px)" : "none" }}
      >
        <span className="absolute bottom-2 right-3.5 text-[11px] font-medium tracking-wide text-sky/80">
          OMEGA
        </span>
      </div>
      <div
        className="absolute inset-x-0 bottom-4 top-0 rounded-lg border border-white/25 bg-white/90 transition-transform duration-500 ease-out"
        style={{ transform: slid ? "translate(-12px, -8px)" : "none" }}
      >
        <span className="absolute left-3.5 top-2.5 text-[11px] font-semibold tracking-wide text-black/80">
          CABINET
        </span>
      </div>
    </div>
  );
}

/* ——— grille stricte partagée par TOUTES les rangées (alignement au pixel) :
   [numéro | nom+secteur | méta | flèche] — la colonne méta existe partout
   (vide sauf BILLD) pour que le J-XX ne torde jamais la mise en page ——— */
const ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_1.75rem] items-baseline gap-x-3 " +
  "sm:grid-cols-[3.5rem_minmax(0,1fr)_10rem_2.5rem] sm:gap-x-6";

/* hairline 1px avec fondu aux extrémités — plus de ligne plate */
function Hairline() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 h-px"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 12%, rgba(255,255,255,0.08) 88%, transparent)",
      }}
    />
  );
}

/* flèche SVG fine, stroke 1.5 — glisse et pivote vers l'extérieur au survol */
function Fleche({ open, reduced }: { open: boolean; reduced: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block translate-y-[2px]"
      style={{
        transform: open && !reduced ? "translate(6px, 2px) rotate(-45deg)" : "translateY(2px)",
        transition: reduced ? "none" : `transform ${open ? 300 : 500}ms ease-out`,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12h15M13 6l6 6-6 6"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function IndexRow({
  idx,
  system,
  job,
  benefit,
  open,
  reduced,
  countdown,
  onToggle,
  onEnter,
  onLeave,
}: {
  idx: number;
  system: string;
  job: string;
  benefit: string;
  open: boolean;
  reduced: boolean;
  countdown: number | null;
  onToggle: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const isBilld = system === "BILLD";
  const washColor = isBilld ? OR_RGB : SKY;
  const accent = isBilld ? OR : `rgb(${SKY})`;
  /* entrée 300ms, sortie 500ms — jamais sec */
  const dur = open ? 300 : 500;
  const visual =
    system === "PUBLIQ" ? (
      <FluxAO reduced={reduced} />
    ) : system === "STAYD" ? (
      <Calendrier active={open} reduced={reduced} />
    ) : system === "COLLECT" ? (
      <Calques active={open} reduced={reduced} />
    ) : (
      <EtapesBilld active={open} reduced={reduced} />
    );

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Hairline />
      {/* wash — un souffle d'accent, pas un surlignage */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(90deg, rgba(${washColor}, 0.04), rgba(${washColor}, 0.015) 45%, transparent 75%)`,
          opacity: open ? 1 : 0,
          transform: open ? "translateX(0)" : "translateX(-18%)",
          transition: reduced ? "none" : `opacity ${dur}ms ease-out, transform ${dur}ms ease-out`,
        }}
      />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`pepite-${system}`}
        onClick={onToggle}
        className={`relative w-full px-6 py-[22px] text-left sm:px-10 sm:py-[30px] ${ROW_GRID}`}
      >
        {/* numéro — baseline du nom, accent famille au survol */}
        <span
          className="num text-[13px]"
          style={{
            color: open ? accent : "rgba(255,255,255,0.25)",
            transition: reduced ? "none" : `color ${dur}ms ease-out`,
          }}
        >
          {String(idx + 1).padStart(2, "0")}
        </span>
        {/* nom — light, blanc pur au repos, métal en révélation au survol */}
        <span className="min-w-0">
          <span className="relative block w-fit max-w-full">
            <span
              className="block truncate text-[36px] font-light leading-none tracking-[-0.04em] text-white sm:text-[64px]"
              style={{
                opacity: open ? 0 : 1,
                transform: open && !reduced ? "translateX(8px)" : "none",
                transition: reduced ? "none" : `opacity ${dur}ms ease-out, transform ${dur}ms ease-out`,
              }}
            >
              {system}
            </span>
            <span
              aria-hidden
              className="metal-text absolute inset-0 block truncate text-[36px] font-light leading-none tracking-[-0.04em] sm:text-[64px]"
              style={{
                opacity: open ? 1 : 0,
                transform: open && !reduced ? "translateX(8px)" : "none",
                transition: reduced ? "none" : `opacity ${dur}ms ease-out, transform ${dur}ms ease-out`,
              }}
            >
              {system}
            </span>
          </span>
          <span
            className="mt-[10px] block font-mono text-[11px] uppercase tracking-[0.14em]"
            style={{ color: isBilld ? `${OR}B8` : "rgba(255,255,255,0.35)" }}
          >
            {SECTEURS[system]}
          </span>
        </span>
        {/* méta — présente sur toutes les rangées, remplie sur BILLD seule */}
        <span className="text-right">
          {isBilld && (
            <>
              <span className="num block text-[24px] font-medium leading-none sm:text-[32px]" style={{ color: OR }}>
                J-{countdown === null ? "··" : countdown}
              </span>
              <span className="num mt-1.5 block text-[11px] tracking-wide text-white/40">
                1ᵉʳ sept. 2026
              </span>
            </>
          )}
        </span>
        <Fleche open={open} reduced={reduced} />
      </button>
      {/* expansion — même easing que le hero [0.16,1,0.3,1], 400ms */}
      <div
        id={`pepite-${system}`}
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: reduced ? "none" : "grid-template-rows 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          {/* contenu en fondu décalé de 80ms après l'ouverture */}
          <div
            className="flex flex-col gap-8 px-6 pb-10 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-14 sm:px-10 sm:pb-12 sm:pl-[calc(3.5rem+1.5rem+2.5rem)]"
            style={{
              opacity: open ? 1 : 0,
              transform: open || reduced ? "none" : "translateY(8px)",
              transition: reduced
                ? "none"
                : open
                  ? "opacity 350ms ease-out 80ms, transform 350ms ease-out 80ms"
                  : "opacity 200ms ease-out",
            }}
          >
            <div className="max-w-xl">
              <p className="text-[15px] leading-relaxed text-muted">{job}</p>
              <p className="mt-4 flex gap-2.5 text-[14px] font-medium leading-snug text-white/90">
                <span
                  aria-hidden
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                  style={{ background: accent }}
                />
                {benefit}
              </p>
              <Link
                href={`/offres/${system.toLowerCase()}`}
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-white/40 transition-colors hover:text-sky"
              >
                <span aria-hidden>→</span> découvrir
              </Link>
            </div>
            <div className="shrink-0 sm:pt-1">{visual}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— section ——— */

export default function PepitesSection({
  famille,
  mockup,
}: {
  famille: Famille;
  mockup: React.ReactNode;
}) {
  const days = useCountdown();
  const reduced = useReduced();
  const [open, setOpen] = useState<number | null>(null);
  const [fine, setFine] = useState(false);
  useEffect(() => {
    setFine(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const quote = famille.proof.type === "quote" ? famille.proof.text : "";

  return (
    <section className="border-b border-line-soft">
      {/* ——— header : eyebrow + titre + ligne manifeste + CTA unique ——— */}
      <div className="px-6 pb-12 pt-16 sm:px-10 sm:pb-16 sm:pt-36">
        <Reveal>
          <div className="text-[17px] font-medium text-sky">{famille.tag}</div>
        </Reveal>
        <Reveal delay={90}>
          <h2 className="mt-5 max-w-2xl text-[27px] font-medium leading-[1.14] tracking-[-0.03em] text-white sm:text-[46px]">
            {famille.title1}
            <br />
            {famille.title2}
          </h2>
        </Reveal>
        <Reveal delay={180}>
          <p className="mt-7 max-w-3xl border-l-2 border-sky pl-6 text-[19px] font-medium leading-snug text-white sm:text-[24px]">
            {quote}
          </p>
        </Reveal>
        <Reveal delay={270}>
          <Link
            href="/reserver-un-audit"
            className="mt-8 inline-block rounded-[var(--radius-btn)] bg-white px-7 py-3.5 text-[16px] font-semibold text-black transition hover:bg-neutral-200 active:scale-[0.98]"
          >
            Réserver l&apos;audit gratuit
          </Link>
        </Reveal>
      </div>

      {/* ——— mockup BILLD Factur-X — wrapper identique à FeatureSection,
          il ne bouge pas ——— */}
      <div className="glow-band border-y border-line-soft px-4 py-10 sm:px-16 sm:py-14">
        <Reveal y={36} scale={0.97}>
          {mockup}
        </Reveal>
      </div>

      {/* ——— L'INDEX : 4 rangées ouvrables + la suite de la collection ——— */}
      <div className="pb-14 pt-6 sm:pt-10">
        {famille.moteurs.map((m, i) => (
          <IndexRow
            key={m.system}
            idx={i}
            system={m.system}
            job={m.job}
            benefit={m.benefit}
            open={open === i}
            reduced={reduced}
            countdown={days}
            onToggle={() => setOpen((v) => (v === i ? null : i))}
            onEnter={() => fine && setOpen(i)}
            onLeave={() => fine && setOpen(null)}
          />
        ))}
        {/* en préparation — notes de bas de page, même grille, non ouvrables */}
        {UPCOMING.map((u, i) => (
          <div key={u.name} className={`relative px-6 py-4 sm:px-10 ${ROW_GRID}`}>
            <Hairline />
            <span className="num text-[12px] text-white/20">
              {String(i + 5).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="num text-[15px] text-white/30">{u.name}</span>
              <span className="ml-4 hidden font-mono text-[10px] uppercase tracking-[0.14em] text-white/20 sm:inline">
                {u.secteur}
              </span>
            </span>
            <span className="whitespace-nowrap text-right font-mono text-[10px] lowercase italic text-white/20">
              <span aria-hidden className="mr-1.5 inline-block h-[3px] w-[3px] rounded-full bg-white/20 align-middle" />
              en préparation
            </span>
            <span />
          </div>
        ))}
      </div>
    </section>
  );
}
