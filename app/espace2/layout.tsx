import type { Metadata } from "next";
import { Geist, Inter, Manrope, Source_Code_Pro } from "next/font/google";
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

   22/10/2026 — base commune au 1:1 du tableau de bord Supabase, mesurée
   sur supabase.com/dashboard : le texte en Inter (13 px, graisse 450),
   les titres en Manrope (600), les en-têtes de tableau et les étiquettes
   de tuile en Source Code Pro. Les trois sont sous licence SIL OFL. Geist
   reste chargée : /omega et l'aperçu de /bienvenue s'en servent encore,
   et les variables de espace2.css retombent sur elle.
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-v2-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-v2-manrope", display: "swap" });
const code = Source_Code_Pro({ subsets: ["latin"], variable: "--font-v2-code", display: "swap" });
const polices = [geist.variable, inter.variable, manrope.variable, code.variable].join(" ");

export const metadata: Metadata = {
  title: { default: "Espace client Omega (nouveau design)", template: "%s | Espace client Omega" },
  robots: { index: false, follow: false },
  /* l'onglet du navigateur : le logo blanc sur fond noir (demande de Teo, 09/10 — l'icône noire disparaissait dans la barre sombre) */
  icons: { icon: [{ url: "/omega-icone-pilotage.png", type: "image/png", sizes: "64x64" }], apple: [{ url: "/omega-icone-pilotage-apple.png", sizes: "180x180" }] },
};

export default async function LayoutEspace2({ children }: { children: React.ReactNode }) {
  const utilisateur = await utilisateurCourant();
  /* 07/10/2026 — un client qui entre pour la première fois (lien reçu
     après la signature) remplit d'abord /bienvenue. Sans session : rien ne
     change, l'exemple s'affiche. */
  if (utilisateur && (await bienvenueAFaire())) redirect("/bienvenue");
  return (
    <div className={polices}>
      {/* le thème choisi est posé avant la première peinture : pas d'éclair blanc en sombre */}
      <script dangerouslySetInnerHTML={{ __html: AMORCE_THEME }} />
      <Coquille utilisateur={utilisateur} police={polices}>{children}</Coquille>
    </div>
  );
}
