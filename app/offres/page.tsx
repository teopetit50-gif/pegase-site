import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import {
  HeroCollage,
  IconeAide,
  IconeCoffre,
  IconeFleche,
  IconeFlecheDroite,
  IconePrise,
  IconeValidation,
  MediaAnswr,
  MediaCatalogue,
  MediaEtapes,
  MediaLocal,
  MediaOffload,
  MediaOutils,
  MediaPayd,
  MediaValidation,
} from "@/components/offres/Media";
import { SystemMarque } from "@/components/logos";

/* ══════════════════════════════════════════════════════════════════════
   /offres — « Nos offres » (25/07/2026)

   Reprise à l'identique de la maquette de référence demandée par Teo
   (ocoya.com/features/create) : mêmes sections dans le même ordre, mêmes
   proportions, même typographie, mêmes rayons et mêmes animations d'entrée.
   Relevé au pixel sur viewport 1440 — voir le bloc `.offres` de globals.css
   pour les tokens.

   Ce qui change par rapport à la référence : le CONTENU. Textes, moteurs,
   chiffres et visuels sont ceux de Omega — reprendre la copie et les
   captures produit d'un tiers n'aurait ni sens commercial ni base légale.
   Les trois photos viennent de la bibliothèque déjà présente dans
   public/photos (Unsplash, licence et crédits dans CREDITS.txt).

   Le chrome (header caméléon, footer) reste celui du site : les sections
   claires portent data-monde="clair" pour que le header bascule en blanc.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Nos offres | Omega.AI",
  description:
    "Un poste par corvée : relance d'impayés, clients dormants, réponses clients 24/7, factures fournisseurs classées. Installés sur vos outils actuels (mail, tableur, WhatsApp), sous votre validation.",
};

/* ——— rangée des quatre arguments, sous le hero ——— */
/* 07/08 (Teo) — les quatre arguments sont réécrits, textes fournis tels quels.
   Deux jeux de titres étaient proposés : les intitulés développés retenus ici
   et une variante en un mot (INTÉGRATION / CONTRÔLE / SÉCURITÉ / FINANCEMENT).
   Les développés l'emportent parce qu'ils disent de quoi il s'agit sans
   dépendre du texte dessous, et qu'ils tiennent tous sur une ou deux lignes
   dans la colonne centrée. Pour basculer sur la variante courte, il suffit de
   remplacer les quatre `titre`.

   Le texte fourni pour le bloc financement ne mentionnait plus la Région.
   L'incise a été remise (arbitrage Teo du 07/08) : le Chèque TIC est un
   dispositif régional guadeloupéen, et sans elle cette page — qui s'adresse
   à toute la France — laissait croire à une aide ouverte à tous. */
const ARGUMENTS = [
  {
    icone: <IconePrise />,
    titre: "Intégration à votre environnement",
    texte:
      "Nos systèmes s'intègrent à vos outils existants (messagerie, tableaux de suivi et canaux de communication) sans imposer de changement d'organisation.",
  },
  {
    icone: <IconeValidation />,
    titre: "Contrôle humain",
    texte:
      "Vous conservez la validation des actions sensibles. Les règles de fonctionnement, les niveaux d'autonomie et les validations sont définis avec vous.",
  },
  {
    icone: <IconeCoffre />,
    titre: "Sécurité des données",
    texte:
      "Les environnements clients sont cloisonnés et les données protégées par des mécanismes de chiffrement et de contrôle d'accès adaptés.",
  },
  {
    icone: <IconeAide />,
    titre: "Financement éligible",
    /* « de la Région Guadeloupe » et « qui y sont immatriculées » sont remis
       (Teo, 07/08) : sans eux, un lecteur hexagonal se croit éligible à une
       aide qui ne le concerne pas. Seule cette incise est ajoutée au texte
       fourni, le reste est intact. */
    texte:
      "Selon votre situation et la nature du projet, une partie de l'investissement peut être prise en charge dans le cadre du Chèque TIC, le dispositif de la Région Guadeloupe ouvert aux entreprises qui y sont immatriculées. L'éligibilité est vérifiée en amont.",
  },
];

/* ——— les trois cartes de la bande noire ———
   05/08/2026 (Teo) — les PHOTOS cèdent la place aux LOGOS DE PAQUETS. Chaque
   carte porte désormais la marque de l'offre vers laquelle elle mène, en grand,
   au lieu d'une scène d'illustration.

   Pourquoi le logo est posé en BLANC sur fond sombre et non l'inverse : le titre
   et le lien de ces cartes sont blancs, calés sur le voile `.o-photo::after`.
   Un fond clair aurait obligé à réencrer titre, lien et pastille — trois
   régressions de contraste pour un gain nul. Les masques alpha se colorent en
   CSS, donc le blanc ne coûte aucun fichier supplémentaire.

   Et c'est le `mark` (icône seule) qui est affiché, pas le lockup : le nom du
   paquet est déjà écrit juste en dessous, dans « Voir CASHD ».

   Les photos (`/photos/payd-comptoir.jpg`, `answr-carte.jpg`, `offload.jpg`)
   restent au dépôt — ServiceDetail les sert encore. */
const SCENES: {
  system: string;
  etiquette: string;
  titre: string;
  lien: string;
  href: string;
}[] = [
  {
    system: "CASHD",
    etiquette: "Trésorerie",
    titre: "Vos factures cessent de dormir.",
    lien: "Voir CASHD",
    href: "/offres/relances-impayes",
  },
  {
    system: "FRONTD",
    etiquette: "24 h/24",
    titre: "Vos clients ont une réponse la nuit.",
    lien: "Voir FRONTD",
    href: "/offres/demandes-clients",
  },
  {
    system: "FILED",
    etiquette: "Comptabilité",
    titre: "Votre compta arrête d'avoir un mois de retard.",
    lien: "Voir FILED",
    href: "/offres/factures-fournisseurs",
  },
  /* 07/08/2026 (Teo) — quatrième carte. Les trois premières nomment un paquet
     du catalogue ; celle-ci dit l'inverse — que le catalogue n'est pas une
     limite. Elle ferme donc la colonne, après les cas concrets, et pas avant :
     proposer le sur-mesure d'entrée ferait passer les paquets pour un
     rabais. Sa cible est /offres/sur-mesure, une route statique qui rend le
     même gabarit que CASHD sans passer par [system] — voir le commentaire en
     tête de ce fichier-là. */
  {
    system: "SUR MESURE",
    etiquette: "Sur mesure",
    titre: "Et si votre besoin n'entre dans aucune case.",
    lien: "Voir le sur-mesure",
    href: "/offres/sur-mesure",
  },
];

/* ——— en-tête de section : pastille, titre, chapô, centrés ——— */
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

/* ——— carte bento blanche : titre, une ligne, puis le média arrimé en bas ——— */
function CarteBento({
  titre,
  texte,
  children,
  serre = false,
}: {
  titre: string;
  texte: string;
  children: React.ReactNode;
  serre?: boolean;
}) {
  return (
    <div
      data-reveal
      className={`o-card flex flex-col items-center px-6 pt-10 sm:px-[50px] sm:pt-[50px] ${
        serre ? "pb-10 sm:pb-[50px]" : "pb-0"
      }`}
    >
      {/* trame pointillée du fond de carte — elle ne monte jamais jusqu'au
          texte, sinon elle le salit */}
      <div
        aria-hidden
        className="o-dots o-dots-fade-up pointer-events-none absolute inset-x-0 bottom-0 top-[38%]"
      />
      <h3 className="o-h5 relative text-center">{titre}</h3>
      <p className="o-body relative mt-2 max-w-[465px] text-center">{texte}</p>
      {/* mt-auto et non une marge fixe : les deux cartes d'une même rangée
          prennent la hauteur de la plus haute, et sans cela le média de la
          plus courte flottait au milieu du pointillé au lieu d'être arrimé
          au bord bas comme sur la référence */}
      <div className="relative mt-auto w-full pt-[42px]">{children}</div>
    </div>
  );
}

/* ——— carte du bloc « mise en place » : plate, alignée à gauche ——— */
function CarteMise({
  titre,
  texte,
  children,
  avant,
  lien,
}: {
  titre: string;
  texte: string;
  children?: React.ReactNode;
  avant?: React.ReactNode;
  lien?: { label: string; href: string };
}) {
  return (
    <div data-reveal className="o-card-soft flex flex-col p-8 sm:p-10">
      {avant ? <div className="mb-7">{avant}</div> : null}
      <h3 className="o-h5">{titre}</h3>
      <p className="o-body mt-2.5">{texte}</p>
      {children ? <div className="mt-7">{children}</div> : null}
      {lien ? (
        <Link href={lien.href} className="o-link mt-7">
          {lien.label}
          <IconeFleche />
        </Link>
      ) : null}
    </div>
  );
}

export default function OffresPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="offres">
        {/* ════════ HERO ════════
            Fond pointillé sur les 600 premiers pixels, éteint en dégradé ;
            le collage produit chevauche le bas du bloc de texte. */}
        {/* pt calé sur la référence : la pastille y tombe à 225 px du haut de
            page. Le header du site occupe 72 px DANS le flux (il est sticky,
            pas fixed, contrairement à la nav flottante de la référence), d'où
            81 + 60 au lieu de 160 + 60. */}
        <section
          data-monde="clair"
          className="relative overflow-hidden pt-[40px] sm:pt-[81px]"
        >
          <div
            aria-hidden
            className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[600px]"
          />

          <div className="o-wrap relative">
            <div className="flex flex-col items-center pt-[60px] text-center">
              <div data-reveal>
                <span className="o-pill o-pill--xs">Nos offres</span>
              </div>
              <h1 data-reveal className="o-h1 mt-4 max-w-[700px]">
                Commencez par le processus qui a le plus d&apos;impact.
              </h1>
              <p data-reveal className="o-lead mt-[15px] max-w-[650px]">
                Nous identifions avec vous le poste où l&apos;automatisation
                crée le plus de valeur, puis nous le déployons directement dans
                votre environnement existant. Une approche progressive,
                mesurable et sans migration inutile.
              </p>
              <div data-reveal className="mt-[25px] flex flex-wrap items-center justify-center gap-3">
                <Link href="/tarifs" className="o-btn o-btn--primary">
                  Audit gratuit
                </Link>
              </div>
            </div>

            <div data-reveal className="mt-10 pb-[15px]">
              <HeroCollage />
            </div>
          </div>
        </section>

        {/* ════════ QUATRE ARGUMENTS — bande noire ════════
            Pas de data-monde="clair" : le header caméléon doit rester sombre
            au-dessus de cette bande. Le fond déborde jusqu'aux bords de
            l'écran via .o-nuit, le contenu reste dans la colonne. */}
        <section className="o-nuit py-[90px] sm:py-[110px]">
          <div className="o-wrap">
            <div className="grid grid-cols-1 gap-x-20 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
              {ARGUMENTS.map((a) => (
                <div key={a.titre} data-reveal className="flex flex-col items-center text-center">
                  <span style={{ color: "var(--o-text)" }}>{a.icone}</span>
                  <h3
                    className="mt-5 text-[20px] font-semibold tracking-[-0.02em]"
                    style={{ fontFamily: "var(--font-jakarta)", color: "var(--o-text)" }}
                  >
                    {a.titre}
                  </h3>
                  <p className="o-body mt-2 max-w-[240px]">{a.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ LES MOTEURS — bento 2×2 ════════ */}
        <section id="moteurs" data-monde="clair" className="o-wrap scroll-mt-24 pb-[120px]">
          <EnTete
            pastille="Ce qui s'installe"
            titre="Chacun fait un seul travail."
            chapo="Aucun ne fait tout : chacun prend une corvée, la traite en continu sur vos outils, et s'arrête sur votre validation. Trois exemples, puis les autres."
          />

          <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <CarteBento
              titre="CASHD · impayés"
              texte="Devis sans réponse relancés à J+3 et J+7, factures échues à J+7 et J+21."
            >
              <MediaPayd />
            </CarteBento>
            <CarteBento
              titre="FRONTD · demandes clients"
              texte="Une demande reçue à 21 h obtient sa réponse à 21 h."
            >
              <MediaAnswr />
            </CarteBento>
            <CarteBento
              titre="FILED · la paperasse"
              texte="Factures fournisseurs lues, classées par fournisseur, transmises au cabinet à date fixe."
            >
              <MediaOffload />
            </CarteBento>
            <CarteBento
              titre="Les six d'un coup d'œil"
              texte="Quatre qui s'installent, deux qui viennent avec : RELOAD ramène du chiffre, PULSE donne le point du matin, VAULT garantit que rien ne part sans vous."
              serre
            >
              <MediaCatalogue />
            </CarteBento>
          </div>
        </section>

        {/* ════════ BANDE NOIRE — texte + chiffres à gauche, scènes à droite ════════ */}
        <section className="bg-black py-[120px]" style={{ boxShadow: "0 0 0 100vmax #000", clipPath: "inset(0 -100vmax)" }}>
          <div className="o-wrap flex flex-col items-start gap-[70px] lg:flex-row lg:items-center lg:gap-20">
            {/* colonne texte — 560 px sur la maquette */}
            <div className="w-full lg:w-[560px] lg:shrink-0">
              <div data-reveal>
                <span className="o-pill o-pill--xs o-pill--dark">Installé sur l&apos;existant</span>
              </div>
              <h2 data-reveal className="o-h2 mt-4 !text-white">
                Branché sur vos outils actuels.
              </h2>
              <p data-reveal className="o-body mt-5 !text-white/60">
                Pas de CRM à acheter, pas de migration, pas de compte à créer.
                Le moteur lit vos données là où elles sont : votre tableur,
                votre messagerie, et écrit là où vous travaillez déjà. Le
                raccordement type prend une demi-journée.
              </p>
              <div data-reveal className="mt-5">
                <Link href="/tarifs" className="o-link o-link--light">
                  Commencer
                  <IconeFleche />
                </Link>
              </div>

              <div data-reveal className="mt-[70px] grid grid-cols-1 gap-x-[50px] gap-y-10 sm:grid-cols-2">
                <div>
                  <div className="o-h2 !text-white">30 min</div>
                  <p className="o-body mt-2 !text-white/60">
                    L&apos;audit qui chiffre votre problème n°1 : ce qu&apos;il
                    vous coûte réellement, et le moteur au meilleur retour.
                  </p>
                </div>
                <div>
                  <div className="o-h2 !text-white">10 000 €</div>
                  <p className="o-body mt-2 !text-white/60">
                    Le plafond de financement Chèque TIC pour les
                    entreprises guadeloupéennes éligibles. Vérifié pendant l&apos;audit.
                  </p>
                </div>
              </div>
            </div>

            {/* colonne scènes — 07/08 (Teo, « elles prennent trop de place ») :
                les cartes passent de 560×450 à 560×260 et l'écart de 60 à 28 px.
                Le cadre était aux deux tiers vide — le signe occupait le haut,
                le titre le bas, et un grand blanc mort entre les deux. En 260
                de haut les deux se rejoignent sans se toucher, et la colonne
                gagne près de 900 px sur quatre cartes, ce qui compte d'autant
                plus qu'une quatrième vient d'être ajoutée. */}
            <div className="flex w-full flex-col gap-7 lg:w-[560px] lg:shrink-0">
              {SCENES.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  data-reveal
                  className="o-photo o-photo--marque"
                >
                  <SystemMarque system={s.system} />
                  <span className="o-pill o-pill--xs o-pill--verre o-marque-etiquette">
                    {s.etiquette}
                  </span>
                  <div className="o-marque-texte">
                    <div className="o-h4 !text-white">{s.titre}</div>
                    <span className="o-link o-link--light mt-5">
                      {s.lien}
                      <IconeFleche />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ MISE EN PLACE — bento décalé sur deux colonnes ════════ */}
        <section data-monde="clair" className="o-wrap py-[120px]">
          <EnTete
            pastille="Mise en place"
            titre="Rien ne démarre sans vous."
            chapo="De l'audit au premier moteur en production, chaque jalon se valide avant le suivant, et vous n'aurez changé aucun outil en chemin."
          />

          {/* deux colonnes de hauteurs différentes : c'est ce décalage qui
              donne le rythme de la maquette, pas une grille régulière */}
          <div className="mx-auto mt-20 grid max-w-[1000px] grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-8">
              <CarteMise
                titre="Trois étapes, pas trois mois"
                texte="Audit, raccordement, premier cycle supervisé. Comptez une demi-journée de branchement, puis deux semaines de rodage."
              >
                <MediaEtapes />
              </CarteMise>
              <CarteMise
                titre="Sur vos outils"
                texte="Le moteur se branche sur ce que vous utilisez déjà. Ni compte à créer, ni colonne à renommer, ni habitude à changer."
                avant={<MediaOutils />}
                lien={{ label: "Vérifier la compatibilité", href: "/tarifs" }}
              />
            </div>

            <div className="flex flex-col gap-8">
              <CarteMise
                titre="Rien ne part sans vous"
                texte="Les premières semaines, tout vous est soumis avant envoi. Ensuite vous choisissez ce qui part seul et ce qui attend votre accord."
              >
                <MediaValidation />
              </CarteMise>
              <CarteMise
                titre="Vos données restent les vôtres"
                texte="Un espace de données chiffré et séparé pour chaque client, et le strict nécessaire transmis aux modèles à chaque tâche."
              >
                <MediaLocal />
              </CarteMise>
            </div>
          </div>
        </section>

        {/* ════════ CTA FINAL — carte gris clair à trame pointillée ════════ */}
        <section data-monde="clair" className="o-wrap pb-[120px]">
          <div
            data-reveal
            className="relative overflow-hidden rounded-[15px] bg-[#fafafa] px-6 py-16 text-center sm:px-20 sm:py-20"
          >
            <div
              aria-hidden
              className="o-dots o-dots-fade-up pointer-events-none absolute inset-x-0 bottom-0 top-1/2"
            />
            <h2 className="o-h2 relative mx-auto max-w-[1040px]">
              Un chiffre avant tout devis.
            </h2>
            <p className="o-lead relative mx-auto mt-4 max-w-[610px]">
              Trente minutes pour mesurer ce que votre difficulté principale
              vous coûte, et désigner le moteur au meilleur retour. Gratuit,
              sans engagement.
            </p>
            <div className="relative mt-8">
              <Link href="/tarifs" className="o-btn o-btn--primary">
                Audit gratuit
                <IconeFlecheDroite taille={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
