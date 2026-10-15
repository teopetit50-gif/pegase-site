import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import CoquilleOmega from "@/components/omega/CoquilleOmega";
import PorteOmega from "@/components/omega/PorteOmega";
import { AMORCE_THEME_OMEGA } from "@/components/omega/theme";
import { utilisateurCourant } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/omega/donnees";

/* ══════════════════════════════════════════════════════════════════════
   /omega — le tableau de bord personnel de Teo (09/10/2026)

   Même design que /espace2, contenu tout autre : ses cinq pages de
   pilotage. Trois cas :
     · personne de connecté → la porte (e-mail + mot de passe), rien
       d'autre ne se voit ;
     · connecté mais absent de omega_admins → page introuvable ;
     · connecté et admin → le tableau de bord.
   Jamais indexé.
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
/* les chiffres des graphiques et des jauges, à chasse fixe comme chez Vercel */
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pilotage", template: "%s | Pilotage Omega" },
  robots: { index: false, follow: false },
  /* l'onglet du navigateur : le logo blanc sur fond noir (demande de Teo, 09/10 — l'icône noire du site disparaissait dans la barre sombre) */
  icons: { icon: [{ url: "/omega-icone-pilotage.png", type: "image/png", sizes: "64x64" }], apple: [{ url: "/omega-icone-pilotage-apple.png", sizes: "180x180" }] },
};

export default async function LayoutOmega({ children }: { children: React.ReactNode }) {
  /* l'identité et le droit sont lus EN MÊME TEMPS (deux allers-retours vers la base, pas l'un après l'autre) */
  const [utilisateur, admin] = await Promise.all([utilisateurCourant(), estAdmin()]);
  if (!utilisateur) {
    return (
      <div className={`${geist.variable} ${geistMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: AMORCE_THEME_OMEGA }} />
        <PorteOmega police={geist.variable} />
      </div>
    );
  }
  if (!admin) notFound();
  return (
    <div className={`${geist.variable} ${geistMono.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: AMORCE_THEME_OMEGA }} />
      <CoquilleOmega email={utilisateur.email} police={geist.variable}>
        {children}
      </CoquilleOmega>
    </div>
  );
}
