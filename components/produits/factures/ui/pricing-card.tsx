import React from "react";
import { cn } from "@/components/produits/factures/utils";

/* ══════════════════════════════════════════════════════════════════════
   Pricing Card (Efferd UI, 21st.dev) — relevé le 10/09/2026 depuis
   l'onglet `Component.tsx` de la fiche, session connectée.

   NOTE DE MÉTHODE : le registre (`21st.dev/r/<auteur>/<slug>`) répond
   403 sans cookie de session, et `curl` n'en a pas. Le code se lit
   depuis le navigateur : cliquer l'onglet `Component.tsx` puis lire le
   premier `<pre>` de la page. C'est la seule voie sans compte en ligne
   de commande.

   Le système est repris tel quel — Card, Header, Plan, Price, Body,
   List, Separator — seule la mise en forme (tabulations → espaces) a
   changé. Les couleurs viennent des jetons du site, donc il est
   monochrome sans retouche.

   ── PASSAGE EN CLAIR (11/09/2026) ────────────────────────────────────

   DEUX EFFETS DE VERRE TOMBENT, ET C'EST VOULU. `shadow-xl` et
   `backdrop-blur-xl` n'avaient de sens que posés sur du noir : sur du
   papier, une ombre XL est une tache grise sous une carte qui ne flotte
   pas, et un flou d'arrière-plan ne floute rien du tout puisqu'il n'y a
   rien derrière. La carte se définit par son FILET, comme chez les trois
   pages sœurs, plus une ombre d'un pixel pour l'asseoir.

   LE REFLET DU HAUT (`glassEffect`) est la seule chose qu'on garde du
   verre — mais retourné. Il éclairait le haut de la carte d'un blanc à
   7 % ; sur du papier, un objet éclairé par le haut est BLANC EN HAUT et
   légèrement grisé en bas. Le dégradé va donc maintenant du blanc franc
   vers le transparent, sur un fond `#f7f7f7` : même volume, matière
   opposée. C'est le même raisonnement que dans Bento.tsx.

   ⚠ ET IL A FALLU LE PASSER DERRIÈRE LE TEXTE. Le reflet est un enfant
   ABSOLU posé avant `{children}` ; les enfants positionnés se peignent
   APRÈS le contenu en flux, donc il recouvrait le nom du palier et le
   badge. À 7 % de blanc sur du noir, personne ne l'avait jamais vu ; à
   100 % de blanc sur du papier, « DÉCOUVERTE » et « à définir » ont
   purement disparu — le défaut était là depuis le début, le passage en
   clair l'a seulement rendu visible. `isolate` sur l'entête en fait un
   contexte d'empilement, et `-z-10` range le reflet entre le fond de
   l'entête et son texte. Ne pas retirer l'un des deux : sans `isolate`,
   un z-index négatif remonterait derrière le fond de la carte.
   ══════════════════════════════════════════════════════════════════════ */

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative w-full rounded-xl border border-[#171717]/[0.16] bg-transparent p-1.5 shadow-[0_1px_2px_rgba(23,23,23,0.05)]",
        className
      )}
      {...props}
    />
  );
}

function Header({
  className,
  children,
  glassEffect = true,
  ...props
}: React.ComponentProps<"div"> & { glassEffect?: boolean }) {
  return (
    <div
      className={cn(
        "relative isolate mb-4 rounded-xl border border-[#171717]/[0.12] bg-[#f7f7f7] p-4",
        className
      )}
      {...props}
    >
      {glassEffect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 rounded-[inherit]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0) 100%)",
          }}
        />
      )}
      {children}
    </div>
  );
}

function Plan({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-8 flex items-center justify-between", className)} {...props} />;
}

function Description({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-[#737373]", className)} {...props} />;
}

function PlanName({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#737373] [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "rounded-full border border-[#171717]/20 px-2 py-0.5 text-xs text-[#4d4d4d]",
        className
      )}
      {...props}
    />
  );
}

function Price({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-3 flex items-end gap-1", className)} {...props} />;
}

function MainPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("font-display text-3xl tracking-[-0.03em] text-[#171717]", className)}
      {...props}
    />
  );
}

function Period({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("pb-1 text-sm text-[#4d4d4d]", className)} {...props} />;
}

function OriginalPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto mr-1 text-lg text-[#737373] line-through", className)}
      {...props}
    />
  );
}

function Body({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-6 p-3", className)} {...props} />;
}

function List({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("space-y-3", className)} {...props} />;
}

function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li className={cn("flex items-start gap-3 text-sm text-[#737373]", className)} {...props} />
  );
}

function Separator({
  children = "Compris en plus",
  className,
  ...props
}: React.ComponentProps<"div"> & { children?: string }) {
  return (
    <div
      className={cn("flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]", className)}
      {...props}
    >
      <span className="h-px flex-1 bg-[#171717]/15" />
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-[#171717]/15" />
    </div>
  );
}

export {
  Card, Header, Description, Plan, PlanName, Badge,
  Price, MainPrice, Period, OriginalPrice, Body, List, ListItem, Separator,
};
