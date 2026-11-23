"use client";

/* ══════════════════════════════════════════════════════════════════════
   ApercuRecouvrement — l'écran du recouvrement, et deux choses qu'il règle

   ORIGINE. `content-11` de @felipemenezes098 (21st.dev, relevé le
   23/11/2026 sur le registre) : un grand cadre arrondi d'où DÉPASSE un
   écran de recouvrement (il est posé à 24 px du coin et fait 125 % de la
   largeur, le cadre le rogne), et à droite deux cartes de même fond.

   CE QUI EST REPRIS TEL QUEL, variante « standard » : la grille
   1,4 fr / 1 fr dès 1024 px, le cadre (rayon 24, hauteurs 288 / 320 /
   352 px), l'écran décalé de 24 px en 125 %, les cartes (rayon 24,
   24 px de marge, icône de 20 px, 14 px demi-gras puis 14 px), l'écran
   lui-même (en-tête, quatre tuiles, deux colonnes séparées par un filet)
   et l'entrée « subtle » : 12 px, flou de 6 px, 0,5 s, 0,1 s d'écart.

   CE QUI CHANGE, et pourquoi :
   1. SANS SON TITRE. La source ouvre par un titre et une phrase ; sur le
      site c'est l'en-tête de section qui les porte, dans sa graisse à
      lui. Le bloc ne rend que le cadre et les deux cartes.
   2. DES TUILES QUI NE PROMETTENT RIEN. La source affiche un « taux de
      recouvrement » de 74 % : dans une page de vente, c'est un chiffre
      de performance inventé. Ici quatre grandeurs d'exploitation
      (encours, comptes, relances à valider, promesses), et la mention
      « Exemple » sur l'écran.
   3. PAS DE DÉPENDANCE EN PLUS : `react-wrap-balancer` est remplacé par
      `text-wrap: balance`, les cartes shadcn par un simple cadre.
   4. Une seule teinte de variation (vert pour ce qui monte), le reste
      en encre.
   ══════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, LayoutGrid, Mail, MessageSquare, Phone, Sparkles } from "lucide-react";
import { MotionConfig, motion, type Variants } from "motion/react";
import "./essai.css";

const TUILES = [
  { libelle: "Encours échu", valeur: "184 290 €", ecart: "−4,2 %", sens: "bas" as const },
  { libelle: "Comptes suivis", valeur: "312", ecart: "+12", sens: "haut" as const },
  { libelle: "Relances à valider", valeur: "9", ecart: "ce matin", sens: "plat" as const },
  { libelle: "Promesses de paiement", valeur: "27", ecart: "+5", sens: "haut" as const },
];

const CANAUX = [
  { Icone: Mail, nom: "E-mail", detail: "124 envoyés ce mois", reste: "6 à valider" },
  { Icone: MessageSquare, nom: "SMS", detail: "86 envoyés ce mois", reste: "2 à valider" },
  { Icone: Phone, nom: "Téléphone", detail: "41 appels préparés", reste: "1 à valider" },
];

const FIL = [
  { titre: "Paiement reçu", detail: "Menuiserie Costa · 2 480 €" },
  { titre: "Séquence de relance terminée", detail: "Garage du Port" },
  { titre: "Nouveaux comptes importés", detail: "38 fiches" },
  { titre: "Échéancier accepté", detail: "Bâti Sud" },
];

const POINTS: { icone: ReactNode; titre: string; texte: string }[] = [
  {
    icone: <LayoutGrid className="size-5" />,
    titre: "Une vue par compte",
    texte: "Soldes, paiements et relances vivent au même endroit, plus dans des tableurs dispersés.",
  },
  {
    icone: <Sparkles className="size-5" />,
    titre: "Des priorités à jour",
    texte: "Chaque compte est classé par statut et par ancienneté. Ce qui demande votre attention remonte tout seul.",
  },
];

const conteneur: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const element: Variants = {
  cache: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const media: Variants = {
  cache: { opacity: 0, scale: 0.97, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function EcranRecouvrement() {
  return (
    <div className="eb-blanc eb-ombre w-full overflow-hidden">
      <div className="eb-trait flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div>
          <h4 className="m-0 text-sm font-semibold tracking-tight">Recouvrement</h4>
          <p className="eb-doux m-0 mt-0.5 text-xs">L&apos;état de chaque compte, ce mois-ci</p>
        </div>
        <span className="eb-voile eb-doux rounded-full px-2 py-0.5 text-[11px] font-medium">Exemple</span>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4 sm:px-6">
        {TUILES.map((tuile) => (
          <div key={tuile.libelle} className="eb-trait min-w-0 rounded-lg border p-3">
            <p className="eb-doux m-0 truncate text-[11px]">{tuile.libelle}</p>
            <p className="m-0 mt-1 text-base font-semibold tabular-nums">{tuile.valeur}</p>
            <p
              className={`m-0 mt-1 flex items-center gap-0.5 text-[11px] tabular-nums ${tuile.sens === "haut" ? "eb-monte" : "eb-doux"}`}
            >
              {tuile.sens === "haut" && <ArrowUpRight className="size-3" />}
              {tuile.sens === "bas" && <ArrowDownRight className="size-3" />}
              {tuile.ecart}
            </p>
          </div>
        ))}
      </div>

      <div className="eb-trait grid grid-cols-1 gap-6 border-t px-5 py-5 sm:grid-cols-2 sm:gap-0 sm:px-6">
        <div className="sm:pr-6">
          <h5 className="m-0 text-xs font-medium">Relances par canal</h5>
          <div className="mt-3 flex flex-col">
            {CANAUX.map(({ Icone, nom, detail, reste }) => (
              <div
                key={nom}
                className="eb-trait flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0"
              >
                <Icone className="eb-doux size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-xs font-medium">{nom}</p>
                  <p className="eb-doux m-0 text-[11px]">{detail}</p>
                </div>
                <span className="text-xs font-medium whitespace-nowrap tabular-nums">{reste}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="eb-trait sm:border-l sm:pl-6">
          <h5 className="m-0 text-xs font-medium">Fil du jour</h5>
          <div className="relative mt-3 flex flex-col gap-3.5 pl-4">
            <div className="eb-piste absolute top-1 bottom-1 left-[3px] w-px" />
            {FIL.map((entree) => (
              <div key={entree.titre} className="relative">
                <span className="eb-point absolute top-1 -left-4 size-1.5 rounded-full" />
                <p className="m-0 text-xs font-medium">{entree.titre}</p>
                <p className="eb-doux m-0 text-[11px]">{entree.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApercuRecouvrement() {
  /* `reducedMotion="user"` : sous mouvement réduit, la bibliothèque saute
     les déplacements et ne garde que le fondu. La source lisait la
     préférence dans le rendu, ce qui désaccorde serveur et navigateur. */
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="eb grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-6"
        variants={conteneur}
        initial="cache"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <motion.div variants={media}>
          <div
            aria-hidden="true"
            className="eb-voile relative h-72 w-full overflow-hidden rounded-3xl sm:h-80 lg:h-[22rem]"
          >
            <div className="absolute top-6 left-6 w-[125%] max-w-none overflow-hidden rounded-2xl">
              <EcranRecouvrement />
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 sm:gap-5">
          {POINTS.map((point) => (
            <motion.div
              key={point.titre}
              variants={element}
              className="eb-voile flex h-full flex-col gap-2 rounded-3xl p-6"
            >
              {point.icone}
              <h3 className="m-0 text-sm font-semibold">{point.titre}</h3>
              <p className="eb-doux m-0 text-sm leading-relaxed text-balance">{point.texte}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </MotionConfig>
  );
}
