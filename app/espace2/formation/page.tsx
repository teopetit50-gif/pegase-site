import type { Metadata } from "next";
import Article from "@/components/espace2/formation/Article";
import { PAGES } from "@/components/espace2/formation/pages";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/formation — le guide de démarrage de l'espace client (29/10/2026)

   Demande de Teo : « la page d'un SaaS où il y a du texte et une vidéo
   qu'on peut lancer pour débuter — fais exactement la même ». Retrouvée :
   le Start Guide de la documentation Linear (linear.app/docs/start-guide),
   vidéo « Intro to Linear » en tête. Le même jour, Teo l'a voulue DANS
   l'espace client, puis avec ses pages : « Bien démarrer » et une page
   par module, sous /espace2/formation/[page]. Contenu :
   components/espace2/formation/pages.ts ; relevé et écarts :
   formation.css.

   La vidéo (public/formation/decouvrir-omega.mp4) est PROVISOIRE : une
   suite de cartes titrées tirée par outils/video-formation.py, sans voix.
   Pour la remplacer, déposer le nouveau fichier sous le même nom (et son
   image d'affiche, decouvrir-omega.jpg, 1280 × 720) — rien d'autre à
   toucher.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Formation",
};

export default function Page() {
  return <Article page={PAGES.guide} />;
}
