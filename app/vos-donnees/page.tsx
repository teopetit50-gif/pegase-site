import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { lienContact } from "@/lib/reservation";
import Header from "@/components/Header";
import Apparition from "@/components/donnees/Apparition";
import HeroPlein from "@/components/donnees/HeroPlein";
import Options, { type Option } from "@/components/donnees/Options";
import {
  MaquetteBase,
  MaquetteMoteur,
  MaquetteOutil,
  SchemaTrajet,
} from "@/components/donnees/Media";
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
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Où vont vos données | Omega.AI",
  description:
    "Votre base à Francfort, dans l'Union européenne, ou une machine installée chez vous dont rien ne sort. Qui reçoit quoi, ce qui n'entraîne aucun modèle, et ce que vous pouvez récupérer à tout moment.",
};

/* ——— les trois lieux de passage ——— */
const LIEUX = [
  {
    maquette: MaquetteOutil,
    titre: "Votre outil",
    soustitre: "La donnée reste là où elle est née",
  },
  {
    maquette: MaquetteMoteur,
    titre: "Le moteur",
    soustitre: "Il lit, il décide, il n'archive pas",
  },
  {
    maquette: MaquetteBase,
    titre: "La base",
    soustitre: "Francfort, région eu-central-1",
  },
];

/* ——— les six garanties ——— */
const GARANTIES = [
  {
    icone: IconeLieu,
    titre: "Hébergement européen",
    texte:
      "Notre base de données est hébergée en région eu-central-1, à Francfort, en Allemagne. Aucune réplication hors de l'Union européenne.",
  },
  {
    icone: IconeBarriere,
    titre: "Aucun entraînement",
    texte:
      "Nos fournisseurs de modèles n'utilisent ni les entrées ni les sorties de leurs produits commerciaux pour entraîner leurs modèles. C'est le réglage par défaut, pas une option à réclamer.",
  },
  {
    icone: IconeCadenas,
    titre: "Chiffrement de bout en bout",
    texte:
      "TLS sur toutes les liaisons, chiffrement au repos côté hébergeur. Les accès passent par des jetons nominatifs, révocables en une minute.",
  },
  {
    icone: IconeOeil,
    titre: "Rien ne part sans vous",
    texte:
      "Un moteur propose, vous validez. Tant qu'un envoi n'est pas approuvé, il n'existe que sous forme de brouillon dans votre outil.",
  },
  {
    icone: IconeJournal,
    titre: "Tout est journalisé",
    texte:
      "Chaque exécution laisse une ligne : date, moteur, décision, destinataire. Le journal est consultable et exportable à tout moment.",
  },
  {
    icone: IconeEmporter,
    titre: "Réversibilité",
    texte:
      "Vos moteurs s'exportent en fichiers lisibles, vos données dans un format de base standard. Vous les emportez tels quels : aucun format propriétaire ne vous retient.",
  },
];

/* ——— les trois chiffres ——— */
const CHIFFRES = [
  {
    icone: IconeServeur,
    etiquette: "HÉBERGEMENT",
    valeur: "eu-central-1",
    texte: "Francfort, Allemagne : la base ne quitte pas l'UE",
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
    texte: "Le maximum côté fournisseur de modèle, puis effacement",
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
    role: "orchestration des moteurs",
    jetons: ["Les moteurs", "Les identifiants de connexion", "Aucune archive de contenu"],
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
    titre: "Votre base chez nous, à Francfort",
    resume:
      "Vous ne gérez aucune machine. Notre base de données tourne en région eu-central-1, nos automatisations font tourner les moteurs, et vous n'avez qu'à valider ce qui vous est proposé.",
    image: "/photos/donnees-francfort-datacenter.jpg",
    alt: "Allée d'une salle de serveurs, baies métalliques alignées",
    chiffres: [
      { valeur: "48 h", libelle: "Mise en route" },
      { valeur: "0 €", libelle: "Matériel à acheter" },
      { valeur: "UE", libelle: "Lieu de la base" },
    ],
    principe:
      "Vos outils actuels restent vos outils. Le moteur s'y branche, lit le champ dont il a besoin, écrit son résultat dans la base, et vous le soumet.",
    obtenez: [
      "Une base de données à Francfort, chiffrée au repos",
      "Les sauvegardes et la supervision comprises",
      "Un export complet en un clic, à tout moment",
      "L'effacement de la base et des sauvegardes sur demande",
    ],
  },
  {
    cle: "local",
    onglet: "Installation locale · chez vous",
    titre: "Une machine dans vos murs",
    resume:
      "Pour qui ne veut rien laisser sortir. Nous installons les moteurs sur une machine que vous possédez : conteneurs isolés, disque chiffré, votre réseau, votre électricité.",
    image: "/photos/donnees-rack-local.jpg",
    alt: "Baie de brassage vue de près, câble orange lové",
    chiffres: [
      { valeur: "0", libelle: "Base distante" },
      { valeur: "100 %", libelle: "Chez vous" },
      { valeur: "∞", libelle: "Durée après contrat" },
    ],
    principe:
      "Aucun appel sortant que vous n'ayez autorisé. Un modèle ouvert peut tourner sur la machine si vous refusez tout appel externe, au prix d'une qualité de rédaction inférieure.",
    obtenez: [
      "Les moteurs installés sur votre machine, en conteneurs",
      "Les sauvegardes chez vous, sur le support de votre choix",
      "Une machine qui continue de tourner si le contrat s'arrête",
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
      { label: "Mentions légales", href: "/mentions-legales" },
    ],
  },
  {
    label: "Aller plus loin",
    liens: [
      { label: "RGPD : où vivent vos données", href: "/blog/rgpd-donnees-locales" },
      { label: "Nos intégrations", href: "/integrations" },
      { label: "Nous écrire", href: lienContact("Bonjour Omega — question sur vos garanties de données.") },
    ],
  },
];

/* ══ la page ══════════════════════════════════════════════════════════ */

export default function VosDonnees() {
  return (
    <>
      {/* Hors de `.vd` — voir la note en tête de fichier. Le header prélève
          le fond sous lui : à 4 px du bord gauche il traverse le hero (dont
          le cadre est transparent) et tombe sur le blanc de `.vd`, donc la
          barre s'affiche en clair, comme aujourd'hui. */}
      <Header />

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
                  Deux hébergements, un seul choix à faire : votre base chez nous à Francfort,
                  dans l&apos;Union européenne, ou une machine installée chez vous dont rien ne
                  sort.
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
                  Vos données dorment à Francfort, et elles n&apos;en sortent pas
                </h2>
                <p className="vd-body lg:pt-3">
                  Un moteur ne recopie pas votre boîte mail. Il lit le champ dont il a besoin pour
                  la tâche du jour, écrit son résultat, et laisse le reste où il est. Voici le
                  chemin complet, sans étape cachée.
                </p>
              </div>

              {/* le schéma se dessine à l'entrée dans l'écran — arcs tracés,
                  puis flèches, puis libellés (voir le bloc « apparitions » de
                  globals.css) */}
              <Apparition className="vd-ardoise mt-14 grid grid-cols-1 items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-24 lg:pb-28">
                <div className="vd-monte">
                  <h3 className="text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-tight tracking-[-0.01em] text-white">
                    Cinq étapes, et une seule qui stocke
                  </h3>
                  <p className="mt-4 text-[15px] leading-[1.6] tracking-[-0.01em] text-white/85">
                    Le moteur lit, le modèle rédige, vous validez. Seule la dernière étape écrit
                    quelque chose de durable, et cette étape est en Allemagne.
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
                <h2 className="vd-h2">Les trois seuls endroits où passent vos données</h2>
                <p className="vd-lead mt-5">
                  Votre outil, le moteur, la base. Il n&apos;y a pas de quatrième lieu, pas de
                  copie de travail ailleurs, pas d&apos;entrepôt intermédiaire.
                </p>
              </div>

              {/* un seul bloc gris, trois colonnes séparées par un filet —
                  exactement le motif de la référence.
                  Les colonnes montent l'une après l'autre (`--i`), et à
                  l'intérieur de chaque maquette les lignes se posent une par une
                  avec le retard de leur colonne (`--d`). L'ordre raconte le
                  trajet : la boîte mail, puis le moteur, puis la base. */}
              <Apparition className="mt-14 grid grid-cols-1 overflow-hidden rounded-[var(--vd-r-md)] bg-[var(--vd-soft)] md:grid-cols-3">
                {LIEUX.map((l, i) => {
                  const Maquette = l.maquette;
                  return (
                    <div
                      key={l.titre}
                      style={{ "--i": i, "--d": `${i * 110}ms` } as React.CSSProperties}
                      className={`vd-monte px-6 pt-8 pb-8 md:px-8 ${
                        i > 0 ? "border-t border-[#e4e4e4] md:border-t-0 md:border-l" : ""
                      }`}
                    >
                      <Maquette />
                      <h3 className="vd-h3 mt-7">{l.titre}</h3>
                      <p className="vd-small mt-1.5">{l.soustitre}</p>
                    </div>
                  );
                })}
              </Apparition>
            </div>
          </section>

          {/* ─── LES SIX GARANTIES ────────────────────────────────────── */}
          <section id="garanties" className="scroll-mt-24 py-16 md:py-24">
            <div className="vd-wrap">
              <h2 className="vd-h2 text-center">Ce que ça vous garantit</h2>

              <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {GARANTIES.map((g) => {
                  const Icone = g.icone;
                  return (
                    <div key={g.titre} className="vd-carte">
                      <span className="vd-chip">
                        <Icone className="h-5 w-5" />
                      </span>
                      <h3 className="vd-h3 mt-10">{g.titre}</h3>
                      {/* le texte est poussé en bas de carte : c'est ce qui donne
                          à la grille de la référence son alignement par le bas
                          malgré des titres de une à trois lignes */}
                      <p className="vd-small mt-auto pt-10">{g.texte}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ─── LA CITATION ──────────────────────────────────────────── */}
          <section className="py-16 md:py-24">
            <div className="vd-wrap">
              <div className="vd-ardoise relative lg:px-24 lg:py-20">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)] lg:gap-16">
                  <p className="vd-eyebrow !text-white/70">
                    ÉCRIT
                    <br />
                    AU CONTRAT
                  </p>
                  <div>
                    <Guillemet className="h-4 w-auto text-white/60" />
                    <blockquote className="mt-5 text-[clamp(1.5rem,1rem+1.6vw,2.25rem)] leading-[1.25] tracking-[-0.01em] text-white">
                      Aucune de vos données, ni ce que vous nous confiez ni ce que les
                      moteurs produisent, ne sert à entraîner un modèle
                      d&apos;intelligence artificielle.
                    </blockquote>
                    <p className="mt-8 text-[15px] leading-[1.5] tracking-[-0.01em] text-white/85">
                      Omega.AI
                      <br />
                      <span className="text-white/60">
                        Engagement repris au contrat, pas une promesse de page d&apos;accueil
                      </span>
                    </p>
                    <Link
                      href="/mentions-legales"
                      className="mt-7 inline-flex items-center gap-1.5 border-b border-white/40 pb-0.5 text-[14px] tracking-[-0.01em] text-white transition-colors hover:border-white"
                    >
                      Lire les mentions légales
                      <FlecheCoin className="h-3 w-3" />
                    </Link>
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
                Tout ce qui touche à vos données, et pour chacun la seule chose qu&apos;il
                voit passer.
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
                Aucun autre tiers ne reçoit quoi que ce soit. La liste nominative de nos
                prestataires, avec leur pays d&apos;hébergement et leurs garanties, est
                annexée au contrat et communiquée sur simple demande. Le détail juridique
                figure dans les{" "}
                <Link href="/mentions-legales" className="underline underline-offset-2">
                  mentions légales
                </Link>
                .
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
                    Une adresse, pas un nuage.
                  </h2>
                  <p className="vd-body mt-4">
                    « Le cloud », c&apos;est le nom commercial d&apos;une baie dans un bâtiment.
                    La vôtre est à Francfort, et son adresse tient en une ligne :
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
                <h2 className="vd-h1 vd-titre-degrade">Vos données, votre choix.</h2>
                <p className="vd-lead max-w-[38rem]">
                  Trente minutes suffisent pour savoir laquelle des deux installations vous
                  convient, et ce qu&apos;elle coûte.
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
              Vos données restent les vôtres, où qu&apos;elles dorment
            </p>

            <div className="mt-16 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="vd-pied-label sm:text-right">
                © 2026 Omega.AI, tous droits réservés ·{" "}
                <Link
                  href="/mentions-legales"
                  className="underline underline-offset-2 transition-colors hover:text-white"
                >
                  Mentions légales
                </Link>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
