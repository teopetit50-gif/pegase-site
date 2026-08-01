"use client";

/* /solutions v4 — charte v2 : ALTERNANCE SOMBRE/CLAIR façon Qonto.
   - « PROTÉGER » : MONDE CLAIR (#f4f1ec) — tuiles BLANCHES à ombre douce et
     dégradé radial subtil (carte-claire), mockups en cadres SOMBRES posés
     dessus (le pop des captures Qonto : téléphone noir sur carte blanche).
   - TUILE AUDIT : désormais SOMBRE (noir + or) posée dans le bento clair —
     l'accent inversé dans le bon sens (les tuiles noires de Qonto).
   - « FAIRE RENTRER » : section d'accent SOMBRE — pin horizontal GSAP
     conservé tel quel (tuiles #12151c, barre de progression or).
   Textes sur clair : #0f1013 / #52555c, or texte #8a6519 (AA), flèche
   cerclée noire sur blanc. Interdits NOTES-DESIGN toujours en vigueur. */

import Link from "next/link";
import { useState, useEffect } from "react";
import Fondu from "./Fondu";
import { FAMILLES } from "@/lib/content";
import { FICHES } from "@/lib/fiches";
import {
  VFacture,
  VChat,
  VTableur,
  VFiche,
  PhoneFrame,
  CHAT_JOUR,
} from "./vignettes";

const OR = "#e0b341";

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

/* titre court = le titre produit existant, sans le nom système */
function titre(system: string) {
  const all = FAMILLES.flatMap((f) => f.moteurs);
  const m = all.find((x) => x.system === system);
  if (!m) return system;
  const t = m.title.startsWith(m.system)
    ? m.title.slice(m.system.length).replace(/^\s*—\s*/, "")
    : m.title;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ——— flèche cerclée — l'affordance systématique (44px, se remplit) ——— */
function FlecheCerclee({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid h-11 w-11 place-items-center rounded-full border transition-colors duration-200 ${
        light
          ? "border-black/15 group-hover:border-black group-hover:bg-black"
          : "border-white/15 group-hover:border-white group-hover:bg-white"
      } ${className}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 17L17 7M9 7h8v8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-colors duration-200 ${
            light
              ? "stroke-black/55 group-hover:stroke-[#f4f1ec]"
              : "stroke-white/60 group-hover:stroke-black"
          }`}
        />
      </svg>
    </span>
  );
}

/* ——— tuile blanche du monde clair ——— */
function Tuile({
  system,
  className = "",
  children,
  centre = false,
}: {
  system: string;
  className?: string;
  children: React.ReactNode;
  centre?: boolean;
}) {
  const fiche = FICHES[system];
  return (
    <Link
      href={`/offres/${system.toLowerCase()}`}
      className={`carte-claire group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] p-8 transition-transform duration-300 hover:-translate-y-1 sm:p-10 ${className}`}
    >
      <FlecheCerclee light className="absolute right-6 top-6" />
      <div className="pr-14">
        <div className="text-[23px] font-medium leading-snug tracking-[-0.02em] text-[#0f1013] sm:text-[27px]">
          {titre(system)}
        </div>
        <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-[#52555c]">{fiche?.pitch}</p>
        <div className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-black/40">
          {system}
        </div>
      </div>
      <div className={`mt-9 flex flex-1 ${centre ? "items-center justify-center" : "items-end"}`}>
        {children}
      </div>
    </Link>
  );
}

/* ——— intertitre court — blur-in une fois (SolutionsMotion) ——— */
function Intertitre({ label, clair = false }: { label: string; clair?: boolean }) {
  return (
    <div data-intertitre className="flex items-center gap-4 pb-6 pt-12 first:pt-0">
      <span
        className={`font-mono text-[12px] uppercase tracking-[0.18em] ${
          clair ? "text-black/45" : "text-white/40"
        }`}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{
          background: clair
            ? "linear-gradient(90deg, rgba(15,16,19,0.12), transparent)"
            : "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </div>
  );
}

/* ——— B. FAIRE RENTRER — REVIVE seul (offre resserrée 21/07) ——— */

function SlideRevive({ reduced }: { reduced: boolean }) {
  return (
    <Link
      href="/offres/revive"
      className="group relative grid w-full content-center gap-9 overflow-hidden rounded-[var(--radius-card)] border border-white/[0.08] bg-[#12151c] p-8 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors duration-300 hover:bg-[#161a23] sm:p-12 lg:grid-cols-2 lg:items-center lg:gap-14"
    >
      <FlecheCerclee className="absolute right-6 top-6" />
      <div className="pr-14">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: OR }}>
          réveiller
        </div>
        <div className="mt-4 text-[26px] font-medium leading-snug tracking-[-0.02em] text-white sm:text-[32px]">
          {titre("REVIVE")}
        </div>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/55">
          {FICHES.REVIVE?.pitch}
        </p>
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white/30">
          REVIVE
        </div>
      </div>
      <div className="flex justify-center lg:justify-end">
        <VFiche reduced={reduced} />
      </div>
    </Link>
  );
}

/* ——— la page-bento : clair (Protéger) puis sombre (Faire rentrer) ——— */

export default function SolutionsBento() {
  const reduced = useReduced();

  return (
    <>
      {/* ——— A. PROTÉGER — MONDE CLAIR ——— */}
      <section data-monde="clair" className="monde-clair px-4 pb-20 pt-6 sm:px-8 lg:px-10">
        <Intertitre clair label="Protéger" />
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          {/* PAYD — pleine largeur, la facture (cadre sombre) en grand */}
          <div className="order-1 lg:order-none lg:col-span-2" data-reveal>
            <Link
              href="/offres/payd"
              className="carte-claire group relative grid gap-10 overflow-hidden rounded-[var(--radius-card)] p-8 transition-transform duration-300 hover:-translate-y-1 sm:p-12 lg:grid-cols-2 lg:items-center"
            >
              <FlecheCerclee light className="absolute right-6 top-6" />
              <div className="pr-14">
                <div className="text-[27px] font-medium leading-snug tracking-[-0.02em] text-[#0f1013] sm:text-[34px]">
                  {titre("PAYD")}
                </div>
                <p className="mt-2.5 max-w-md text-[15.5px] leading-relaxed text-[#52555c]">
                  {FICHES.PAYD?.pitch}
                </p>
                <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-black/40">
                  PAYD
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <VFacture reduced={reduced} big />
              </div>
            </Link>
          </div>

          {/* ANSWR — grande tuile blanche, téléphone NOIR posé dessus */}
          <div className="order-2 lg:order-none" data-reveal>
            <Tuile system="ANSWR" className="h-full" centre>
              <PhoneFrame>
                <VChat reduced={reduced} bulles={CHAT_JOUR} />
              </PhoneFrame>
            </Tuile>
          </div>

          {/* OFFLOAD — face au téléphone */}
          <div className="order-4 lg:order-none" data-reveal>
            <Tuile system="OFFLOAD" className="h-full">
              <VTableur reduced={reduced} />
            </Tuile>
          </div>

          {/* ——— L'ACCENT INVERSÉ — tuile AUDIT SOMBRE posée dans le clair ——— */}
          <div className="order-3 lg:order-none lg:col-span-2" data-claire>
            <div className="group relative overflow-hidden rounded-[var(--radius-card)] border border-white/[0.08] bg-[#0e1116] p-9 shadow-[0_28px_56px_-20px_rgba(15,16,19,0.45)] sm:p-12">
              <div aria-hidden className="absolute right-0 top-0 h-full w-1.5" style={{ background: OR }} />
              <div className="max-w-2xl">
                <div className="text-[28px] font-medium leading-snug tracking-[-0.02em] text-white sm:text-[36px]">
                  Par lequel commencer ?
                </div>
                <p className="mt-2.5 text-[17px] leading-relaxed text-white/60">
                  30 minutes. Un chiffre précis.
                </p>
                <Link
                  href="/reserver-un-audit"
                  className="cta-shine mt-8 inline-block rounded-[var(--radius-btn)] bg-white px-7 py-3.5 text-[15px] font-semibold text-black transition-transform duration-150 hover:bg-neutral-200 active:scale-[0.97]"
                >
                  Réserver l&apos;audit gratuit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— B. FAIRE RENTRER — SECTION D'ACCENT SOMBRE (pin conservé) ——— */}
      <Fondu vers="sombre" />
      <section className="bg-black px-4 pb-20 pt-6 sm:px-8 lg:px-10">
        <Intertitre label="Faire rentrer" />
        <div data-reveal>
          <SlideRevive reduced={reduced} />
        </div>
      </section>
    </>
  );
}
