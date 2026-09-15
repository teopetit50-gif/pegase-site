"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { SystemLogo } from "@/components/logos";
import { Chevron } from "@/components/offres/MediaMoteurs";
import { nomPaquet } from "@/lib/content";
import "./CartesSystemes.css";

/* ══════════════════════════════════════════════════════════════════════
   <CartesSystemes> — les quatre cartes « ce que chaque système consomme »
   de /integrations (14/09/2026)

   ORIGINE. `card-hover-effect` d'Aceternity UI (MIT), fiche de la
   bibliothèque montée le 20/08 : `OMEGA/toyota-guadeloupe/bibliotheque/
   composants/cartes-et-produits/aceternity__card-hover-effect/`. Sa seule
   idée réelle est gardée : un lavis de fond partagé qui GLISSE d'une carte
   à l'autre au survol (AnimatePresence + `layoutId`), la carte survolée se
   détachant de lui en passant au blanc.

   POURQUOI ICI. Les quatre cartes sont quatre PORTES vers /offres/<slug>,
   et elles ne le disaient que par un « Voir la fiche » en bas à gauche :
   au repos, une rangée de quatre pavés gris inertes. Quatre cartes qui
   s'éclaireraient chacune dans leur coin se liraient comme quatre produits
   sans rapport ; un seul lavis qui se déplace les lit comme quatre entrées
   d'une même maison — ce que dit le chapô juste au-dessus. Le geste est
   déjà dans la maison : <PortesHover> (accueil) l'a repris du même
   composant le 10/09, mêmes durées, même `exit` retardé.

   CE QUI EST JETÉ. Tout son habillage : `bg-neutral-200`, la carte noire,
   `dark:bg-slate-800/[0.8]`, `rounded-3xl`, `text-zinc-100`, `text-zinc-400`,
   `group-hover:border-slate-700`, ses quatre sous-composants exportés
   (Card/CardTitle/CardDescription) et son `cn` de `@/lib/utils`, qui n'existe
   pas dans ce dépôt. Sa grille `md:2 lg:3 py-10` aussi : la rangée est
   1 / 2 / 4, et l'écart des colonnes reste le `gap-4` de la page.

   ÉCARTS ASSUMÉS.
   • LE FOCUS CLAVIER ALLUME LA CARTE, ce que la source ne fait pas (elle
     n'écoute que la souris). `onFocus` filtré par `:focus-visible` : un
     clic à la souris, qui focalise aussi le lien, n'allume donc rien de
     plus que le survol.
   • « (hover: none) → rien » est tenu en JavaScript et non en CSS :
     `onPointerEnter` n'allume que si `pointerType === "mouse"`. Un gel en
     `@media (hover: none)` aurait coupé du même coup le chemin clavier
     d'une tablette à clavier.
   • Le blanc de la carte active est piloté par `data-actif` et non par
     `hover:bg-white` : `.o-card-soft` pose son fond HORS COUCHE dans
     globals.css, il gagne contre tout utilitaire Tailwind (c'est la raison
     d'être de `.o-card-porte`). Et un attribut, contrairement à `:hover`,
     répond aussi au focus.
   • `data-reveal` reste sur CHAQUE carte, comme aujourd'hui : `motion`
     n'écrit ici que sur le lavis, jamais sur le lien que GSAP anime — les
     deux ne se disputent aucun transform.
   • Le lavis déborde de 8 px et non de la gouttière entière : à `gap-4`,
     deux lavis voisins se toucheraient sans jamais se recouvrir, et un
     seul est allumé à la fois.
   • useReducedMotion : plus de `layoutId` (donc plus de glissement) et
     durées à zéro — l'état change d'un coup, rien ne disparaît.
   ══════════════════════════════════════════════════════════════════════ */

/* Un outil aplati en title/hex/path : un composant client ne reçoit que du
   sérialisable, jamais le module simple-icons, que la page aplatit déjà
   pour <FamilleOutils> / <GrilleOutils>. Rien n'est recopié ici. */
export type PastilleOutil = { title: string; hex: string; path: string };

export type Systeme = {
  system: string;
  slug: string;
  role: string;
  outils: PastilleOutil[];
};

/* `layoutId` est GLOBAL à l'application : ce nom ne doit croiser ni
   « porte-surbrillance » (<PortesHover>) ni « cpt-surbrillance »
   (<CompteTableau>, supprimé le 15/09). */
const LAVIS = "csy-lavis-systeme";

export default function CartesSystemes({
  systemes,
  className,
}: {
  systemes: Systeme[];
  className?: string;
}) {
  /* l'INDICE de la carte allumée, jamais son nom : rien à faire coïncider
     avec une donnée, et `null` est le repos rendu par le serveur */
  const [actif, setActif] = useState<number | null>(null);
  const fige = useReducedMotion() ?? false;

  if (systemes.length === 0) return null;

  /* mêmes valeurs que la source : 150 ms à l'entrée, 150 ms à la sortie
     après 200 ms d'attente — c'est ce délai qui fait que le lavis a le
     temps d'arriver sur la carte suivante avant de s'éteindre sur la
     précédente, donc qu'il GLISSE au lieu de clignoter. */
  const entree = fige ? { duration: 0 } : { duration: 0.15 };
  const sortie = fige ? { duration: 0 } : { duration: 0.15, delay: 0.2 };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {systemes.map((m, i) => {
        const allume = actif === i;
        return (
          <Link
            key={m.system}
            href={`/offres/${m.slug}`}
            data-reveal
            className="csy-porte"
            onPointerEnter={(e) => {
              /* le tactile ne déclenche rien : un tap enverrait un
                 pointerenter de type « touch » juste avant de naviguer */
              if (e.pointerType === "mouse") setActif(i);
            }}
            onPointerLeave={() => setActif(null)}
            onFocus={(e) => {
              if (e.currentTarget.matches(":focus-visible")) setActif(i);
            }}
            onBlur={() => setActif(null)}
          >
            <AnimatePresence>
              {allume && (
                <motion.span
                  aria-hidden
                  layoutId={fige ? undefined : LAVIS}
                  className="csy-lavis"
                  initial={fige ? false : { opacity: 0 }}
                  animate={{ opacity: 1, transition: entree }}
                  exit={{ opacity: 0, transition: sortie }}
                />
              )}
            </AnimatePresence>

            <div
              data-actif={allume ? "true" : "false"}
              className="o-card-soft csy-carte flex h-full flex-col p-7"
            >
              <div className="flex items-center gap-3">
                <SystemLogo system={m.system} />
                <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#09090b]">
                  {nomPaquet(m.system)}
                </span>
              </div>

              <p className="o-small csy-role mt-3 !text-[15px] !text-[#52525b]">
                {m.role}
              </p>

              {m.outils.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {m.outils.map((o) => (
                    /* le nom porté par le disque et non par le tracé : une
                       seule annonce, et l'infobulle tombe sur la même cible
                       que le nom lu à la synthèse vocale */
                    <span
                      key={o.title}
                      role="img"
                      title={o.title}
                      aria-label={o.title}
                      className="csy-pastille"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill={`#${o.hex}`}
                        aria-hidden
                      >
                        <path d={o.path} />
                      </svg>
                    </span>
                  ))}
                </div>
              )}

              {/* `mt-auto` : le rôle de RELOAD tient sur deux lignes là où
                  les trois autres en font une — sans lui, les quatre
                  « Voir la fiche » ne seraient pas sur la même ligne */}
              <span className="o-link mt-auto pt-6 !text-[14px]">
                Voir la fiche
                <Chevron taille={12} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
