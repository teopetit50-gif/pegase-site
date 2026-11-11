import Link from "next/link";
import { MARQUE_SITE } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   Le pied d'un site dédié à un logiciel (10/11/2026)

   Rendu par components/PageShell.tsx à la place de components/Footer.tsx
   (« © Omega.AI », Nos offres, Intégrations…) sur un déploiement portant
   NEXT_PUBLIC_PORTAIL. Même dessin que le pied d'Omega, réduit à ce qui
   existe sur ce site : réserver un audit, le service client, les données.
   ══════════════════════════════════════════════════════════════════════ */
const LIENS: { label: string; href: string }[] = [
  { label: "Réserver un audit", href: "/reserver-un-audit" },
  { label: "Service client", href: "/contact" },
  { label: "Où vont vos données", href: "/vos-donnees" },
];

export default function Pied() {
  const marque = MARQUE_SITE;
  if (!marque) return null;
  return (
    <footer className="mx-[calc(50%-50vw)] border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-10 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="text-neutral-500">© 2026 {marque.nom}</div>
        <nav aria-label="Pied de page" className="flex flex-wrap items-center gap-x-7 gap-y-2">
          {LIENS.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-500 transition hover:text-neutral-900">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
