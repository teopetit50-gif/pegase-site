import Link from "next/link";
import { Etincelle, Fleche } from "./Icones";

/* Le bouton de la référence fait glisser sa flèche en diagonale au survol :
   deux exemplaires superposés, l'un sort en haut à droite pendant que
   l'autre entre par en bas à gauche. Relevé sur ses styles en ligne
   (translateX(-100%) translateY(100%) au repos pour le second).

   Piège de hiérarchie : dans la référence, l'action principale est le bouton
   NOIR ; le bouton blanc bordé est le secondaire. */

/* `affichage` PORTE l'utilitaire d'affichage : la classe de base n'en met
   aucun. Un `inline-flex` de base gagnerait l'arbitrage d'ordre d'émission
   contre un `hidden` passé par l'appelant, et le bouton resterait visible là
   où on croyait l'avoir masqué — sans que rien ne le signale. */
type Props = {
  href: string;
  children: React.ReactNode;
  variante?: "principal" | "secondaire";
  affichage?: string;
  className?: string;
};

const externe = (href: string) => /^https?:/.test(href);

export function Bouton({
  href,
  children,
  variante = "principal",
  affichage = "inline-flex",
  className = "",
}: Props) {
  const base =
    "py-3 px-5 items-center gap-2 rounded-lg font-mono text-sm uppercase transition-colors duration-300 group";
  const style =
    variante === "principal"
      ? "text-white bg-black hover:bg-neutral-700"
      : "bg-white text-neutral-900 border border-neutral-900 hover:bg-neutral-100";

  const contenu = (
    <>
      {children}
      {variante === "principal" && (
        <span className="relative overflow-hidden inline-flex w-5 h-5">
          <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full group-hover:-translate-y-full">
            <Fleche />
          </span>
          <span className="absolute inset-0 flex items-center justify-center -translate-x-full translate-y-full transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0">
            <Fleche />
          </span>
        </span>
      )}
    </>
  );

  if (externe(href)) {
    return (
      <a href={href} className={`${affichage} ${base} ${style} ${className}`}>
        {contenu}
      </a>
    );
  }
  return (
    <Link href={href} className={`${affichage} ${base} ${style} ${className}`}>
      {contenu}
    </Link>
  );
}

export function Etiquette({
  children,
  centre = false,
  affichage = "flex",
}: {
  children: React.ReactNode;
  centre?: boolean;
  affichage?: string;
}) {
  return (
    <p
      className={`${affichage} font-mono gap-2 items-center uppercase text-neutral-900 ${
        centre ? "justify-center text-center" : ""
      }`}
    >
      <Etincelle />
      {children}
    </p>
  );
}
