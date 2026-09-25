import { BookOpenCheck, Globe, LockKeyhole, ScrollText } from "lucide-react";
import CarteBlanche from "./CarteBlanche";
import Apparait from "./Apparait";
import { AUDIT, ENSEIGNES, SECURITE } from "./textes";

/* ══ 3 · LA CARTE BLANCHE : sécurité, puis enseignes ══════════════════
   Balisage de la référence (« Security for critical operations. » puis
   « Solutions designed for your organization. »), relevé hydraté.
   Leurs pastilles de certification (images SOC 2, HIPAA…) deviennent des
   pictogrammes au trait dans un anneau, même taille (48 / 56 px) ; leur
   carte vert sombre (#2c3827) devient le jade de la page. Les cartes
   montrent des enseignes françaises (25/09, voir textes.ts) : photos
   Wikimedia Commons sans le zoom ×1,25 de la référence, qui coupait les
   logos, et cadrées une à une ; crédits sous les cartes.
   Sur la carte, au survol : le voile floute, la pastille s'efface et le nom
   reste seul au centre — comme chez eux. */
const ICONES = [BookOpenCheck, Globe, LockKeyhole, ScrollText];

function Anneau({ Icone }: { Icone: (typeof ICONES)[number] }) {
  return (
    <span className="grid place-items-center h-12 w-12 lg:h-14 lg:w-14 shrink-0 rounded-full border border-white/35">
      <Icone className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={1.5} aria-hidden />
    </span>
  );
}

export default function Securite() {
  return (
    <div
      data-header-theme="blue"
      className="bg-[var(--nm-bande-2)]"
      style={{ background: "linear-gradient(to bottom, transparent 24px, var(--nm-bande) 24px, var(--nm-bande-2) 60%)" }}
    >
      <div>
        <CarteBlanche className="overflow-clip rounded-t-[24px] rounded-b-[24px] -mt-6">
          <section aria-label="Sécurité et hébergement des données" className="w-full nm-px-edge py-12 lg:py-16 text-[var(--nm-noir)]">
            <div className="mx-auto max-w-[1392px]">
              <h2 className="nm-type-h1 mb-8">{SECURITE.titre}</h2>
              <div className="grid grid-cols-2 gap-y-8 text-white lg:grid-cols-4 rounded-[24px] bg-[var(--nm-sombre)] py-8">
                {SECURITE.cartes.map((c, i) => (
                  <article
                    key={c.titre}
                    className="flex min-w-0 flex-col border-white/25 px-4 even:border-l sm:px-6 lg:border-l lg:px-8 lg:first:border-l-0"
                  >
                    <div className="flex items-center gap-2 lg:gap-3 mb-4 h-12 lg:h-14">
                      <Anneau Icone={ICONES[i]} />
                    </div>
                    <h3 className="nm-serif text-[22px] lg:text-[26px]">{c.titre}</h3>
                    <p className="mt-2 text-xs font-medium text-white/90 lg:text-sm">{c.sous}</p>
                  </article>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
                  <h3 className="nm-type-mono text-[var(--nm-g6)]">{SECURITE.surDemande}</h3>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Sur demande">
                    {SECURITE.options.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
                <a
                  className="inline-flex min-h-11 items-center gap-2 self-start text-sm underline underline-offset-4 lg:shrink-0"
                  href="/vos-donnees"
                >
                  {SECURITE.lien}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 7h10v10" />
                    <path d="M7 17 17 7" />
                  </svg>
                </a>
              </div>
            </div>
          </section>

          <section className="nm-section-py overflow-hidden">
            <Apparait>
              <h2 className="nm-type-h2 text-[var(--nm-noir)] text-center mb-12 lg:mb-16 px-16 lg:px-6">{ENSEIGNES.titre}</h2>
            </Apparait>
            <Apparait effet="fondu" className="mx-auto max-w-[1392px] nm-px-edge grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {ENSEIGNES.cartes.map((c) => (
                <a key={c.nom} className="nm-enseigne block min-w-0" href={AUDIT}>
                  <div
                    className="relative overflow-hidden cursor-pointer shrink-0 bg-[var(--nm-g2)] rounded-[20px] border border-[var(--nm-g2)]"
                    style={{ width: "100%", aspectRatio: "360 / 500" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`Magasin ${c.nom}, ${c.secteur.toLowerCase()}`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: c.cadrage, transform: `scale(${c.zoom})`, transformOrigin: "50% 100%" }}
                      src={c.image}
                    />
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="nm-enseigne__voile absolute inset-0 rounded-[20px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="nm-enseigne__pastille backdrop-blur-[35px] rounded-[7px] h-[42px] flex items-center px-4 transition-opacity duration-300"
                        style={{ background: "linear-gradient(to right, rgba(177,177,174,0.4), rgba(225,225,222,0.4))" }}
                      >
                        <span className="nm-type-body text-white whitespace-nowrap">{c.nom}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="nm-enseigne__nom nm-type-body text-white whitespace-nowrap transition-opacity duration-300 opacity-0">
                        {c.nom}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </Apparait>
            <Apparait effet="fondu">
              <p className="text-center mt-8 nm-type-body text-[var(--nm-g6)] nm-px-edge">
                {ENSEIGNES.pied}
                <br className="lg:hidden" />
                <span className="hidden lg:inline"> </span>
                <a className="nm-text-body-sm underline hover:text-[var(--nm-noir)] transition-colors" href={AUDIT}>
                  {ENSEIGNES.lien}
                </a>
              </p>
              <p className="text-center mt-3 nm-px-edge text-[11px] leading-[1.4] text-[var(--nm-g4)]">{ENSEIGNES.mention}</p>
            </Apparait>
          </section>
        </CarteBlanche>
      </div>
    </div>
  );
}
