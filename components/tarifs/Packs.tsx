/* ══════════════════════════════════════════════════════════════════════
   Les quatre packs d'automatisations — 27/11/2026.

   SOURCE : le pitch deck « Omega — Pitch deck » du 27/11 (slide 9, « Nos
   packs d'automatisations : dix automatisations chacun, un prix
   d'installation par palier »). Teo, le même jour : « tout remplacer ».
   Les agents à 199 € par mois et les recharges de pièces quittent le site.

   CE QUI EST ÉCRIT, mot pour mot depuis la slide :
   · l'installation d'un pack, « À PARTIR DE » : 1 750 € pour 3
     automatisations au choix, 2 900 € pour 6, 4 000 € pour les 10 ;
   · les dix automatisations de chaque pack (libellés de la slide).

   CE QUI N'EST PAS ÉCRIT :
   · le prix de la pièce (1 € ou 2 € dans les notes du deck). Teo, 27/11 :
     « on n'est pas sûr, c'est à l'audit qu'on verra combien ça coûte
     réellement au client ». On écrit l'unité facturée, jamais le montant ;
   · les remises pilotes et tout pourcentage de partage (notes internes) ;
   · les noms de code des packs (sortis du site le 25/11, commit 02b83861).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { Check } from "lucide-react";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Bouton from "@/components/charte/Bouton";
import { Scene } from "@/components/charte/Cartes";
import { cn } from "@/lib/cn";
import { lienContact } from "@/lib/reservation";
import { GrandChiffre, NOTE_TVA, type Prix } from "@/components/tarifs/TroisPrix";

/* les trois paliers d'installation, identiques pour les quatre packs */
const PALIERS_PACK: (Prix & { fort?: boolean })[] = [
  {
    nom: "3 automatisations",
    chiffre: { avant: "dès", entier: "1 750", centimes: null },
    unite: "HT, une fois",
    lu: "À partir de 1 750 € HT, payés une seule fois",
    sous: "Au choix parmi les dix du pack",
    texte: "Pour commencer par l'essentiel, par exemple les relances et la mise en demeure.",
    points: [],
  },
  {
    nom: "6 automatisations",
    chiffre: { avant: "dès", entier: "2 900", centimes: null },
    unite: "HT, une fois",
    lu: "À partir de 2 900 € HT, payés une seule fois",
    sous: "Au choix parmi les dix du pack",
    texte: "Pour couvrir la tâche presque entière, et garder la main sur le reste.",
    points: [],
  },
  {
    nom: "Le pack complet",
    chiffre: { avant: "dès", entier: "4 000", centimes: null },
    unite: "HT, une fois",
    lu: "À partir de 4 000 € HT, payés une seule fois",
    sous: "Les dix automatisations du pack",
    texte: "Toute la tâche est prise en charge. Vous ne gardez que la validation.",
    points: [],
    fort: true,
  },
];

type Pack = {
  nom: string;
  promesse: string;
  /* l'unité facturée à la pièce, sans montant (voir l'en-tête) */
  piece: string;
  href: string;
  automatisations: string[];
};

const PACKS: Pack[] = [
  {
    nom: "Relances d'impayés",
    promesse:
      "Vos factures en retard sont relancées chaque matin, jusqu'à la mise en demeure soumise à votre signature.",
    piece: "la relance envoyée",
    href: "/offres/relances-impayes",
    automatisations: [
      "Relance des devis sans réponse",
      "Rappel courtois à J+7",
      "Relance ferme à J+21",
      "Mise en demeure prête à signer",
      "Ton adapté au montant et au retard",
      "Arrêt dès le paiement encaissé",
      "Liste blanche de clients exclus",
      "Délais adaptés au secteur",
      "Journal de chaque envoi",
      "File de validation",
    ],
  },
  {
    nom: "Clients dormants",
    promesse:
      "Les clients qui ne commandent plus reçoivent un message tiré de leur dernier achat, validé avant envoi.",
    piece: "le message de reprise envoyé",
    href: "/offres/nouvelles-affaires",
    automatisations: [
      "Détection des clients silencieux",
      "Analyse des ventes et des contacts",
      "Classement par valeur",
      "Première vague validée",
      "Message tiré du dernier achat",
      "Un seul message par client",
      "Consignes appliquées à la lettre",
      "Arrêt au premier doute",
      "Reprise de contact validée",
      "Suivi des réponses",
    ],
  },
  {
    nom: "Demandes entrantes",
    promesse:
      "Chaque mail et chaque WhatsApp reçoit une réponse en moins d'une minute, tirée de votre base.",
    piece: "la demande traitée",
    href: "/offres/demandes-clients",
    automatisations: [
      "Réception des mails",
      "Réception des WhatsApp",
      "Réponse en moins d'une minute",
      "Réponses tirées de votre base",
      "Tri des demandes par urgence",
      "Rendez-vous dans l'agenda",
      "Réclamations transmises",
      "Demande d'avis Google",
      "Mention « je suis une IA »",
      "Plafond de sécurité quotidien",
    ],
  },
  {
    nom: "Factures fournisseurs",
    promesse:
      "Les factures reçues sont lues, contrôlées, classées et transmises au cabinet. Seules les anomalies vous reviennent.",
    piece: "la facture lue",
    href: "/offres/factures-fournisseurs",
    automatisations: [
      "Lecture des factures reçues",
      "PDF, scans, photos et mails",
      "Montants et échéance extraits",
      "Classement par fournisseur",
      "Catégorie comptable du secteur",
      "Contrôle HT + TVA = TTC",
      "Rangement sur le Drive",
      "Envoi direct au cabinet",
      "Export mensuel",
      "Suivi de ce qui est dû",
    ],
  },
];

function CartePack({ p }: { p: Pack }) {
  return (
    <article className="tf-tier">
      <div className="tf-tier-tete">
        <div className="tf-tier-nom">
          <h3>{p.nom}</h3>
        </div>
        <p className="tf-tier-desc">{p.promesse}</p>
      </div>

      <div className="tf-tier-prix">
        <p className="tf-tier-ligne">Ensuite, à la pièce : {p.piece}.</p>
        <p className="tf-tier-note">Le prix de la pièce est fixé à l&apos;audit, sur vos volumes.</p>
      </div>

      <div className="tf-tier-liste">
        <h4 className="tf-tier-legende">Les dix automatisations</h4>
        <ul className="space-y-2.5">
          {p.automatisations.map((a) => (
            <li key={a} className="flex items-start">
              <span
                aria-hidden
                className="mr-2.5 mt-px grid size-[18px] flex-none place-content-center rounded-full bg-[#202322] text-white"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tf-tier-pied">
        <Bouton href="/reserver-un-audit" plein>
          Réserver un audit
        </Bouton>
        <p className="tf-tier-plus">
          <Link href={p.href} className="ch-lien">
            Voir le détail
          </Link>
        </p>
      </div>
    </article>
  );
}

export default function Packs() {
  return (
    <Section id="packs">
      <EnTeteSection
        pastille="Packs d'automatisations"
        titre="Quatre packs, dix automatisations chacun."
        suite="Un prix d'installation par palier."
        chapo="Dans chaque pack, vous choisissez 3, 6 ou 10 automatisations. L'installation se paie une seule fois et nos agents constructeurs la font en 2 à 4 semaines. Ensuite, l'IA se paie à la pièce, au prix fixé à l'audit."
      />

      {/* les trois paliers, dans les colonnes à filets des prix publics */}
      <div className="tf-prix">
        <div className="tf-prix-grille">
          {PALIERS_PACK.map((p) => (
            <article key={p.nom} className={cn("tf-prix-col", p.fort && "tf-prix-col--fort")}>
              <h3 className="tf-prix-nom">{p.nom}</h3>
              <Scene basse trame={p.fort} className="tf-prix-scene">
                <GrandChiffre p={p} />
                <p className="tf-prix-sous">{p.sous}</p>
              </Scene>
              <p className="tf-prix-texte">{p.texte}</p>
            </article>
          ))}
        </div>
      </div>

      <div id="grille" className="tf-agents scroll-mt-32">
        {PACKS.map((p) => (
          <CartePack key={p.nom} p={p} />
        ))}
      </div>

      {/* le site n'est pas le catalogue : ce qui sort des quatre packs se
          construit sur mesure, et la page le dit (CLAUDE.md, « Vente ») */}
      <div className="tf-prix-notes">
        <p>
          Un besoin hors de ces quatre packs, un logiciel peu répandu à raccorder ou plusieurs services
          aux règles distinctes ? Nous le construisons sur mesure, sur devis.{" "}
          <Link href={lienContact("avant")} className="ch-lien">
            Décrire votre besoin
          </Link>
        </p>
        <p className="tf-prix-tva">{NOTE_TVA}</p>
      </div>
    </Section>
  );
}
