import type { Metadata } from "next";
import { Geist, Inter, Manrope, Source_Code_Pro } from "next/font/google";
import Coquille3 from "@/components/espace3/Coquille3";
import { AMORCE_THEME } from "@/components/espace2/amorce";

/* ══════════════════════════════════════════════════════════════════════
   /espace3 — le tableau de bord d'un groupe de sociétés (30/10/2026)

   Le clone de /espace2 pour les groupes : même dessin, même thème, mais
   tout ce qui s'affiche parle du groupe. Deux postes au choix dans la
   barre du haut : le CEO et la direction marketing. Démonstration : les
   données sont celles d'un groupe fictif (components/espace3/donnees.ts).
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-v2-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-v2-manrope", display: "swap" });
const code = Source_Code_Pro({ subsets: ["latin"], variable: "--font-v2-code", display: "swap" });
const polices = [geist.variable, inter.variable, manrope.variable, code.variable].join(" ");

export const metadata: Metadata = {
  title: { default: "Tableau de bord du groupe", template: "%s | Omega pour les groupes" },
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/omega-icone-pilotage.png", type: "image/png", sizes: "64x64" }], apple: [{ url: "/omega-icone-pilotage-apple.png", sizes: "180x180" }] },
};

export default function LayoutEspace3({ children }: { children: React.ReactNode }) {
  return (
    <div className={polices}>
      <script dangerouslySetInnerHTML={{ __html: AMORCE_THEME }} />
      <Coquille3 police={polices}>{children}</Coquille3>
    </div>
  );
}
