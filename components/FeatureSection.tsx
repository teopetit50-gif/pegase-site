import Link from "next/link";
import { siClaude, siNvidia, siAmd } from "simple-icons";
import Reveal from "./Reveal";
import MotorCard from "./MotorCard";
import type { Famille } from "@/lib/content";

/* Les totems 3D sont retirés (gemme 20/07, pièce puis flèche 21/07) — la
   colonne preuve des offensifs porte une tuile sombre façon Qonto
   (pill + titre + lien ↗ + panneau d'icônes outils, glyphes neutres). */

/* Charte v2 : sections familles en MONDE CLAIR. Les accents texte sont
   assombris pour tenir AA sur #f4f1ec (les couleurs vives restent pour les
   éléments graphiques : ticks, bordures de citation, logos). */
const ACCENT: Record<
  string,
  { texte: string; tick: string; quoteBorder: string; logo: string }
> = {
  "text-gold": { texte: "#b45309", tick: "bg-gold", quoteBorder: "border-gold", logo: "text-gold" },
  "text-mint": { texte: "#047857", tick: "bg-mint", quoteBorder: "border-mint", logo: "text-mint" },
  "text-sky": { texte: "#0369a1", tick: "bg-sky", quoteBorder: "border-sky", logo: "text-sky" },
};

export default function FeatureSection({
  famille,
  mockup,
}: {
  famille: Famille;
  mockup: React.ReactNode;
}) {
  const { tag, accent, title1, title2, desc, proof, moteurs, id } = famille;
  const ac = ACCENT[accent] ?? ACCENT["text-gold"];

  return (
    <section data-monde="clair" className="monde-clair">
      {/* header — 2 colonnes desktop : pitch à gauche, bloc preuve à droite */}
      <div className="grid gap-12 px-6 pb-10 pt-10 sm:px-10 sm:pb-14 sm:pt-16 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
        <div>
          <Reveal>
            <div className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-black/50">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-[2px] ${ac.tick}`} />
              {tag}
            </div>
          </Reveal>
          <Reveal delay={90}>
            <h2 className="mt-5 max-w-2xl text-[28px] font-bold leading-[1.08] tracking-[-0.025em] text-[#0f1013] sm:text-[48px]">
              {title1}
              <br />
              {title2}
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#52555c] sm:text-lg">
              {desc}
            </p>
          </Reveal>
          <Reveal delay={270}>
            {/* CTA unique du site — pilule noire sur monde clair */}
            <Link
              href="/reserver-un-audit"
              className="mt-8 inline-block rounded-[var(--radius-btn)] bg-black px-7 py-3.5 text-[16px] font-semibold text-[#f4f1ec] transition hover:bg-black/85 active:scale-[0.97] shadow-[0_0_46px_-2px_rgba(15,16,19,0.55),0_14px_30px_-8px_rgba(15,16,19,0.42)]"
            >
              Réserver l&apos;audit gratuit
            </Link>
          </Reveal>
        </div>

        {/* bloc preuve : chiffres du problème sourcés, ou formulation forte */}
        <Reveal delay={200} className="self-center">
          {id === "offensifs" && (
            <div className="mb-8 w-full">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.07] px-3 py-1 text-[11px] font-medium tracking-wide text-black/60">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-black/50" />
                SOUS LE CAPOT
              </span>
              <div className="mt-4 text-[22px] font-bold leading-snug tracking-[-0.02em] text-[#0f1013] sm:text-[25px]">
                Des modèles d&apos;IA sur votre propre machine
              </div>
              <Link
                href="/offres"
                className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium text-black/60 transition hover:text-black"
              >
                Découvrir les moteurs
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              {/* le panneau gris seul, étincelle or en continu sur sa bordure */}
              <div className="border-beam mt-6 rounded-[12px] bg-black px-7 py-4 shadow-[0_0_110px_-8px_rgba(15,16,19,0.55),0_0_44px_-6px_rgba(15,16,19,0.35),0_22px_56px_-16px_rgba(15,16,19,0.4)] ring-1 ring-white/[0.06]">
                <div className="flex items-center justify-between gap-4 sm:gap-6">
                  <span className="grid h-[46px] w-[46px] place-items-center rounded-[8px]" style={{ background: "#D97757" }}>
                    <svg width="25" height="25" viewBox="0 0 24 24" aria-label="Claude">
                      <path d={siClaude.path} fill="#ffffff" />
                    </svg>
                  </span>
                  <span className="grid h-[46px] w-[46px] place-items-center rounded-[8px] bg-white">
                    <svg width="27" height="27" viewBox="0 0 24 24" aria-label="NVIDIA">
                      <path d={siNvidia.path} fill="#76B900" />
                    </svg>
                  </span>
                  <span className="grid h-[46px] w-[46px] place-items-center rounded-[8px] bg-white">
                    <svg width="25" height="25" viewBox="0 0 24 24" aria-label="AMD">
                      <path d={siAmd.path} fill="#0f1013" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          )}
          {proof.type === "stats" ? (
            <div className="flex flex-col gap-8 lg:items-end lg:text-right">
              {proof.items.map((s) => (
                <div key={s.n}>
                  <div className="num text-[30px] font-medium leading-none text-[#0f1013] sm:text-[36px]">
                    {s.n}
                    {s.unit && (
                      <span
                        className="ml-1 text-[17px] sm:text-[20px]"
                        style={{ color: ac.texte }}
                      >
                        {s.unit}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 max-w-xs text-[14px] leading-snug text-[#52555c]">
                    {s.label}
                    {s.src && (
                      <span className="ml-1.5 whitespace-nowrap text-[12px] text-black/35">
                        ({s.src})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`border-l-2 ${ac.quoteBorder} pl-6`}>
              <p className="text-[20px] font-medium leading-snug text-[#0f1013] sm:text-[24px]">
                {proof.text}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[#52555c]">
                {proof.sub}
              </p>
            </div>
          )}
        </Reveal>
      </div>

      {/* mockup — objet sombre qui FLOTTE sur le clair : pas de bande ni de
          filets, une grande ombre douce fait la jonction entre les mondes */}
      <div className="px-4 py-12 sm:px-16 sm:py-16">
        <Reveal y={36} scale={0.97}>
          <div className="mx-auto max-w-[1100px]">{mockup}</div>
        </Reveal>
      </div>

      {/* 4 cartes moteurs signature — cartes blanches à ombre douce,
          scroll horizontal avec snap mobile */}
      {moteurs.length > 0 && (
      <div
        className={
          moteurs.length === 1
            ? "flex justify-center px-4 py-8 sm:px-8 sm:py-14"
            : moteurs.length === 3
              ? "flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 py-8 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-8 sm:py-14 lg:px-10"
              : "flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 py-8 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-8 sm:py-14 lg:grid-cols-4 lg:px-10"
        }
      >
        {moteurs.map((m, idx) => (
          <div key={m.system} className={moteurs.length === 1 ? "w-full max-w-[420px]" : "contents"}>
            <MotorCard moteur={m} accent={accent} idx={idx} />
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
