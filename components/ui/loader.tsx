"use client";

import { IconLoader } from "@intentui/icons";
import { ProgressBar } from "react-aria-components";
import { twMerge } from "tailwind-merge";
import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

/* ══════════════════════════════════════════════════════════════════════
   loader — LE témoin de chargement du site (15/09/2026)

   Composant fourni par Teo : « utilise ce composant en tant que loader
   de omegaai.fr, à chaque fois que ça doit charger tu dois l'utiliser. »
   Il n'y avait AUCUN témoin de chargement sur le site avant ce jour
   (vérifié : zéro `animate-spin`, zéro spinner) — les attentes se
   disaient uniquement par du texte, « Envoi… », « Chargement de
   l'agenda… », « Un instant… ». Le texte reste ; le témoin vient devant.

   Trois dessins, choisis par `variant` :
     • `spin`  (par défaut) — les douze traits d'opacité décroissante qui
       tournent par crans, façon indicateur système ;
     • `ring`  — l'anneau de @intentui/icons, tourné par `animate-spin` ;
     • `bars`  — cinq barres qui respirent (SMIL), pour un bloc entier.

   Écarts avec la source, assumés :

   1. `intent` est recâblé sur les jetons DU SITE. La source vise les
      jetons Intent UI (`text-primary`, `text-muted-fg`, `text-success`,
      `text-warning`, `text-danger`) : aucun n'existe ici, les cinq
      teintes seraient mort-nées et le témoin resterait noir sans un
      bruit. Elles pointent donc sur `--gold`, `--muted`, `--mint`, l'or
      assombri lisible sur blanc (#b45309, celui de MotorCard) et le
      rouge des messages d'erreur (#7c2d24, celui de `.rv-erreur`).
      La valeur par défaut reste `current` : le témoin prend la couleur
      du texte qui l'entoure, donc il marche tel quel dans le monde
      sombre du site comme dans le monde clair des formulaires `.resa`.

   2. Le nom accessible par défaut est « Chargement… », pas
      « Loading... » : tout le site est en français, un lecteur d'écran
      n'a pas à changer de langue pour un témoin.

   3. `aria-hidden` fait sauter la `ProgressBar` entière et ne rend que
      le dessin. C'est le cas des boutons : leur libellé dit déjà
      « Envoi… », et un rôle `progressbar` posé dedans ferait un nom
      accessible « Chargement… Envoi… ». Dans un bouton, le témoin est
      donc décoratif ; partout ailleurs il s'annonce.

   `react-aria-components` porte le rôle `progressbar` et l'état
   indéterminé — c'est ce que la source vient chercher, et la raison pour
   laquelle le paquet est désormais installé alors que `switch.tsx`
   s'en était passé en juillet.
   ══════════════════════════════════════════════════════════════════════ */

const loaderStyles = tv({
  base: "relative",
  variants: {
    intent: {
      current: "text-current",
      primary: "text-gold",
      secondary: "text-muted",
      success: "text-mint",
      warning: "text-[#b45309]",
      danger: "text-[#7c2d24]",
    },
    size: {
      sm: "size-4",
      md: "size-6",
      lg: "size-8",
      xl: "size-10",
    },
  },
  defaultVariants: {
    intent: "current",
    size: "sm",
  },
});

type LoaderVariantProps = VariantProps<typeof loaderStyles>;

const Bars = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={twMerge("size-4", className)}
    data-slot="icon"
    viewBox="0 0 135 140"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    {...props}
  >
    <rect y="10" width="15" height="120" rx="6">
      <animate
        attributeName="height"
        begin="0.5s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.5s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x="30" y="10" width="15" height="120" rx="6">
      <animate
        attributeName="height"
        begin="0.25s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.25s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x="60" width="15" height="140" rx="6">
      <animate
        attributeName="height"
        begin="0s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x="90" y="10" width="15" height="120" rx="6">
      <animate
        attributeName="height"
        begin="0.25s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.25s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x="120" y="10" width="15" height="120" rx="6">
      <animate
        attributeName="height"
        begin="0.5s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.5s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
  </svg>
);

const Ring = (props: React.SVGProps<SVGSVGElement>) => <IconLoader {...props} />;

const Spin = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={twMerge("size-4", className)}
    data-slot="icon"
    viewBox="0 0 2400 2400"
    {...props}
  >
    <g strokeWidth="200" strokeLinecap="round" fill="none">
      <line x1="1200" y1="600" x2="1200" y2="100" />
      <line opacity="0.5" x1="1200" y1="2300" x2="1200" y2="1800" />
      <line opacity="0.917" x1="900" y1="680.4" x2="650" y2="247.4" />
      <line opacity="0.417" x1="1750" y1="2152.6" x2="1500" y2="1719.6" />
      <line opacity="0.833" x1="680.4" y1="900" x2="247.4" y2="650" />
      <line opacity="0.333" x1="2152.6" y1="1750" x2="1719.6" y2="1500" />
      <line opacity="0.75" x1="600" y1="1200" x2="100" y2="1200" />
      <line opacity="0.25" x1="2300" y1="1200" x2="1800" y2="1200" />
      <line opacity="0.667" x1="680.4" y1="1500" x2="247.4" y2="1750" />
      <line opacity="0.167" x1="2152.6" y1="650" x2="1719.6" y2="900" />
      <line opacity="0.583" x1="900" y1="1719.6" x2="650" y2="2152.6" />
      <line opacity="0.083" x1="1750" y1="247.4" x2="1500" y2="680.4" />
      <animateTransform
        attributeName="transform"
        attributeType="XML"
        type="rotate"
        keyTimes="0;0.08333;0.16667;0.25;0.33333;0.41667;0.5;0.58333;0.66667;0.75;0.83333;0.91667"
        values="0 1199 1199;30 1199 1199;60 1199 1199;90 1199 1199;120 1199 1199;150 1199 1199;180 1199 1199;210 1199 1199;240 1199 1199;270 1199 1199;300 1199 1199;330 1199 1199"
        dur="0.83333s"
        begin="0.08333s"
        repeatCount="indefinite"
        calcMode="discrete"
      />
    </g>
  </svg>
);

const LOADERS = {
  bars: Bars,
  ring: Ring,
  spin: Spin,
};

const DEFAULT_SPINNER = "spin";

interface LoaderProps
  extends Omit<React.ComponentPropsWithoutRef<"svg">, "display" | "opacity" | "intent">,
    LoaderVariantProps {
  variant?: keyof typeof LOADERS;
  percentage?: number;
  isIndeterminate?: boolean;
  formatOptions?: Intl.NumberFormatOptions;
  ref?: React.RefObject<SVGSVGElement>;
}

const Loader = ({ isIndeterminate = true, ref, ...props }: LoaderProps) => {
  const {
    className,
    variant = DEFAULT_SPINNER,
    intent,
    size,
    /* sortis du reste : ce sont des props de la ProgressBar, pas du SVG —
       laissés dans le spread, React les recopierait sur le <svg> et
       préviendrait en console. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- sorti du spread, jamais lu : la source ne le câble sur rien
    percentage,
    formatOptions,
    ...spinnerProps
  } = props;
  const LoaderPrimitive = LOADERS[variant in LOADERS ? variant : DEFAULT_SPINNER];

  const dessin = (
    <LoaderPrimitive
      role="presentation"
      className={loaderStyles({
        intent,
        size,
        className: twMerge([
          ["ring"].includes(variant) && "animate-spin",
          variant === "spin" && "stroke-current",
          className,
        ]),
      })}
      ref={ref}
      {...spinnerProps}
    />
  );

  /* Témoin décoratif — le cas des boutons, dont le libellé dit déjà
     « Envoi… ». On ne rend QUE le dessin : `filterDOMProps` de react-aria
     ne recopie pas `aria-hidden` sur la ProgressBar (vérifié dans la
     source : seuls `dir`, `lang`, `hidden`, `inert`, `translate` passent),
     donc la poser là serait sans effet et le bouton s'appellerait
     « Chargement… Envoi… ». Pas de rôle `progressbar` du tout : c'est le
     texte du bouton qui porte l'information. */
  if (props["aria-hidden"]) return dessin;

  return (
    <ProgressBar
      data-slot="loader"
      aria-label={props["aria-label"] ?? "Chargement…"}
      formatOptions={formatOptions}
      isIndeterminate={isIndeterminate}
    >
      {dessin}
    </ProgressBar>
  );
};

export { Loader };
