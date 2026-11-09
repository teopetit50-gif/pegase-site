/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Bouton.tsx (09/11/2026)
   Le bouton et le lien de la référence, classe pour classe :
   · `Bouton` : le `group/button` (« About the studio », « Start a project »)
     — voile qui grandit depuis le coin bas-gauche en 400 ms, libellé qui
     glisse d'une ligne vers le haut, flèche qui avance de 4 px ;
   · `Lien` : le `.link` souligné d'un pixel, redessiné au survol
     (nivara.css).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";

const COURBE = "transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function Fleche({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2 8h12M9 3l5 5-5 5" />
    </svg>
  );
}

export default function Bouton({
  href,
  children,
  variante = "ink",
  className = "",
}: {
  href: string;
  children: string;
  /** `ink` : fond encre, libellé papier (statement) · `paper` : fond papier, libellé encre, voile encre (clôture) */
  variante?: "ink" | "paper";
  className?: string;
}) {
  const papier = variante === "paper";
  return (
    <Link
      href={href}
      className={`group/button relative inline-flex cursor-pointer items-center overflow-hidden px-6 py-3.5 ${
        papier ? "bg-paper text-ink" : "bg-ink text-paper"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 origin-bottom-left scale-0 group-hover/button:scale-100 ${COURBE} ${
          papier ? "bg-ink" : "bg-paper/15"
        }`}
      />
      <span
        className={`relative flex items-center gap-3 transition-colors duration-[400ms] ${
          papier ? "group-hover/button:text-paper" : ""
        }`}
      >
        <span className="block h-[1.3em] overflow-hidden leading-[1.3em]">
          <span className={`flex flex-col group-hover/button:-translate-y-1/2 ${COURBE}`}>
            <span>{children}</span>
            <span aria-hidden="true">{children}</span>
          </span>
        </span>
        <Fleche className={`size-3.5 group-hover/button:translate-x-1 ${COURBE}`} />
      </span>
    </Link>
  );
}

export function Lien({ href, children, className = "" }: { href: string; children: string; className?: string }) {
  return (
    <Link href={href} className={`link ${className}`}>
      {children}
    </Link>
  );
}
