"use client";

/* ══════════════════════════════════════════════════════════════════════
   ApercuGestion — le tableau de bord du logiciel, et deux choses qu'il
   règle

   ORIGINE. `content-11` de @felipemenezes098 (21st.dev, relevé le
   23/11/2026 sur le registre) : un grand cadre arrondi d'où DÉPASSE un
   écran (il est posé à 24 px du coin et fait 125 % de la largeur, le
   cadre le rogne), et à droite deux cartes de même fond.

   CE QUI EST REPRIS TEL QUEL, variante « standard » : la grille
   1,4 fr / 1 fr dès 1024 px, le cadre (rayon 24, hauteurs 288 / 320 /
   352 px), l'écran décalé de 24 px en 125 %, les cartes (rayon 24,
   24 px de marge, icône de 20 px, 14 px demi-gras puis 14 px), l'écran
   lui-même (en-tête, quatre tuiles, deux colonnes séparées par un filet)
   et l'entrée « subtle » : 12 px, flou de 6 px, 0,5 s, 0,1 s d'écart.

   CE QUI CHANGE, et pourquoi :
   1. L'ÉCRAN EST LE TABLEAU DE BORD DU LOGICIEL DE GESTION (repris le
      23/11 : la première version montrait un écran de recouvrement).
      Quatre tuiles (banque, ventes, à encaisser, à payer), ce qui attend
      votre accord, et le travail fait pendant la nuit, nommé par ce
      qu'il est (relances, réponses, factures lues), sans nom de code.
      Les chiffres sont ceux des écrans de /gestion : un EXEMPLE, marqué.
   2. SANS SON TITRE. La source ouvre par un titre et une phrase ; sur le
      site c'est l'en-tête de section qui les porte.
   3. AUCUN CHIFFRE DE PERFORMANCE. La source affiche un « taux de
      recouvrement » de 74 % ; ici des grandeurs d'exploitation.
   4. LES DEUX CARTES DISENT LES DEUX PHRASES DE /gestion : une saisie, à
      jour partout ; l'IA fait les réglages.
   5. PAS DE DÉPENDANCE EN PLUS : `react-wrap-balancer` est remplacé par
      `text-wrap: balance`, les cartes shadcn par un simple cadre.
   ══════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { Landmark, Link2, Package, Send, Sparkles } from "lucide-react";
import { MotionConfig, motion, type Variants } from "motion/react";
import "./essai.css";

const TUILES = [
  { libelle: "En banque", valeur: "54 210 €", note: "Compte courant" },
  { libelle: "Ventes du mois", valeur: "128 400 €", note: "42 factures" },
  { libelle: "À encaisser", valeur: "14 870 €", note: "6 factures" },
  { libelle: "À payer", valeur: "39 293 €", note: "14 factures" },
];

const A_VALIDER = [
  { Icone: Send, titre: "3 devis à envoyer", detail: "Préparés par l'IA", module: "Ventes" },
  { Icone: Landmark, titre: "3 lignes à rapprocher", detail: "Relevé de novembre", module: "Banque" },
  { Icone: Package, titre: "1 article à commander", detail: "Seuil atteint au dépôt nord", module: "Stock" },
];

const NUIT = [
  { titre: "6 relances écrites", detail: "Relances" },
  { titre: "3 réponses rédigées", detail: "Demandes clients" },
  { titre: "12 factures lues", detail: "Factures fournisseurs" },
  { titre: "8 messages rédigés", detail: "Clients inactifs" },
];

const POINTS: { icone: ReactNode; titre: string; texte: string }[] = [
  {
    icone: <Link2 className="size-5" />,
    titre: "Une saisie, à jour partout",
    texte:
      "Ventes, achats, stock, banque et comptabilité sont reliés. Une information saisie une fois est à jour partout.",
  },
  {
    icone: <Sparkles className="size-5" />,
    titre: "L'IA fait les réglages",
    texte:
      "Vous décrivez votre activité. Elle active vos modules, règle la TVA et prépare votre plan comptable.",
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

function EcranTableauDeBord() {
  return (
    <div className="eb-blanc eb-ombre w-full overflow-hidden">
      <div className="eb-trait flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div>
          <h4 className="m-0 text-sm font-semibold tracking-tight">Tableau de bord</h4>
          <p className="eb-doux m-0 mt-0.5 text-xs">Novembre 2026 · 2 dépôts</p>
        </div>
        <span className="eb-voile eb-doux rounded-full px-2 py-0.5 text-[11px] font-medium">Exemple</span>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4 sm:px-6">
        {TUILES.map((tuile) => (
          <div key={tuile.libelle} className="eb-trait min-w-0 rounded-lg border p-3">
            <p className="eb-doux m-0 truncate text-[11px]">{tuile.libelle}</p>
            <p className="m-0 mt-1 text-base font-semibold whitespace-nowrap tabular-nums">{tuile.valeur}</p>
            <p className="eb-doux m-0 mt-1 truncate text-[11px] tabular-nums">{tuile.note}</p>
          </div>
        ))}
      </div>

      <div className="eb-trait grid grid-cols-1 gap-6 border-t px-5 py-5 sm:grid-cols-2 sm:gap-0 sm:px-6">
        <div className="sm:pr-6">
          <h5 className="m-0 text-xs font-medium">À valider</h5>
          <div className="mt-3 flex flex-col">
            {A_VALIDER.map(({ Icone, titre, detail, module }) => (
              <div
                key={titre}
                className="eb-trait flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0"
              >
                <Icone className="eb-doux size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-xs font-medium">{titre}</p>
                  <p className="eb-doux m-0 truncate text-[11px]">{detail}</p>
                </div>
                <span className="eb-doux text-[11px] font-medium whitespace-nowrap">{module}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="eb-trait sm:border-l sm:pl-6">
          <h5 className="m-0 text-xs font-medium">Le travail de la nuit</h5>
          <div className="relative mt-3 flex flex-col gap-3.5 pl-4">
            <div className="eb-piste absolute top-1 bottom-1 left-[3px] w-px" />
            {NUIT.map((entree) => (
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

export default function ApercuGestion() {
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
              <EcranTableauDeBord />
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
