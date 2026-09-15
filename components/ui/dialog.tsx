"use client";

/* ══════════════════════════════════════════════════════════════════════
   dialog — reprise de `@originui/dialog` (21st.dev, MIT), 15/09/2026

   Demandé par Teo : « utilise les composants 21st.dev, je veux que ce soit
   pro ; quand on clique sur le profil ça nous fait un beau truc. » Le
   dessin de la référence est celui de son aperçu (cdn.21st.dev, capture du
   registre) : panneau blanc arrondi, filet fin, pastille ronde à icône en
   tête, titre, une phrase, le corps, puis un bouton noir pleine largeur et
   une sortie en texte dessous. C'est exactement le vocabulaire du site — on
   garde la géométrie et on remplace le contenu.

   SIX ADAPTATIONS, et aucune n'est cosmétique (voir la mémoire
   « adapter-un-composant-shadcn ») :

   1. LES JETONS SHADCN N'EXISTENT PAS ICI. `bg-background`,
      `text-muted-foreground`, `outline-ring/70` ne sont définis nulle part
      dans ce site, et Tailwind n'émet RIEN pour une couleur inconnue : le
      panneau serait transparent sur fond transparent, sans un
      avertissement. Tout est réécrit sur les jetons du monde clair de la
      réservation (`--r-texte`, `--r-doux`, `--r-faible`, `--r-filet`),
      ceux que porte déjà /compte.

   2. `border` SEUL PEINT EN currentColor en Tailwind v4 — un filet de la
      couleur du texte, ici presque noir. La couleur est écrite partout.

   3. `tailwindcss-animate` N'EST PAS INSTALLÉ. `animate-in`, `fade-in-0`,
      `zoom-in-95`, `slide-in-from-top-[48%]` sont des utilitaires de ce
      greffon : laissées en place, ce sont des chaînes mortes et le panneau
      apparaît d'un coup. Elles sont remplacées par deux @keyframes
      accrochées au `[data-state=open]` de la primitive (dialog.css).

   4. RIEN N'EST ANIMÉ EN OPACITÉ, ET IL N'Y A PAS D'ANIMATION DE SORTIE.
      C'est la règle la plus chère du dépôt : un fondu 0 → 1 sur un panneau
      flottant laisse, si l'horloge d'animation est gelée, un panneau
      invisible qui intercepte quand même les clics ; et une animation de
      sortie bloque le démontage de Radix (Presence attend `animationend`)
      — panneau coincé au-dessus de la page. Ne restent que translation et
      échelle, à l'ouverture seulement.

   5. `@radix-ui/react-icons` n'est pas une dépendance du site ; la croix
      vient de `lucide-react`, déjà là.

   6. LE PANNEAU PORTE LA CLASSE `resa`, ET C'EST NÉCESSAIRE. Un dialogue
      Radix est rendu dans un PORTAIL : son panneau est enfant de <body>,
      donc HORS de la racine `.resa` sous laquelle vivent toutes nos règles
      de formulaire (`.resa .rv-champ`, `.resa .r-btn`, `.resa .cp-texte`…).
      Sans elle, les champs sortent sans filet, le bouton noir sans fond —
      vu à l'écran le 15/09, et rien dans la console. Le panneau est donc
      déclaré racine de ce monde, et dialog.css neutralise les trois
      déclarations de `.resa` qui n'ont pas de sens sur un panneau flottant
      (le fond gris, l'ombre de 100vmax qui peint la pleine largeur, le
      `clip-path` qui la découpe) — à une spécificité supérieure, pour que
      l'ordre des feuilles n'ait pas à être deviné.

   Deux ajouts à la référence : `DialogBody`, parce qu'un formulaire de six
   champs doit pouvoir défiler sans emporter le titre ni le pied ; et
   `DialogIcone`, la pastille ronde de l'aperçu, pour ne pas la réécrire à
   chaque appel.
   ══════════════════════════════════════════════════════════════════════ */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import "./dialog.css";
import { cn } from "@/lib/cn";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("dlg-voile", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      {/* `resa` sur le panneau : voir l'adaptation n° 6 en tête de fichier */}
      <DialogPrimitive.Content className={cn("dlg-panneau resa", className)} {...props}>
        {children}
        <DialogPrimitive.Close className="dlg-fermer" aria-label="Fermer">
          <X width={16} height={16} strokeWidth={2} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/* la pastille ronde de l'aperçu : un filet, une icône à 60 % d'encre */
function DialogIcone({ children }: { children: React.ReactNode }) {
  return (
    <span className="dlg-icone" aria-hidden="true">
      {children}
    </span>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("dlg-tete", className)} {...props} />;
}

/* le corps défilant — le titre et le pied restent en place */
function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("dlg-corps", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("dlg-pied", className)} {...props} />;
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("dlg-titre", className)} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("dlg-intro", className)} {...props} />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcone,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
