import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { lienReservation } from "@/lib/reservation";
import { CADRE, CLOTURE, COMPTEURS, HERO, PRINCIPES } from "@/lib/tarifs";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs — « Comment nous chiffrons » (v3, 13/08/2026)

   Reproduction de **scale.com/careers**, demandée par Teo le 13/08 en
   remplacement complet de la v2, qui reproduisait le template Flux
   `/about`. La v2 est partie en entier : son composant `Chiffrage.tsx` est
   supprimé, et son bloc `.tarifs` / `.t-` de globals.css avec.

   C'est la deuxième page du site tirée de scale.com — /vos-donnees
   reproduit déjà global-public-sector. Les deux partagent la police
   (Hanken Grotesk, substitut libre d'Aeonik) et l'échelle typographique ;
   le reste est propre à careers et vit dans le bloc `.tf` de globals.css,
   où le relevé au pixel est documenté.

   Correspondance section par section avec la référence :
     hero plein cadre, titre + chapô + bouton   → « Le prix sort de vos volumes »
     « IN THE NEWS » — 3 cartes de couleur      → les trois compteurs
     « OUR CREDOS » — 6 cartes grises           → ce que nous ne facturons jamais
     « OUR BENEFITS » — 4 blocs illustrés       → une fois / chaque mois / TIC
     CTA final plein cadre                      → « Savoir ce que ça donnerait »

   17/08 — DEUX SECTIONS TOMBÉES, sur demande de Teo, toutes deux pour
   redite. Cinq sections au lieu de sept : c'est un écart assumé avec la
   référence, pas un oubli de relevé.

     « WHY » (H2 centré + deux colonnes) — son premier paragraphe redisait
     le titre du hero (le barème est un chiffre promis), le deuxième
     énumérait les trois compteurs que les cartes juste au-dessus venaient
     de poser, le reste tombait dans le principe « pas de prix par
     utilisateur ». Ses deux seules phrases propres — le calcul vérifiable
     dans la proposition, et « la recommandation peut être de ne rien
     installer » — sont remontées en chapô des compteurs.

     « OPEN POSITIONS » (filtres + liste repliable) — elle listait les six
     postes avec leurs outils, ce que /offres et /integrations font déjà,
     et son ancre `#devis` n'était visée par aucun lien du site. Son
     composant client `components/tarifs/Postes.tsx` est supprimé avec
     elle, et le bloc `.tf-barre` / `.tf-liste` de globals.css avec.

   LA RÈGLE QUI SURVIT À LA REFONTE, et qui prime sur la ressemblance :
   AUCUN MONTANT sur cette page. Le prix Omega se déduit des volumes
   mesurés à l'audit, pas d'un barème. La seule exception est le taux du
   Chèque TIC (40 à 80 %, plafond 10 000 €), qui est celui de la Région
   Guadeloupe — public, vérifiable, et il ne nous engage sur rien. Le
   détail est en tête de `lib/tarifs.ts`.

   Ce que la référence a et que nous n'avons pas : ses trois cartes de
   presse et ses photos de bureaux. Les cartes deviennent les trois
   compteurs du prix (même gabarit, même bouton), et les photos viennent
   de la bibliothèque déjà sourcée du site — aucune preuve sociale, aucun
   témoignage inventé, la règle NOTES-DESIGN tient toujours.

   La page est entièrement statique depuis le 17/08 — la liste repliable
   était son seul composant client. Les entrées au défilement passent par
   [data-reveal], animé par PageMotion comme sur le reste du site.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Comment nous chiffrons | Omega.AI",
  description:
    "Une installation facturée une fois, un abonnement mensuel sans engagement : ce qui fait le prix, ce que nous ne facturons jamais, et pourquoi le montant sort de vos volumes mesurés à l'audit plutôt que d'un barème.",
};

const TONS = {
  vert: "tf-carte-couleur--vert",
  bleu: "tf-carte-couleur--bleu",
  encre: "tf-carte-couleur--encre",
} as const;

export default function TarifsPage() {
  const lienAudit = lienReservation("Comment vous chiffrez");

  return (
    <PageShell>
      <PageMotion />

      <div className="tf" data-monde="clair">
        {/* ─────────────── 1. hero plein cadre ─────────────── */}
        <div className="pt-24">
          <div className="tf-bleed-wrap">
            <section className="tf-bleed">
              <Image
                src={HERO.photo.src}
                alt={HERO.photo.alt}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="tf-bleed-corps">
                <h1 className="tf-h1">{HERO.titre}</h1>
                <p className="tf-lead max-w-[46rem]">{HERO.chapo}</p>
                <Link
                  href={lienAudit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tf-btn w-fit"
                >
                  {HERO.cta}
                </Link>
              </div>
            </section>
          </div>
        </div>

        {/* ─────────────── 2. les trois compteurs ─────────────── */}
        <section className="tf-section">
          <div className="tf-wrap">
            <div className="tf-tete tf-tete--serre" data-reveal>
              <p className="tf-eyebrow">Ce qui fait le prix</p>
              <h2 className="tf-h2">Trois compteurs, relevés chez vous</h2>
              <p className="tf-lead">
                Ils figurent dans la proposition, à côté du montant qu&apos;ils
                justifient : vous vérifiez le calcul au lieu de le croire. Et si le
                comptage ne montre pas de quoi rembourser l&apos;installation, la
                recommandation est de ne rien installer.
              </p>
            </div>

            <div className="tf-grille" data-reveal>
              {COMPTEURS.map((c) => (
                <article className={`tf-carte-couleur ${TONS[c.ton]}`} key={c.rang}>
                  <div className="flex flex-col gap-4">
                    <p className="tf-mono">{c.rang}</p>
                    <h3 className="tf-h3">{c.titre}</h3>
                    <p className="tf-body">{c.texte}</p>
                  </div>
                  <Link href={c.lien.href} className="tf-btn tf-btn--filet w-fit">
                    {c.lien.libelle}
                    <Fleche />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── 3. ce que nous ne facturons jamais ─────────────── */}
        <section className="tf-section">
          <div className="tf-wrap">
            <div className="flex flex-col items-center">
              <div className="tf-tete tf-tete--colle" data-reveal>
                <p className="tf-eyebrow">Nos principes</p>
                <h2 className="tf-h2">Ce que nous ne facturons jamais</h2>
                <p className="tf-lead">
                  Six choses qui ne figureront sur aucune de vos factures, et qui
                  n&apos;apparaîtront pas non plus au troisième mois.
                </p>
              </div>

              <div className="tf-grille tf-grille--principes mt-16 w-full" data-reveal>
                {PRINCIPES.map((p) => (
                  <article className="tf-carte" key={p.titre}>
                    <div className="flex flex-col gap-4">
                      <h3 className="tf-h4">{p.titre}</h3>
                      <p className="tf-body">{p.texte}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────── 4. le cadre ─────────────── */}
        <section className="tf-section">
          <div className="tf-wrap">
            <div className="flex flex-col items-center gap-16">
              <div className="tf-tete tf-tete--colle" data-reveal>
                <p className="tf-eyebrow">{CADRE.surTitre}</p>
                <h2 className="tf-h2">{CADRE.titre}</h2>
                <p className="tf-lead">{CADRE.chapo}</p>
              </div>

              <div className="tf-grille tf-grille--blocs w-full" data-reveal>
                {CADRE.blocs.map((b) => (
                  <article className="tf-bloc" key={b.titre}>
                    <div className="tf-bloc-img">
                      <Image
                        src={b.photo.src}
                        alt={b.photo.alt}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="tf-bloc-txt">
                      <h3 className="tf-h3">{b.titre}</h3>
                      <p className="tf-body">{b.texte}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────── 5. clôture plein cadre ─────────────── */}
        <div className="pb-8">
          <div className="tf-bleed-wrap">
            <section className="tf-bleed">
              <Image
                src={CLOTURE.photo.src}
                alt={CLOTURE.photo.alt}
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="tf-bleed-corps">
                <h2 className="tf-h1">{CLOTURE.titre}</h2>
                <p className="tf-lead max-w-[46rem]">{CLOTURE.texte}</p>
                <Link
                  href={lienAudit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tf-btn w-fit"
                >
                  {CLOTURE.cta}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* la flèche des boutons au filet, seule icône de la page */
function Fleche() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 11 11 3m0 0H4.5M11 3v6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
