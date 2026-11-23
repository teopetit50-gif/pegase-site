"use client";

/* ══════════════════════════════════════════════════════════════════════
   MetiersOnglets — une rangée de logos en onglets ; chacun ouvre un
   fait en grand et la situation qu'il règle

   ORIGINE. `logo-cloud-04` de Hirael (@mohammadshehadeh, MIT, 21st.dev,
   relevé le 23/11/2026 sur le registre) : six mots-symboles de clients
   en onglets entre deux filets ; l'actif porte une ligne qui se remplit
   en 6 s puis passe au suivant, s'arrête au survol et au clavier, et ne
   repart plus dès qu'on a choisi soi-même. Dessous : un chiffre en très
   grand, et à droite d'un filet la citation et son lien.

   CE QUI EST REPRIS TEL QUEL : la grille des onglets (2, 3 puis 6
   colonnes, 80 px de haut, filets haut et bas), la ligne de 2 px et ses
   6 s, la pause, l'arrêt après un choix, le panneau en 5 fr / 7 fr avec
   son filet et ses 64 px, les corps (12 px, 60 → 72 px, 18 px, 14 px ;
   citation 20 → 24 px), l'échange du panneau (fondu + 8 px, 250 ms,
   60 ms d'écart).

   CE QUI CHANGE, et pourquoi :
   1. AUCUN CLIENT INVENTÉ. La source signe six citations de personnes
      nommées et affiche leurs résultats (« 41 % de tickets en moins »).
      Ici les onglets sont NOS six modules métier (repris le 23/11 : la
      première version y mêlait les agents par leur nom de code). En
      grand, l'objet du métier ; dessous, ce que fait le module ; à
      droite, le problème de départ. Les deux phrases sont celles de
      l'accueil (lib/secteurs-accueil), déjà validées.
   2. LES LOGOS SONT LES NÔTRES (public/logos), en gris comme dans le
      défilement de l'accueil ; la source compose des mots-symboles.
      Ceux des agents sont des fichiers BLANCS (relevé à la recette :
      luminance 255) : `logoBlanc` les retourne en encre, sans quoi
      trois onglets sur six sont vides.
   3. LA GRAISSE DES TITRES DE L'ACCUEIL : chiffre et citation en normal,
      là où la source est en demi-gras.
   4. Les onglets sont ceux de Radix (clavier et rôles natifs), sans la
      copie des onglets shadcn que la source embarque. La ligne est à
      l'encre : le gris chaud de la source n'existe pas dans la charte.
   Les récits arrivent en propriété : la page les compose depuis
   components/accueil-v3/textes, ce composant ne connaît aucun texte.
   ══════════════════════════════════════════════════════════════════════ */

import * as Tabs from "@radix-ui/react-tabs";
import Image from "next/image";
import Link from "next/link";
import { useState, type AnimationEvent, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import "./essai.css";

export type Recit = {
  id: string;
  nom: string;
  /** le logo complet (signe + nom) ; sans lui, le nom s'écrit en toutes lettres */
  logo?: string;
  /** vrai quand le fichier du logo est blanc (les agents) : il est retourné en encre */
  logoBlanc?: boolean;
  chiffre: string;
  libelle: string;
  note: string;
  texte: string;
  role: string;
  href: string;
  lien: string;
};

const AVANCE_MS = 6000;

const retard = (index: number, pas = 60): CSSProperties => ({ animationDelay: `${index * pas}ms` });
const numero = (n: number) => String(n).padStart(2, "0");

export default function MetiersOnglets({ recits }: { recits: Recit[] }) {
  const [actif, setActif] = useState(recits[0].id);
  const [choisi, setChoisi] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [focus, setFocus] = useState(false);

  const enPause = survol || focus;
  const auto = !choisi;

  const avancer = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.target !== event.currentTarget || !auto) return;
    const courant = recits.findIndex((recit) => recit.id === actif);
    setActif(recits[(courant + 1) % recits.length].id);
  };

  const choisir = (valeur: string) => {
    if (!valeur) return;
    setActif(valeur);
    setChoisi(true);
  };

  return (
    <Tabs.Root
      value={actif}
      onValueChange={choisir}
      className="eb w-full"
      onPointerEnter={() => setSurvol(true)}
      onPointerLeave={() => setSurvol(false)}
      onFocus={() => setFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false);
      }}
    >
      <Tabs.List
        aria-label="Modules métier"
        className="eb-trait grid w-full grid-cols-2 border-y sm:grid-cols-3 lg:grid-cols-6"
      >
        {recits.map((recit) => {
          const estActif = recit.id === actif;
          return (
            <Tabs.Trigger
              key={recit.id}
              value={recit.id}
              className="eb-onglet relative flex h-20 cursor-pointer items-center justify-center border-0 bg-transparent px-4"
            >
              {recit.logo ? (
                <Image
                  src={recit.logo}
                  alt={recit.nom}
                  width={120}
                  height={33}
                  className={`h-6 w-auto object-contain transition-opacity duration-150 ${recit.logoBlanc ? "eb-logo-blanc" : "eb-logo"} ${estActif ? "opacity-100" : "opacity-45"}`}
                />
              ) : (
                <span
                  className={`text-base font-medium whitespace-nowrap transition-opacity duration-150 ${estActif ? "opacity-100" : "opacity-45"}`}
                >
                  {recit.nom}
                </span>
              )}
              <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden">
                {estActif && (
                  <span
                    onAnimationEnd={avancer}
                    style={
                      auto
                        ? {
                            animationDuration: `${AVANCE_MS}ms`,
                            animationPlayState: enPause ? "paused" : "running",
                          }
                        : undefined
                    }
                    className={`eb-ligne-active block size-full ${auto ? "eb-avance" : ""}`}
                  />
                )}
              </span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      {recits.map((recit, index) => (
        <Tabs.Content
          key={recit.id}
          value={recit.id}
          className="grid gap-10 pt-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:pt-14"
        >
          <div className="flex flex-col gap-3">
            <span className="eb-anim-change eb-doux text-xs tabular-nums">
              {numero(index + 1)}
              <span className="eb-pale mx-1.5">|</span>
              {numero(recits.length)}
            </span>
            <p style={retard(1)} className="eb-anim-change m-0 mt-3 flex flex-col gap-1">
              <span className="text-5xl leading-none font-normal tracking-tight sm:text-6xl xl:text-7xl">
                {recit.chiffre}
              </span>
              <span className="text-lg font-medium">{recit.libelle}</span>
            </p>
            {recit.note && (
              <span style={retard(2)} className="eb-anim-change eb-doux text-sm">
                {recit.note}
              </span>
            )}
          </div>

          <figure className="eb-trait m-0 flex flex-col gap-6 md:border-l md:pl-16">
            <blockquote
              style={retard(2)}
              className="eb-anim-change m-0 text-xl leading-relaxed font-normal tracking-tight text-pretty sm:text-2xl"
            >
              «&nbsp;{recit.texte}&nbsp;»
            </blockquote>
            <figcaption
              style={retard(3)}
              className="eb-anim-change flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{recit.nom}</span>
                <span className="eb-doux text-sm">{recit.role}</span>
              </span>
              <Link href={recit.href} className="eb-lien">
                {recit.lien}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </figcaption>
          </figure>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
