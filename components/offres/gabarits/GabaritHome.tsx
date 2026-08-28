import Image from "next/image";
import Link from "next/link";
import { SystemLogo } from "@/components/logos";
import { Chevron, GrilleOutils } from "@/components/offres/MediaMoteurs";
import {
  BandeauAutresMoteurs,
  BandeauOutilsMoteur,
  CarteBlanche,
  ChaineControle,
  ChaineOutils,
  DemoFiche,
  PastillesOutils,
} from "@/components/offres/MediaFiche";
import BlocFaq from "./BlocFaq";
import type { GabaritProps } from "./types";
import { NOMBRES } from "./types";

/* ══════════════════════════════════════════════════════════════════════
   Gabarit « home » — d'après ocoya.com (page d'accueil)

   Extrait le 25/07/2026 du corps de app/offres/[system]/page.tsx, sans
   modification, quand Teo a demandé un design par moteur. Affecté à PAYD.

   26/07/2026 — Teo retire deux sections : les jalons « Installé en quelques
   jours » (10) et la carte de clôture « … est-il le bon pour vous ? » (12).
   La page se termine désormais sur la FAQ. Le gabarit sert PAYD ET les huit
   moteurs sans page de référence : le retrait vaut pour eux aussi.

   Dix sections, relevées au pixel sur viewport 1440 :
     1  hero asymétrique sur gris pointillé   → pitch + fonctionnement[0] + démo
     2  bandeau de logos défilant             → fiche.outils
     3  rangée de cartes 343 px               → fiche.points
     4  grille de pastilles rondes            → intégrations du desk
     5  trois cartes à chaîne de nœuds        → démo · garde-fous · outils
     6  bento 2 colonnes                      → fiche.fonctionnement + contrôle
     7  rangée de cartes                      → fiche.cible
     8  bandeau défilant                      → les autres moteurs
     9  bento 2 colonnes                      → ce qui est compris (desk)
    10  FAQ en carte grise                    → fiche.faq
   ══════════════════════════════════════════════════════════════════════ */

function EnTete({
  pastille,
  titre,
  chapo,
}: {
  pastille: string;
  titre: string;
  chapo: string;
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
    </div>
  );
}

export default function GabaritHome({
  m,
  fiche,
  role,
  paragraphes,
  autres,
}: GabaritProps) {
  return (
    <div className="offres offres--sombre">
      {/* ════════ 1 · HERO ════════ */}
      <section
       
        className="o-gris relative overflow-hidden pb-[90px] pt-[40px] sm:pb-[120px] sm:pt-[81px]"
      >
        <div
          aria-hidden
          className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        />
        <div className="o-wrap relative">
          <div className="grid grid-cols-1 items-start gap-14 pt-[60px] lg:grid-cols-[700px_minmax(0,1fr)] lg:gap-[76px]">
            <div>
              <div data-reveal className="flex flex-wrap items-center gap-3">
                <Link href="/offres" className="o-pill o-pill--xs">
                  ← Nos offres
                </Link>
                <span className="o-pill o-pill--xs">{m.famille.tag}</span>
              </div>

              <div data-reveal className="mt-7 flex items-center gap-4">
                <SystemLogo system={m.system} />
                <div>
                  <div
                    className="text-[26px] font-semibold tracking-[-0.03em] text-[#fafafa]"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    {m.system}
                  </div>
                  <div className="o-small !text-[#a1a1aa]">{role}</div>
                </div>
              </div>

              {/* Le pitch tient le rôle du H1 : c'est la promesse du moteur,
                  en 48/67,2 comme le H1 de la page de référence. */}
              <h1 data-reveal className="o-h2 mt-6">
                {fiche.pitch}
              </h1>

              <p data-reveal className="o-lead mt-5 max-w-[608px]">
                {paragraphes[0]}
              </p>

              <div data-reveal className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/tarifs" className="o-btn o-btn--primary">
                  Chiffrer mon cas
                </Link>
                <Link href="#fonctionnement" className="o-btn o-btn--ghost">
                  Comment il tourne
                  <Chevron taille={13} />
                </Link>
              </div>

              <div data-reveal className="mt-10">
                <PastillesOutils outils={fiche.outils} />
              </div>

              <div data-reveal className="mt-6 flex flex-wrap items-center gap-3">
                <span className="o-pill o-pill--xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  SUR VOS OUTILS
                </span>
                <span className="o-small !text-[#a1a1aa]">{fiche.outils.join(" · ")}</span>
              </div>
            </div>

            <div data-reveal className="flex w-full flex-col gap-5 lg:max-w-[404px]">
              <DemoFiche demo={fiche.demo} />

              <CarteBlanche>
                <div className="px-6 py-6">
                  <span className="o-demo-fort">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20 6 9 17l-5-5" />
                      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
                    </svg>
                  </span>
                  <div
                    className="o-demo-fort mt-5 text-[20px] font-semibold tracking-[-0.02em]"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    Vous gardez la main
                  </div>
                  <p className="o-demo-faible mt-2 text-[15px] leading-[1.7]">
                    {fiche.controle}
                  </p>
                </div>
              </CarteBlanche>

              {fiche.photo ? (
                <div className="o-photo !aspect-[404/260]">
                  <Image
                    src={fiche.photo}
                    alt={fiche.photoAlt ?? ""}
                    fill
                    sizes="(max-width: 1024px) 100vw, 404px"
                  />
                  <span className="o-pill o-pill--xs o-pill--verre absolute right-5 top-5 z-10">
                    {m.famille.tag}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 2 · BANDEAU DES OUTILS DU MOTEUR ════════ */}
      <section className="pb-[40px] pt-[70px]">
        <p data-reveal className="o-lead mb-10 text-center">
          {m.system} se branche sur ce que vous tenez déjà
        </p>
        <div data-reveal>
          <BandeauOutilsMoteur outils={fiche.outils} />
        </div>
      </section>

      {/* ════════ 3 · CE QU'IL FAIT ════════ */}
      <section id="fonctionnement" className="scroll-mt-24 py-[110px]">
        <div className="o-wrap">
          {/* 26/07 — l'intertitre et son chapô viennent maintenant de la
              fiche : « X en quatre points. » se lisait à l'identique sur les
              douze moteurs, et le chapô resservait le pitch déjà affiché en
              H1 plus haut. Repli sur l'ancienne formule si la fiche ne porte
              pas encore sa copie. */}
          <EnTete
            pastille="Ce qu'il fait"
            titre={fiche.sections?.pointsTitre ?? `${m.system} en quatre points.`}
            chapo={fiche.sections?.pointsChapo ?? fiche.pitch}
          />
        </div>
        <div className="o-marquee mt-20">
          <div className="o-wrap flex gap-[70px] overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {fiche.points.map((pt, i) => (
              <div
                key={pt}
                data-reveal
                className="o-card-plate flex w-[300px] shrink-0 flex-col px-7 py-9 sm:w-[343px] sm:px-8 sm:py-10"
              >
                {/* 05/08 — la pastille ronde noire cède la place au numéro en
                    filigrane (design D). Le texte remonte de la ligne qu'elle
                    occupait, d'où la marge supérieure qui disparaît. */}
                <span aria-hidden className="o-num-fantome">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="o-body">{pt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 4 · INTÉGRATIONS ════════ */}
      <section className="pb-[110px]">
        <div className="o-wrap">
          {/* 13/08 — ce bloc était identique mot pour mot sur les six paquets.
              Il dit maintenant, moteur par moteur, QUELS outils sont lus et
              écrits : un facturier pour CASHD, aucune écriture pour PULSE, un
              socle placé sous les autres pour VAULT. Repli sur l'ancienne
              formule si la fiche ne porte pas encore sa copie. */}
          <EnTete
            pastille="Intégrations"
            titre={fiche.sections?.integrationsTitre ?? "Branché sur ce que vous avez."}
            chapo={
              fiche.sections?.integrationsChapo ??
              "Messagerie, tableur, paiement, e-commerce, agenda : le moteur lit et écrit là où vous travaillez déjà. Ni compte à créer, ni migration."
            }
          />
        </div>
        <div data-reveal className="mt-16">
          <GrilleOutils />
        </div>
      </section>

      {/* ════════ 5 · TROIS CHAÎNES ════════ */}
      <section className="o-wrap pb-[110px]">
        <EnTete
          pastille="En marche"
          titre={
            fiche.sections?.marcheTitre ?? "Un déclencheur, une chaîne, votre validation."
          }
          chapo={
            fiche.sections?.marcheChapo ??
            "Un événement de votre activité déclenche la chaîne : une facture qui dépasse son échéance, un message qui arrive. Chaque étape est lisible, et la dernière vous attend."
          }
        />
        <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div data-reveal className="o-card-plate px-8 pb-10 pt-10">
            <h3 className="o-h4">Le moteur en situation</h3>
            <p className="o-body mt-3">
              {fiche.sections?.situationChapo ??
                `Ce que ${m.system} produit concrètement, sur un cas type.`}
            </p>
            <div className="mt-8">
              <DemoFiche demo={fiche.demo} />
            </div>
          </div>
          <div data-reveal className="o-card-plate px-8 pb-10 pt-10">
            <h3 className="o-h4">Vos garde-fous</h3>
            <p className="o-body mt-3">{fiche.controle}</p>
            <div className="mt-8">
              <ChaineControle />
            </div>
          </div>
          <div data-reveal className="o-card-plate px-8 pb-10 pt-10">
            <h3 className="o-h4">Sur vos outils</h3>
            {/* PULSE ne fait que lire, VAULT ne fait que contrôler : la
                formule « lit et écrit » était fausse sur deux des trois pages
                servies par ce gabarit. */}
            <p className="o-body mt-3">
              {fiche.sections?.outilsChapo ??
                "Le moteur lit et écrit dans vos outils actuels. Aucun n'est remplacé, aucun n'est à réapprendre."}
            </p>
            <div className="mt-8">
              <ChaineOutils outils={fiche.outils} />
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 6 · LE DÉTAIL ════════ */}
      <section className="o-wrap pb-[110px]">
        <EnTete
          pastille="Le détail"
          titre="Comment il travaille, précisément."
          chapo={
            fiche.sections?.detailChapo ??
            `Le fonctionnement de ${m.system}, sans raccourci : ce qu'il lit, ce qu'il décide, et ce qu'il vous laisse trancher.`
          }
        />
        <div className="mx-auto mt-20 grid max-w-[1040px] grid-cols-1 gap-8 lg:grid-cols-2">
          {paragraphes.map((para, i) => (
            <div key={i} data-reveal className="o-card-plate flex flex-col p-8 sm:p-10">
              <span aria-hidden className="o-num-fantome">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="o-body">{para}</p>
            </div>
          ))}
          <div data-reveal className="o-card-plate flex flex-col p-8 sm:p-10">
            <h3 className="o-h5">Vous gardez la main</h3>
            <p className="o-body mt-2.5">{fiche.controle}</p>
          </div>
        </div>
      </section>

      {/* ════════ 7 · PENSÉ POUR ════════ */}
      <section className="pb-[110px]">
        <div className="o-wrap">
          <EnTete
            pastille="Pensé pour"
            titre="À qui ce moteur sert."
            chapo={
              fiche.sections?.cibleChapo ??
              `${m.system} a été construit pour des activités où ce problème coûte le plus cher. Si vous n'y êtes pas, l'audit désignera un autre moteur.`
            }
          />
        </div>
        <div className="o-marquee mt-20">
          <div className="o-wrap flex gap-[70px] overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {fiche.cible.map((c) => (
              <div
                key={c}
                data-reveal
                className="o-card-plate flex w-[260px] shrink-0 flex-col items-center px-8 py-12 text-center sm:w-[290px]"
              >
                <h3 className="o-h4">{c}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 8 · LES AUTRES MOTEURS ════════ */}
      <section className="pb-[110px]">
        <div className="o-wrap flex flex-col items-center text-center">
          <div data-reveal>
            <span className="o-pill">Catalogue</span>
          </div>
          {/* 07/08 — « Onze autres moteurs. » était figé dans le balisage et
              datait des douze moteurs d'avant le regroupement en paquets : la
              page annonçait onze cartes au-dessus d'un bandeau qui en montrait
              trois ou quatre. Le compte est désormais tiré de `autres`, donc
              il suit le catalogue sans qu'on y repense. */}
          <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
            {NOMBRES[autres.length] ?? autres.length} autre
            {autres.length > 1 ? "s" : ""} système
            {autres.length > 1 ? "s" : ""}.
          </h2>
          <p data-reveal className="o-lead mt-4 max-w-[650px]">
            {fiche.sections?.catalogueChapo ??
              `${m.system} n'est peut-être pas celui à installer en premier. L'audit désigne le moteur au meilleur retour chez vous, et il arrive que ce soit un autre.`}
          </p>
          <div data-reveal className="mt-5">
            <Link href="/offres" className="o-link">
              Voir toutes les offres
              <Chevron />
            </Link>
          </div>
        </div>
        <div data-reveal className="mt-16">
          <BandeauAutresMoteurs moteurs={autres} />
        </div>
      </section>

      {/* ════════ 9 · CE QUI EST COMPRIS ════════ */}
      <section className="o-wrap pb-[110px]">
        <EnTete
          pastille="Compris"
          titre="Ce qui vient avec le moteur."
          chapo={
            fiche.sections?.comprisChapo ??
            "Le moteur n'est que la partie visible. Ce qui suit est livré avec, sans supplément et sans négociation."
          }
        />
        <div className="mx-auto mt-20 grid max-w-[1040px] grid-cols-1 gap-8 lg:grid-cols-2">
          <div data-reveal className="o-card-plate p-8 sm:p-10">
            <h3 className="o-h5">Une file de validation</h3>
            <p className="o-body mt-2.5">
              Tout ce qui doit partir y passe. Vous approuvez, corrigez ou
              suspendez, aussi longtemps que vous le jugez utile.
            </p>
          </div>
          <div data-reveal className="o-card-plate p-8 sm:p-10">
            <h3 className="o-h5">Un journal de tout ce qui est parti</h3>
            <p className="o-body mt-2.5">
              Chaque envoi est daté, archivé, consultable. Le jour où un client
              conteste avoir été relancé, la preuve est là.
            </p>
          </div>
          <div data-reveal className="o-card-plate p-8 sm:p-10">
            <h3 className="o-h5">Vos données restent chez vous</h3>
            <p className="o-body mt-2.5">
              Un espace chiffré et distinct pour chaque client, hébergé dans
              l&apos;Union européenne. Seul le strict nécessaire est transmis aux
              modèles, tâche par tâche.
            </p>
          </div>
          <div data-reveal className="o-card-plate p-8 sm:p-10">
            <h3 className="o-h5">Le Chèque TIC vérifié</h3>
            <p className="o-body mt-2.5">
              Pour les entreprises guadeloupéennes éligibles, une partie de
              l&apos;installation est financée. L&apos;éligibilité est vérifiée
              pendant l&apos;audit, avant tout engagement de votre part.
            </p>
          </div>
        </div>
      </section>

      {/* ════════ 10 · FAQ ════════

          26/07 (Teo) — la section « Installé en quelques jours » (les jalons)
          est retirée : le parcours est déjà raconté plus haut, la reprendre en
          grille juste avant la FAQ faisait doublon. `fiche.etapes` continue
          d'alimenter les autres gabarits.

          13/08 — le balisage part dans BlocFaq, désormais partagé avec les
          gabarits `integration` et `publish`, qui n'affichaient aucune FAQ. */}
      <BlocFaq faq={fiche.faq} chapo={fiche.sections?.faqChapo} />

      {/* 26/07 (Teo) — la carte de clôture « [MOTEUR] est-il le bon pour vous ? »
          est retirée de ce gabarit. La page se termine sur la FAQ ; l'appel à
          l'audit reste porté par le header, le hero et le footer. */}
    </div>
  );
}
