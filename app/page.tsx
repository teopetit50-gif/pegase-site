import type { ReactNode } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { lienContact } from "@/lib/reservation";
import { SystemLogo } from "@/components/logos";
import {
  BandeauOutils,
  Chevron,
  EmblemeEurope,
  MaqCheque,
  MaqJournal,
  MaqLocal,
  MaqValidation,
} from "@/components/offres/MediaMoteurs";
import { FAMILLES, POSTS } from "@/lib/content";

/* ══════════════════════════════════════════════════════════════════════
   / — la page d'accueil (30/07/2026)

   4ᵉ page de référence : ocoya.com/affiliates. Teo voulait une home qui ne
   ressemble à aucune autre page du site — or les trois références déjà
   prises (la home, features/create, features/publish, integrations/[marque])
   sont intégralement blanches, et la fiche /offres/payd rendait exactement
   les dix mêmes sections que la version précédente de ce fichier.

   /affiliates est la seule des références restantes à ALTERNER un monde
   noir et un monde clair. C'est ce contraste qu'on reprend, et lui seul
   rend la home reconnaissable au premier coup d'œil.

   Relevé au pixel sur viewport 1440 :
     hero noir #09090b, tout centré — pastille, H1 60/72 ls −1,8 sur 700 de
     large, chapô 18/28,8, deux boutons r8 en 9/15, puis une rangée de faits
     en 24 semibold qui défile ; halo circulaire de 1306 px à 5 % et filets
     de vitesse horizontaux derrière le texte.
     Sections claires : pastille 12/14,4 → H2 48/67,2 centré sur 600 →
     chapô 18/28,8 sur 650 → contenu.

   Écart assumé, demandé par Teo : « en plus développé ». La référence tient
   en 7 sections, celle-ci en compte 11 — le bandeau d'outils, le catalogue
   des douze moteurs, les articles et l'hébergement n'existent pas chez elle.

   30/07 — les deux boutons « Audit gratuit » pointaient sur /audit, hérité
   du code restauré. Or /audit est le DÉROULÉ du protocole, pas la page de
   réservation : le header, lui, envoie sur /tarifs (entrée neutre « Commencer », 28/08). Deux boutons
   du même nom menaient donc à deux endroits différents (Teo). Repointés.

   Aucun chiffre inventé : la rangée du hero ne porte que des faits
   vérifiables (le catalogue, l'échéance légale, le taux du Chèque TIC,
   l'hébergement). Omega ne publie ni nombre de clients ni euros récupérés
   tant qu'ils ne sont pas sourcés.
   ══════════════════════════════════════════════════════════════════════ */

/* 05/08 (Teo) — hero réécrit sur deux reproches précis.
   1. « TPE », « Guadeloupe », « Antilles » : le hero enfermait l'offre dans un
      département alors qu'elle vaut partout en France. Plus aucune mention
      géographique ici, et plus de sigle de segment.
   2. « Pas assez pro, que du générique, des phrases pour vendre » : l'ancien
      titre — « ce qui se répète n'a plus à passer par vous » — sonnait bien et
      ne disait rien. Un visiteur qui le lisait ne savait toujours pas ce que
      fait le produit. Le nouveau nomme les deux tâches les plus reconnaissables
      et le chapô décrit le mécanisme dans l'ordre où il se déroule : ça se
      branche, ça rédige, ça attend votre accord. Chaque affirmation est
      vérifiable ailleurs sur le site, aucune n'est une promesse de vente. */
/* 3ᵉ correction (Teo) : la version précédente ne parlait que de CASHD et de
   FRONTD — « tu parles de PAYD uniquement, je veux un texte qui parle des
   paquets ». Le hero couvre désormais les quatre qui s'installent, dans le
   même ordre que le catalogue plus bas : impayés (CASHD), clients sans
   nouvelles (RELOAD), demandes reçues (FRONTD), factures fournisseurs (FILED).
   La phrase de validation reste : c'est ce qui distingue l'offre d'un envoi
   automatique, et elle vaut pour les quatre. */
/* 07/08 (Teo) — nouveau titre et nouveau chapô, fournis tels quels. Le hero
   n'énumère plus les quatre paquets : il ouvre sur la promesse (continuité,
   rigueur, contrôle) et laisse le détail des quatre tâches à la section
   catalogue plus bas. La 3ᵉ correction ci-dessus ne décrit donc plus le texte
   en place ; elle reste là pour la raison qui l'avait motivée — ne pas
   réduire l'offre à un seul paquet — qui vaut toujours si le hero réénumère
   un jour. La pastille, elle, cite encore les trois familles. */
const HERO = {
  pastille: "Relances, réponses et classement automatisés",
  titre: "Votre entreprise continue d'avancer, même quand vous n'y pensez pas.",
  chapo:
    "Nous concevons des systèmes intelligents qui exécutent vos processus récurrents avec rigueur, continuité et contrôle, afin de fluidifier vos opérations et libérer du temps à forte valeur ajoutée.",
};

/* 05/08 — la liste FAITS est partie avec la rangée défilante du hero, retirée
   parce qu'elle faisait doublon avec la bande suivante. Elle est dans
   l'historique git si le bandeau revient. */

/* Filets de vitesse du hero — positions figées (jamais d'aléatoire au
   rendu, ça casserait l'hydratation). left/top en %.

   30/07 — les largeurs étaient en PIXELS relevés sur viewport 1440. Sur un
   téléphone de 390 px, un filet de 420 px traversait donc l'écran de bord à
   bord : on ne lisait plus des stries mais des barres horizontales en
   travers du titre (Teo). Elles sont désormais exprimées en vw — même
   largeur qu'avant à 1440 (1 vw = 14,4 px), et de courtes stries partout
   ailleurs. L'opacité, elle, est divisée sur petit écran (voir .o-trait). */
/* 05/08 — le tableau TRAITS (filets de vitesse du hero nuit) et ses règles
   de placement ont été retirés avec le hero qu'ils habillaient. Ils sont
   dans l'historique git si le hero sombre revient un jour. */


/* 07/08 (Teo) — les deux bénéfices sont réécrits, textes fournis tels quels.
   Le second change aussi d'étiquette : « Charge » devient « Temps ».

   Ces textes décrivent le résultat plutôt que le mécanisme. La cadence de
   relance (J+3 / J+7 / J+21), l'arrêt sur règlement et le garde-fou des sept
   jours ne sont donc plus énoncés ici — ils restent exposés sur la fiche
   moteur correspondante, ce qui préserve la règle maison : toute affirmation
   de cette page est vérifiable ailleurs sur le site. La note du 05/08 sur le
   chiffre d'encours guadeloupéen tombe d'elle-même, le texte n'avançant plus
   aucun chiffre. */
const BENEFICES = [
  {
    label: "Trésorerie",
    titre: "Votre chiffre d'affaires ne reste plus en attente.",
    texte:
      "Les échéances sont suivies automatiquement, les relances sont déclenchées au bon moment et s'arrêtent dès qu'un règlement est identifié. Votre trésorerie gagne en régularité, sans ajouter de charge à vos équipes.",
    maquette: <MaqValidation />,
  },
  {
    label: "Temps",
    titre: "Vos journées retrouvent de l'espace.",
    texte:
      "Les tâches répétitives sont prises en charge en arrière-plan : suivi, préparation, classement, réponses et contrôles. Vos équipes interviennent uniquement lorsque leur expertise ou leur décision est réellement nécessaire.",
    maquette: <MaqJournal />,
  },
];

/* 05/08 (Teo, « réduis cette section ») — la frise passe de cinq colonnes à
   quatre, et chaque texte de trois lignes à deux.

   Deux étapes ont fusionné plutôt que d'être supprimées : « vous gardez la
   main » (les douze verrous) et « on mesure, on ajuste » (le journal) ne sont
   pas deux moments successifs du déroulé, ce sont les deux faces d'une même
   étape — ce qui est vérifié avant l'envoi, et ce qui en est consigné après.
   Aucune information ne se perd : les verrous restent détaillés dans la FAQ
   et sur les fiches moteur, le journal dans la section « garanties ».

   Le gain n'est pas que vertical. À cinq colonnes, la grille tombait sur
   trois rangées en tablette avec un « 05 » seul sur la dernière, sans rien à
   sa droite ; à quatre, elle se referme sur deux rangées pleines. */
/* 07/08 (Teo) — le déroulé est réécrit, textes fournis tels quels. Il reste à
   quatre étapes, donc la mise en grille décrite ci-dessus ne bouge pas ; en
   revanche la fusion « verrous + journal » qu'elle justifiait n'a plus d'objet,
   la 04 étant devenue « Pilotage ». Les douze verrous restent documentés dans
   la FAQ et sur les fiches moteur, le journal dans la section « garanties » :
   rien ne se perd, mais plus rien n'y renvoie depuis ici.

   Chaque étape gagne un `sousTitre` : la source distingue le nom de l'étape
   (« Diagnostic opérationnel ») de ce qu'elle produit (« Identifier les
   processus à fort impact »), là où l'ancienne version fondait les deux en un
   seul titre. */
const ETAPES = [
  {
    n: "01",
    titre: "Diagnostic opérationnel",
    sousTitre: "Identifier les processus à fort impact",
    texte:
      "Nous analysons vos flux de travail, les points de friction et les tâches à faible valeur ajoutée afin de cibler les leviers d'amélioration les plus pertinents.",
  },
  {
    n: "02",
    titre: "Conception",
    sousTitre: "Définir un système adapté à votre organisation",
    texte:
      "Chaque solution est conçue selon vos règles métier, vos priorités et vos méthodes de travail. Aucun modèle générique : le système s'adapte à votre fonctionnement.",
  },
  {
    n: "03",
    titre: "Déploiement",
    sousTitre: "Intégrer sans bouleverser l'existant",
    texte:
      "Nous connectons le système à votre environnement de travail et organisons sa mise en production de manière progressive, sécurisée et maîtrisée.",
  },
  {
    n: "04",
    titre: "Pilotage",
    sousTitre: "Mesurer, ajuster, faire évoluer",
    texte:
      "Les premières opérations restent sous votre contrôle. Nous affinons les règles, suivons les performances et faisons évoluer le système selon vos usages.",
  },
];

/* 07/08 (Teo) — le bloc financement est réécrit, textes fournis tels quels.
   Le paragraphe unique se scinde en deux : ce que le dispositif finance, puis
   un encadré « accompagnement » qui reprend le montage du dossier.

   Le texte fourni ne mentionnait plus la Région : le Chèque TIC étant un
   dispositif RÉGIONAL et la vitrine ne s'adressant plus au seul département,
   un visiteur hexagonal aurait lu cette carte comme une aide le concernant.
   L'incise a donc été remise (arbitrage Teo du 07/08). Le reste du texte est
   celui qui a été fourni.

   UNE PERTE ASSUMÉE : le barème (40 à 80 % du projet selon le poste) n'est
   plus affiché. La maquette continue d'annoncer « jusqu'à 10 000 € », ce qui
   reste vrai, et le détail vit dans l'article du dispositif.

   Le lien change aussi de destination — voir le commentaire sur `lien`. */
const GARANTIES: {
  label: string;
  titre: string;
  texte: string;
  encadre?: { titre: string; texte: string };
  lien: { label: string; href: string };
  maquette: ReactNode;
}[] = [
  {
    label: "Financement",
    titre: "Jusqu'à 10 000 € de prise en charge selon votre éligibilité",
    /* « de la Région Guadeloupe » et « qui y sont immatriculées » sont remis
       (Teo, 07/08) : le Chèque TIC est régional, et la vitrine ne s'adresse
       plus au seul département. Seule cette incise est ajoutée au texte
       fourni, le reste est intact. */
    texte:
      "Le dispositif Chèque TIC, porté par la Région Guadeloupe et ouvert aux entreprises qui y sont immatriculées, peut financer une partie de votre projet de transformation numérique. Nous vérifions votre éligibilité en amont et vous accompagnons dans la constitution du dossier.",
    encadre: {
      titre: "Un accompagnement de bout en bout",
      texte:
        "Nous préparons avec vous les éléments nécessaires au dossier : périmètre du projet, description technique, devis et pièces justificatives.",
    },
    /* Le libellé passe de « Lire le détail du dispositif » à « Vérifier mon
       éligibilité » : il annonce un acte, plus une lecture. Le garder pointé
       sur l'article aurait promis une vérification pour livrer un texte —
       il mène donc à la prise de rendez-vous, seul endroit où l'éligibilité
       se vérifie réellement, ce que le texte de la carte dit déjà. Pour
       revenir en arrière : href "/blog/cheque-tic-financement". */
    lien: {
      label: "Vérifier mon éligibilité",
      href: "/commencer",
    },
    maquette: <MaqCheque />,
  },
  {
    label: "Données",
    titre: "Vos données restent les vôtres",
    texte:
      "Vous gardez vos outils de tous les jours : messagerie, tableur, WhatsApp. Vos données de suivi, elles, vivent dans un espace dédié à votre entreprise, chiffré et hébergé dans l'Union européenne. Le cloisonnement n'est pas un filtre posé dans le code : c'est la base elle-même qui refuse une ligne rattachée à deux entreprises. Le jour où vous arrêtez, tout vous est remis et effacé sur demande.",
    lien: { label: "Pourquoi ce choix", href: "/blog/rgpd-donnees-locales" },
    maquette: <MaqLocal />,
  },
];

/* Les trois faits de la section « hébergement ». Aucun n'est une promesse :
   le cloisonnement est une contrainte posée en base et prouvée par un jeu
   d'invariants, le chiffrement et le coffre à secrets sont l'état réel de
   l'installation, la réversibilité est déjà écrite dans les mentions
   légales. Si l'un des trois cesse d'être vrai, il sort d'ici avant de
   devenir un argument. */
/* 07/08 (Teo) — les trois blocs sont réécrits, textes fournis tels quels, et
   réordonnés : le lieu passe en premier, le cloisonnement et le chiffrement
   fusionnent en deuxième, la réversibilité reste en troisième.

   La règle ci-dessus tient toujours — rien ici n'est faux — mais les trois
   textes sont désormais plus généraux que les précédents : « environnement
   logique distinct » à la place de la contrainte d'unicité posée en base,
   « exportées ou supprimées selon les conditions prévues contractuellement »
   à la place de l'export en format ouvert et de l'effacement sans reste. Le
   détail technique n'est pas perdu : il reste dans les mentions légales et
   dans l'article « Pourquoi ce choix ». C'est le registre de cette section
   qui change, pas les faits. */
const HEBERGEMENT = [
  {
    titre: "Hébergement européen",
    texte:
      "Vos données sont hébergées dans une infrastructure située à Francfort, en Allemagne, au sein de l'Union européenne.",
  },
  {
    titre: "Sécurité et cloisonnement",
    texte:
      "Chaque entreprise dispose d'un environnement logique distinct. Les données sont chiffrées au repos comme lors de leur transmission.",
  },
  {
    titre: "Maîtrise et réversibilité",
    texte:
      "Vous restez propriétaire de vos données. Elles peuvent être exportées ou supprimées à votre demande, selon les conditions prévues contractuellement.",
  },
];

const FAQ = [
  {
    q: "Il faut changer de logiciel ?",
    a: "Non. Les moteurs lisent et écrivent dans ce que vous utilisez déjà : messagerie, tableur, WhatsApp, agenda, outil de facturation. Aucun compte à créer, aucune donnée à migrer, aucune colonne à renommer : vos fichiers gardent la forme qu'ils ont aujourd'hui.",
  },
  {
    q: "Qu'est-ce qui part sans que je le voie ?",
    a: "Rien, sauf si vous le décidez explicitement. Chaque message passe par une file de validation, et douze verrous sont vérifiés juste avant l'envoi : facture déjà réglée, client qui a demandé l'arrêt, message déjà parti récemment, horaire, plafond du jour. Un seul qui saute et l'envoi est refusé.",
  },
  {
    q: "On commence par combien de choses à la fois ?",
    a: "Une. L'assistant en fait quatre, mais on met en route celle que l'audit a chiffrée comme la plus rentable chez vous, et on la mène jusqu'au bout. Les autres suivent, une par semaine, si les chiffres du premier moteur le justifient.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Le chiffrage sort de l'audit, parce qu'il dépend de vos outils, de votre volume et du moteur retenu. Un prix affiché ici ne voudrait pas dire grand-chose. Ce qui est certain, c'est que le Chèque TIC peut en financer une partie (de 40 à 80 % selon le poste, jusqu'à 10 000 €), si vous êtes éligible.",
  },
  {
    q: "Où sont hébergées mes données ?",
    a: "Dans un espace dédié à votre entreprise, chiffré et hébergé dans l'Union européenne, strictement séparé de celui de chaque autre client. Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier, et vous pouvez demander l'export complet ou la suppression à tout moment.",
  },
  {
    q: "Je suis concerné par la facture électronique ?",
    a: "Au 1ᵉʳ septembre 2026, toutes les entreprises établies en France doivent être en mesure de recevoir des factures au format structuré. L'émission suit au 1ᵉʳ septembre 2027 pour les TPE et PME. Nous ne vendons pas de mise en conformité, mais l'audit fait le point sur votre fichier client (SIREN, adresses, mentions obligatoires), parce que c'est de là que viennent presque toutes les factures rejetées.",
  },
];

/* 05/08/2026 — les cartes de la vitrine sont désormais les PAQUETS, pas les
   moteurs. Les quatre qui s'installent tiennent exactement dans la grille de
   quatre colonnes qui existait déjà (auparavant les quatre moteurs vedettes
   sur douze) : aucune maille ne bouge. Les deux paquets compris — PULSE et
   VAULT — ne sont pas des cartes, ils vivent dans la section « garanties »
   et sur /offres. */
const VEDETTES = ["CASHD", "RELOAD", "FRONTD", "FILED"];

const MOTEURS = FAMILLES.flatMap((f) => f.moteurs)
  .filter((m) => VEDETTES.includes(m.system))
  .sort((a, b) => VEDETTES.indexOf(a.system) - VEDETTES.indexOf(b.system));

/* 07/08 (Teo) — nouvelles accroches des quatre cartes du catalogue, fournies
   telles quelles, avec un sous-titre qui nomme l'objectif du système.

   Elles sont définies ICI et pas dans `lib/content.ts` à dessein. Le champ
   `benefit` des moteurs est lu à huit endroits — MotorCard, PepitesSection,
   les trois gabarits d'offre, Publics, et la fiche /offres/[system] qui s'en
   sert de pitch de repli. Le réécrire aurait changé six pages qu'on ne m'a
   pas demandé de toucher. Cette table ne vaut donc que pour la vitrine ; le
   reste du site continue de lire `benefit`.

   Corollaire à connaître : une accroche modifiée ici ne suit pas ailleurs.
   Le jour où le nouveau registre doit valoir partout, c'est `benefit` qu'il
   faut réécrire, et cette table disparaît. */
const ACCROCHES_VITRINE: Record<string, { objectif: string; texte: string }> = {
  CASHD: {
    objectif: "Sécuriser les encaissements",
    texte:
      "Les échéances sont suivies et les relances préparées au bon moment, selon vos règles de gestion.",
  },
  RELOAD: {
    objectif: "Réactiver les opportunités",
    texte:
      "Les clients inactifs et les opportunités à potentiel sont identifiés, priorisés et remis dans le bon circuit.",
  },
  FRONTD: {
    objectif: "Traiter les demandes sans délai",
    texte:
      "Chaque demande entrante est analysée, qualifiée et préparée pour réponse, y compris en dehors des horaires habituels.",
  },
  FILED: {
    objectif: "Structurer les flux documentaires",
    texte:
      "Les documents entrants sont lus, contrôlés, classés et transmis au bon interlocuteur, sans ressaisie inutile.",
  },
};

/* ——— en-tête de section, commun à toutes les sections claires ——— */
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
        <span className="o-pill o-pill--xs">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 mt-4 max-w-[600px]">
        {titre}
      </h2>
      <p data-reveal className="o-lead mt-4 max-w-[650px]">
        {chapo}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <PageShell>
      <PageMotion />

      <div className="offres">
        {/* ════════ 1 · HERO CLAIR — clone du template Flux ════════
            05/08/2026 (Teo, « exactement comme le screen de l'autre site,
            avec exactement le même fond, tout pareil, juste tu changes les
            textes — je veux le 1:1 »).

            Référence : flux-nextjs-template.vercel.app — la démo officielle
            de Cruip, et l'un des modèles présentés sur /modeles. Relevé au
            style calculé sur viewport 1280, valeurs converties de lab() en
            hexadécimal — voir le bloc `.o-flux-*` de globals.css, qui porte le
            détail de chaque mesure.

            Le hero nuit précédent (halo WebGL + filets de vitesse `.o-deco`)
            disparaît d'ici ; TRAITS n'est plus lu par cette page. Le header
            n'a rien demandé : il PRÉLÈVE la couleur du fond sous lui et bascule
            seul en verre clair.

            Deux écarts au 1:1 :
            · un seul bouton, comme la référence : le second CTA (« Ce qu'il
              fait chez vous ») n'a pas d'équivalent chez Flux ;
            · la bande de faits est conservée sous la maquette, réencrée en
              clair — Flux y met des logos de partenaires, qu'Omega n'a pas. */}
        <section className="o-flux relative overflow-hidden pb-0 pt-[48px] md:pt-[64px] lg:pt-[256px]">
          <div aria-hidden className="o-flux-fond">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fonds/plis-blancs.webp" alt="" />
          </div>

          <div className="o-wrap relative z-10 flex flex-col items-center text-center">
            <div data-reveal>
              {/* 05/08 (Teo) — le point de veille qui bat, repris de la
                  référence, est retiré : « enlève le point orange ». */}
              <span className="o-flux-pastille">{HERO.pastille}</span>
            </div>
            <h1 data-reveal className="o-flux-h1 mt-5 max-w-[900px] md:mt-6">
              {HERO.titre}
            </h1>
            <p data-reveal className="o-flux-lead my-2 max-w-[760px] md:my-4 lg:my-6">
              {HERO.chapo}
            </p>
            <div data-reveal className="mt-4 flex flex-col items-center md:mt-6 lg:mt-8">
              <Link href="/commencer" className="o-flux-btn">
                Commencer
                <span aria-hidden className="o-flux-btn-rond">
                  <Chevron taille={14} />
                </span>
              </Link>
              <span className="o-flux-sous">
                Deux minutes pour choisir — sans engagement
              </span>
            </div>
          </div>

          {/* la maquette, posée en bas de cadre et coupée par le bord comme
              chez la référence — d'où `pb-0` sur la section.

              05/08, arbitrage de Teo : c'est la CAPTURE DU TEMPLATE qui est
              affichée, pas le tableau de bord Omega (`HeroCollage`). Je lui ai
              signalé qu'elle porte « Hello, Flux » et des données d'hôtel en
              anglais, donc qu'un prospect la lira comme le produit d'Omega ;
              il a tranché pour le 1:1. À remplacer par une capture du vrai
              tableau de bord Omega quand il en existera une. */}
          <div data-reveal className="o-flux-maquette relative z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fonds/dashboard-hero.webp"
              alt="Tableau de bord"
              width={1682}
              height={1122}
            />
          </div>

          {/* 05/08 (Teo, « enlève ça vu qu'il y a déjà le même juste en bas »)
              — la rangée de faits défilante qui fermait le hero est retirée :
              elle faisait doublon avec ce qui suit. Le hero se termine donc sur
              la maquette, dont le bas se fond — d'où `pb-0` sur la section. */}
        </section>

        {/* ════════ 2 · LES OUTILS ════════ */}
        <section data-monde="clair" className="pb-[50px] pt-[70px]">
          <div className="o-wrap">
            <p data-reveal className="o-small text-center">
              Branché sur les outils que vous tenez déjà
            </p>
          </div>
          <div data-reveal className="mt-8">
            <BandeauOutils />
          </div>
        </section>

        {/* ════════ 3 · CE QUE ÇA CHANGE — deux colonnes symétriques ════════ */}
        <section data-monde="clair" className="py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="CE QUE ÇA CHANGE"
              titre="Moins de tâches. Plus de temps. Plus de marge."
              chapo="Nous concevons des systèmes qui prennent en charge les tâches répétitives de votre entreprise. Ils exécutent, suivent et organisent ce qui devait jusque-là être fait manuellement, pendant que vos équipes gardent le contrôle et se concentrent sur ce qui crée réellement de la valeur."
            />
            <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
              {BENEFICES.map((b) => (
                <div key={b.label} data-reveal className="flex flex-col">
                  <div className="o-card overflow-hidden">{b.maquette}</div>
                  <p className="o-small mt-8 !text-[14px] uppercase tracking-[0.08em]">
                    {b.label}
                  </p>
                  <h3 className="o-h4 mt-2">{b.titre}</h3>
                  <p className="o-body mt-4">{b.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 4 · COMMENT ÇA MARCHE — frise de quatre étapes ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE DÉROULÉ"
              titre="De l'analyse au déploiement."
              chapo="Une méthode structurée pour intégrer des systèmes intelligents à vos opérations, sans perturber votre organisation existante."
            />
            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {/* 05/08 (Teo, « le design des numéros est trop amateur ») — la
                  pastille ronde noire pleine est partie. Deux raisons : c'est
                  la marque de fabrique des thèmes gratuits, et son contraste
                  maximal captait l'œil sur le numéro alors que l'information
                  est dans le titre.

                  À la place, une frise éditoriale : un filet fin qui coiffe
                  chaque colonne et forme une ligne continue d'un bout à
                  l'autre sur grand écran, le numéro en petit et en gris sous
                  ce filet. La hiérarchie s'inverse — le titre reprend le
                  premier rôle — et la progression se lit dans la frise elle
                  même plutôt que dans une puce. Chiffres en `tabular-nums`
                  pour que les cinq numéros aient exactement la même chasse. */}
              {ETAPES.map((e) => (
                <div key={e.n} data-reveal className="flex flex-col">
                  <span aria-hidden className="h-px w-full bg-[#e4e4e7]" />
                  <span
                    className="mt-4 text-[12px] font-semibold tracking-[0.12em] text-[#a1a1aa]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {e.n}
                  </span>
                  <h3 className="o-h5 mt-3">{e.titre}</h3>
                  {/* 07/08 — le sous-titre porte ce que l'étape produit. Il est
                      en gras et en noir pour se détacher du corps de texte
                      juste dessous, sans rivaliser avec le h3 : même taille que
                      le corps, pas de niveau de titre supplémentaire (le h3
                      reste le seul point d'entrée du plan de la page). */}
                  <p className="mt-2 text-[15px] font-semibold leading-[24px] text-[#18181b]">
                    {e.sousTitre}
                  </p>
                  <p className="o-small mt-2 !text-[15px] !leading-[24px]">
                    {e.texte}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 5 · LE CATALOGUE — douze cartes compactes ════════ */}
        <section
          id="catalogue"
          data-monde="clair"
          className="scroll-mt-24 pb-[110px]"
        >
          <div className="o-wrap">
            <EnTete
              pastille="CE QUI S'INSTALLE"
              titre="Quatre systèmes. Quatre leviers de performance."
              chapo="Encaissement, réactivation client, traitement des demandes, gestion documentaire : chaque système prend en charge un processus précis de votre activité, avec des règles définies et un contrôle humain à chaque étape."
            />
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MOTEURS.map((m) => (
                <Link
                  key={m.system}
                  href={`/offres/${m.slug}`}
                  data-reveal
                  className="o-card-soft o-card-scintille flex flex-col p-7 transition-[background-color,box-shadow] duration-200 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <SystemLogo system={m.system} />
                    <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#09090b]">
                      {m.system}
                    </span>
                  </div>
                  {/* Le sigle seul ne dit rien à un visiteur qui arrive : le
                      sous-titre nomme l'objectif juste sous lui, avant le
                      détail. Repli sur `benefit` si un système entrait dans
                      VEDETTES sans avoir d'accroche vitrine. */}
                  <p className="mt-4 text-[15px] font-semibold leading-[23px] text-[#18181b]">
                    {ACCROCHES_VITRINE[m.system]?.objectif ?? m.title}
                  </p>
                  <p className="o-small mt-2 !text-[15px] !leading-[23px] !text-[#52525b]">
                    {ACCROCHES_VITRINE[m.system]?.texte ?? m.benefit}
                  </p>
                  <span className="o-link mt-6 !text-[14px]">
                    Voir le détail
                    <Chevron taille={12} />
                  </span>
                </Link>
              ))}
            </div>
            {/* PULSE et VAULT, compris chez tout le monde, vivent sur /offres */}
            {/* 07/08 (Teo) — deux libellés étaient proposés : « Découvrir les
                autres systèmes » et « Voir l'ensemble de nos solutions ». Le
                premier est retenu parce qu'il dit vrai sur la destination —
                /offres montre les DEUX paquets restants, pas un catalogue
                complet — là où « l'ensemble de nos solutions » promettrait une
                page qui récapitule les six. */}
            <div data-reveal className="mt-10 flex justify-center">
              <Link href="/offres" className="o-btn o-btn--ghost">
                Découvrir les autres systèmes
                <Chevron taille={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* ════════ 6 · L'HÉBERGEMENT — où vivent physiquement les données ═══
            05/08/2026 (Teo). Demandée d'abord « en bas », puis déplacée le
            même jour au-dessus du catalogue. 16/08/2026 (Teo) — repassée
            en dessous : « met la partie des systèmes avant la partie vos
            données ».

            Ce qui change de lecture. Le visiteur voit désormais ce qui
            s'installe avant d'entendre où vivent les données : l'objection
            du lieu ne se pose vraiment qu'une fois qu'il sait quelles
            données il y aurait à héberger. Elle reste avant les garanties,
            donc toujours dans le mouvement des réserves, pas reléguée en
            fin de page.

            Elle ne fait pas doublon avec la carte « Données » de la section 7,
            qui répond à la question de la PROPRIÉTÉ — à qui appartiennent ces
            données, ce qu'on en fait, ce qu'il en reste le jour où le client
            part. Celle-ci répond à la question du LIEU : sur quel territoire,
            sous quel droit, et à quelle distance d'une législation étrangère.
            Ce sont deux objections différentes, elles arrivent d'ailleurs à
            deux moments différents d'un rendez-vous.

            Chaque affirmation est vérifiable et rien n'est arrondi. Francfort
            n'est pas une formule : c'est la région eu-central-1 du projet
            `omega-core-eu`, déjà déclarée telle quelle dans les mentions
            légales. Le paragraphe de réserve en pied de section n'est pas une
            précaution juridique posée à contrecœur — c'est la seule manière
            d'écrire cette section qui survive à la question suivante, celle
            que pose tout client sérieux : « et l'IA, elle tourne où ? » */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="HÉBERGEMENT"
              titre="Vos données restent sous juridiction européenne."
              chapo="Hébergées en Allemagne, au sein de l'Union européenne, vos données sont traitées dans un environnement conforme aux exigences du RGPD et protégées tout au long de leur cycle de vie."
            />

            <div
              data-reveal
              className="o-card mt-14 grid grid-cols-1 gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-16"
            >
              {/* l'emblème et le lieu — la colonne qu'on regarde en premier */}
              <div className="flex flex-col items-start">
                <span className="inline-flex overflow-hidden rounded-[6px] shadow-[0_0_0_1px_rgba(9,9,11,0.08)]">
                  <EmblemeEurope taille={104} />
                </span>
                {/* 07/08 (Teo, « quelque chose de plus institutionnel ») — le
                    gros titre ne nomme plus la ville. Francfort n'est pas perdu
                    pour autant : il est énoncé juste à droite, dans le bloc
                    « Hébergement européen », et dans les mentions légales. */}
                <p className="o-h5 mt-7">Infrastructure hébergée en Europe</p>
                <p className="o-small mt-2.5 !text-[15px] !leading-[24px]">
                  Une base de données unique, sur le sol de l&apos;Union
                  européenne. C&apos;est là que vivent vos factures, vos
                  relances et vos échanges clients, et nulle part ailleurs.
                </p>
              </div>

              {/* les trois faits — même frise éditoriale que le déroulé */}
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-7">
                {HEBERGEMENT.map((h) => (
                  <div key={h.titre} className="flex flex-col">
                    <span aria-hidden className="h-px w-full bg-[#e4e4e7]" />
                    <h3 className="o-h5 mt-4 !text-[17px] !leading-[25px]">
                      {h.titre}
                    </h3>
                    <p className="o-small mt-2.5 !text-[15px] !leading-[24px]">
                      {h.texte}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p
              data-reveal
              className="o-small mx-auto mt-8 max-w-[760px] text-center !text-[15px] !leading-[24px]"
            >
              Une réserve, parce qu&apos;elle compte : les modèles
              d&apos;intelligence artificielle qui rédigent les messages sont
              interrogés hors d&apos;Europe. Ils reçoivent le strict nécessaire
              à chaque tâche (un montant, une date, un nom), jamais votre
              fichier client ni votre historique, et rien de ce qui leur est
              envoyé ne sert à entraîner un modèle.
            </p>
          </div>
        </section>

        {/* ════════ 7 · CE QUI RESTE CHEZ VOUS — deux cartes larges ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LES GARANTIES"
              titre="Un investissement maîtrisé. Des données protégées."
              chapo="Nous vous accompagnons sur deux points essentiels : le financement de votre projet et la maîtrise de vos données. Des conditions claires, dès le départ."
            />
            <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2">
              {GARANTIES.map((g) => (
                <div
                  key={g.label}
                  data-reveal
                  className="o-card flex flex-col overflow-hidden"
                >
                  <div className="border-b border-[#f4f4f5]">{g.maquette}</div>
                  <div className="flex flex-1 flex-col p-8 sm:p-10">
                    <p className="o-small !text-[14px] uppercase tracking-[0.08em]">
                      {g.label}
                    </p>
                    <h3 className="o-h5 mt-2">{g.titre}</h3>
                    <p className="o-body mt-4">{g.texte}</p>
                    {/* Encadré facultatif : seule la carte « Financement » en a
                        un. `flex-1` migre du paragraphe vers lui quand il est
                        là, pour que les deux cartes gardent la même hauteur et
                        que les deux liens restent alignés en pied. */}
                    {g.encadre ? (
                      <div className="mt-6 flex-1 rounded-[10px] bg-[#fafafa] p-5">
                        <p className="text-[15px] font-semibold leading-[23px] text-[#18181b]">
                          {g.encadre.titre}
                        </p>
                        <p className="o-small mt-2 !text-[15px] !leading-[23px]">
                          {g.encadre.texte}
                        </p>
                      </div>
                    ) : (
                      <span aria-hidden className="flex-1" />
                    )}
                    <Link href={g.lien.href} className="o-link mt-6 !text-[15px]">
                      {g.lien.label}
                      <Chevron taille={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 8 · L'ÉCHÉANCE — retour au noir ════════ */}
        <section className="o-nuit relative py-[110px]">
          <div aria-hidden className="o-deco">
            <div className="o-halo" />
          </div>
          <div className="o-wrap relative">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <div data-reveal>
                  <span className="o-pill o-pill--xs">ÉCHÉANCE LÉGALE</span>
                </div>
                <h2 data-reveal className="o-h2 mt-4">
                  1ᵉʳ septembre 2026.
                </h2>
                <p data-reveal className="o-lead mt-5">
                  À cette date, toutes les entreprises établies en France doivent
                  être en mesure de recevoir des factures électroniques au format
                  structuré. Pas un PDF par mail : un fichier qui transite par une
                  plateforme agréée.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                  <Link href="/commencer" className="o-btn o-btn--primary">
                    Faire le point avant l&apos;échéance
                  </Link>
                  <Link
                    href="/blog/facturation-electronique-2026"
                    className="o-btn o-btn--ghost"
                  >
                    Ce que la loi impose
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>
              <div data-reveal className="o-carte-nuit p-8 sm:p-10">
                <p className="o-body">
                  Le blocage ne vient presque jamais du logiciel. Il vient de la
                  qualité des données : fichiers clients sans SIREN, adresses
                  incomplètes, taux de TVA approximatifs. Chaque anomalie devient
                  une facture rejetée par la plateforme.
                </p>
                <p className="o-body mt-5">
                  Nettoyer sa base à froid coûte quelques heures. Le faire en
                  urgence, facture rejetée par facture rejetée, coûte des
                  semaines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 9 · FAQ ════════ */}
        <section data-monde="clair" className="py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="QUESTIONS"
              titre="Ce qu'on nous demande avant de signer."
              chapo="Les six questions qui reviennent à chaque premier rendez-vous, avec les réponses qu'on donne en vrai."
            />
            <div className="mx-auto mt-12 max-w-[800px]">
              {FAQ.map((f) => (
                <details key={f.q} className="o-faq-item">
                  <summary>
                    {f.q}
                    <span className="o-faq-croix" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="o-body pb-6 pr-10">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 10 · ARTICLES ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="À LIRE"
              titre="Le fond, pas la brochure."
              chapo="Conformité, financement, données, impayés : quatre sujets traités pour ce qu'ils sont, avec le calendrier et les chiffres qui vont avec."
            />
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {POSTS.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  data-reveal
                  className="o-card-soft flex flex-col p-8 transition-colors duration-200 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="o-pill o-pill--xs">{p.cat}</span>
                    <span className="o-small !text-[13px]">{p.date}</span>
                  </div>
                  <h3 className="o-h5 mt-5 !text-[21px] !leading-[29px]">
                    {p.title}
                  </h3>
                  <p className="o-small mt-3 !text-[15px] !leading-[23px] !text-[#52525b]">
                    {p.excerpt}
                  </p>
                  <span className="o-link mt-6 !text-[14px]">
                    Lire
                    <Chevron taille={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 11 · CTA — clôture au noir ════════ */}
        <section className="o-nuit relative py-[120px]">
          <div aria-hidden className="o-deco">
            <div className="o-halo" />
          </div>
          <div className="o-wrap relative flex flex-col items-center text-center">
            <h2 data-reveal className="o-h2 max-w-[620px]">
              On commence par regarder.
            </h2>
            <p data-reveal className="o-lead mt-5 max-w-[600px]">
              Trente minutes pour identifier ce qui vous coûte le plus, vérifier
              votre éligibilité au Chèque TIC, et dire franchement s&apos;il y a
              quelque chose à automatiser chez vous. Si la réponse est non, on le
              dit.
            </p>
            <div data-reveal className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/commencer" className="o-btn o-btn--primary">
                Commencer
              </Link>
              <a href={lienContact("Bonjour Omega — je vous écris depuis le site.")} className="o-btn o-btn--ghost">
                Nous joindre
              </a>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
