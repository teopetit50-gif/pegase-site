import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Grille from "@/components/tarifs/Grille";
import { COMPRIS } from "@/lib/paliers";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs — v5 « La grille publique, dans la maison v3 » (29/08/2026)

   Décision Teo du 29/08 : garder le CONTENU de la v4 du 28/08 — prix
   publics 59/85/105, choix des postes dans les cartes, FAQ, Chèque TIC,
   porte audit pour les structures où plusieurs services valident — mais
   le remettre dans le DESIGN v3, le relevé de **scale.com/careers**
   (bloc .tf de globals.css, restauré ce jour avec une extension v5 pour
   les meubles que la référence n'a pas : cases, badge, prix, replis).
   Le monde .resa (clone Qonto pricing) ne rend plus cette page ; il
   continue de servir /reserver-un-audit, /installation et /reserver.

   Correspondance section par section avec la référence :
     hero plein cadre, titre + chapô + bouton  → « Des prix publics… »
     « IN THE NEWS » — 3 cartes de couleur     → les trois paliers
     « OUR CREDOS » — cartes grises            → ce que nous ne facturons jamais
     bandeau plein cadre                       → le Chèque TIC
     replis (le gabarit de « OPEN POSITIONS ») → la FAQ tarifs
     CTA final plein cadre                     → la porte audit

   Les photos sont le jeu v3 (public/photos/tarifs-*, sourcing dans
   CREDITS.txt) : architecture froide, sans visage, sans marque. La seule
   icône de la page reste la flèche — règle v3 — mais elle n'apparaît
   plus : les CTA des cartes sont des boutons au filet pleine largeur.

   CE QUI A CHANGÉ DE RÈGLE : la v3 interdisait tout montant (« le prix
   sort de vos volumes ») ; le modèle commercial arrêté les 27-28/08
   affiche les prix pour ceux qui tiennent leurs outils. L'ancienne règle
   ne survit que pour les structures où plusieurs services valident :
   leur porte est l'audit, sans prix — c'est la clôture de la page. La
   mention « Région » du Chèque TIC reste obligatoire (aide régionale
   citée sur un site national).

   PAIEMENT : rien en ligne aujourd'hui. La couture vit dans
   components/tarifs/Grille.tsx — une étape s'insérera entre le choix
   des postes et la réunion, sans refonte.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Tarifs | Omega.AI",
  description:
    "Un poste 59 €, trois postes 85 €, tout Omega 105 € par mois — sans engagement, installation comprise, satisfait ou remboursé 30 jours. Et pour les structures où plusieurs services valident : un audit d'abord, un devis ensuite.",
};

/* Ce qu'on ne facture jamais — resserré depuis la v3 (six cartes) : les
   deux retirées (« pas de surcoût si le mois s'emballe », « devis en une
   page ») redisaient le sans-engagement et la réunion d'installation. */
const JAMAIS: { titre: string; texte: string }[] = [
  {
    titre: "Pas de prix par personne",
    texte:
      "Le prix ne dépend pas du nombre de gens qui s'en servent chez vous. Embaucher ne coûte rien de plus.",
  },
  {
    titre: "Aucune commission au résultat",
    texte:
      "Pas de pourcentage sur les sommes encaissées. Nous avons intérêt à relancer juste, pas à relancer fort.",
  },
  {
    titre: "Aucun engagement de durée",
    texte:
      "L'abonnement est mensuel. Vous prévenez, le mois va à son terme, les envois s'arrêtent. Rien n'est payé d'avance.",
  },
  {
    titre: "Vos données repartent avec vous",
    texte:
      "L'export complet vous est remis à la sortie, sans condition et sans frais. Ce qui est à vous reste à vous.",
  },
];

/* ——— la FAQ tarifs — les questions qu'une page de prix doit prendre de
   front, mêmes règles éditoriales que la FAQ de la page audit. ——— */
const FAQ_TARIFS: { q: string; r: string[] }[] = [
  {
    q: "Puis-je changer de palier ensuite ?",
    r: [
      "Oui, à tout moment et sans frais de changement : le prix suit simplement le nombre de postes en service. On ajoute un poste quand les chiffres du premier le justifient — c'est même le chemin qu'on recommande.",
    ],
  },
  {
    q: "Comment se passe le paiement ?",
    r: [
      "Rien ne se paie en ligne. Tout se règle à la réunion d'installation, et l'abonnement ne démarre qu'une fois le système en route chez vous. L'abonnement est mensuel, sans engagement : vous prévenez, le mois en cours va à son terme, les envois s'arrêtent.",
    ],
  },
  {
    q: "Qu'est-ce que le prix comprend, exactement ?",
    r: [
      "Le fonctionnement des postes choisis, le point du matin, les verrous de validation, vos corrections et le suivi. La réunion d'installation est comprise : on branche vos outils ensemble, en visio, écran partagé.",
      "Un raccordement particulier — un logiciel rare, un historique à reprendre — est chiffré avant tout engagement, jamais découvert en cours de route.",
    ],
  },
  {
    q: "Et si ça ne me convient pas ?",
    r: [
      "Trente jours pour être remboursé, sans justification à fournir. Au-delà, l'abonnement reste mensuel et résiliable à tout moment — et vos données repartent avec vous, export complet compris.",
    ],
  },
  {
    q: "Le Chèque TIC s'applique-t-il ici ?",
    r: [
      "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible. Il porte sur l'installation, pas sur l'abonnement. Votre éligibilité est vérifiée à la réunion d'installation, et si un dossier se justifie, nous le montons avec vous.",
    ],
  },
  {
    q: "Plusieurs services se partagent le travail chez nous — cette grille nous concerne ?",
    r: [
      "Probablement pas : quand plusieurs personnes valident, chacune sur son poste, un prix affiché serait un mensonge. Votre porte est l'audit — on mesure vos volumes, et le devis en sort. Il est gratuit dans ses deux premiers formats.",
    ],
  },
];

export default function TarifsPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="tf" data-monde="clair">
        {/* ─────────────── 1. hero plein cadre ─────────────── */}
        <div className="pt-24">
          <div className="tf-bleed-wrap">
            <section className="tf-bleed">
              <Image
                src="/photos/tarifs-hero-atrium.jpg"
                alt="L'atrium d'un immeuble de bureaux moderne, vu d'en bas"
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="tf-bleed-corps">
                <h1 className="tf-h1">Des prix publics, une installation comprise</h1>
                <p className="tf-lead max-w-[46rem]">
                  Pour les indépendants, TPE et PME&nbsp;: vous choisissez vos postes, vous réservez
                  la réunion d&apos;installation, et le système démarre sous votre œil. Sans
                  engagement, satisfait ou remboursé trente jours.
                </p>
                <a href="#grille" className="tf-btn w-fit">
                  Choisir mes postes
                </a>
              </div>
            </section>
          </div>
        </div>

        {/* ─────────────── 2. la grille — les trois paliers ─────────────── */}
        <section className="tf-section" id="grille">
          <div className="tf-wrap">
            <div className="tf-tete tf-tete--serre" data-reveal>
              <p className="tf-eyebrow">La grille</p>
              <h2 className="tf-h2">Choisissez vos postes</h2>
              <p className="tf-lead">
                Quatre postes s&apos;installent sur les outils que vous avez déjà — mail, tableur,
                WhatsApp. Quel que soit le palier,{" "}
                <Link
                  href={`/offres/${COMPRIS[0].slug}`}
                  className="underline underline-offset-4 hover:text-black"
                >
                  {COMPRIS[0].system} · {COMPRIS[0].nom.toLowerCase()}
                </Link>{" "}
                et{" "}
                <Link
                  href={`/offres/${COMPRIS[1].slug}`}
                  className="underline underline-offset-4 hover:text-black"
                >
                  {COMPRIS[1].system} · {COMPRIS[1].nom.toLowerCase()}
                </Link>{" "}
                tournent d&apos;office&nbsp;: savoir où vous en êtes et la certitude que rien ne part
                sans vous ne sont pas des options.
              </p>
            </div>

            <Grille />

            <p className="tf-note mx-auto mt-8 max-w-3xl text-center" data-reveal>
              Prix TTC, grille en vigueur au 28/08/2026 — le prix affiché au moment de votre demande
              est celui qui vous est confirmé à l&apos;installation. L&apos;installation elle-même
              (mise en route sur vos outils, rodage sous votre œil) est comprise dans la réunion
              pour les quatre postes standard&nbsp;; un raccordement particulier est chiffré avant
              tout engagement.
            </p>
          </div>
        </section>

        {/* ─────────────── 3. ce que nous ne facturons jamais ─────────────── */}
        <section className="tf-section">
          <div className="tf-wrap">
            <div className="flex flex-col items-center">
              <div className="tf-tete tf-tete--colle" data-reveal>
                <p className="tf-eyebrow">Nos principes</p>
                <h2 className="tf-h2">Ce que nous ne facturons jamais</h2>
              </div>

              <div className="tf-grille tf-grille--principes mt-16 w-full" data-reveal>
                {JAMAIS.map((j) => (
                  <article className="tf-carte" key={j.titre}>
                    <div className="flex flex-col gap-4">
                      <h3 className="tf-h4">{j.titre}</h3>
                      <p className="tf-body">{j.texte}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────── 4. le Chèque TIC, plein cadre ─────────────── */}
        <div className="tf-bleed-wrap" id="cheque-tic">
          <section className="tf-bleed tf-bleed--bandeau">
            <Image
              src="/photos/tarifs-cheque-tic-signature.jpg"
              alt="Deux mains signant un document posé sur un bureau"
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="tf-bleed-corps">
              <p className="tf-mono !text-white/70">Chèque TIC — Région Guadeloupe</p>
              <h2 className="tf-h2">De 40 à 80&nbsp;% d&apos;un projet numérique financés</h2>
              <p className="tf-lead max-w-[46rem]">
                La Région Guadeloupe finance de 40 à 80&nbsp;% d&apos;un projet de transformation
                numérique, dans la limite de 10&nbsp;000&nbsp;€, pour une entreprise éligible. Votre
                éligibilité est vérifiée à la réunion d&apos;installation — et si un dossier se
                justifie, nous le montons avec vous.
              </p>
              <a href="#grille" className="tf-btn w-fit">
                Choisir mes postes
              </a>
            </div>
          </section>
        </div>

        {/* ─────────────── 5. la FAQ tarifs ─────────────── */}
        <section className="tf-section">
          <div className="tf-wrap">
            <div className="tf-tete tf-tete--serre" data-reveal>
              <p className="tf-eyebrow">Questions</p>
              <h2 className="tf-h2">Questions sur les prix</h2>
            </div>

            <div className="mx-auto max-w-3xl" data-reveal>
              {FAQ_TARIFS.map((f) => (
                <details key={f.q} className="tf-faq">
                  <summary>{f.q}</summary>
                  <div className="tf-faq-corps">
                    {f.r.map((par, i) => (
                      <p key={i}>{par}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── 6. clôture plein cadre : la porte audit ─────────────── */}
        <div className="pb-8">
          <div className="tf-bleed-wrap">
            <section className="tf-bleed">
              <Image
                src="/photos/tarifs-cloture-facade.jpg"
                alt="La façade d'un immeuble au soleil couchant, reflets dans le verre"
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="tf-bleed-corps">
                <h2 className="tf-h1">
                  Plusieurs services se partagent le travail chez vous&nbsp;?
                </h2>
                <p className="tf-lead max-w-[46rem]">
                  Cette grille n&apos;est pas votre porte&nbsp;: quand plusieurs personnes valident,
                  chacune sur son poste, votre prix sort d&apos;un audit.
                </p>
                <Link href="/reserver-un-audit" className="tf-btn w-fit">
                  Réserver un échange
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
