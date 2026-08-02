import type { Metadata } from "next";
import Image from "next/image";
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
  title: "Nos offres — Omega",
  description:
    "Un moteur par corvée : relance d'impayés, réponses clients 24/7, factures fournisseurs classées. Installés sur vos outils actuels — mail, tableur, WhatsApp — sous votre validation.",
};

/* ——— rangée des quatre arguments, sous le hero ——— */
const ARGUMENTS = [
  {
    icone: <IconePrise />,
    titre: "Sur vos outils",
    texte:
      "Mail, tableur, WhatsApp : le moteur lit et écrit là où vous travaillez déjà. Ni CRM à acheter, ni colonne à renommer.",
  },
  {
    icone: <IconeValidation />,
    titre: "Rien ne part sans vous",
    texte:
      "Chaque message s'approuve, se corrige ou se suspend d'un clic — aussi longtemps que vous le voulez.",
  },
  {
    icone: <IconeCoffre />,
    titre: "Données cloisonnées",
    texte:
      "Un espace chiffré par client, hébergé dans l'Union européenne — jamais mélangées, jamais revendues. Le strict nécessaire aux modèles.",
  },
  {
    icone: <IconeAide />,
    titre: "Chèque TIC",
    texte:
      "Jusqu'à 10 000 € financés par la Région pour les TPE éligibles, selon le poste. Vérifié pendant l'audit.",
  },
];

/* ——— les trois cartes photo de la bande noire ———
   `pos` : object-position, posé seulement quand le cadrage par défaut (centre)
   coupe le sujet — une photo portrait dans un cadre 560×450, typiquement. */
const SCENES: {
  photo: string;
  alt: string;
  pos?: string;
  etiquette: string;
  titre: string;
  lien: string;
  href: string;
}[] = [
  {
    /* 31/07 (Teo) — payd-card.jpg (carte bancaire noire tenue en main sur
       fond sombre) se confondait avec la bande noire de la section : « image
       noire avec fond noir ». Remplacée par une scène claire — un client
       règle au comptoir d'une boulangerie-café, employée face caméra, grande
       baie vitrée — qui se détache du noir et dit « l'argent rentre ».
       payd-card.jpg reste servie par ServiceDetail (onglet PAYD), intouchée.
       Ratio 1600×1200 = 1,333 pour un cadre 1,244 : cover ne rogne que ~7 %
       en largeur, pas de `pos` nécessaire, le sujet est centré. */
    photo: "/photos/payd-comptoir.jpg",
    alt: "Client réglant au comptoir d'une boulangerie-café, l'employée encaisse",
    etiquette: "Trésorerie",
    titre: "Vos factures cessent de dormir.",
    lien: "Voir PAYD",
    href: "/offres/payd",
  },
  {
    /* 26/07 (Teo) — answr-phone.jpg montrait un iPhone à l'écran VIERGE sur
       fond gris : la scène disait « un téléphone », pas « ANSWR répond ». La
       maquette de conversation montre le moteur en train de tenir l'échange,
       jusqu'à la prise de rendez-vous.

       29/07 (Teo, « la photo est trop grosse ») — answr-conversation.jpg est
       la seule image PORTRAIT du lot (941×1672, ratio 0,563) dans un cadre
       .o-photo paysage (560×450, ratio 1,244). En object-fit: cover elle était
       donc agrandie à 995 px de haut pour 450 visibles : 55 % hors champ, et
       un téléphone démesuré. Les deux autres scènes, en 1,5, ne perdent que
       18 % en largeur — d'où l'écart criant entre les trois cartes.

       answr-carte.jpg est la même maquette RECOMPOSÉE au ratio du cadre :
       l'îlot propre du sujet (téléphone + doigts, isolé sur blanc pur de
       y=172 à y=1350) est posé à 82 % de la hauteur et ancré en bas — sa
       coupe tombe pile sur le bord, donc invisible. À 82 %, le haut du
       téléphone descend à 18 % du cadre : la pastille « 24 h/24 » du coin
       supérieur droit reste sur le blanc au lieu de mordre sur l'écran.
       Le ratio étant désormais exact, `cover` ne recadre plus rien et `pos`
       n'a plus d'objet. Le master portrait reste au dépôt.

       29/07 (Teo, « c'est pas centrée ») — le sujet était volontairement
       décalé à droite pour dégager le fond sous le titre. Il est désormais
       au centre exact (394 px de marge à gauche, 393 à droite). Le sujet
       étant ancré en bas, le titre passe donc sur le bas du téléphone : le
       contraste a été remesuré voile compris et tient l'AA. */
    photo: "/photos/answr-carte.jpg",
    alt: "Conversation ANSWR sur un téléphone tenu à deux mains : demande de devis, créneau proposé, rendez-vous confirmé",
    etiquette: "24 h/24",
    titre: "Vos clients ont une réponse la nuit.",
    lien: "Voir ANSWR",
    href: "/offres/answr",
  },
  {
    /* offload-chip.jpg (gros plan de processeur) illustrait le mot « chip »,
       pas la comptabilité. offload.jpg — une personne qui dépouille des
       papiers — dit la corvée que le moteur enlève. */
    photo: "/photos/offload.jpg",
    alt: "Personne attablée qui dépouille des papiers",
    etiquette: "Comptabilité",
    titre: "Votre compta arrête d'avoir un mois de retard.",
    lien: "Voir OFFLOAD",
    href: "/offres/offload",
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
                Un moteur par tâche qui vous coûte cher.
              </h1>
              <p data-reveal className="o-lead mt-[15px] max-w-[650px]">
                Douze moteurs au catalogue, un seul installé à la fois : celui
                dont l&apos;audit démontre qu&apos;il rapporte le plus chez
                vous. Sur vos outils actuels, sans migration.
              </p>
              <div data-reveal className="mt-[25px] flex flex-wrap items-center justify-center gap-3">
                <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
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
            pastille="Moteurs"
            titre="Chacun fait un seul travail."
            chapo="Un moteur ne fait pas tout : il prend une tâche, la traite en continu sur vos outils, et s'arrête sur votre validation. Trois exemples, puis le catalogue."
          />

          <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <CarteBento
              titre="PAYD — impayés"
              texte="Devis sans réponse relancés à J+3 et J+7, factures échues à J+7 et J+21."
            >
              <MediaPayd />
            </CarteBento>
            <CarteBento
              titre="ANSWR — demandes clients"
              texte="Une demande reçue à 21 h obtient sa réponse à 21 h."
            >
              <MediaAnswr />
            </CarteBento>
            <CarteBento
              titre="OFFLOAD — comptabilité"
              texte="Factures fournisseurs lues, classées par fournisseur, transmises au cabinet à date fixe."
            >
              <MediaOffload />
            </CarteBento>
            <CarteBento
              titre="9 autres moteurs"
              texte="Du moteur défensif au produit sectoriel. Chaque nom ouvre sa fiche détaillée."
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
                Le moteur lit vos données là où elles sont — votre tableur,
                votre messagerie — et écrit là où vous travaillez déjà. Le
                raccordement type prend une demi-journée.
              </p>
              <div data-reveal className="mt-5">
                <Link href="/reserver-un-audit" className="o-link o-link--light">
                  Demander un audit
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
                    TPE guadeloupéennes éligibles. Vérifié pendant l&apos;audit.
                  </p>
                </div>
              </div>
            </div>

            {/* colonne scènes — trois cartes 560×450, 60 px d'écart */}
            <div className="flex w-full flex-col gap-[60px] lg:w-[560px] lg:shrink-0">
              {SCENES.map((s) => (
                <Link key={s.href} href={s.href} data-reveal className="o-photo block">
                  <Image
                    src={s.photo}
                    alt={s.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 560px"
                    style={s.pos ? { objectPosition: s.pos } : undefined}
                  />
                  <span className="o-pill o-pill--xs o-pill--verre absolute right-[30px] top-[30px] z-10">
                    {s.etiquette}
                  </span>
                  <div className="absolute inset-x-[30px] bottom-[30px] z-10">
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
            chapo="De l'audit au premier moteur en production, chaque jalon se valide avant le suivant — et vous n'aurez changé aucun outil en chemin."
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
                lien={{ label: "Vérifier la compatibilité", href: "/reserver-un-audit" }}
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
              <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
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
