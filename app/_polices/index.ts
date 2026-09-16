/* ══ LA POLICE DU SITE — 16/09/2026 ═══════════════════════════════════
   Déclarée ICI et nulle part ailleurs : le layout la pose sur <html>, et
   app/polices.css fait pointer sur elle tous les anciens noms de
   variables du site. Aucune page ne charge plus de police en propre.

   GENERAL SANS (Indian Type Foundry, distribuée sur Fontshare sous
   l'ITF Free Font License — libre pour un usage commercial, et
   l'auto-hébergement est nommément autorisé : « downloading, accessing,
   SELF-HOSTING, installing, storing, embedding »). Un seul fichier
   variable de 37 ko couvre 200 → 700.

   Pourquoi elle : c'est le sosie d'Aeonik Pro, la police de scale.ai que
   Teo veut. Mesurée contre la vraie Aeonik (chargée depuis scale.com),
   à 100 px :
     hauteur d'x / capitale   +0,7 %      (Manrope +2,9 · Urbanist −1,7)
     ascendante / capitale     0,0 %      — comme Aeonik, le 'd' monte
                                            exactement à la hauteur du 'H'
     « The Best In The Business »  −0,1 %
     « Vos équipes ont les outils » +0,2 %
   Et à l'œil, composée ligne à ligne sous la vraie : même 'g' à un étage
   à queue droite, même 'R' à jambe droite, même 'Q', même 'S'.

   Geist, qui tenait ce rôle depuis le matin, avait été choisie sur la
   seule largeur d'UNE phrase parmi douze familles Google. Le relevé
   lettre par lettre l'a écartée : elle ne figure pas dans les seize
   premières, et à côté d'Aeonik elle lit plus étroite et plus serrée.

   SI TEO ACHÈTE LA VRAIE AEONIK (licence web, CoType Foundry) : déposer
   les .woff2 dans ce dossier, changer `src` ci-dessous, et c'est tout —
   rien d'autre dans le site ne nomme de police.
   ═══════════════════════════════════════════════════════════════════ */
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";

export const omega = localFont({
  src: "./GeneralSans-Variable.woff2",
  weight: "200 700",
  display: "swap",
  variable: "--font-omega",
});

/* Aeonik a son mono ; General Sans n'en a pas. Geist Mono fait la paire —
   elle ne sert que les étiquettes et les chiffres alignés. */
export const omegaMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-omega-mono",
});
