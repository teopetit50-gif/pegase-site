import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";

/* ══════════════════════════════════════════════════════════════════════
   LA PAGE D'ATTERRISSAGE D'UNE ANNONCE — 21/09/2026

   Une par accroche (lib/pub.ts), servie sous /p/<slug>. Règle de la
   stratégie (plans-et-decisions/strategie-acquisition-2026-09-21.md) :
   UNE accroche, UNE page courte, UN bouton. Le bouton mène au créneau de
   diagnostic (30 min, gratuit) : c'est l'événement « Schedule » du pixel
   qui juge la campagne, rien d'autre n'est compté.

   Monde clair .resa, mêmes classes que /contact — aucun CSS nouveau. Pas
   d'index : ces pages doublonnent les pages produit pour Google, elles
   ne vivent que derrière une annonce.

   Textes : aucun prix, aucune preuve sociale, aucun nom d'outil, aucun
   lieu (règle « produit français, jamais guadeloupéen »), et jamais le
   lecteur décrit par son défaut — on décrit ce qui arrive, pas ce qu'il
   rate.
   ══════════════════════════════════════════════════════════════════════ */

export type Accroche = {
  slug: string;
  kicker: string;
  titre: string;
  chapo: string;
  bouton: string;
  cePasse: { titre: string; texte: string }[];
  etapes: { titre: string; texte: string }[];
  note: string;
  produit?: { href: string; libelle: string };
};

export const LIEN_DIAGNOSTIC = "/reserver?formule=diagnostic";

export default function PagePub({ a }: { a: Accroche }) {
  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        {/* ═══ 1 — premier écran ═══ */}
        <section data-monde="clair" className="r-wrap pb-14 pt-14 sm:pb-20 sm:pt-24">
          <div data-arrivee="titre">
            <p className="ap-kicker">{a.kicker}</p>
            <h1 className="r-h1 mt-4 max-w-[18ch]">{a.titre}</h1>
          </div>
          <p data-arrivee="chapo" className="r-lead mt-5 max-w-[52ch]">
            {a.chapo}
          </p>
          <div data-arrivee="bloc" className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={LIEN_DIAGNOSTIC} className="r-btn r-btn--noir w-full sm:w-auto">
              {a.bouton}
            </Link>
            <p className="ap-note">30 minutes en visio, gratuit, sans engagement.</p>
          </div>
        </section>

        {/* ═══ 2 — ce qui se passe ═══ */}
        <div className="r-blanc">
          <section data-monde="clair" className="r-wrap py-14 sm:py-20">
            <h2 data-reveal className="r-h3 max-w-[18ch]">
              Ce qui se passe
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {a.cePasse.map((c, i) => (
                <article key={c.titre} data-reveal className="ap-carte">
                  <p className="ap-frise-num !mt-0">0{i + 1}</p>
                  <h3 className="r-h4 mt-3">{c.titre}</h3>
                  <p className="mt-3 text-[15px] leading-[24px] text-[#3d3d3d]">{c.texte}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ 3 — comment ça s'installe ═══ */}
        <section data-monde="clair" className="r-wrap py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[379px_1fr] lg:gap-16">
            <h2 data-reveal className="r-h3 lg:sticky lg:top-28 lg:self-start">
              Comment ça s&apos;installe
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {a.etapes.map((e, i) => (
                <div key={e.titre} data-reveal className="ap-frise">
                  <div className="ap-frise-filet" />
                  <p className="ap-frise-num">ÉTAPE {i + 1}</p>
                  <h3 className="ap-frise-titre">{e.titre}</h3>
                  <p className="ap-frise-texte">{e.texte}</p>
                </div>
              ))}
            </div>
          </div>
          <p data-reveal className="ap-note mt-10">
            {a.note}
          </p>
        </section>

        {/* ═══ 4 — le bouton, une seconde fois ═══ */}
        <section data-monde="clair" className="r-wrap pb-16 sm:pb-24">
          <div data-reveal className="ap-encart">
            <h2 className="r-h4">Voir ça sur votre cas</h2>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-[24px] text-[#3d3d3d]">
              Un créneau de 30 minutes en visio&nbsp;: vous décrivez votre quotidien, nous
              montrons ce que ça donne chez vous, et vous repartez avec un chiffre.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={LIEN_DIAGNOSTIC} className="r-btn r-btn--noir">
                {a.bouton}
              </Link>
              {a.produit && (
                <Link href={a.produit.href} className="r-btn r-btn--fil">
                  {a.produit.libelle}
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
