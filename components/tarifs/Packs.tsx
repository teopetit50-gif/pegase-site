"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les quatre packs d'automatisations — 27/11/2026.

   CONTENU : le pitch deck « Omega — Pitch deck » du 27/11 (slide 9).
   Teo, le même jour : « tout remplacer ». Les agents à 199 € par mois et
   les recharges de pièces quittent le site.
   · l'installation d'un pack, « À PARTIR DE » : 1 750 € pour 3
     automatisations au choix, 2 900 € pour 6, 4 000 € pour les 10 ;
   · les dix automatisations de chaque pack (libellés de la slide) ;
   · le prix de la pièce n'est PAS écrit. Teo, 27/11 : « on n'est pas sûr,
     c'est à l'audit qu'on verra combien ça coûte réellement au client ».
     On écrit l'unité facturée, jamais le montant ;
   · ni remise pilote, ni pourcentage de partage, ni nom de code de pack.

   DESSIN : 21st.dev, diarmuradi/pricing-7 « Toggle Pricing Cards », choisi
   par Teo sur planche le 27/11 (« N »). Le registre demande un compte : le
   code n'a pas été récupéré, le composant est REDESSINÉ d'après son rendu
   (variante claire) : pastille, titre centré, piste segmentée, une carte
   blanche à deux colonnes (liste cochée | nom, texte, prix, bouton), la
   phrase d'aide et son lien sous la carte. Le prix, le texte et la liste
   s'animent au changement d'onglet (motion).
   Écarts voulus : DEUX pistes (le pack, puis 3 / 6 / 10), le bouton blanc
   de la charte (25/11 : tous les boutons sont blancs), les couleurs de la
   charte de l'accueil. Le dessin vit dans ./packs.css.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check } from "lucide-react";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Bouton from "@/components/charte/Bouton";
import { cn } from "@/lib/cn";
import { lienContact } from "@/lib/reservation";
import "./packs.css";

type Palier = {
  id: "3" | "6" | "10";
  onglet: string;
  nom: string;
  prix: string;
  /* la phrase entière, pour les lecteurs d'écran */
  lu: string;
  texte: string;
};

/* les trois paliers d'installation, identiques pour les quatre packs */
const PALIERS: Palier[] = [
  {
    id: "3",
    onglet: "3 automatisations",
    nom: "3 automatisations au choix",
    prix: "1 750",
    lu: "À partir de 1 750 € HT, payés une seule fois",
    texte: "Pour commencer par l'essentiel. Vous choisissez trois automatisations parmi les dix du pack.",
  },
  {
    id: "6",
    onglet: "6 automatisations",
    nom: "6 automatisations au choix",
    prix: "2 900",
    lu: "À partir de 2 900 € HT, payés une seule fois",
    texte: "Pour couvrir la tâche presque entière. Vous choisissez six automatisations parmi les dix du pack.",
  },
  {
    id: "10",
    onglet: "Pack complet",
    nom: "Le pack complet",
    prix: "4 000",
    lu: "À partir de 4 000 € HT, payés une seule fois",
    texte: "Les dix automatisations du pack. Toute la tâche est prise en charge, vous ne gardez que la validation.",
  },
];

type Pack = {
  id: string;
  onglet: string;
  nom: string;
  /* l'unité facturée à la pièce, sans montant (voir l'en-tête) */
  piece: string;
  href: string;
  automatisations: string[];
};

const PACKS: Pack[] = [
  {
    id: "relances",
    onglet: "Relances",
    nom: "Relances d'impayés",
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
    id: "dormants",
    onglet: "Clients dormants",
    nom: "Clients dormants",
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
    id: "demandes",
    onglet: "Demandes",
    nom: "Demandes entrantes",
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
    id: "factures",
    onglet: "Factures fournisseurs",
    nom: "Factures fournisseurs",
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

/* la piste segmentée de la référence : l'onglet actif est une pastille
   blanche qui glisse d'un onglet à l'autre (layoutId) */
function Piste<T extends string>({
  label,
  options,
  valeur,
  choisir,
  className,
}: {
  label: string;
  className?: string;
  options: { id: T; libelle: string }[];
  valeur: T;
  choisir: (v: T) => void;
}) {
  const reduit = useReducedMotion();
  const nom = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("pk-piste", className)}>
      {options.map((o) => {
        const actif = o.id === valeur;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => choisir(o.id)}
            className={cn("pk-onglet", actif && "pk-onglet--actif")}
          >
            {actif ? (
              <motion.span
                layoutId={`pk-curseur-${nom}`}
                className="pk-curseur"
                transition={reduit ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.45 }}
              />
            ) : null}
            <span className="pk-onglet-texte">{o.libelle}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Packs() {
  const [packId, setPackId] = useState(PACKS[0].id);
  const [palierId, setPalierId] = useState<Palier["id"]>("3");
  const reduit = useReducedMotion();
  const pack = PACKS.find((p) => p.id === packId) ?? PACKS[0];
  const palier = PALIERS.find((p) => p.id === palierId) ?? PALIERS[0];
  const complet = palier.id === "10";
  const fondu = reduit
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(4px)" },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <Section id="packs">
      <EnTeteSection
        disposition="centre"
        pastille="Packs d'automatisations"
        titre="Choisissez votre pack."
        chapo="Quatre packs de dix automatisations. Dans chacun, vous en prenez 3, 6 ou les 10. L'installation se paie une seule fois, puis l'IA se paie à la pièce."
      />

      <div className="pk">
        <div className="pk-pistes">
          <Piste
            label="Le pack"
            className="pk-piste--packs"
            options={PACKS.map((p) => ({ id: p.id, libelle: p.onglet }))}
            valeur={packId}
            choisir={setPackId}
          />
          <Piste
            label="Le nombre d'automatisations"
            className="pk-piste--paliers"
            options={PALIERS.map((p) => ({ id: p.id, libelle: p.onglet }))}
            valeur={palierId}
            choisir={setPalierId}
          />
        </div>

        <div className="pk-carte">
          {/* gauche : les dix automatisations du pack. Au palier 3 ou 6,
              ce sont les dix CHOIX possibles (cercle vide) ; au pack complet,
              les dix sont comprises (cercle plein). */}
          <div className="pk-liste">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${pack.id}-${complet}`} {...fondu}>
                <p className="pk-legende">
                  {complet ? "Les dix automatisations comprises" : `${palier.id} au choix parmi ces dix`}
                </p>
                <ul>
                  {pack.automatisations.map((a) => (
                    <li key={a}>
                      <span aria-hidden className={cn("pk-coche", complet && "pk-coche--pleine")}>
                        <Check strokeWidth={3} />
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* droite : le nom, le texte, le prix « dès », le bouton */}
          <div className="pk-offre">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${pack.id}-${palier.id}`} className="pk-offre-corps" {...fondu}>
                <p className="pk-pack">{pack.nom}</p>
                <h3 className="pk-nom">{palier.nom}</h3>
                <p className="pk-texte">{palier.texte}</p>
                <p className="pk-prix">
                  <span className="sr-only">{palier.lu}</span>
                  <span aria-hidden className="pk-prix-des">
                    dès
                  </span>
                  <span aria-hidden className="pk-prix-montant">
                    {palier.prix}&nbsp;€
                  </span>
                  <span aria-hidden className="pk-prix-unite">
                    HT, une fois
                  </span>
                </p>
                <p className="pk-piece">
                  Ensuite, à la pièce&nbsp;: {pack.piece}. Prix fixé à l&apos;audit, sur vos volumes.
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="pk-actions">
              <Bouton href="/reserver-un-audit" plein>
                Réserver un audit
              </Bouton>
              <Link href={pack.href} className="pk-detail">
                Voir le pack {pack.nom.toLowerCase()}
                <ArrowUpRight aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* le site n'est pas le catalogue : ce qui sort des quatre packs se
            construit sur mesure, et la page le dit (CLAUDE.md, « Vente ») */}
        <div className="pk-aide">
          <p>Un besoin hors de ces quatre packs&nbsp;? Nous le construisons sur mesure, sur devis.</p>
          <Link href={lienContact("avant")} className="pk-aide-lien">
            Décrire votre besoin
            <ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
    </Section>
  );
}
