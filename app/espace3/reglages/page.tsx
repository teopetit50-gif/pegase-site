import type { Metadata } from "next";
import ReglagesLinear from "@/components/espace3/lin/ReglagesLinear";

/* /espace3/reglages — Settings › Preferences de Linear, au 1:1 (28/10/2026).
   Général, Accessibilité (#accessibilite) et Données (#donnees) sont les
   ancres d'une seule page ; le volet de navigation les pointe. */

export const metadata: Metadata = {
  title: "Réglages",
};

export default function PageReglages() {
  return <ReglagesLinear />;
}
