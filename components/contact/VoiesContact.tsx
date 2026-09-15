"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useInView } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import "./VoiesContact.css";

/* ══════════════════════════════════════════════════════════════════════
   <AttendreContact> et <BesoinsContact> — les deux fins de /contact
   (15/09/2026)

   ORIGINE. « Animated List » de Magic UI (magicui/animated-list). Sa
   mécanique : un index dans un `useState`, un `setTimeout` qui l'avance
   toutes les `delay` ms, `children.slice(0, index + 1).reverse()` qui ne
   monte que les éléments atteints — chacun entrant au SOMMET d'une pile
   sous `AnimatePresence` (ressort `scale 0 → 1`), `layout` faisant
   descendre les précédents d'un cran.

   ⚠ Le parc s'en sert déjà une fois : components/tarifs/site/JournalDemandes
   (le journal des demandes de /tarifs) en garde la CADENCE en décalages CSS,
   lignes qui montent de 8 px dans une fausse fenêtre d'application. Ici le
   geste est relu autrement : ce qui se déplace n'est pas le contenu mais LA
   LIGNE. Chaque temps porte le trait qui le sépare du précédent, et ce trait
   se trace de gauche à droite ; à trois colonnes les traits se touchent
   (gouttière nulle), de sorte que la cadence de la source se lit comme un
   seul fil qui avance en travers de la section, 01 → 02 → 03.

   POURQUOI ICI. Les deux sections répondent à la même question — « et
   après ? ». « Ce que vous pouvez attendre » était trois blocs de texte
   qu'on lit en trente secondes : le numéro passe SUR la ligne du titre,
   l'œil attrape trois titres avant de lire une phrase. « Selon votre
   besoin » était un <dl> dont seul le libellé de droite était cliquable :
   la rangée entière devient la porte, chevron compris.

   DEUX EXPORTS, une seule feuille. Un composant unique aurait dû rendre les
   deux <section> — donc la bande blanche .r-blanc, le titre collant en
   colonne de gauche et l'encart « Pas encore client ? », qui ne sont pas à
   nous. Chaque export remplace le CONTENU d'une section, rien de plus.

   CE QUI EST JETÉ. Le montage progressif (`slice`) : il ne mettrait dans le
   document que les éléments atteints — sans JavaScript, un temps sur trois
   et une rangée sur cinq. Tout est rendu au serveur, entier. `AnimatePresence`
   et `exit` : rien ne sort jamais d'ici. `layout` : il pousserait les blocs
   voisins, donc des reflows dans une page que GSAP est en train de révéler.
   `.reverse()` et la pile : une pile de notifications est le sujet de la
   démonstration, pas celui d'une page de service client — l'ordre de lecture
   est 01, 02, 03. Le ressort `stiffness 350 / damping 40` et le `scale: 0` :
   un bloc qui naît d'un point et rebondit est un jouet. `delay = 1000` :
   380 ms, le temps de lire un titre. Les fonds colorés et les pastilles
   d'icône de la démonstration : le monde est blanc, noir et gris zinc.
   `cn` de `@/lib/utils` et les utilitaires de géométrie : l'alias du projet
   est `@/lib/cn`, et tout le dessin vit dans VoiesContact.css, scopé `.resa`.

   ÉCARTS ASSUMÉS.
   · Le geste est en CSS (`@keyframes vc-trace-fil`, `vc-temps-in`), pas en
     `motion.div` : motion pose son `initial` dans le HTML du serveur, donc
     des blocs à opacité 0 servis à un visiteur sans JavaScript. Ici l'état
     de REPOS est l'état FINI ; l'attribut `data-cadence`, absent du HTML du
     serveur, ne fait que rejouer l'entrée. `motion/react` reste ce qui
     DÉCLENCHE (`useInView`, même marge que JournalDemandes).
   · L'attribut est posé par `ref.current?.setAttribute`, jamais par un
     `setState` : `react-hooks/set-state-in-effect` est en erreur ici, et
     rien d'autre ne dépend de cette valeur.
   · prefers-reduced-motion : lu par `matchMedia` DANS l'effet (jamais au
     rendu), ET les règles d'animation vivent sous `no-preference`.
   · Les cinq rangées gardent le `[data-reveal]` de la page : leur cadence
     est déjà celle du `stagger` GSAP, aucune seconde mécanique n'est
     ajoutée. Les trois temps, eux, PERDENT leur `[data-reveal]` au profit
     de la cadence d'ici — une mécanique par bloc, jamais deux.
   · Les textes sont ceux de page.tsx au mot près ; `insecables()` ne change
     qu'une chose, l'espace devant `? : ; !`, qui devient insécable. C'est
     une fonction pure : même sortie au serveur et au client.
   ══════════════════════════════════════════════════════════════════════ */

/** le `delay` de la source : un temps toutes les 380 ms, dans l'ordre de lecture */
const PAS_MS = 380;

export type TempsAttendu = { n: string; titre: string; texte: string };
export type BesoinLien = { q: string; href: string; lien: string };

/* Typographie française : l'espace qui précède ? : ; ! devient insécable.
   On la pose ICI plutôt que dans les constantes de page.tsx, qui ne sont
   pas à nous — et une insécable tapée dans un fichier se perd une fois sur
   deux, alors qu'un `\u00A0` reste lisible et se relit. */
function insecables(texte: string): string {
  return texte.replace(/ ([?:;!])/g, "\u00A0$1");
}

/* ─────────────────────────────────────────────────────────────────────
   1. « Ce que vous pouvez attendre » — trois temps, un fil qui avance
   ───────────────────────────────────────────────────────────────────── */
export function AttendreContact({
  temps,
  className,
}: {
  temps: readonly TempsAttendu[];
  className?: string;
}) {
  const racine = useRef<HTMLOListElement>(null);
  const vu = useInView(racine, { once: true, margin: "0px 0px -12% 0px" });

  /* À l'entrée dans la fenêtre, une fois : on pose l'attribut qui donne le
     départ. En mouvement réduit on ne le pose jamais — les trois temps
     restent tels que le serveur les a rendus, c'est-à-dire finis. */
  useEffect(() => {
    if (!vu) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    racine.current?.setAttribute("data-cadence", "oui");
  }, [vu]);

  return (
    <ol ref={racine} role="list" className={cn("vc-frise", className)}>
      {temps.map((t, i) => (
        <li
          key={t.n}
          className="vc-temps"
          style={{ "--vc-retard": `${i * PAS_MS}ms` } as CSSProperties}
        >
          <h3 className="vc-tete">
            <span className="num vc-num">{t.n}</span>
            <span className="vc-titre">{t.titre}</span>
          </h3>
          <p className="vc-texte">{insecables(t.texte)}</p>
        </li>
      ))}
    </ol>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   2. « Selon votre besoin » — cinq rangées, la rangée entière est la porte
   ───────────────────────────────────────────────────────────────────── */
export function BesoinsContact({
  besoins,
  className,
}: {
  besoins: readonly BesoinLien[];
  className?: string;
}) {
  return (
    <ul role="list" className={cn("vc-voies", className)}>
      {besoins.map((b) => (
        <li key={b.href} data-reveal className="vc-voie">
          {/* <Link> et jamais <a> : une adresse interne en <a> recharge le site */}
          <Link href={b.href} className="vc-rangee">
            <span className="vc-question">{insecables(b.q)}</span>
            <span className="vc-dest">
              {b.lien}
              <ChevronRight
                className="vc-chevron"
                size={16}
                strokeWidth={1.75}
                aria-hidden
                focusable="false"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
