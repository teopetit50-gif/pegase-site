/* La signature « Conçu par Omega » du héros de Daliro.

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/
   marque.tsx`. Ce qui change :
   · `Signe` (l'ancien pictogramme de Daliro, trois rangs de blocs) ne
     servait qu'à l'entête et au pied du site source, qui ne viennent pas.
     Il est remplacé par `SigneDaliro` ci-dessous, le logo officiel.
   · Le masque pointait sur `/omega-mark.png`, une copie du logo posée dans
     le site source. On pointe sur `/logo-pegase.png`, le fichier que
     l'entête d'Omega affiche (components/Header.tsx) : c'est un masque
     alpha, la teinte vient de `bg-current`. Une seule source pour le logo,
     et aucune copie de plus dans public/. */
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

const MASQUE: CSSProperties = {
  WebkitMaskImage: "url(/logo-pegase.png)",
  maskImage: "url(/logo-pegase.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export function PoweredByOmega({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span aria-hidden="true" className="inline-block size-3 bg-current" style={MASQUE} />
      <span>Omega</span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Le signe officiel de Daliro — 24/09/2026 (fichiers fournis par Teo le
   même jour : public/logos/daliro-mark.png, 512 × 512, et
   daliro-lockup.png, 1200 × 326).

   Ce sont des MASQUES ALPHA : le RVB est noir uniforme, seule l'alpha
   porte le dessin. Un <img> nu les afficherait en noir quoi qu'on fasse ;
   on les rend donc comme `SystemLogo` (components/logos.tsx) : un fond
   `currentColor` découpé par `mask-image`, préfixes `-webkit-` compris. La
   teinte se règle par `text-…` sur l'élément ou son parent.

   On ne les copie pas dans public/secteurs-btp : ils vivent à côté des
   logos des autres systèmes, et c'est là qu'une nouvelle version sera
   déposée.

   Où il remplace la source (trois endroits, tous des maquettes où Daliro
   est l'application qui parle) :
     · la vignette d'application de la notification « Karim B. demande à
       valider » (Fonctions.tsx) — elle portait l'ancien pictogramme ;
     · l'avatar de « Daliro » dans la carte vocale (Fonctions.tsx) — il
       portait le glyphe « rouleau », celui des peintres ;
     · l'avatar de « Daliro » dans le fil d'activité des fiches du héros
       (Heros.tsx) — il portait un glyphe de robot.
   Le lockup (signe + mot) n'a pas d'emplacement dans la page : dans la
   source, seuls l'entête et le pied l'affichaient, et ils ne viennent pas. */
const SIGNE: CSSProperties = {
  WebkitMaskImage: "url(/logos/daliro-mark.png)",
  maskImage: "url(/logos/daliro-mark.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export function SigneDaliro({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block shrink-0 bg-current", className)} style={SIGNE} />;
}
