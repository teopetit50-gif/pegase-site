import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import {
  HeroCollage,
  IconeFleche,
  MediaAnswr,
  MediaLocal,
  MediaOffload,
  MediaOutils,
  MediaPayd,
} from "@/components/offres/Media";
import { Features, type CaseFeature } from "@/components/ui/features-4";
import { BentoGrid01, type ArgumentBento } from "@/components/ui/bento-grid-01";
import { AuditLog, type EntreeJournal } from "@/components/ui/audit-log";
import { Bento02, type TuileBento } from "@/components/ui/bento-02";
import { HowItWorks01, type Etape, type CarteGarantie } from "@/components/ui/how-it-works-01";
import { Cta3 } from "@/components/ui/cta-3";
import {
  Activity,
  Bell,
  Blocks,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Lock,
  MessageSquare,
  Pause,
  Plug,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   /offres — « Nos offres » (25/07/2026, refondue le 11/09/2026)

   Reprise d'origine à l'identique de la maquette de référence demandée par
   Teo (ocoya.com/features/create) : mêmes sections dans le même ordre,
   mêmes proportions, même typographie, mêmes rayons et mêmes animations
   d'entrée. Relevé au pixel sur viewport 1440 — voir le bloc `.offres` de
   globals.css pour les tokens.

   ——— Passe du 11/09/2026 : quatre sections sur six passent à des
   composants 21st.dev ————————————————————————————————————————————————
   Teo : « aucun composant de 21st.dev sur cette page, remplace section par
   section. » La page n'en portait qu'un (`features-4`, le catalogue).

   | section                | composant repris    | auteur        |
   |------------------------|---------------------|---------------|
   | les quatre arguments   | bento-grid-01       | 21st.dev      |
   | les moteurs            | bento-02            | @ln-dev7      |
   | le catalogue (déjà là) | features-4          | @meschacirung |
   | la mise en place       | how-it-works-01     | @ln-dev7      |
   | · son média « validation » | audit-log       | 21st.dev      |
   | l'appel final          | cta-3               | @efferd       |

   Seconde passe du 11/09 (Teo a collé quatre fiches 21st.dev de plus) :
   la bande noire passe de `feature-section-with-hover-effects` à
   `bento-grid-01` — le survol ne suffisait pas, il fallait du mouvement
   sans geste. `components/ui/features-hover.tsx` reste au dépôt, plus
   personne ne l'appelle. `how-it-works-01` était déjà là depuis la
   première passe. `tech-solutions-hero-section` n'a PAS été intégré : son
   CSS (huit classes maison) et son fond `raycast-animated-blue-background`
   n'étaient pas dans la fiche, et le rebâtir aurait été l'inventer.

   Chaque reprise est réencrée à la charte dans son propre fichier, avec
   ses écarts documentés en tête — c'est là qu'il faut lire pourquoi une
   classe shadcn a disparu.

   CE QUI N'A PAS BOUGÉ : le hero et ses textes, les textes des quatre
   arguments (fournis tels quels par Teo le 07/08, y compris l'incise sur la
   Région Guadeloupe), les intitulés et phrases des trois moteurs, le
   catalogue des six, les trois garanties de la mise en place.

   CE QUI A BOUGÉ, et où c'est passé : la carte « Trois étapes, pas trois
   mois » n'existe plus en tant que carte — les trois étapes qu'elle
   contenait dans `MediaEtapes` (audit / raccordement / cycle supervisé)
   SONT devenues la première rangée de la mise en place, et « deux semaines
   de rodage » a suivi dans la troisième étape. Aucun fait perdu, une carte
   de moins.

   Le chrome (header caméléon, footer) reste celui du site : les sections
   claires portent data-monde="clair" pour que le header bascule en blanc.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Nos offres | Omega.AI",
  description:
    "Quatre systèmes prêts à déployer : encaissements, réactivation commerciale, demandes entrantes, flux documentaires. Intégrés à vos outils en place, sous validation humaine.",
};

/* ——— rangée des quatre arguments, sous le hero ———
   07/08 (Teo) — les quatre arguments sont réécrits, textes fournis tels
   quels. Deux jeux de titres étaient proposés : les intitulés développés
   retenus ici et une variante en un mot (INTÉGRATION / CONTRÔLE / SÉCURITÉ
   / FINANCEMENT). Les développés l'emportent parce qu'ils disent de quoi il
   s'agit sans dépendre du texte dessous. Pour basculer sur la variante
   courte, il suffit de remplacer les quatre `titre`.

   Le texte fourni pour le bloc financement ne mentionnait plus la Région.
   L'incise a été remise (arbitrage Teo du 07/08) : le Chèque TIC est un
   dispositif régional guadeloupéen, et sans elle cette page — qui s'adresse
   à toute la France — laissait croire à une aide ouverte à tous.

   11/09 — les quatre textes sont INTACTS depuis le début, à travers deux
   changements de contenant : quatre colonnes centrées à 240 px, puis des
   cases à filets, et enfin les tuiles animées de `bento-grid-01`. Le défaut
   d'origine n'était pas la longueur mais l'inégalité (le quatrième faisait
   neuf lignes contre cinq, et trois colonnes finissaient dans le vide) ;
   ce qui manquait ensuite était le mouvement. Les icônes ont disparu du
   tableau : le bento porte une animation par tuile, pas un pictogramme. */
const ARGUMENTS: [ArgumentBento, ArgumentBento, ArgumentBento, ArgumentBento] = [
  {
    titre: "Intégration à votre environnement",
    texte:
      "Nos systèmes s'intègrent à vos outils existants (messagerie, tableaux de suivi et canaux de communication) sans imposer de changement d'organisation.",
  },
  {
    titre: "Contrôle humain",
    texte:
      "Vous conservez la validation des actions sensibles. Les règles de fonctionnement, les niveaux d'autonomie et les validations sont définis avec vous.",
  },
  {
    titre: "Sécurité des données",
    texte:
      "Les environnements clients sont cloisonnés et les données protégées par des mécanismes de chiffrement et de contrôle d'accès adaptés.",
  },
  {
    titre: "Financement éligible",
    texte:
      "Selon votre situation et la nature du projet, une partie de l'investissement peut être prise en charge dans le cadre du Chèque TIC, le dispositif de la Région Guadeloupe ouvert aux entreprises qui y sont immatriculées. L'éligibilité est vérifiée en amont.",
  },
];

/* ——— les trois moteurs montrés, en tuiles ———
   11/09 — ils étaient dans des cartes décoratives ; ce sont maintenant les
   portes des pages produit. C'est le seul endroit de la page où les trois
   captures d'interface apparaissent. */
const MOTEURS: TuileBento[] = [
  {
    icone: Bell,
    titre: "CASHD · encaissements",
    texte:
      "Les devis sans réponse sont relancés à J+3 et J+7, les factures échues à J+7 et J+21, selon vos règles.",
    href: "/offres/relances-impayes",
    media: <MediaPayd />,
  },
  {
    icone: MessageSquare,
    titre: "FRONTD · demandes entrantes",
    texte: "Une demande reçue à 21 h est qualifiée et reçoit sa réponse à 21 h, sur son canal d'origine.",
    href: "/offres/demandes-clients",
    media: <MediaAnswr />,
  },
  {
    icone: FileText,
    titre: "FILED · flux documentaires",
    texte:
      "Les factures fournisseurs sont lues, contrôlées, classées par émetteur et transmises à la comptabilité à date fixe.",
    href: "/offres/factures-fournisseurs",
    media: <MediaOffload />,
  },
];

/* ——— les six paquets de la grille à filets ———
   11/09/2026 (Teo, « j'aime pas cette section ») — remplace SCENES, les
   quatre cartes de 560×260 de la bande noire. Les intitulés sont ceux de
   NOM_PAQUET (lib/content.ts) et les phrases leurs `benefit`, raccourcis
   pour tenir sur deux lignes dans une case de 333 px.

   PULSE et VAULT entrent dans la liste alors que les cartes ne les
   montraient pas : ils ont une page (rendue par [system]), et une grille de
   six cases se remplit exactement avec le catalogue.

   Les icônes viennent de lucide-react et non des marques de paquets : les
   marques sont des PNG pensés pour le grand format, et PULSE et VAULT n'en
   ont pas — les six cases n'auraient pas porté le même signe. */
const PAQUETS: CaseFeature[] = [
  {
    icone: Bell,
    titre: "CASHD",
    texte: "Les devis sans réponse et les factures échues sont relancés à J+3, J+7 et J+21.",
    href: "/offres/relances-impayes",
  },
  {
    icone: Users,
    titre: "RELOAD",
    texte:
      "Les clients inactifs sont classés par valeur, et les marchés publics de votre zone relevés chaque jour.",
    href: "/offres/nouvelles-affaires",
  },
  {
    icone: MessageSquare,
    titre: "FRONTD",
    texte: "Chaque demande entrante est qualifiée et traitée à toute heure, sur son canal d'origine.",
    href: "/offres/demandes-clients",
  },
  {
    icone: FileText,
    titre: "FILED",
    texte: "Chaque pièce fournisseur est lue, ses montants recoupés, puis transmise à la comptabilité.",
    href: "/offres/factures-fournisseurs",
  },
  {
    icone: Activity,
    titre: "PULSE",
    texte: "L'état réel de l'activité en un message chaque matin, lu en deux minutes.",
    href: "/offres/point-du-matin",
  },
  {
    icone: Lock,
    titre: "VAULT",
    texte: "Douze contrôles avant chaque envoi, et le journal de tout ce qui est parti.",
    href: "/offres/securite",
  },
];

/* ——— les trois étapes de mise en place ———
   Elles ne sont pas nouvelles : c'est mot pour mot ce que `MediaEtapes`
   listait à l'intérieur de la carte « Trois étapes, pas trois mois ». Elles
   montent d'un cran et deviennent la section. Seule la troisième est
   allongée, pour recueillir « deux semaines de rodage » qui vivait dans le
   texte de la carte disparue. */
const ETAPES: Etape[] = [
  {
    rang: "01",
    icone: Search,
    titre: "Diagnostic, 30 min",
    texte: "Le processus le plus coûteux, chiffré.",
  },
  {
    rang: "02",
    icone: Plug,
    titre: "Intégration",
    texte: "Une demi-journée sur votre environnement.",
  },
  {
    rang: "03",
    icone: CheckCheck,
    titre: "Cycle supervisé",
    texte: "Vos équipes valident chaque action pendant deux semaines, le temps d'ajuster les règles.",
  },
];

/* ——— le journal de la carte « Rien ne part sans vous » ———
   Mêmes trois faits que la fausse fenêtre qu'il remplace (`MediaValidation`) :
   une relance rédigée qui attend l'accord, une réponse partie APRÈS
   validation, une relance suspendue par le client. Ce que le journal ajoute
   et que la file d'attente ne disait pas : QUI a fait le geste — le moteur
   propose, vous tranchez, ce qui est exactement la promesse de la carte. */
const JOURNAL: EntreeJournal[] = [
  {
    id: "j1",
    titre: "Relance FA-2402 · 14 300 €",
    description: "Message rédigé, en attente de validation.",
    horodatage: "il y a 2 min",
    auteur: "CASHD",
    etiquette: "à valider",
    icone: <Clock className="h-3 w-3" />,
  },
  {
    id: "j2",
    titre: "Réponse · demande reçue à 21 h 04",
    description: "Partie après votre validation.",
    horodatage: "il y a 1 h",
    auteur: "Vous",
    etiquette: "envoyé",
    icone: <Check className="h-3 w-3" />,
  },
  {
    id: "j3",
    titre: "Relance DV-0891 · service achats",
    description: "Suspendue : montant à revoir avant envoi.",
    horodatage: "hier",
    auteur: "Vous",
    etiquette: "suspendu",
    icone: <Pause className="h-3 w-3" />,
  },
];

/* ——— les trois garanties, textes et médias inchangés ——— */
const GARANTIES: CarteGarantie[] = [
  {
    icone: Blocks,
    titre: "Sur votre environnement",
    texte:
      "Le système lit et écrit dans les outils déjà en place. Aucun compte à créer pour vos équipes, aucune donnée à migrer, aucune habitude à changer.",
    media: <MediaOutils />,
    lien: { label: "Vérifier la compatibilité", href: "/integrations" },
  },
  {
    icone: ShieldCheck,
    titre: "Rien ne part sans validation",
    texte:
      "Les premières semaines, chaque action est soumise à validation avant envoi. Vous décidez ensuite, règle par règle, de ce qui part seul et de ce qui attend un accord.",
    media: <AuditLog entrees={JOURNAL} />,
  },
  {
    icone: Lock,
    titre: "Vos données restent les vôtres",
    texte:
      "Chaque entreprise dispose d'un espace chiffré et cloisonné, et les modèles ne reçoivent que le strict nécessaire à chaque tâche.",
    media: <MediaLocal />,
  },
];

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
                <Link href="/commencer" className="o-btn o-btn--primary">
                  Commencer
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
            l'écran via .o-nuit, le contenu reste dans la colonne.

            La respiration verticale descend de 90/110 à 64/80 : les cases
            de `features-hover` portent désormais leur propre `py-9 sm:py-10`,
            et cumulée l'ancienne valeur creusait 80 px de noir vide en haut
            comme en bas. */}
        <section className="o-nuit py-[64px] sm:py-[80px]">
          <div className="o-wrap">
            <BentoGrid01 cases={ARGUMENTS} libelleAtterrissage="Chèque TIC" />
          </div>
        </section>

        {/* ════════ LES MOTEURS — bento : tuile large puis trois tuiles ════════ */}
        <section id="moteurs" data-monde="clair" className="scroll-mt-24 pt-[80px] pb-[120px]">
          <Bento02
            pastille="Ce qui se déploie"
            titre="Chaque système tient un poste, et un seul."
            chapo="Aucun ne fait tout : chacun prend en charge un processus, le traite en continu sur vos outils et s'arrête à votre validation. Trois exemples, puis le catalogue complet."
            lien={{ label: "Voir les six systèmes", href: "#catalogue" }}
            tuiles={MOTEURS}
          />
        </section>

        {/* ════════ LES SIX — grille à filets sur bande noire ════════
            11/09/2026 (Teo) — l'ancienne section tenait sur 1150 px : une
            colonne de texte à gauche, deux chiffres, et quatre cartes de
            560×260 à droite. Elle disait une troisième fois ce que le bento
            venait de dire, et le bloc `features-4` demandé par Teo tient la
            même information en un tiers de la hauteur.

            Ce qui a disparu et où ça se dit déjà : « Branché sur vos outils
            actuels » est repris deux fois — dans les quatre arguments du haut
            (« Intégration à votre environnement ») et dans la mise en place
            (« Sur vos outils ») ; le plafond du Chèque TIC est dans ces mêmes
            arguments ; les trente minutes d'audit sont dans le CTA final.

            Le fond noir est conservé : c'est la seule respiration sombre du
            milieu de page, et sans lui la page enchaîne quatre sections
            blanches d'affilée. Le débordement jusqu'aux bords de l'écran
            reste la technique de .o-nuit (ombre écrêtée horizontalement).

            L'ancre `#catalogue` est la destination du bouton de la tuile
            large du bento : « Voir les six » descend ici. */}
        <section
          id="catalogue"
          className="scroll-mt-24 bg-black py-[120px]"
          style={{ boxShadow: "0 0 0 100vmax #000", clipPath: "inset(0 -100vmax)" }}
        >
          <Features
            pastille="Le catalogue"
            titre="Quatre systèmes à déployer, deux inclus."
            chapo="Chacun couvre un processus précis. Les deux derniers accompagnent toute installation, sans facturation supplémentaire."
            cases={PAQUETS}
          />

          {/* le sur-mesure fermait la colonne de cartes : il garde sa place
              APRÈS le catalogue — le proposer avant ferait passer les paquets
              pour un rabais — mais en une ligne au lieu d'une carte. */}
          <div data-reveal className="o-wrap mt-10 text-center">
            <p className="o-small !text-white/60">
              Si votre besoin n&apos;entre dans aucune de ces cases, le sur-mesure prend le relais.{" "}
              <Link href="/offres/sur-mesure" className="o-link o-link--light align-[-3px]">
                Découvrir le sur-mesure
                <IconeFleche />
              </Link>
            </p>
          </div>
        </section>

        {/* ════════ MISE EN PLACE — trois étapes, puis trois garanties ════════ */}
        <section data-monde="clair" className="py-[120px]">
          <HowItWorks01
            pastille="Mise en place"
            titre="Une mise en place progressive, validée à chaque étape."
            chapo="Du diagnostic au premier système en production, chaque jalon est validé avant le suivant, et votre environnement reste inchangé."
            etapes={ETAPES}
            cartes={GARANTIES}
          />
        </section>

        {/* ════════ APPEL FINAL — le bloc tenu au trait ════════ */}
        <section data-monde="clair" className="o-wrap pb-[120px]">
          <Cta3
            titre="Un chiffrage avant tout engagement."
            chapo="Trente minutes suffisent pour mesurer ce que le processus le plus coûteux représente pour votre organisation, et désigner le système au meilleur retour. Sans engagement."
            bouton={{ label: "Commencer", href: "/commencer" }}
          />
        </section>
      </div>
    </PageShell>
  );
}
