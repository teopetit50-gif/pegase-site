import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Coquille from "@/components/espace2/Coquille";
import { AMORCE_THEME } from "@/components/espace2/amorce";
import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/supabase/server";
import { bienvenueAFaire } from "@/app/bienvenue/etat";

/* ══════════════════════════════════════════════════════════════════════
   /espace2 — la prévisualisation du nouveau design de l'espace client
   (06/10/2026, session C1)

   Construit À CÔTÉ de /espace, sans y toucher : mêmes écrans, mêmes
   données (exemple ou base réelle, mêmes portes Supabase), nouvelle
   coquille. /espace ne passera au nouveau design qu'après l'accord de Teo.

   La police : Geist (SIL Open Font License), réservée à cet espace — le
   site garde General Sans. Geist Mono est déjà posée par le layout racine.
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Espace client Omega (nouveau design)", template: "%s | Espace client Omega" },
  robots: { index: false, follow: false },
};

export default async function LayoutEspace2({ children }: { children: React.ReactNode }) {
  const utilisateur = await utilisateurCourant();
  /* 07/10/2026 — un client qui entre pour la première fois (lien reçu
     après la signature) remplit d'abord /bienvenue. Sans session : rien ne
     change, l'exemple s'affiche. */
  if (utilisateur && (await bienvenueAFaire())) redirect("/bienvenue");
  return (
    <div className={geist.variable}>
      {/* le thème choisi est posé avant la première peinture : pas d'éclair blanc en sombre */}
      <script dangerouslySetInnerHTML={{ __html: AMORCE_THEME }} />
      <Coquille utilisateur={utilisateur} police={geist.variable}>{children}</Coquille>
    </div>
  );
}
