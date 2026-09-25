"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { MENU, rubriqueCourante, type Entree } from "@/lib/menu";
import "./menu-principal.css";

/* ══════════════════════════════════════════════════════════════════════
   MenuPrincipal — le bandeau horizontal du header (11/09/2026)

   Ce que ce composant change pour le visiteur : jusqu'ici la barre
   n'affichait AUCUN lien, à aucune largeur — juste un burger, et toute la
   navigation derrière un panneau plein écran. Le catalogue vit maintenant
   dans la barre à partir de `lg` ; en dessous, le burger et son panneau
   sont conservés tels quels (un menu déroulant au survol n'a pas de sens
   au doigt).

   ─ Pourquoi le seuil est à `lg` et pas à `md` ─

   Relevé à 1024 px : logo 140, les cinq intitulés 465, le groupe de droite
   (CTA + compte) 140 — il reste environ 200 px de jeu dans la colonne de
   944. À 768 il en manquerait une centaine, et les intitulés se
   toucheraient avant de déborder. C'est aussi le seuil déjà retenu pour la
   console.

   ─ Le caméléon ─

   Le header prélève le fond réel de la section qu'il survole ; il nous
   passe le résultat en `clair`, qui pose `.omenu--clair`. Une seule classe
   décide des deux mondes, au lieu d'un ternaire par élément — le reste de
   Header.tsx en compte une quinzaine, et c'est exactement ce qui rend ce
   fichier pénible à modifier.

   ─ Le panneau, lui, ne suit pas ─

   Il est blanc dans les deux mondes (voir menu-principal.css). Son seul
   ornement est la case large de « Nos offres » : un léger dégradé et la
   marque, calqué sur la case vedette de la démo d'origine, qui donne au
   panneau un point d'entrée au lieu d'une liste nue de cinq lignes.
   ══════════════════════════════════════════════════════════════════════ */

/* 25/09 — un panneau à plusieurs colonnes (« Nos offres ») : les entrées
   portent le titre de leur colonne, et celles d'une même colonne se
   suivent. On les regroupe dans l'ordre de la liste. Aucune entrée
   titrée : `null`, le panneau garde sa géométrie d'origine. */
function enColonnes(entrees: Entree[] = []) {
  if (!entrees.some((e) => e.colonne)) return null;
  const colonnes: { titre: string; entrees: Entree[] }[] = [];
  for (const e of entrees) {
    const titre = e.colonne ?? "";
    const derniere = colonnes[colonnes.length - 1];
    if (derniere && derniere.titre === titre) derniere.entrees.push(e);
    else colonnes.push({ titre, entrees: [e] });
  }
  return colonnes;
}

function Rangee({ entree, pathname }: { entree: Entree; pathname: string }) {
  return (
    <li>
      <NavigationMenuLink
        asChild
        active={
          pathname === entree.href || pathname.startsWith(entree.href + "/")
        }
      >
        <Link href={entree.href}>
          <div className="font-medium tracking-[-0.01em]">{entree.label}</div>
          {entree.texte && (
            <p className="text-[13px] leading-[1.45] text-[var(--omenu-panneau-douce)]">
              {entree.texte}
            </p>
          )}
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export default function MenuPrincipal({
  clair,
  pathname,
}: {
  clair: boolean;
  pathname: string;
}) {
  const courante = rubriqueCourante(pathname);

  return (
    <NavigationMenu
      viewport={false}
      aria-label="Navigation principale"
      className={`omenu hidden lg:flex ${clair ? "omenu--clair" : ""}`}
    >
      <NavigationMenuList>
        {MENU.map((rubrique) => {
          const active = courante === rubrique.label;

          /* rubrique simple : un lien, pas de chevron. Il emprunte la même
             variante que les intitulés à panneau — sans quoi « Tarifs »
             n'aurait ni la même hauteur ni le même creux au survol que
             « Nos offres » juste à côté. */
          if (rubrique.href) {
            return (
              <NavigationMenuItem key={rubrique.label}>
                <NavigationMenuLink
                  asChild
                  active={active}
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href={rubrique.href}>{rubrique.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }

          const large = Boolean(rubrique.vedette);
          const colonnes = enColonnes(rubrique.entrees);
          const vedette = rubrique.vedette && (
            /* 24/09 (Teo) — la case vedette couvre autant de rangées
                       que la liste a d'entrées. Écrite en dur à 5, elle
                       laissait le sixième secteur (« Groupes de
                       distribution ») retomber sous elle, à gauche, au lieu
                       de le ranger dans la colonne de droite. */
            <li
              className="md:row-span-(--rangs)"
              style={
                {
                  "--rangs": rubrique.entrees?.length || 1,
                } as CSSProperties
              }
            >
              <NavigationMenuLink asChild>
                <Link
                  href={rubrique.vedette.href}
                  /* `h-full` + `justify-end` : la case occupe toute
                             la hauteur de la colonne voisine quel que soit
                             le nombre d'entrées, et son texte reste calé en
                             bas. C'est la géométrie de la case vedette
                             d'origine, dont la hauteur venait d'un
                             `row-span` et non d'une valeur écrite. */
                  className="relative flex h-full flex-col justify-end overflow-hidden rounded-[10px] bg-[#f3f3f1] p-4 no-underline select-none"
                >
                  {/* 14/09 (Teo) — la case avait un fond vide, un
                              simple dégradé de 300 px de haut sous la
                              marque : « il manque une image ». On y pose
                              les plis blancs du gabarit Flux
                              (`/fonds/plis-menu.webp`, recadrage portrait
                              de `plis-blancs.webp`) : la texture qui
                              servait au hero avant Silk, monochrome, donc
                              dans la charte. Le voile en dégradé, quasi nul
                              en haut et blanc cassé en bas, garde la marque
                              lisible sur les plis et repose le texte sur
                              une surface calme — ce que faisait l'ancien
                              dégradé, à la même teinte d'arrivée. */}
                  <Image
                    src="/fonds/plis-menu.webp"
                    alt=""
                    fill
                    sizes="240px"
                    className="object-cover object-center"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,250,250,0.15)_0%,rgba(245,245,243,0.55)_45%,rgba(239,239,236,0.96)_100%)]"
                  />
                  <Image
                    src="/logo-pegase.png"
                    alt=""
                    width={96}
                    height={96}
                    className="relative mb-auto h-[22px] w-[22px]"
                  />
                  <div className="relative mt-4 mb-1 text-[15px] font-semibold tracking-[-0.01em]">
                    {rubrique.vedette.label}
                  </div>
                  <p className="relative text-[13px] leading-[1.45] text-[var(--omenu-panneau-douce)]">
                    {rubrique.vedette.texte}
                  </p>
                </Link>
              </NavigationMenuLink>
            </li>
          );

          return (
            /* 25/09 — le panneau à colonnes fait 880 px : posé sous son
               intitulé, il sortait de l'écran à droite dès 1280. L'item
               passe en `static`, le panneau se place donc par rapport au
               bandeau entier (la racine, `relative`) et s'y centre. */
            <NavigationMenuItem
              key={rubrique.label}
              className={colonnes ? "static" : undefined}
            >
              {/* La primitive n'a pas de prop `active` sur l'intitulé à
                  panneau : on pose l'attribut à la main, dans la même
                  écriture que celle de la primitive (présent et vide) pour
                  que le sélecteur `data-[active]` attrape les deux. */}
              <NavigationMenuTrigger {...(active ? { "data-active": "" } : {})}>
                {rubrique.label}
              </NavigationMenuTrigger>

              <NavigationMenuContent
                className={colonnes ? "md:left-[calc(50%-440px)]" : undefined}
              >
                {colonnes ? (
                  /* 25/09 — la vedette, puis une colonne par titre. La
                     vedette tient toute la hauteur (`h-full` dans sa case). */
                  <div className="grid w-[880px] grid-cols-[200px_1fr_1fr] gap-x-1.5">
                    <ul className="grid">{vedette}</ul>
                    {colonnes.map((c) => (
                      <div key={c.titre}>
                        <p className="px-2.5 pt-2.5 pb-1 text-[12px] font-medium tracking-[0.01em] text-[var(--omenu-panneau-douce)]">
                          {c.titre}
                        </p>
                        <ul className="grid gap-0.5">
                          {c.entrees.map((entree) => (
                            <Rangee
                              key={entree.href}
                              entree={entree}
                              pathname={pathname}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul
                    className={
                      large
                        ? "grid w-[560px] gap-0.5 md:grid-cols-[0.8fr_1fr]"
                        : "grid w-[320px] gap-0.5"
                    }
                  >
                    {vedette}

                    {rubrique.entrees?.map((entree) => (
                      <li
                        key={entree.href}
                        /* 15/09, dans la journée — cette case a porté un
                        placement explicite (`md:col-start-1 md:row-start-6`)
                        sur `rang === 0`, le temps où « Nos offres » comptait
                        SIX entrées pour cinq rangées : la sixième retombait
                        sous la case vedette, et on y avait mis « Votre métier »
                        plutôt que de laisser l'ordre de la liste y envoyer
                        « Sur mesure ».

                        La page /secteurs ayant été supprimée, « Votre métier »
                        est partie et le groupe est revenu à CINQ entrées —
                        exactement le nombre de rangées de la case vedette. Le
                        placement épinglé, lui, était resté : il visait
                        toujours la première entrée de la liste, devenue CASHD,
                        qui se retrouvait donc seule sous la vedette pendant
                        que les quatre autres tenaient la colonne de droite
                        (Teo : « CASHD a été déplacé, il doit être dans la
                        liste à droite »).

                        Il n'y a plus rien à épingler : à cinq entrées pour
                        cinq rangées, l'auto-placement remplit la colonne de
                        droite dans l'ordre, et c'est le résultat voulu. Ne pas
                        réintroduire de `col-start`/`row-start` ici sans
                        recompter les entrées — et si le groupe repasse à six,
                        écrire les DEUX coordonnées, pas seulement la colonne :
                        une case au placement à moitié libre déplace le curseur
                        d'auto-placement et met les systèmes en quinconce. */
                      >
                        <NavigationMenuLink
                          asChild
                          active={
                            pathname === entree.href ||
                            pathname.startsWith(entree.href + "/")
                          }
                        >
                          <Link href={entree.href}>
                            <div className="font-medium tracking-[-0.01em]">
                              {entree.label}
                            </div>
                            {entree.texte && (
                              <p className="text-[13px] leading-[1.45] text-[var(--omenu-panneau-douce)]">
                                {entree.texte}
                              </p>
                            )}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                )}
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
