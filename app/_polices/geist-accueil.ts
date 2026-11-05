/* ══ GEIST, POUR L'ACCUEIL SEUL — 05/11/2026 ═══════════════════════════
   Deuxième exception à « une police pour tout le site » (index.ts), après
   la serif des avocats (serif.ts), et pour la même raison : une page qui
   décalque une référence au pixel.

   L'accueil reprend agent-ai-v1.21st.app (Teo : « reproduis-la exactement
   en 1:1 »). Cette page est composée en Geist et Geist Mono — c'est elle
   qui fixe ses chasses, ses interlettrages et la hauteur de ses titres.
   En General Sans, chaque titre change de longueur et la page ne
   ressemble plus.

   Geist (Vercel) est sous SIL Open Font License : usage commercial libre.
   Déclarée ici pour n'être préchargée que par app/page.tsx, qui pose
   `geistAccueil.variable` sur sa racine. Le nom de variable évite
   `--font-geist`, qu'app/polices.css fait déjà pointer sur General Sans.
   ═══════════════════════════════════════════════════════════════════ */
import { Geist, Geist_Mono } from "next/font/google";

export const geistAccueil = Geist({
  subsets: ["latin"],
  variable: "--font-geist-aa",
  display: "swap",
});

export const geistMonoAccueil = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono-aa",
  display: "swap",
});
