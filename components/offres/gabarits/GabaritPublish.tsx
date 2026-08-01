import Image from "next/image";
import Link from "next/link";
import { SystemLogo } from "@/components/logos";
import { Chevron, GrilleOutils } from "@/components/offres/MediaMoteurs";
import { BandeauAutresMoteurs, DemoFiche, PastillesOutils } from "@/components/offres/MediaFiche";
import {
  CollagePublish,
  MaqDossierCabinet,
  MaqRegleClassement,
} from "@/components/offres/MediaPublish";
import type { GabaritProps } from "./types";

/* ══════════════════════════════════════════════════════════════════════
   Gabarit « publish » — d'après ocoya.com/features/publish

   Demandé par Teo le 25/07/2026 pour OFFLOAD seul, en remplacement complet
   du gabarit « intégration ». Sept sections, relevées au pixel sur viewport
   1440 :

     1  hero CENTRÉ — pastille, H1 60/72 sur 700, chapô sur 650, deux
        boutons, puis le COLLAGE de panneaux superposés (900 × 673)
     2  quatre colonnes de 240 — intertitre + paragraphe, sans icône
     3  intégrations — H2 centré sur 600, chapô sur 650, pastilles rondes
     4  deux grandes cartes de 580, contenu centré, badge + H4 + une ligne
        + lien, média arrimé au bord bas
     5  bento deux colonnes de 405
     6  bandeau défilant de cartes
     7  CTA

   Fond SOMBRE, comme les autres fiches : Teo parcourt les références en
   thème sombre et l'a demandé explicitement. Le collage suit, ses panneaux
   passant par les variables `--demo-*` plutôt que par du blanc dur.
   ══════════════════════════════════════════════════════════════════════ */

function EnTete({
  pastille,
  titre,
  chapo,
  lien,
}: {
  pastille: string;
  titre: string;
  chapo: string;
  lien?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div data-reveal>
        <span className="o-pill">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
        {titre}
      </h2>
      <p data-reveal className="o-lead mt-4 max-w-[650px]">
        {chapo}
      </p>
      {lien ? (
        <div data-reveal className="mt-5">
          <Link href={lien.href} className="o-link">
            {lien.label}
            <Chevron />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/* Grande carte de la section 4 : badge, titre, une ligne, lien, puis un
   média arrimé au bord bas et écrêté par la carte — comme la référence. */
function CarteMedia({
  badge,
  titre,
  texte,
  lien,
  children,
}: {
  badge: string;
  titre: string;
  texte: string;
  lien: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div data-reveal className="o-bloc flex flex-col items-center px-6 pt-12 text-center sm:px-12">
      <span className="o-pill o-pill--xs">{badge}</span>
      <h3 className="o-h4 mt-5">{titre}</h3>
      <p className="o-body mt-3 max-w-[440px]">{texte}</p>
      <Link href={lien.href} className="o-link mt-5">
        {lien.label}
        <Chevron />
      </Link>
      {/* mt-auto : les deux cartes d'une rangée prennent la hauteur de la
          plus haute, le média doit rester collé au bas dans les deux cas */}
      <div className="mt-auto w-full pt-12">{children}</div>
    </div>
  );
}

export default function GabaritPublish({
  m,
  fiche,
  role,
  paragraphes,
  accentSombre,
  autres,
}: GabaritProps) {
  return (
    <div className="offres offres--sombre">
      {/* ════════ 1 · HERO CENTRÉ + COLLAGE ════════ */}
      <section className="relative overflow-hidden pt-[40px] sm:pt-[81px]">
        <div
          aria-hidden
          className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[1200px]"
        />
        <div className="o-wrap relative">
          <div className="flex flex-col items-center pt-[60px] text-center">
            <div data-reveal className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/offres" className="o-pill o-pill--xs">
                ← Nos offres
              </Link>
              <span className="o-pill o-pill--xs">{m.famille.tag}</span>
            </div>

            <div data-reveal className="mt-7 flex items-center gap-4">
              <span className="o-tuile">
                <span className="scale-[0.86]">
                  <SystemLogo system={m.system} />
                </span>
              </span>
              <div className="text-left">
                <div
                  className="text-[24px] font-semibold tracking-[-0.03em]"
                  style={{ fontFamily: "var(--font-jakarta)", color: accentSombre }}
                >
                  {m.system}
                </div>
                <div className="o-small">{role}</div>
              </div>
            </div>

            <h1 data-reveal className="o-h1 mt-6 max-w-[700px]">
              {fiche.pitch}
            </h1>

            <p data-reveal className="o-lead mt-[15px] max-w-[650px]">
              {m.benefit}
            </p>

            <div data-reveal className="mt-[25px] flex flex-wrap items-center justify-center gap-3">
              <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
                Chiffrer mon cas — audit gratuit
              </Link>
              <Link href="#reglages" className="o-btn o-btn--ghost">
                Comment il classe
                <Chevron taille={13} />
              </Link>
            </div>
          </div>

          {/* le collage de panneaux superposés */}
          <div data-reveal className="mt-10 pb-[15px]">
            <CollagePublish fiche={fiche} />
          </div>
        </div>
      </section>

      {/* ════════ 2 · QUATRE COLONNES ════════ */}
      <section className="o-wrap py-[110px]">
        <div className="grid grid-cols-1 gap-x-20 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {fiche.points.map((pt, i) => (
            <div key={pt} data-reveal>
              <h3
                className="text-[20px] font-semibold tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-jakarta)", color: "var(--o-text)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </h3>
              <p className="o-body mt-3 max-w-[240px]">{pt}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ 2 bis · BANDE PHOTO ════════
          La référence coupe ses sections par de l'image. Sans elle, la page
          enchaînait quatre écrans de texte et de maquettes. */}
      {fiche.photo ? (
        <section className="o-wrap pb-[110px]">
          <div data-reveal className="o-photo !aspect-[1200/460]">
            <Image
              src={fiche.photo}
              alt={fiche.photoAlt ?? ""}
              fill
              sizes="(max-width: 1248px) 100vw, 1200px"
              priority={false}
            />
            <div className="absolute inset-x-8 bottom-8 z-10 sm:inset-x-14 sm:bottom-12">
              <div className="o-h4 !text-white">{fiche.pitch}</div>
              <p className="o-body mt-3 max-w-[520px] !text-white/70">{m.benefit}</p>
            </div>
            <span className="o-pill o-pill--xs o-pill--verre absolute right-8 top-8 z-10">
              {m.famille.tag}
            </span>
          </div>
        </section>
      ) : null}

      {/* ════════ 3 · INTÉGRATIONS ════════ */}
      <section className="pb-[110px]">
        <div className="o-wrap">
          <EnTete
            pastille="Intégrations"
            titre="Branché sur ce que vous avez."
            chapo="Messagerie, tableur, stockage, comptabilité : le moteur lit et écrit là où vous travaillez déjà. Ni compte à créer, ni migration."
          />
        </div>
        <div data-reveal className="mt-16">
          <GrilleOutils />
        </div>
        <div data-reveal className="o-wrap mt-14 flex flex-wrap items-center justify-center gap-4">
          <PastillesOutils outils={fiche.outils} />
          <span className="o-small">{fiche.outils.join(" · ")}</span>
        </div>
      </section>

      {/* ════════ 4 · RÉGLAGES — deux grandes cartes ════════ */}
      <section id="reglages" className="o-wrap scroll-mt-24 pb-[110px]">
        <EnTete
          pastille="Réglages"
          titre="Classement automatique, contrôle manuel."
          chapo={paragraphes[0]}
        />
        <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <CarteMedia
            badge="Cadré avec vous"
            titre="Des règles, pas des devinettes"
            texte="Le moteur ne classe que selon les règles fixées à l'installation. Hors de ces règles, il met de côté au lieu d'approximer."
            lien={{ label: "Voir le déroulé", href: "/reserver-un-audit" }}
          >
            <MaqRegleClassement fiche={fiche} />
          </CarteMedia>
          <CarteMedia
            badge="Chaque mois"
            titre="Un dossier prêt à ouvrir"
            texte="Pièces nommées, horodatées, réparties par journal. Le cabinet reçoit un dossier complet, pas un tas de PDF."
            lien={{ label: "Voir les autres moteurs", href: "/offres" }}
          >
            <MaqDossierCabinet />
          </CarteMedia>
        </div>
      </section>

      {/* ════════ 5 · BENTO — ce qui vient avec ════════ */}
      <section className="o-wrap pb-[110px]">
        <EnTete
          pastille="Compris"
          titre="Ce qui vient avec le moteur."
          chapo="Le classement n'est que la partie visible. Ce qui suit est livré avec, sans supplément et sans négociation."
        />
        <div className="mx-auto mt-20 grid max-w-[1040px] grid-cols-1 gap-8 lg:grid-cols-2">
          <div data-reveal className="o-card-plate flex flex-col p-8 sm:p-10">
            <h3 className="o-h5">Vous gardez la main</h3>
            <p className="o-body mt-2.5">{fiche.controle}</p>
            <div className="mt-7">
              <DemoFiche demo={fiche.demo} />
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {paragraphes.slice(1).map((para, i) => (
              <div key={i} data-reveal className="o-card-plate flex flex-col p-8 sm:p-10">
                <span className="o-pill o-pill--xs w-fit">
                  {String(i + 2).padStart(2, "0")}
                </span>
                <p className="o-body mt-6">{para}</p>
              </div>
            ))}
            <div data-reveal className="o-card-plate flex flex-col p-8 sm:p-10">
              <h3 className="o-h5">Pensé pour</h3>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {fiche.cible.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full border border-white/[0.1] bg-[#09090b] px-4 py-2 text-[14px] font-medium text-[#d4d4d8]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* la mise en place, en jalons */}
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fiche.etapes.map((e, i) => (
            <div key={e.t} data-reveal className="o-formule">
              <span className="o-pill o-pill--xs w-fit">
                Jalon {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="o-h5 mt-6">{e.t}</h3>
              <p className="o-body mt-3 !text-[15px]">{e.d}</p>
            </div>
          ))}
          <div data-reveal className="o-formule o-formule--phare">
            <span className="o-pill o-pill--xs w-fit">Avant tout</span>
            <h3 className="o-h5 mt-6">L&apos;audit — 30 min</h3>
            <p className="o-body mt-3 !text-[15px]">
              On chiffre ce que le problème vous coûte, on vérifie que{" "}
              {m.system} est bien le bon moteur, et on regarde votre éligibilité
              au Chèque TIC.
            </p>
            <Link href="/reserver-un-audit" className="o-btn o-btn--primary !mt-8 mt-auto w-full">
              Demander l&apos;audit
            </Link>
          </div>
        </div>
      </section>

      {/* ════════ 6 · BANDEAU DES AUTRES MOTEURS ════════ */}
      <section className="pb-[110px]">
        <div className="o-wrap flex flex-col items-center text-center">
          <div data-reveal>
            <span className="o-pill">Catalogue</span>
          </div>
          <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
            Onze autres moteurs.
          </h2>
          <p data-reveal className="o-lead mt-4 max-w-[650px]">
            {m.system}{" "}
            n&apos;est peut-être pas celui à installer en premier.
            L&apos;audit désigne le moteur au meilleur retour chez vous — et il
            arrive que ce soit un autre.
          </p>
        </div>
        <div data-reveal className="mt-16">
          <BandeauAutresMoteurs moteurs={autres} />
        </div>
      </section>

      {/* ════════ 7 · CTA + navigation ════════ */}
      <section className="o-wrap pb-[120px]">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[20px] bg-[#18181b] px-6 py-20 text-center sm:px-20"
        >
          <div
            aria-hidden
            className="o-dots o-dots-fade-up pointer-events-none absolute inset-x-0 bottom-0 top-1/2"
          />
          <h2 className="o-h2 relative mx-auto max-w-[1040px]">
            {m.system} est-il le bon pour vous ?
          </h2>
          <p className="o-lead relative mx-auto mt-4 max-w-[610px]">
            L&apos;audit gratuit chiffre ce que votre difficulté principale vous
            coûte et désigne le moteur au meilleur retour — celui-ci, ou un
            autre.
          </p>
          <div className="relative mt-8">
            <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
              Réserver l&apos;audit gratuit
              <Chevron taille={14} />
            </Link>
          </div>
        </div>

        {fiche.photo ? (
          <div data-reveal className="o-photo mt-8 !aspect-[1200/420]">
            <Image
              src={fiche.photo}
              alt={fiche.photoAlt ?? ""}
              fill
              sizes="(max-width: 1248px) 100vw, 1200px"
            />
            <span className="o-pill o-pill--xs absolute right-6 top-6 z-10 !border-white/25 !bg-black/50 !text-white backdrop-blur-md">
              {m.famille.tag}
            </span>
          </div>
        ) : null}

      </section>
    </div>
  );
}
