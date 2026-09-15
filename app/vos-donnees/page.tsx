import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Apparition from "@/components/donnees/Apparition";
import HeroPlein from "@/components/donnees/HeroPlein";
import Options, { type Option } from "@/components/donnees/Options";
import { SchemaTrajet } from "@/components/donnees/Media";
import CarteLieux from "@/components/donnees/CarteLieux";
import CartesGaranties from "@/components/donnees/CartesGaranties";
import {
  Chevron,
  FlecheCoin,
  Guillemet,
  IconeBarriere,
  IconeCadenas,
  IconeEmporter,
  IconeJournal,
  IconeLieu,
  IconeOeil,
  IconeSablier,
  IconeServeur,
  IconeZero,
} from "@/components/donnees/Icones";

/* ══════════════════════════════════════════════════════════════════════
   /vos-donnees — « Où vont vos données » (v2, 08/08/2026)

   Reproduction à l'identique de **scale.com/global-public-sector**, demandée
   par Teo le 08/08 en remplacement de la v1, qui reproduisait
   scale.com/public-sector. Mêmes sections dans le même ordre, mêmes
   proportions, même échelle typographique, mêmes rayons. Le relevé au pixel
   et le choix de police sont documentés en tête du bloc `.vd` de globals.css.

   Correspondance section par section avec la référence :
     hero plein cadre, titre 3 lignes en dégradé   → « Où / vont / vos données »
     H2 à gauche + para à droite                   → « Elles dorment à Francfort »
     grande carte bleu ardoise + schéma au trait   → le trajet d'une donnée
     H2 centré + 3 vignettes dans un bloc gris     → les trois lieux de passage
     « How Scale Delivers Value » + 6 cartes       → les six garanties
     carte citation bleu ardoise                   → notre engagement contractuel
     3 chiffres                                    → Francfort / 0 / 30 jours
     tableau « Solutions Portfolio »               → qui reçoit quoi
     bandeau vidéo                                 → bandeau photo
     « USE CASES » à onglets                       → les deux hébergements
     CTA final plein cadre                         → « Vos données, votre choix »

   ── ⚠ AUCUN NOM DE PRESTATAIRE SUR CETTE PAGE (14/08/2026) ─────────────
   Règle posée par Teo : le site ne dit JAMAIS quels outils nous utilisons.
   On écrit « notre base de données », « nos automatisations », « notre
   fournisseur de modèles » — jamais le nom de l'éditeur. Cette page les
   nommait tous (tableau « qui reçoit quoi », six garanties, deux
   hébergements, citation, colonne « Sources » du pied) : c'était la plus
   exposée du site. Ne pas les réintroduire, même « pour faire sérieux » —
   la preuve passe désormais par le contrat, pas par la marque d'un tiers.

   Contrepartie assumée : la carte ardoise ne cite plus un tiers vérifiable,
   elle porte notre engagement. Et le tableau annonce désormais que la liste
   NOMINATIVE est annexée au contrat et donnée sur demande — c'est ce qui
   tient la page côté RGPD, un client doit pouvoir savoir qui traite ses
   données. Cette annexe doit donc exister avant la signature du premier
   contrat.

   ── CE QUI EST VÉRIFIÉ (interne — ne pas republier les noms) ────────────
   • Francfort. Le projet de base `omega-core-eu` (ref noepmkkplxshjbmqqxft)
     est en région `eu-central-1`, c'est-à-dire Francfort. Relevé le 07/08
     via l'API de l'hébergeur, pas déduit d'un document.
   • Le fournisseur de modèles n'entraîne pas sur les produits commerciaux :
     c'est son réglage par défaut, documenté dans son centre de
     confidentialité (lien retiré de la page, conservé côté interne).
   • Rétention par défaut de 30 jours sur l'API, et accord « zéro rétention »
     possible sur approbation.
   • Certifications du fournisseur de modèles : SOC 2 Type I et II,
     ISO 27001:2022, ISO/IEC 42001:2023.

   ── CE QUI DOIT ÊTRE VALIDÉ PAR TEO ────────────────────────────────────
   Inchangé depuis la v1 — ces phrases décrivent des ENGAGEMENTS, pas des
   faits relevés, et la page est publique :
     1. Le périmètre exact lu par chaque moteur (tableau « qui reçoit quoi »).
     2. La liste des sous-traitants, tirée des URL présentes dans le dépôt.
        Surtout : la RÉGION de l'instance qui fait tourner les moteurs, qui
        n'a pas pu être relevée. Si elle n'est pas en UE, « rien ne sort de
        l'UE » ne vaut que pour la base, pas pour le flux.
     3. L'offre « installation locale » : vendable aujourd'hui, à quel prix,
        avec quel modèle local ? Les trois chiffres de son onglet aussi.
     4. Le délai d'effacement de 30 jours annoncé « écrit au contrat » — il
        doit exister dans un contrat avant d'être annoncé ici.

   Les cinq photos ont été sourcées le 08/08 (Teo : les précédentes « sont
   moches »). Unsplash, bibliothèque gratuite, crédits dans
   public/photos/CREDITS.txt.

   ── LA BARRE DU HAUT EST CELLE DU SITE (14/08/2026) ────────────────────
   Teo : « la barre du haut de la page où vont vos données est différente de
   la barre du haut des autres pages […] que ce soit exactement le même ».
   La page portait son propre chrome, relevé sur scale.com/public-sector :
   un bandeau noir d'annonce « Francfort, UE » surmontant une barre blanche
   à liens inline et deux boutons. Les deux sont supprimés au profit de
   <Header />, le header caméléon de tout le site — components/Header.tsx.
   L'ancien composant (components/donnees/Chrome.tsx) est supprimé avec eux.

   Il est posé HORS du `<div className="vd">`, et c'est la condition pour
   qu'il soit vraiment identique : sous `.vd` il hériterait de Hanken
   Grotesk et du noir du bloc, alors que tout le reste du site est en Inter.

   Le PIED de page, lui, reste propre à la page (`.vd-pied`) : Teo n'a parlé
   que du haut.

   ── LE HEADER N'EST PLUS MONTÉ ICI (14/09/2026) ─────────────────────
   Depuis le 01/09, app/layout.tsx rend <Header /> pour tout le site, hors
   du sous-arbre de page. Cette page était la dernière à en monter un
   second ; tant que la barre était `fixed` les deux se superposaient sans
   que rien ne se voie, et depuis qu'elle est `sticky` (menu du 11/09) ils
   s'empilaient : deux barres l'une sous l'autre — Teo : « ça met deux
   trucs comme ça, c'est un bug ». La condition « hors de `.vd` » tient
   toujours, le layout le pose avant {children}.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Où vont vos données | Omega.AI",
  description:
    "Hébergement dans l'Union européenne, à Francfort, ou installation sur vos propres serveurs. Liste des sous-traitants et du périmètre reçu par chacun, chiffrement, journalisation et conditions de réversibilité.",
};


/* ——— les six garanties ——— */
const GARANTIES = [
  {
    icone: IconeLieu,
    titre: "Hébergement européen",
    texte:
      "Notre base de données est hébergée dans la région eu-central-1, à Francfort, en Allemagne. Aucune réplication n'est effectuée hors de l'Union européenne.",
  },
  {
    icone: IconeBarriere,
    titre: "Aucun entraînement",
    texte:
      "Nos fournisseurs de modèles n'utilisent ni les entrées ni les sorties de leurs produits commerciaux pour entraîner leurs modèles. Ce réglage est celui de nos contrats et ne dépend d'aucune démarche de votre part.",
  },
  {
    icone: IconeCadenas,
    titre: "Chiffrement de bout en bout",
    texte:
      "Les liaisons sont chiffrées en TLS et les données le sont au repos chez notre hébergeur. Les accès reposent sur des jetons nominatifs, que nous révoquons immédiatement à votre demande.",
  },
  {
    icone: IconeOeil,
    titre: "Validation avant envoi",
    texte:
      "Le système prépare chaque envoi, puis le soumet à la personne habilitée dans votre organisation. Tant que la validation n'a pas eu lieu, le message reste un brouillon dans votre outil.",
  },
  {
    icone: IconeJournal,
    titre: "Tout est journalisé",
    texte:
      "Chaque exécution inscrit une ligne au journal : date, système, décision et destinataire. Ce journal reste consultable et exportable à tout moment, y compris pour un contrôle.",
  },
  {
    icone: IconeEmporter,
    titre: "Réversibilité",
    texte:
      "Vos automatisations s'exportent en fichiers lisibles et vos données dans un format de base standard. Aucun format propriétaire n'intervient, ce qui vous permet de reprendre l'ensemble sans conversion.",
  },
];

/* ——— les trois chiffres ——— */
const CHIFFRES = [
  {
    icone: IconeServeur,
    etiquette: "HÉBERGEMENT",
    valeur: "eu-central-1",
    texte: "Francfort, Allemagne : aucune réplication hors de l'Union européenne",
  },
  {
    icone: IconeZero,
    etiquette: "ENTRAÎNEMENT",
    valeur: "0",
    texte: "Aucune de vos données ne sert à entraîner un modèle",
  },
  {
    icone: IconeSablier,
    etiquette: "RÉTENTION MODÈLE",
    valeur: "30 j",
    texte: "Durée maximale de rétention chez notre fournisseur, puis effacement",
  },
];

/* ——— le tableau « qui reçoit quoi » ———
   Les couleurs de pastille reprennent la palette de la référence, qui donne
   une teinte par catégorie sans jamais la légender : c'est un repère de
   lecture, pas un code. */
const RECOIT: { point: string; nom: string; role: string; jetons: string[] }[] = [
  {
    point: "#7c6cf0",
    nom: "Notre base de données",
    role: "hébergeur européen",
    jetons: ["Francfort · eu-central-1", "Fiches clients", "Journal d'exécution", "Chiffré au repos"],
  },
  {
    point: "#5b8def",
    nom: "Nos automatisations",
    role: "orchestration des systèmes",
    jetons: ["Les systèmes", "Les identifiants de connexion", "Aucune archive de contenu"],
  },
  {
    point: "#d97757",
    nom: "Notre fournisseur de modèles",
    role: "intelligence artificielle",
    jetons: ["Le texte à traiter", "Aucun entraînement", "Rétention 30 jours max"],
  },
  {
    point: "#2fb6a8",
    nom: "Votre messagerie",
    role: "l'outil que vous aviez déjà",
    jetons: ["Vos e-mails", "Vos pièces jointes", "Déjà chez vous avant Omega.AI"],
  },
  {
    point: "#4ac26b",
    nom: "Votre WhatsApp",
    role: "l'outil que vous aviez déjà",
    jetons: ["Les conversations du numéro branché", "Rien d'autre"],
  },
  {
    point: "#a1a1aa",
    nom: "L'hébergeur de ce site",
    role: "site vitrine",
    jetons: ["Ce site", "Aucune donnée client"],
  },
];

/* ——— les deux hébergements, pour la section à onglets ——— */
const OPTIONS: Option[] = [
  {
    cle: "francfort",
    onglet: "Hébergement Omega.AI · Francfort",
    titre: "Votre base hébergée à Francfort",
    resume:
      "Vous n'administrez aucune machine. Notre base est opérée dans la région eu-central-1 et nos automatisations exécutent les systèmes, tandis que vos équipes conservent la validation de ce qui est produit.",
    image: "/photos/donnees-francfort-datacenter.jpg",
    alt: "Allée d'une salle de serveurs, baies métalliques alignées",
    chiffres: [
      { valeur: "48 h", libelle: "Mise en route" },
      { valeur: "0 €", libelle: "Matériel à acheter" },
      { valeur: "UE", libelle: "Lieu de la base" },
    ],
    principe:
      "Votre environnement existant reste en place. Le système s'y connecte, lit les champs dont il a besoin, écrit son résultat dans la base, puis vous le soumet pour validation.",
    obtenez: [
      "Une base de données à Francfort, chiffrée au repos",
      "Les sauvegardes et la supervision comprises",
      "Un export complet en un clic, à tout moment",
      "L'effacement de la base et des sauvegardes sur demande",
    ],
  },
  {
    cle: "local",
    onglet: "Installation locale · vos serveurs",
    titre: "Une installation sur vos propres serveurs",
    resume:
      "Ce dispositif s'adresse aux organisations dont la politique interne interdit toute sortie de données. Nous installons les systèmes sur un serveur qui vous appartient, en conteneurs isolés et sur disque chiffré, à l'intérieur de votre réseau.",
    image: "/photos/donnees-rack-local.jpg",
    alt: "Baie de brassage vue de près, câble orange lové",
    chiffres: [
      { valeur: "0", libelle: "Base distante" },
      { valeur: "100 %", libelle: "Chez vous" },
      { valeur: "∞", libelle: "Durée après contrat" },
    ],
    principe:
      "Aucun appel sortant n'est émis sans votre autorisation. Si votre politique interdit tout appel externe, un modèle ouvert s'exécute sur la machine, avec une qualité de rédaction inférieure.",
    obtenez: [
      "Les systèmes installés sur votre machine, en conteneurs",
      "Les sauvegardes chez vous, sur le support de votre choix",
      "Une installation qui continue de fonctionner si le contrat prend fin",
      "La documentation d'exploitation, pour reprendre la main",
    ],
  },
];

/* ——— pied de page ——— */
const PIED = [
  {
    label: "Omega.AI",
    liens: [
      { label: "Nos offres", href: "/offres" },
      { label: "Modèles de sites", href: "/modeles" },
      { label: "Intégrations", href: "/integrations" },
      { label: "Tarifs", href: "/tarifs" },
    ],
  },
  {
    label: "Vos données",
    liens: [
      { label: "Le trajet d'une donnée", href: "#trajet" },
      { label: "Les six garanties", href: "#garanties" },
      { label: "Qui reçoit quoi", href: "#recoit" },
      { label: "Les deux hébergements", href: "#hebergement" },
    ],
  },
  {
    label: "L'entreprise",
    liens: [
      { label: "Blog", href: "/blog" },
      { label: "Commencer", href: "/commencer" },
    ],
  },
  {
    label: "Aller plus loin",
    liens: [
      { label: "RGPD : où sont hébergées vos données", href: "/blog/rgpd-donnees-locales" },
      { label: "Nos intégrations", href: "/integrations" },
      { label: "Nous écrire", href: "/contact" },
    ],
  },
];

/* ══ la page ══════════════════════════════════════════════════════════ */

export default function VosDonnees() {
  return (
    <>
      <div className="vd min-h-screen">
        <main className="mx-auto max-w-[1440px]">
          {/* ─── HERO ─────────────────────────────────────────────────────
              Plein écran en haut de page, replié dans son cadre dès qu'on
              défile — voir components/donnees/HeroPlein.tsx et le bloc
              « le hero qui se replie » de globals.css. */}
          <HeroPlein>
            <section className="vd-bleed vd-sur-image">
              <Image
                src="/photos/donnees-couloir.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="relative z-10 flex w-full max-w-[72rem] flex-col gap-6">
                {/* trois lignes forcées, comme « Global / Public / Sector » */}
                <h1 className="vd-h1 vd-titre-degrade">
                  Où
                  <br />
                  vont
                  <br />
                  vos données
                </h1>
                <p className="vd-lead max-w-[42rem]">
                  Vos données sont hébergées dans l&apos;Union européenne, à Francfort, ou sur une machine installée dans vos locaux lorsque votre politique interne l&apos;exige. Cette page décrit les deux dispositifs, les sous-traitants concernés et les engagements repris au contrat.
                </p>
                <Link href="/commencer" className="vd-cta w-fit">
                  Commencer
                  <span>
                    <Chevron className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>
            </section>
          </HeroPlein>

          {/* ─── LE TRAJET D'UNE DONNÉE ───────────────────────────────── */}
          <section id="trajet" className="scroll-mt-24 py-16 md:py-24">
            <div className="vd-wrap">
              {/* titre à gauche, accroche à droite : la composition de la
                  référence pour cette section-là. Les autres sont centrées. */}
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-20">
                <h2 className="vd-h2">
                  Vos données sont hébergées à Francfort, sans réplication ailleurs
                </h2>
                <p className="vd-body lg:pt-3">
                  Un système ne duplique ni votre messagerie ni vos fichiers. Il lit les champs nécessaires à la tâche en cours, écrit son résultat, puis laisse le reste à sa place. Le schéma ci-dessous suit une donnée d&apos;un bout à l&apos;autre du traitement.
                </p>
              </div>

              {/* le schéma se dessine à l'entrée dans l'écran — arcs tracés,
                  puis flèches, puis libellés (voir le bloc « apparitions » de
                  globals.css) */}
              <Apparition className="vd-ardoise mt-14 grid grid-cols-1 items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-24 lg:pb-28">
                <div className="vd-monte">
                  <h3 className="text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-tight tracking-[-0.01em] text-white">
                    Cinq étapes, dont une seule conserve une donnée
                  </h3>
                  <p className="mt-4 text-[15px] leading-[1.6] tracking-[-0.01em] text-white/85">
                    Le système lit la donnée, le modèle rédige une proposition, puis vos équipes valident avant tout envoi. Seule la dernière étape écrit durablement, et elle se situe en Allemagne.
                  </p>
                </div>
                <SchemaTrajet className="h-auto w-full text-white/85" />
              </Apparition>
            </div>
          </section>

          {/* ─── LES TROIS LIEUX ──────────────────────────────────────── */}
          <section className="py-16 md:py-24">
            <div className="vd-wrap">
              <div className="mx-auto max-w-[46rem] text-center">
                <h2 className="vd-h2">Les trois environnements par lesquels passent vos données</h2>
                <p className="vd-lead mt-5">
                  Vos données transitent par votre outil existant, par le système qui exécute la tâche, puis par notre base à Francfort. Aucun quatrième environnement n&apos;intervient et aucune copie de travail n&apos;est conservée ailleurs.
                </p>
              </div>

              <CarteLieux />
            </div>
          </section>

          {/* ─── LES SIX GARANTIES ────────────────────────────────────── */}
          <section id="garanties" className="scroll-mt-24 py-16 md:py-24">
            <div className="vd-wrap">
              <h2 className="vd-h2 text-center">Ce que cette architecture garantit</h2>

              <CartesGaranties
                garanties={GARANTIES.map(({ titre, texte }) => ({ titre, texte }))}
              />
            </div>
          </section>

          {/* ─── LA CITATION ──────────────────────────────────────────── */}
          <section className="py-16 md:py-24">
            <div className="vd-wrap">
              <div className="vd-ardoise relative lg:px-24 lg:py-20">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)] lg:gap-16">
                  <p className="vd-eyebrow !text-white/70">
                    ENGAGEMENT
                    <br />
                    CONTRACTUEL
                  </p>
                  <div>
                    <Guillemet className="h-4 w-auto text-white/60" />
                    <blockquote className="mt-5 text-[clamp(1.5rem,1rem+1.6vw,2.25rem)] leading-[1.25] tracking-[-0.01em] text-white">
                      Aucune de vos données, ni ce que vous nous confiez ni ce que les systèmes produisent, ne sert à entraîner un modèle d&apos;intelligence artificielle.
                    </blockquote>
                    <p className="mt-8 text-[15px] leading-[1.5] tracking-[-0.01em] text-white/85">
                      Omega.AI
                      <br />
                      <span className="text-white/60">
                        Engagement repris dans le contrat de service
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── LES TROIS CHIFFRES ───────────────────────────────────── */}
          <section className="pb-16 md:pb-24">
            <div className="vd-wrap">
              <div className="mx-auto grid max-w-[64rem] grid-cols-1 gap-4 sm:grid-cols-3">
                {CHIFFRES.map((c) => {
                  const Icone = c.icone;
                  return (
                    <div key={c.etiquette} className="vd-carte">
                      <div className="flex items-center gap-2.5">
                        <Icone className="h-4 w-4 text-[#8a8a8a]" />
                        <p className="vd-eyebrow">{c.etiquette}</p>
                      </div>
                      <p className="vd-chiffre mt-10">{c.valeur}</p>
                      <p className="vd-small mt-2">{c.texte}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ─── QUI REÇOIT QUOI ──────────────────────────────────────── */}
          <section id="recoit" className="scroll-mt-24 py-16 md:py-24">
            <div className="vd-wrap">
              <h2 className="vd-h2 text-center">Qui reçoit quoi</h2>
              <p className="vd-lead mx-auto mt-5 max-w-[42rem] text-center">
                Chaque sous-traitant qui intervient dans le traitement figure ci-dessous,
                avec le périmètre exact des données qui lui parviennent.
              </p>

              <div className="mt-14 overflow-x-auto">
                <table className="vd-tbl min-w-[720px]">
                  <thead>
                    <tr>
                      <th className="w-[34%]">Sous-traitant</th>
                      <th>Ce qu&apos;il reçoit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECOIT.map((r) => (
                      <tr key={r.nom}>
                        <td>
                          <span className="vd-tbl-nom">
                            <span className="vd-point" style={{ background: r.point }} />
                            {r.nom}
                          </span>
                          <span className="vd-small mt-0.5 block pl-5">{r.role}</span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {r.jetons.map((j) => (
                              <span key={j} className="vd-jeton">
                                {j}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="vd-small mx-auto mt-8 max-w-[42rem] text-center">
                Aucun autre tiers n&apos;intervient dans le traitement. La liste nominative
                de nos prestataires, avec leur pays d&apos;hébergement et leurs garanties, est
                annexée au contrat et communiquée sur demande.
              </p>
            </div>
          </section>

          {/* ─── BANDEAU PHOTO ────────────────────────────────────────── */}
          <section className="pb-16 md:pb-24">
            <div className="vd-wrap">
              <div className="vd-bleed vd-bleed--bande vd-sur-image">
                <Image
                  src="/photos/donnees-baie.jpg"
                  alt=""
                  fill
                  sizes="(min-width:1280px) 1216px, 100vw"
                  className="object-cover"
                />
                <div className="relative z-10 max-w-[38rem]">
                  <h2 className="vd-h4">
                    Le cloud désigne ici des centres de données identifiés
                  </h2>
                  <p className="vd-body mt-4">
                    Notre hébergeur les regroupe par région, et la vôtre se situe à Francfort, en Allemagne. Elle figure au contrat sous son identifiant exact&nbsp;:
                    <span className="whitespace-nowrap"> eu-central-1</span>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── LES DEUX HÉBERGEMENTS ────────────────────────────────── */}
          <section id="hebergement" className="scroll-mt-24 pb-16 md:pb-24">
            <div className="vd-wrap">
              <Options options={OPTIONS} />
            </div>
          </section>

          {/* ─── CTA FINAL ────────────────────────────────────────────── */}
          <div className="px-4 pb-12">
            <section className="vd-bleed vd-sur-image">
              <Image
                src="/photos/donnees-francfort-skyline.jpg"
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="relative z-10 flex w-full max-w-[72rem] flex-col gap-6">
                <h2 className="vd-h1 vd-titre-degrade">Choisir votre hébergement</h2>
                <p className="vd-lead max-w-[38rem]">
                  Un entretien de trente minutes suffit pour déterminer lequel des deux dispositifs convient à votre organisation, ce qu&apos;il implique pour votre système d&apos;information et ce qu&apos;il coûte.
                </p>
                <Link href="/commencer" className="vd-cta w-fit">
                  Commencer
                  <span>
                    <Chevron className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>
            </section>
          </div>
        </main>

        {/* ─── PIED DE PAGE ───────────────────────────────────────────── */}
        <footer className="vd-pied">
          <div className="mx-auto max-w-[1440px] px-6 pb-10 pt-16 sm:px-10">
            <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
              <Image
                src="/logo-pegase-blanc.png"
                alt=""
                width={96}
                height={96}
                className="h-6 w-6 shrink-0"
              />
              <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
                {PIED.map((col) => (
                  <div key={col.label}>
                    <p className="vd-pied-label">{col.label}</p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {col.liens.map((l) => (
                        <li key={l.label}>
                          {l.href.startsWith("http") ? (
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="vd-pied-lien"
                            >
                              {l.label}
                            </a>
                          ) : l.href.startsWith("#") ? (
                            <a href={l.href} className="vd-pied-lien">
                              {l.label}
                            </a>
                          ) : (
                            <Link href={l.href} className="vd-pied-lien">
                              {l.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* la signature géante de la référence — même rôle, même place */}
            <p className="vd-signature mt-24 max-w-[22ch]">
              Vous restez responsable de traitement, quel que soit l&apos;hébergement retenu
            </p>

            <div className="mt-16 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="vd-pied-label sm:text-right">
                © 2026 Omega.AI, tous droits réservés
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
