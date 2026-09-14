"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Lock } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   bento-grid-01 — la grille sombre à tuiles animées (11/09/2026)

   Reprise de `bento-grid-01` (21st.dev) : une grille de 6 colonnes où
   deux tuiles hautes (2×2) encadrent deux tuiles standard (2×1), chacune
   portant une animation en boucle au-dessus de son intitulé.

   Remplace la bande noire des quatre arguments de /offres — la section que
   Teo a mise en capture deux fois. Elle portait ce matin quatre colonnes de
   texte centré, puis `features-hover` cet après-midi ; ce qu'il manquait
   dans les deux cas est le MOUVEMENT : quatre promesses sur fond noir se
   lisent comme des conditions générales.

   ——— ce qui a été jeté, et pourquoi ————————————————————————————————
   • `bg-zinc-950 px-6 py-24 min-h-screen` : la section d'origine se
     suffisait à elle-même. Ici elle est posée DANS la bande `.o-nuit` qui
     existe déjà, qui gère son propre débordement jusqu'aux bords de
     l'écran. `min-h-screen` aurait fait une bande d'une hauteur d'écran.
   • `font-serif` : le site n'a pas de serif, il a Jakarta. Les intitulés
     prennent `var(--font-jakarta)` comme partout ailleurs.
   • `zinc-900` / `zinc-800` en dur → `--o-soft` (#18181b) et `--o-line`
     (#27272a) sous `.o-nuit`. Les valeurs tombent à un cran près, mais
     écrites en jetons la tuile suit le monde où on la pose.
   • Les six tuiles deviennent QUATRE — nous avons quatre arguments, pas
     six. La géométrie tient exactement : 2×2 + 2×1 + 2×2 + 2×1 remplit
     deux rangées de six colonnes sans trou. Les deux tuiles larges (3×1)
     de la source, qui servaient à rattraper un compte impair, sautent.
   • `Globe`, `Smartphone`, `Lock` et le « Aa » de la source disent le
     produit de la source. Les quatre animations sont réaffectées à ce que
     NOS arguments racontent (voir chaque tuile).
   • Les couleurs d'accent disparaissent : la charte est monochrome.

   ⚠ AUCUN CHIFFRE INVENTÉ. La source affiche « 100ms » qui atterrit après
   un squelette de chargement. Le même mécanisme sert ici à faire atterrir
   « Chèque TIC », pas un montant : le plafond du dispositif n'est écrit
   nulle part sur le site, et une barre de progression pleine sous
   « Financement éligible » laisserait croire à une prise en charge totale.
   La barre a donc été retirée de cette tuile.

   ⚠ LES RANGÉES SONT EN `minmax(210px, auto)`, PAS EN `210px` comme la
   source. Ses six légendes faisaient une ligne et demie ; les nôtres vont
   de 134 à 256 signes — « Financement éligible » en fait six lignes dans
   une tuile standard. À hauteur fixe, `overflow-hidden` l'aurait coupé net,
   et la coupe ne se voit pas sur un écran large où la tuile est plus large.

   Le mouvement respecte `prefers-reduced-motion` : sous ce réglage les
   quatre animations se figent sur leur état d'arrivée au lieu de boucler.
   La source ne le faisait pas.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— 1. des blocs qui se recomposent : « ça s'adapte à ce que vous avez » ——— */
function Recomposition({ fige }: { fige: boolean }) {
  const [etat, setEtat] = useState(0);
  useEffect(() => {
    if (fige) return;
    const t = setInterval(() => setEtat((p) => (p + 1) % 3), 2500);
    return () => clearInterval(t);
  }, [fige]);

  const grilles = ["grid-cols-2", "grid-cols-3", "grid-cols-1"];

  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        layout
        className={`grid ${grilles[etat]} h-fit w-full max-w-[220px] gap-2`}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            layout
            className="h-6 w-full rounded-md bg-white/[0.16]"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ——— 2. trois validations qui s'allument : « rien ne part sans vous » ———
   la source allumait trois cadenas ; ici ce sont trois coches, parce que
   l'argument parle de validation humaine et non de sécurité (qui a sa
   propre tuile juste à côté). */
function Validations({ fige }: { fige: boolean }) {
  const [actives, setActives] = useState(fige ? 3 : 0);
  useEffect(() => {
    if (fige) return;
    const t = setInterval(() => setActives((p) => (p + 1) % 4), 800);
    return () => clearInterval(t);
  }, [fige]);

  return (
    <div className="flex h-full items-center justify-center gap-2.5">
      {[0, 1, 2].map((i) => {
        const on = i < actives;
        return (
          <motion.div
            key={i}
            className={`grid h-12 w-12 place-items-center rounded-lg ${on ? "bg-white/20" : "bg-white/[0.06]"}`}
            animate={{ scale: on ? 1.08 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
              aria-hidden className={on ? "text-white" : "text-white/25"}
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ——— 3. des anneaux qui se REFERMENT sur le verrou : « cloisonné » ———
   la source faisait rayonner les anneaux vers l'extérieur (un CDN qui
   diffuse). L'argument dit l'inverse — des environnements cloisonnés — donc
   les anneaux vont de 3 à 0,6 au lieu de 0,5 à 3. Sans ce retournement
   l'image contredisait le texte qu'elle illustre. */
function Cloisonnement({ fige }: { fige: boolean }) {
  return (
    <div className="relative flex h-full items-center justify-center">
      <Lock className="z-10 h-14 w-14 text-white/85" strokeWidth={1.2} />
      {!fige &&
        [0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute h-14 w-14 rounded-full border border-white/25"
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 0.6, opacity: [0, 0.9, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.75, ease: "easeIn" }}
          />
        ))}
    </div>
  );
}

/* ——— 4. un libellé qui atterrit après son squelette : « éligible » ——— */
function Atterrissage({ libelle, fige }: { libelle: string; fige: boolean }) {
  const [charge, setCharge] = useState(!fige);
  useEffect(() => {
    if (fige) return;
    const t = setTimeout(() => setCharge(false), 900);
    return () => clearTimeout(t);
  }, [fige]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative flex h-12 w-full items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {charge ? (
            <motion.div
              key="squelette"
              className="h-9 w-32 rounded bg-white/10"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              /* ⚠ L'EXIT PORTE SA PROPRE TRANSITION. Dans la source, le
                 `transition={{ duration: 1, repeat: Infinity }}` du
                 squelette s'applique AUSSI à sa sortie : avec
                 `mode="wait"`, AnimatePresence attend la fin d'une sortie
                 qui se répète à l'infini, et le libellé n'entre jamais. Le
                 squelette pulsait donc pour toujours — invisible au
                 contrôle, parce que le texte « Chèque TIC » figure aussi
                 dans le paragraphe de la tuile et qu'une sonde qui lit le
                 textContent répond « oui, c'est affiché ». */
              exit={{ opacity: 0, y: -20, position: "absolute", transition: { duration: 0.25, repeat: 0 } }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : (
            <motion.span
              key="libelle"
              initial={{ y: 20, opacity: 0, filter: "blur(5px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              className="text-[30px] font-semibold tracking-[-0.02em] text-white"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              {libelle}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const TUILE =
  "flex flex-col overflow-hidden rounded-xl border border-[var(--o-line)] bg-[var(--o-soft)] p-7 transition-colors hover:border-white/25 sm:p-8";

export type ArgumentBento = {
  titre: string;
  texte: string;
};

/* ⚠ L'ICÔNE EST IMPORTÉE ICI, ELLE N'EST PAS UNE PROP. Ce composant porte
   « use client » ; la page qui l'appelle est un composant serveur. Un
   `icone={Lock}` passé en prop est une FONCTION qui traverse la frontière,
   et Next répond 500 en production comme en dev : « Functions cannot be
   passed directly to Client Components ». Ni `tsc` ni `eslint` ne le
   voient — seule la page rendue. Les `cases` traversent sans problème :
   ce ne sont que des chaînes. */
export function BentoGrid01({
  cases,
  libelleAtterrissage,
}: {
  /* quatre, dans l'ordre : intégration, contrôle, sécurité, financement */
  cases: [ArgumentBento, ArgumentBento, ArgumentBento, ArgumentBento];
  libelleAtterrissage: string;
}) {
  const fige = useReducedMotion() ?? false;
  const [integration, controle, securite, financement] = cases;

  const legende = (a: ArgumentBento) => (
    <div className="mt-5">
      <h3
        className="text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-white"
        style={{ fontFamily: "var(--font-jakarta)" }}
      >
        {a.titre}
      </h3>
      <p className="o-body mt-1.5">{a.texte}</p>
    </div>
  );

  const entree = (delai: number) => ({
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { delay: fige ? 0 : delai, duration: 0.5 },
  });

  return (
    <div className="grid auto-rows-[minmax(210px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
      {/* haute — l'intégration : des blocs qui se recomposent */}
      <motion.div className={`${TUILE} md:col-span-2 md:row-span-2`} {...entree(0)}>
        <div className="flex-1">
          <Recomposition fige={fige} />
        </div>
        {legende(integration)}
      </motion.div>

      {/* standard — le contrôle humain : trois validations */}
      <motion.div className={`${TUILE} md:col-span-2`} {...entree(0.1)}>
        <div className="flex-1">
          <Validations fige={fige} />
        </div>
        {legende(controle)}
      </motion.div>

      {/* haute — le financement : le libellé qui atterrit.
          ⚠ C'EST LUI QUI PREND LA TUILE HAUTE, PAS LA SÉCURITÉ, et c'est le
          seul écart avec l'ordre des arguments arrêté le 07/08. Son texte
          fait 256 signes contre 134 à la sécurité : dans une tuile standard
          il faisait six lignes, la rangée du bas devenait une fois et demie
          plus haute que celle du haut, et les deux tuiles hautes s'étiraient
          pour la suivre — trois cents pixels de noir vide autour de deux
          animations. Le texte n'a pas été raccourci, c'est le contenant qui
          s'adapte. Sécurité passe donc quatrième à la lecture. */}
      <motion.div className={`${TUILE} md:col-span-2 md:row-span-2`} {...entree(0.2)}>
        <div className="flex-1">
          <Atterrissage libelle={libelleAtterrissage} fige={fige} />
        </div>
        {legende(financement)}
      </motion.div>

      {/* standard — la sécurité : des anneaux qui se referment */}
      <motion.div className={`${TUILE} md:col-span-2`} {...entree(0.3)}>
        <div className="flex-1">
          <Cloisonnement fige={fige} />
        </div>
        {legende(securite)}
      </motion.div>
    </div>
  );
}
