import Link from "next/link";
import { cn } from "./cn";

/** Deux niveaux relevés sur la référence : le PLEIN SOMBRE est l'action
 *  principale, le bordé clair le secondaire. Ne pas les inverser. */
export function Bouton({
  href,
  variante = "principal",
  className,
  children,
}: {
  href: string;
  variante?: "principal" | "secondaire";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-10 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-md px-6 font-medium outline-none transition-all",
        "focus-visible:border-[#a3a3a3] focus-visible:ring-[3px] focus-visible:ring-[#a3a3a3]/50",
        "has-[>svg]:px-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "text-sm sm:gap-4 sm:text-base",
        variante === "principal"
          ? "bg-[#171717] text-[#fafafa] shadow-xs hover:bg-[#171717]/90"
          : "border bg-[#f5f5f5]/70 shadow-none hover:bg-[#e6e6e6] hover:text-[#171717]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
