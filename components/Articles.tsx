import Link from "next/link";
import Reveal from "./Reveal";
import { POSTS } from "@/lib/content";

/* « Aller plus loin » — v2 index de presse (21/07, choix laissé à JARVIS) :
   l'ancienne grille 2 colonnes à pavés remplacée par un index éditorial
   pleine largeur, le langage validé du site : header aligné à gauche
   (label mono + titre Qonto), rangées sur filets fins en grille stricte
   [méta mono | titre + extrait | flèche], flèche qui glisse et pivote au
   survol, rangée entière cliquable. Zéro avatar, zéro pavé. */

export default function Articles() {
  return (
    <section className="border-b border-line-soft">
      <div className="px-6 pb-6 pt-16 sm:px-10 sm:pb-10 sm:pt-28">
        <Reveal>
          <div className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/40">
            <span aria-hidden className="h-1.5 w-1.5 rounded-[2px] bg-gold" />
            Le journal
          </div>
          <h2 className="mt-5 text-[28px] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[44px]">
            Aller plus loin.
          </h2>
        </Reveal>
      </div>

      <div className="px-6 pb-16 sm:px-10 sm:pb-24">
        {POSTS.map((p, idx) => (
          <Reveal key={p.slug} delay={idx * 90}>
            <article
              className={`group border-t transition-colors hover:bg-white/[0.02] ${
                idx === 0 ? "border-white/[0.14]" : "border-line-soft"
              }`}
            >
              <Link
                href={`/blog/${p.slug}`}
                className="grid gap-3 py-9 sm:py-11 lg:grid-cols-[11rem_1fr_3.5rem] lg:items-start lg:gap-8"
              >
                {/* méta — date + catégorie, colonne mono */}
                <div className="flex items-baseline gap-3 lg:block">
                  <div className="num text-[13px] text-white/40">{p.date}</div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold/80 lg:mt-2">
                    {p.cat}
                  </div>
                </div>

                {/* titre + extrait */}
                <div>
                  <h3 className="max-w-2xl text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-white transition-colors duration-300 sm:text-[30px]">
                    {p.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-[15px] leading-[1.75] text-muted">
                    {p.excerpt}
                  </p>
                  <div className="mt-4 text-[13px] text-white/40">{p.author}</div>
                </div>

                {/* flèche — glisse et pivote vers ↗ au survol */}
                <div className="hidden lg:flex lg:justify-end lg:pt-2">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="text-white/35 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:-rotate-45 group-hover:translate-x-1 group-hover:text-white"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            </article>
          </Reveal>
        ))}
        <div aria-hidden className="border-t border-line-soft" />
      </div>
    </section>
  );
}
