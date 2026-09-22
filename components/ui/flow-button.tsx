"use client";

/* 22/09/2026 — « Flow button », collé par Teo depuis 21st.dev pour remplacer
   le bouton « Commencer » du hero de l'accueil (jusque-là la pastille noire
   `o-flux-btn` du gabarit Flux).

   Ce qu'on a gardé de l'original : le trait fin au repos, le texte qui
   glisse, la flèche qui entre par la gauche pendant que l'autre sort par
   la droite, le disque noir qui gonfle sous le pointeur, les coins qui
   passent de la pilule au 12 px.

   Ce qu'on a ajouté : `href` (le hero est un LIEN vers /commencer, pas un
   bouton — l'original ne rendait qu'un <button>), `className` et `style`
   fusionnés (le hero pose sa cascade d'apparition `o-bloc-apparait` et son
   délai `--o-mot-d`), et le passage des attributs restants (`data-cta-hero`,
   que l'entête observe pour cacher son propre « Commencer »).

   Le disque de 220 px suffit tant que le bouton fait moins de ~200 px de
   large ; au-delà les coins resteraient clairs au survol. Le texte du site
   est court (« Commencer »), on ne le paramètre pas.

   `active:scale-[0.95]` : en Tailwind v4 l'échelle vit dans la propriété
   `scale`, pas dans `transform` — elle ne se bat donc pas avec le
   `transform` que la cascade `o-mot-apparait` laisse en `forwards`. */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties } from "react";
import { cn } from "@/lib/cn";

const BASE =
  "group relative inline-flex items-center gap-1 overflow-hidden rounded-[100px] border-[1.5px] border-[#333333]/40 bg-transparent px-8 py-3 text-sm font-semibold text-[#111111] cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:text-white hover:rounded-[12px] active:scale-[0.95]";

function Contenu({ text }: { text: string }) {
  return (
    <>
      {/* flèche de gauche (arr-2) : hors cadre au repos, entre au survol */}
      <ArrowRight
        aria-hidden
        className="absolute left-[-25%] z-[9] h-4 w-4 fill-none stroke-[#111111] transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:left-4 group-hover:stroke-white"
      />

      <span className="relative z-[1] -translate-x-3 transition-all duration-[800ms] ease-out group-hover:translate-x-3">
        {text}
      </span>

      {/* le disque qui gonfle sous le pointeur */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#111111] opacity-0 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:h-[220px] group-hover:w-[220px] group-hover:opacity-100"
      />

      {/* flèche de droite (arr-1) : visible au repos, sort au survol */}
      <ArrowRight
        aria-hidden
        className="absolute right-4 z-[9] h-4 w-4 fill-none stroke-[#111111] transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:right-[-25%] group-hover:stroke-white"
      />
    </>
  );
}

type Commun = {
  text?: string;
  className?: string;
  style?: CSSProperties;
};

type EnLien = Commun & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "className" | "style" | "children"
  >;

type EnBouton = Commun & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "style" | "children"
  >;

export function FlowButton(props: EnLien | EnBouton) {
  const { text = "Modern Button", className, style } = props;

  if (props.href !== undefined) {
    const { href, ...reste } = props;
    delete reste.text;
    delete reste.className;
    delete reste.style;
    return (
      <Link href={href} className={cn(BASE, className)} style={style} {...reste}>
        <Contenu text={text} />
      </Link>
    );
  }

  const { type, ...reste } = props;
  delete reste.href;
  delete reste.text;
  delete reste.className;
  delete reste.style;
  return (
    <button type={type ?? "button"} className={cn(BASE, className)} style={style} {...reste}>
      <Contenu text={text} />
    </button>
  );
}
