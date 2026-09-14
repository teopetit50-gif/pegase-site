import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Bouton principal de la référence — relevé le 09/09/2026.

   Le mécanisme exact : une tache de lumière (radial-gradient) parcourt le
   contour du bouton grâce à `offset-path`, et un panneau noir posé en
   `inset-[2px]` masque tout l'intérieur — seule la bordure reste éclairée.
   Les quatre réglages sont des variables CSS, comme dans la référence :
   `--duration: 3`, `--light-width: 110px`, `--light-color: #FAFAFA`,
   `--border-width: 2px`.

   ATTENTION à ne pas les réinverser : dans la référence, c'est CE bouton
   qui est l'action principale (« GET STARTED »), et l'AUTRE, le bouton
   plein, qui est le secondaire (« REQUEST A DEMO »).

   ── PASSAGE EN CLAIR (11/09/2026) ────────────────────────────────────

   LE PRINCIPAL GARDE SA LUMIÈRE TOURNANTE, MAIS PORTE SON PROPRE NOIR.
   Sur la référence, l'anneau de 2 px laissé entre le bord et le panneau
   intérieur était TRANSPARENT : il montrait le noir de la page, et la
   tache crème s'y détachait. Sur du papier, ce même anneau montre du
   blanc — une lumière crème sur du blanc ne se voit pas. Le bouton pose
   donc lui-même un fond `#0a0a0a` : il devient une pilule noire posée
   sur la feuille, et la lumière court sur SON contour. Même mécanisme,
   même rendu ; il ne dépend simplement plus de la couleur de la page.
   Sa bordure `slate-200/50`, faite pour être vue sur du noir, devient
   une bordure d'encre.

   LE SECONDAIRE ÉTAIT UNE PILULE BLANCHE : elle disparaîtrait sur du
   papier. Elle reste blanche — c'est le geste de la référence, un plein
   clair à côté du plein sombre — et c'est sa BORDURE qui prend le
   travail de la détacher (#d4d4d4 au lieu d'un blanc à 30 %). Son filet
   supérieur en dégradé, lui, marquait l'arête haute de l'objet : sur du
   noir il fallait un filet CLAIR, sur du blanc il faut un filet SOMBRE.
   Même geste, valeur opposée. */

export function Chevrons({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.5 18C12.5 18 18.5 13.5811 18.5 12C18.5 10.4188 12.5 6 12.5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.50005 18C5.50005 18 11.5 13.5811 11.5 12C11.5 10.4188 5.5 6 5.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarButton({
  children,
  href = "#",
  taille = "lg",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  taille?: "sm" | "lg";
  className?: string;
}) {
  const dimensions =
    taille === "sm" ? "h-8 px-4 text-xs" : "h-10 px-4 py-2 text-sm";

  return (
    <a
      href={href}
      style={
        {
          "--duration": 3,
          "--light-width": "110px",
          "--light-color": "#FAFAFA",
          "--border-width": "2px",
          isolation: "isolate",
        } as React.CSSProperties
      }
      className={`group/star-button relative z-[3] inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border border-[#171717]/15 bg-[#0a0a0a] font-medium transition-colors ${dimensions} ${className}`}
    >
      {/* La lumière qui fait le tour. */}
      <span
        aria-hidden="true"
        className="animate-star-btn absolute inset-0 aspect-square bg-[radial-gradient(ellipse_at_center,var(--light-color),transparent,transparent)]"
        style={{ offsetDistance: "0%", width: "var(--light-width)" }}
      />
      {/* Le panneau noir qui ne laisse voir que la bordure. */}
      <span
        aria-hidden="true"
        className="absolute inset-[2px] z-[4] overflow-hidden rounded-[inherit] border-black/10"
        style={{ borderWidth: "var(--border-width)", backgroundColor: "#000000" }}
      />
      <span className="relative z-[5] inline-flex items-center gap-1.5 text-[#ecebe7]">
        {children}
      </span>
    </a>
  );
}

/* Le bouton secondaire de la référence : pilule pleine, avec un filet
   d'un pixel en dégradé posé en haut, qui s'éteint aux deux bouts. */
export function BoutonPlein({
  children,
  href = "#",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`relative isolate inline-flex h-10 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border border-[#d4d4d4] bg-white px-5 text-sm font-medium text-[#171717] transition-all hover:bg-[#f5f5f5] hover:text-[#171717] ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[1.125rem] top-0 h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-[#171717]/0 via-[#171717]/35 to-[#171717]/0"
      />
      {/* `inline-flex` et `whitespace-nowrap` : sans eux, un libellé
          suivi d'une icône passe à la ligne dans un bouton de hauteur
          fixe, et l'icône se retrouve sous le texte. */}
      <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">
        {children}
      </span>
    </a>
  );
}

/* Variante BOUTON du même dessin. `StarButton` rend un `<a>` : dans un
   formulaire il ne soumet rien, il navigue. Toute action de formulaire
   doit passer par celle-ci. */
export function StarSubmit({
  children,
  taille = "lg",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  taille?: "sm" | "lg";
  disabled?: boolean;
  className?: string;
}) {
  const dimensions = taille === "sm" ? "h-8 px-4 text-xs" : "h-10 px-4 py-2 text-sm";
  return (
    <button
      type="submit"
      disabled={disabled}
      style={
        {
          "--duration": 3,
          "--light-width": "110px",
          "--light-color": "#FAFAFA",
          "--border-width": "2px",
          isolation: "isolate",
        } as React.CSSProperties
      }
      className={`group/star-button relative z-[3] inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border border-[#171717]/15 bg-[#0a0a0a] font-medium transition-colors disabled:opacity-50 ${dimensions} ${className}`}
    >
      <span
        aria-hidden="true"
        className="animate-star-btn absolute inset-0 aspect-square bg-[radial-gradient(ellipse_at_center,var(--light-color),transparent,transparent)]"
        style={{ offsetDistance: "0%", width: "var(--light-width)" }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-[2px] z-[4] overflow-hidden rounded-[inherit] border-black/10"
        style={{ borderWidth: "var(--border-width)", backgroundColor: "#000000" }}
      />
      <span className="relative z-[5] inline-flex items-center gap-2 whitespace-nowrap text-[#ecebe7]">
        {children}
      </span>
    </button>
  );
}
