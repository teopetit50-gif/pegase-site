import Link from "next/link";
import { CANAL_LABEL, lienContact } from "@/lib/reservation";

/* Footer v4 (22/07, Teo : « pro c'est genre rien, y a trop de trucs ») —
   réduction à l'os. Une seule rangée : le copyright à gauche, trois liens à
   droite. Ont été retirés : le pégase, la signature « Omega » + sa ligne de
   positionnement, les liens Audit gratuit / Démo / Articles (tous atteignables
   depuis le header et le corps des pages), les deux réseaux (ils pointaient
   sur /contact, pas sur des profils) et la pastille de statut. Mentions
   légales reste : c'est une obligation, pas une décoration. */

const LIENS: { label: string; href: string }[] = [
  { label: "Nos offres", href: "/offres" },
  { label: "Intégrations", href: "/integrations" },
  { label: "Mentions légales", href: "/mentions-legales" },
];

export default function Footer() {
  return (
    <footer>
      <div className="flex flex-col gap-4 border-t border-white/[0.08] px-6 py-10 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="text-white/40">© 2026 Omega — Guadeloupe</div>
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2">
          {LIENS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-white/40 transition hover:text-white/75"
            >
              {l.label}
            </Link>
          ))}
          {/* 30/07 — une seule entrée ajoutée, pas un bloc : le pied de page
              reste « à l'os » (règle Teo du 22/07). Mais le canal de contact
              n'était écrit nulle part ailleurs que sur /audit, qui ne reçoit
              que quatre liens entrants — il était donc introuvable. */}
          <a
            href={lienContact("Omega — une question")}
            className="text-white/40 transition hover:text-white/75"
          >
            {CANAL_LABEL}
          </a>
        </nav>
      </div>
    </footer>
  );
}
