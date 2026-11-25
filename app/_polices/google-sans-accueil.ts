/* ══ GOOGLE SANS, POUR L'ACCUEIL SEUL — 25/11/2026 ═════════════════════
   Troisième exception à « une police pour tout le site » (index.ts), après
   la serif des avocats (serif.ts) et Geist (geist-accueil.ts), et pour la
   même raison : une page qui décalque une référence au pixel.

   L'accueil reprend synnax-ai-native-software-landing-template-v1.21st.app
   (Teo, 25/11 : « refaire celle-là en 1:1, sans faute »). La référence est
   composée d'un bout à l'autre en Google Sans variable (400 → 700) : c'est
   elle qui fixe les chasses, les interlettrages et la hauteur des titres.

   Google Sans est publiée sur Google Fonts sous SIL Open Font License :
   usage commercial libre, auto-hébergée ici par next/font au build.
   Déclarée dans ce fichier pour n'être préchargée que par app/page.tsx,
   qui pose `googleSansAccueil.variable` sur sa racine `.sx`.
   ══════════════════════════════════════════════════════════════════════ */
import { Google_Sans } from "next/font/google";

export const googleSansAccueil = Google_Sans({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});
